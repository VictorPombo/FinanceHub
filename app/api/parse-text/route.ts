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

    const yearToUse = currentYear || new Date().getFullYear();

    const systemPrompt = `Você é um assistente financeiro ultra-preciso que extrai transações de textos informais.

O usuário vai enviar um bloco de texto contendo transações financeiras. Sua missão é identificar TODAS as transações e retornar um array JSON.

REGRAS OBRIGATÓRIAS:
1. "descricao": Nome curto de quem pagou/recebeu ou do serviço. Máximo 4 palavras. Capitalizado.
2. "valor": Número decimal positivo. "R$ 1.500,00" → 1500.0, "R$45,90" → 45.9, "350" → 350.0
3. "tipo": EXATAMENTE "Entrada" ou "Saída". Use o contexto:
   - Palavras como "recebido", "entrada", "recebi", "pagamento de", "pix de", "salário", "freelance": → "Entrada"
   - Palavras como "paguei", "gastei", "compra", "fatura", "aluguel", "conta", "ifood", "uber", "saída": → "Saída"
   - Se o texto tem seções como "Entradas:" ou "Receitas:", tudo abaixo até a próxima seção é Entrada
   - Se o texto tem seções como "Saídas:" ou "Despesas:" ou "Gastos:", tudo abaixo é Saída
4. "data": String "YYYY-MM-DD". 
   - Se o texto diz "12/05": → "${yearToUse}-05-12"
   - Se diz "05 de abril": → "${yearToUse}-04-05"
   - Se não há data, use "${yearToUse}-${String(new Date().getMonth()+1).padStart(2,'0')}-01"
5. "categoria": Tente categorizar: "Moradia", "Alimentação", "Transporte", "Saúde", "Lazer", "Serviços", "Educação", "Recebimento", "Investimento", ou "Outros"

EXEMPLO DE SAÍDA:
[
  { "descricao": "Aluguel", "valor": 1200.0, "tipo": "Saída", "data": "${yearToUse}-04-10", "categoria": "Moradia" },
  { "descricao": "Freelance João", "valor": 800.0, "tipo": "Entrada", "data": "${yearToUse}-04-15", "categoria": "Recebimento" }
]

Retorne APENAS o JSON puro. Sem markdown, sem \`\`\`json. Array vazio [] se nada encontrado.`;

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
       throw new Error("Falha ao ler JSON da resposta: " + responseText.substring(0, 200));
    }

    return NextResponse.json({ transactions: parsedData });
  } catch (error: any) {
    console.error('Text Parsing Error:', error);
    return NextResponse.json({ error: error.message || 'Falha ao processar texto com IA' }, { status: 500 });
  }
}
