import { createClient } from '@supabase/supabase-js';

// Aux function to sort and group data by month
const getMesAnoKey = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

export async function analyzeFinancialAlerts(userId: string) {
  // Use a Service Role Key or require Auth token for the request
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // Fetch from both sources
  const { data: lancamentos } = await supabase.from('lancamentos').select('*').eq('user_id', userId);
  const { data: duda } = await supabase.from('duda_lancamentos').select('*').eq('user_id', userId);
  
  const allData = [...(lancamentos || []), ...(duda || [])].filter(x => x.status === 'Pago' || typeof x.status === 'undefined');

  // We need to look at last 3 months + current month + projected next month
  const now = new Date();
  const currentKey = getMesAnoKey(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`);
  
  const date3MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1); // 0, -1, -2 = 3 months
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthKey = getMesAnoKey(`${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth()+1).padStart(2,'0')}-01`);

  // Group
  const grouped: Record<string, { entradas: number; saidas: number; recorrentes: number; items: any[] }> = {};
  
  allData.forEach((item: any) => {
    const key = getMesAnoKey(item.data);
    if (!grouped[key]) grouped[key] = { entradas: 0, saidas: 0, recorrentes: 0, items: [] };
    grouped[key].items.push(item);
    if (item.tipo === 'Entrada') {
      grouped[key].entradas += Number(item.valor);
    } else {
      grouped[key].saidas += Math.abs(Number(item.valor));
      if (item.recorrente) {
          grouped[key].recorrentes += Math.abs(Number(item.valor));
      }
    }
  });

  const alerts = [];

  // Mês atual stats
  const curStats = grouped[currentKey] || { entradas: 0, saidas: 0, recorrentes: 0, items: [] };
  const nextStats = grouped[nextMonthKey] || { entradas: 0, saidas: 0, recorrentes: 0, items: [] };
  
  // Calculate average of the 3 months (if exist)
  let sumReceitas3M = 0;
  let monthsCount = 0;
  for (let i = 0; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = getMesAnoKey(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`);
    if (grouped[k] && grouped[k].entradas > 0) {
      sumReceitas3M += grouped[k].entradas;
      monthsCount++;
    }
  }
  const rendaMedia = monthsCount > 0 ? sumReceitas3M / monthsCount : curStats.entradas;
  const sobraAtual = curStats.entradas - curStats.saidas;

  // ALERTA 1: FOLGA FINANCEIRA
  if (curStats.entradas > curStats.saidas && sobraAtual >= (curStats.entradas * 0.3) && curStats.entradas > 0) {
    if (nextStats.recorrentes >= (rendaMedia * 0.8) && rendaMedia > 0) {
      const valorSugerido = Math.floor(nextStats.saidas * 0.4);
      alerts.push({
        tipo_alerta: 'folga',
        mes_referencia: currentKey,
        valor_sugerido: valorSugerido,
        titulo: 'Oportunidade: Folga Financeira',
        descricao: `Você teve um mês forte! Se antecipar R$ ${valorSugerido} das contas do mês que vem agora, o próximo mês será muito mais tranquilo.`
      });
    }
  }

  // ALERTA 2: MÊS CRÍTICO À VISTA
  const projectedSobraNext = (grouped[currentKey]?.entradas || rendaMedia) - nextStats.saidas; // very rough projection
  if (rendaMedia > 0 && projectedSobraNext < (rendaMedia * 0.15) && nextStats.saidas > 0) {
     alerts.push({
        tipo_alerta: 'critico',
        mes_referencia: nextMonthKey,
        valor_sugerido: null,
        titulo: 'Atenção: Mês Crítico à Vista',
        descricao: `Sua projeção para o próximo mês indica saldo apertado. Corte gastos supérfluos hoje.`
     });
  }

  // ALERTA 3: PADRÃO ACELERADO
  const todayDate = now.getDate();
  if (todayDate <= 15) {
     let sumEarlyPrev = 0;
     let prevCount = 0;
     for (let i = 1; i <= 2; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const k = getMesAnoKey(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`);
        if (grouped[k]) {
            const earlyGastos = grouped[k].items.filter(x => x.tipo === 'Saída' && new Date(x.data + 'T00:00:00').getDate() <= 15)
                                              .reduce((a,b) => a + Math.abs(Number(b.valor)), 0);
            sumEarlyPrev += earlyGastos;
            prevCount++;
        }
     }
     const avgEarly = prevCount > 0 ? sumEarlyPrev / prevCount : 0;
     const curEarly = curStats.items.filter(x => x.tipo === 'Saída' && new Date(x.data + 'T00:00:00').getDate() <= 15)
                                    .reduce((a,b) => a + Math.abs(Number(b.valor)), 0);
     
     if (avgEarly > 0 && curEarly > (avgEarly * 1.7)) {
        alerts.push({
           tipo_alerta: 'acelerado',
           mes_referencia: currentKey,
           valor_sugerido: null,
           titulo: 'Ritmo Acelerado de Gastos',
           descricao: `Seus gastos nestes primeiros ${todayDate} dias estão significativamente maiores que a média. Segure os gastos não essenciais.`
        });
     }
  }

  // ALERTA 4: CONCENTRAÇÃO DE RISCO
  if (curStats.entradas > 0) {
     const sources: Record<string, number> = {};
     curStats.items.filter(x => x.tipo === 'Entrada').forEach(x => {
        const source = x.descricao || 'Outros';
        sources[source] = (sources[source] || 0) + Number(x.valor);
     });
     for (const [s, val] of Object.entries(sources)) {
         if (val > (curStats.entradas * 0.6)) {
             alerts.push({
                 tipo_alerta: 'concentracao',
                 mes_referencia: currentKey,
                 valor_sugerido: null,
                 titulo: 'Risco de Concentração',
                 descricao: `Mais de 60% da sua receita do mês vem de "${s}". Concentrar ganhos em uma só fonte aumenta o risco financeiro.`
             });
             break;
         }
     }
  }

  // ALERTA 5: EVOLUÇÃO NEGATIVA
  const prev1Key = getMesAnoKey(`${new Date(now.getFullYear(), now.getMonth()-1, 1).getFullYear()}-${String(new Date(now.getFullYear(), now.getMonth()-1, 1).getMonth()+1).padStart(2,'0')}-01`);
  const prev2Key = getMesAnoKey(`${new Date(now.getFullYear(), now.getMonth()-2, 1).getFullYear()}-${String(new Date(now.getFullYear(), now.getMonth()-2, 1).getMonth()+1).padStart(2,'0')}-01`);
  
  const sobraP1 = (grouped[prev1Key]?.entradas || 0) - (grouped[prev1Key]?.saidas || 0);
  const sobraP2 = (grouped[prev2Key]?.entradas || 0) - (grouped[prev2Key]?.saidas || 0);

  if (sobraAtual < sobraP1 && sobraP1 < sobraP2 && curStats.saidas > 0) {
      alerts.push({
          tipo_alerta: 'evolucao',
          mes_referencia: currentKey,
          valor_sugerido: null,
          titulo: 'Evolução Patrimonial Negativa',
          descricao: `Sua sobra no final do mês vem caindo nos últimos 2 meses. Tente estipular uma meta de corte para o próximo ciclo.`
      });
  }

  // Atualizar banco
  if (alerts.length > 0) {
      // Remover antigos deste mês para não duplicar infinitamente, exceto se tomou ação
      await supabase.from('finn_insights').delete().eq('user_id', userId).eq('acao_tomada', false);
      
      const inserts = alerts.map(a => ({
          ...a,
          user_id: userId
      }));
      await supabase.from('finn_insights').insert(inserts);
  }

  return alerts;
}
