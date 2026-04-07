import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

export async function POST(req: Request) {
  if (!ai) {
    return NextResponse.json({ error: 'Configuração da IA ausente (GEMINI_API_KEY não definida). Adicione a chave no painel da Vercel para usar OCR.' }, { status: 500 });
  }
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');
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

    const response = await ai.models.generateContent({
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
    return NextResponse.json({ error: error.message || 'Falha ao processar extrato' }, { status: 500 });
  }
}
