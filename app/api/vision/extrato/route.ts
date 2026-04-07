import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const maxDuration = 60;
export const runtime = 'edge';

let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function POST(req: Request) {
  if (!ai) {
    return NextResponse.json({ error: 'Configuração da IA ausente (GEMINI_API_KEY não definida).' }, { status: 500 });
  }
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64Image = arrayBufferToBase64(buffer);
    const mimeType = file.type || 'image/jpeg';

    const systemPrompt = `Você é um especialista financeiro focado na leitura de extratos bancários Brasileiros (Itaú, Bradesco, Nubank, etc).
Sua missão é extrair TODAS as transações de um comprovante, PDF ou imagem para JSON ARRAY.

Instruções cruciais de Extração:
1. SINAL E COR: Valores negativos (-) ou em cor vermelha SÃO SAÍDAS (despesas). Valores sem sinal ou verdes SÃO ENTRADAS (receitas).
2. LIMPEZA DE NOME: O campo de texto bancário costuma vir sujo. Ignore lixos como "PIX TRANSF", "PAY ", "PAG BOLETO", "QRS", "DEV PIX", "FATURA PAGA". Extraia apenas o recebedor real. Exemplo: "PIX TRANSF EDUARDO06/04" -> "EDUARDO"; "PAG BOLETO CONDOMINIO CYRELA" -> "CONDOMINIO CYRELA".
3. DATAS: O extrato pode ter datas curtas (ex: 06/04). Infira o ano base a partir da imagem. 

Retorne EXATAMENTE UM ARRAY JSON onde cada objeto tenha:
[
  {
    "descricao": "O recebedor limpo. Max 3 a 4 palavras.",
    "valor": 150.50, // APENAS O NUMERO POSITIVO. (Se era -100 no documento, retorne 100).
    "tipo": "Saída", // 'Saída' para débitos, pagamentos, faturas. 'Entrada' para créditos, devoluções, recebimentos.
    "data": "2026-04-06", // Formato YYYY-MM-DD.
    "categoria": "Alimentação" // Deduza: 'Alimentação' (OXXO, iFood, Mercado), 'Transporte', 'Moradia' (Condominio, Enel), 'Lazer', 'Saúde', 'Cartões', 'Transferências' ou 'Outros'.
  }
]

Atenção máxima em retornar APENAS O JSON, nenhuma palavra a mais. Se falhar retorne [].`;

    let response;
    let attempt = 0;
    const maxAttempts = 3;
    
    while(attempt < maxAttempts) {
       try {
           response = await ai.models.generateContent({
             model: 'gemini-2.5-flash',
             contents: [
               { role: 'user', parts: [
                   { text: systemPrompt },
                   { inlineData: { data: base64Image, mimeType: mimeType } }
               ] }
             ],
             config: {
               responseMimeType: "application/json",
             }
           });
           break;
       } catch(err: any) {
           attempt++;
           if (attempt >= maxAttempts) throw err;
           const msg = err.message || '';
           if (msg.includes('503') || msg.includes('overloaded') || msg.includes('high demand')) {
               // Aguarda 2 segundos antes de tentar de novo
               await new Promise(r => setTimeout(r, 2000));
           } else {
               throw err;
           }
       }
    }
    
    if (!response) {
       throw new Error("Falha total na comunicação com a IA.");
    }

    const responseText = response.text || '[]';
    let parsedData = [];
    try {
       parsedData = JSON.parse(responseText);
    } catch {
       throw new Error("Falha ao ler JSON da resposta: " + responseText);
    }

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('OCR Extrato Error:', error);
    
    let errMsg = error.message || 'Falha ao processar extrato.';
    if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE') || errMsg.includes('overloaded')) {
       errMsg = "Sua requisição é volumosa demais para a IA processar de uma vez (arquivos grandes como 90 dias geram timeout). Por favor, dívida o seu PDF em partes de até 30 dias e tente novamente.";
    }
    
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
