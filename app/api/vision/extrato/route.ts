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

    const systemPrompt = `Você é um especialista financeiro focado na extração de dados de Extratos Bancários e Notas Fiscais (NFe, NFCe, Cupons Fiscais).
Sua missão é extrair TODAS as transações de um comprovante, PDF ou imagem para um JSON ARRAY.

Instruções cruciais de Extração:
1. IDENTIFICAÇÃO DO DOCUMENTO: Se for um Extrato, extraia as transações linha a linha. Se for uma Nota Fiscal/Cupom, extraia como uma única transação (ou item a item se fizer sentido), representando o local da compra.
2. SINAL E TIPO: 
   - No Extrato: Valores negativos (-) ou em cor vermelha SÃO SAÍDAS (despesas). Valores sem sinal ou verdes SÃO ENTRADAS (receitas).
   - Na Nota Fiscal (Compra do usuário): O valor total gasto deve ser classificado como "Saída", pois representa uma despesa.
3. LIMPEZA DE NOME: Ignore lixos bancários como "PIX TRANSF", "PAY ", "PAG BOLETO", "QRS", "DEV PIX". Se for uma Nota Fiscal, a descrição deve ser o nome do estabelecimento (ex: "Supermercado Pão de Açúcar", "Posto Ipiranga") ou o item principal.
4. DATAS: Em extratos com datas curtas (ex: 06/04), infira o ano base da imagem. Na Nota Fiscal, busque a Data de Emissão.

Retorne EXATAMENTE UM ARRAY JSON onde cada objeto tenha:
[
  {
    "descricao": "O recebedor limpo ou nome do local da nota. Max 3 a 5 palavras.",
    "valor": 150.50, // APENAS O NUMERO POSITIVO. (Se era -100 no documento, retorne 100).
    "tipo": "Saída", // 'Saída' para débitos, pagamentos, faturas, notas fiscais de compra. 'Entrada' para créditos, recebimentos.
    "data": "2026-04-06", // Formato YYYY-MM-DD.
    "categoria": "Alimentação" // Deduza: 'Alimentação' (OXXO, iFood, Mercado), 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Cartões', 'Transferências' ou 'Outros'.
  }
]

Atenção máxima em retornar APENAS O ARRAY JSON válido, nenhuma palavra a mais. Se não encontrar dados retorne [].`;

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
