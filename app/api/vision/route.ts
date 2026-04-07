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

    // Convert file to base64
    const buffer = await file.arrayBuffer();
    const base64Image = Buffer.from(buffer).toString('base64');
    const mimeType = file.type || 'image/jpeg';

    const systemPrompt = `Você é um leitor de comprovantes financeiros imensamente inteligente.
Sua missão é olhar para a imagem enviada (um comprovante, print de PIX, cupom) e extrair EXATAMENTE as seguintes informações em formato JSON rigoroso, e nada mais.

{
  "descricao": "Nome da empresa/pessoa que recebeu ou enviou. Max 3 palavras.",
  "valor": 150.50, // Formato numérico. Se foi um PIX ENVIADO (pagamento), o valor deve ser POSITIVO. Se foi RECEBIDO, deve ser POSITIVO. Você vai usar o campo 'tipo' para diferenciar.
  "tipo": "Saída", // 'Saída' se for pagamento/envio, 'Entrada' se for recebimento.
  "data": "2026-04-15" // Formato YYYY-MM-DD
}

Se você não conseguir identificar os dados porque é ilegível, retorne um objeto vazio {} com HTTP erro.
Mas tente o seu máximo.`;

    // Process using Gemini 2.5 Flash
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

    const responseText = response.text || '';
    let parsedData = {};
    try {
       parsedData = JSON.parse(responseText);
    } catch {
       throw new Error("Falha ao ler JSON da resposta: " + responseText);
    }

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error('OCR Error:', error);
    return NextResponse.json({ error: error.message || 'Falha ao processar comprovante' }, { status: 500 });
  }
}
