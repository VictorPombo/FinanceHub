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

    const systemPrompt = `Você é um leitor de extratos bancários super inteligente.
Sua missão é olhar para a imagem enviada (foto de extrato ou tabela de banco) e extrair TODAS as transações em formato JSON ARRAY, rigorosamente.

Retorne EXATAMENTE UM ARRAY JSON onde cada objeto tenha:
[
  {
    "descricao": "Nome do local/empresa ou pessoa. Max 3 palavras.",
    "valor": 150.50, // Sempre número POSITIVO. O tipo definirá se é entrada/saída.
    "tipo": "Saída", // 'Saída' se for custo/débito/pagamento, 'Entrada' se for crédito/recebimento.
    "data": "2026-04-15", // Formato YYYY-MM-DD (tente deduzir o ano se faltar).
    "categoria": "Alimentação" // Deduza uma categoria: 'Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Educação', 'Outros'.
  }
]

Se você não conseguir identificar nada, retorne [].`;

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
