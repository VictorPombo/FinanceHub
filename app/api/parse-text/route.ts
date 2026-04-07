import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

export async function POST(req: Request) {
  if (!ai) {
    return NextResponse.json({ error: 'Configuração da IA ausente (GEMINI_API_KEY). Adicione a chave no painel da Vercel.' }, { status: 500 });
  }
  
  try {
    const body = await req.json();
    const { text, currentYear } = body;

    if (!text) {
      return NextResponse.json({ error: 'Nenhum texto enviado.' }, { status: 400 });
    }

    const systemPrompt = `Você é um leitor de recibos financeiros e anotações financeiras ultra inteligente.
O usuário vai enviar um bloco de texto informal contendo transações financeiras.
Sua missão é extrair TODAS as transações e retornar estritamente um array JSON de objetos.

Regras para cada transação:
1. "descricao": Nome de quem pagou ou recebeu, ou do serviço (ex: "Junior", "Catão Itaú", "Condomínio"). Max 4 palavras.
2. "valor": Numero float (positivo). Exemplo: se no texto diz R$ 1.500,00 volte 1500.0.
3. "tipo": string estrita "Entrada" (receitas/ganhos) ou "Saída" (despesas/pagamentos/gastos). Preste atenção ao contexto do bloco, o usuário geralmente separa por '📥 Entradas' e '📤 Saídas'.
4. "data": String no formato "YYYY-MM-DD". Se o usuário citou "15/04", verifique o contexto do ano no texto ou utilize o ano atual que é passado: ${currentYear || new Date().getFullYear()}.

Retorne APENAS um JSON válido. Por exemplo, se houver duas linhas:
[
  { "descricao": "Cartão de Crédito", "valor": 5540.23, "tipo": "Saída", "data": "2026-05-10" },
  { "descricao": "João Pix", "valor": 300.00, "tipo": "Entrada", "data": "2026-05-11" }
]

Retorne um array JSON vazio [] se não encontrar absolutamente nada. Não inclua Markdown envolta (como \`\`\`json).`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [
            { text: systemPrompt },
            { text: "Texto do usuário:\n" + text }
        ] }
      ],
      config: {
        responseMimeType: "application/json",
      }
    });

    const responseText = response.text || '[]';
    let parsedData = [];
    try {
       parsedData = JSON.parse(responseText.trim().replace(/^```json/i, '').replace(/```$/i, '').trim());
       if (!Array.isArray(parsedData)) parsedData = [parsedData];
    } catch {
       throw new Error("Falha ao ler JSON da resposta: " + responseText);
    }

    return NextResponse.json({ transactions: parsedData });
  } catch (error: any) {
    console.error('Text Parsing Error:', error);
    return NextResponse.json({ error: error.message || 'Falha ao processar texto com IA' }, { status: 500 });
  }
}
