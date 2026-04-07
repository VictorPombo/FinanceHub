import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(req: NextRequest) {
  try {
    const { userId, dadosFinanceiros } = await req.json();

    // Requires a gemini API key (Free Tier available at Google AI Studio)
    if (!process.env.GEMINI_API_KEY) {
       console.log("No GEMINI_API_KEY, mimicking response for now.");
       return NextResponse.json({
          response: "📌 Ação para hoje: Configure sua chave GEMINI_API_KEY gratuita no painel para desbloquear meus conselhos avançados! No momento vejo que você teve movimentações, então revise seus gastos."
       });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const systemPrompt = `Você é um consultor financeiro pessoal especializado em finanças pessoais brasileiras. Seu nome é Finn. Você analisa dados reais de extrato bancário, lançamentos manuais e padrões de comportamento financeiro do usuário.

SEU PERFIL:
- Direto, sem enrolação
- Usa linguagem simples (sem jargão técnico)
- Sempre termina com 1 ação concreta que o usuário pode tomar hoje
- Nunca julga os gastos — apenas apresenta os números e consequências
- Quando o mês está bom, aproveita para preparar o próximo
- Quando o mês está ruim, foca no que é controlável agora

REGRAS DE ANÁLISE:
1. Sempre compare o mês atual com a média dos últimos 3 meses
2. Classifique despesas em: fixas (condomínio, IPVA, fatura), variáveis controláveis (lazer) e não controláveis (emergências)
3. Calcule o "índice de fôlego": (receita - despesas_fixas) / receita × 100 — abaixo de 20% = zona de risco
4. Identifique o "vazamento silencioso": pequenos gastos
5. Sugira valores claros de antecipação se sobrar dinheiro e o próximo mês estiver pesado.

FORMATO DE RESPOSTA:
- Comece com 1 linha de diagnóstico direto
- Máximo 3 insights
- Termine com "📌 Ação para hoje: [ação]"
- Se antecipação: 💰 Aproveite agora: [valor] → [o que pagar] → sobra [valor]`;

    const promptText = `${systemPrompt}\n\nDADOS DISPONÍVEIS:\n${JSON.stringify(dadosFinanceiros)}\n\nPor favor, analise meu comportamento financeiro baseado nos dados fornecidos e gere seus conselhos.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: promptText,
    });

    return NextResponse.json({ response: response.text });
  } catch (err: any) {
    console.error("Erro Ask Finn Gemini:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
