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

    const systemPrompt = `Você é um assistente financeiro ultra-preciso que extrai transações de textos informais brasileiros.

O usuário vai enviar um bloco de texto contendo transações financeiras organizadas por mês. Extraia TODAS as transações individuais e retorne um array JSON.

REGRAS OBRIGATÓRIAS:
1. "descricao": Nome curto de quem pagou/recebeu ou do serviço. Máximo 4 palavras. Capitalizado. Remova emojis.
2. "valor": Número decimal positivo. "R$ 1.500,00" → 1500.0, "R$45,90" → 45.9, "350" → 350.0. SEMPRE positivo.
3. "tipo": EXATAMENTE "Entrada" ou "Saída":
   - Seções com 📥, "Entradas", "Receitas", "recebido", "salário", "freelance" → "Entrada"
   - Seções com 📤, "Saídas", "Despesas", "Gastos", "paguei", "fatura", "aluguel" → "Saída"
4. "data": String "YYYY-MM-DD". Use o contexto do mês na seção:
   - "(10/04)" → "${yearToUse}-04-10"
   - "(17/05)" → "${yearToUse}-05-17"
   - Se diz "05 de abril" → "${yearToUse}-04-05"
   - Se não há data, use o mês da seção atual
5. "categoria": Categorize: "Moradia", "Alimentação", "Transporte", "Saúde", "Lazer", "Serviços", "Educação", "Recebimento", "Investimento", "Dívida", ou "Outros"
6. "recorrencia": Detecte pelo contexto:
   - Se marcado "UNICA", "ÚNICA", "📍" → "Única"
   - Se marcado "ULTIMA", "ÚLTIMA", "⚠️" → "Única"
   - Se aparece apenas 1 vez em todos os meses → "Única"
   - Se aparece todo mês (pessoa/serviço que repete) → "Recorrente"
   - Na dúvida → "Recorrente"

IMPORTANTE:
- IGNORE linhas de resumo/totais como "Total entradas:", "Sobra mês:", "Acumulado:", "Saldo inicial:". Extraia apenas as transações individuais.
- Se o texto cobre VÁRIOS MESES, extraia TODAS as transações de TODOS os meses.
- NÃO duplique transações. Cada bullet point = 1 transação.

EXEMPLO:
[
  { "descricao": "Junior", "valor": 1000.0, "tipo": "Entrada", "data": "${yearToUse}-04-10", "categoria": "Recebimento", "recorrencia": "Recorrente" },
  { "descricao": "IPVA", "valor": 1032.0, "tipo": "Saída", "data": "${yearToUse}-04-15", "categoria": "Transporte", "recorrencia": "Única" }
]

Retorne APENAS o JSON puro. Sem markdown, sem \`\`\`json. Array vazio [] se nada encontrado.`;

    // Retry up to 3 times with exponential backoff for 503 errors
    let lastError: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
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
      } catch (e: any) {
        lastError = e;
        const msg = e?.message || '';
        const is503 = msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('overloaded') || msg.includes('high demand');
        if (is503 && attempt < 2) {
          await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
          continue;
        }
        throw e;
      }
    }

    throw lastError;
  } catch (error: any) {
    console.error('Text Parsing Error:', error);
    const msg = error?.message || '';
    if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('overloaded')) {
      return NextResponse.json({ error: 'A IA está sobrecarregada no momento. Tente novamente em alguns segundos.' }, { status: 503 });
    }
    return NextResponse.json({ error: error.message || 'Falha ao processar texto com IA' }, { status: 500 });
  }
}
