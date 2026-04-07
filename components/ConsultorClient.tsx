"use client";

import { useState, useMemo } from "react";
import { formatCurrency, getMesAnoKey } from "@/lib/types";
import { 
  PiggyBank, ArrowDownWideNarrow, TrendingUp, AlertTriangle, 
  ShoppingCart, ShieldAlert, Award, Bot, PencilLine,
  Gauge, Calendar, ListOrdered, Repeat, Zap, Target, 
  ArrowUpRight, ArrowDownRight, Minus, BarChart3, Percent
} from "lucide-react";

interface Props {
  lancamentos: any[];
  dudaLancamentos: any[];
  iaLancamentos: any[];
  dividas: any[];
  config: { saldo_inicial: number } | null;
  lancPrevistos: any[];
}

type TabType = "Planilha Manual" | "Planilha IA";

export default function ConsultorClient({ lancamentos, dudaLancamentos, iaLancamentos, dividas, config, lancPrevistos }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("Planilha Manual");
  
  const dataDeHoje = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(0); // 0 = Todos
  const [selectedYear, setSelectedYear] = useState<number>(dataDeHoje.getFullYear());

  // Strict separation: each tab renders its own universe
  const allData = useMemo(() => {
    switch(activeTab) {
      case "Planilha Manual": return [...lancamentos];
      case "Planilha IA": return [...iaLancamentos];
    }
  }, [activeTab, lancamentos, iaLancamentos]);

  const d = dividas || [];
  const saldo_inicial = config?.saldo_inicial || 0;

  // Filter by selected month/year (0 = all months)
  const lancFiltered = useMemo(() => {
    if (selectedMonth === 0) return allData;
    const mesKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    return allData.filter(x => getMesAnoKey(x.data) === mesKey);
  }, [allData, selectedMonth, selectedYear]);

  // Previous month data for comparison
  const prevData = useMemo(() => {
    if (selectedMonth === 0) return [];
    const d = new Date(selectedYear, selectedMonth - 1, 1);
    d.setMonth(d.getMonth() - 1);
    const prevKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return allData.filter(x => getMesAnoKey(x.data) === prevKey);
  }, [allData, selectedMonth, selectedYear]);

  // ===== CORE METRICS =====
  const entradas = lancFiltered.filter(x => x.tipo === 'Entrada').reduce((a,b) => a + Number(b.valor), 0);
  const saidas = Math.abs(lancFiltered.filter(x => x.tipo === 'Saída').reduce((a,b) => a + Number(b.valor), 0));
  const sobra = entradas - saidas;
  const percComprometida = entradas > 0 ? (saidas / entradas) * 100 : 0;

  const entradasPrev = prevData.filter(x => x.tipo === 'Entrada').reduce((a,b) => a + Number(b.valor), 0);
  const saidasPrev = Math.abs(prevData.filter(x => x.tipo === 'Saída').reduce((a,b) => a + Number(b.valor), 0));
  const sobraPrev = entradasPrev - saidasPrev;

  // Total historical
  const totalEntradasAll = allData.filter(x => x.tipo === 'Entrada').reduce((a,b) => a + Number(b.valor), 0);
  const totalSaidasAll = Math.abs(allData.filter(x => x.tipo === 'Saída').reduce((a,b) => a + Number(b.valor), 0));
  const acumuladoGeral = Number(saldo_inicial) + totalEntradasAll - totalSaidasAll;

  // ===== NEW: Top 5 Gastos =====
  const top5Gastos = [...lancFiltered]
    .filter(x => x.tipo === 'Saída')
    .sort((a,b) => Math.abs(Number(b.valor)) - Math.abs(Number(a.valor)))
    .slice(0, 5);

  // ===== NEW: Category Breakdown =====
  const categoriasMap = useMemo(() => {
    const map: Record<string, { entradas: number; saidas: number; count: number }> = {};
    lancFiltered.forEach(l => {
      const cat = l.categoria || 'Outros';
      if (!map[cat]) map[cat] = { entradas: 0, saidas: 0, count: 0 };
      map[cat].count++;
      if (l.tipo === 'Entrada') map[cat].entradas += Number(l.valor);
      else map[cat].saidas += Math.abs(Number(l.valor));
    });
    return Object.entries(map)
      .map(([nome, vals]) => ({ nome, ...vals, total: vals.saidas > 0 ? vals.saidas : vals.entradas }))
      .sort((a,b) => b.total - a.total);
  }, [lancFiltered]);

  // ===== NEW: Recurring vs One-time =====
  const gastosRecorrentes = Math.abs(lancFiltered.filter(x => x.tipo === 'Saída' && x.recorrencia === 'Recorrente').reduce((a,b) => a + Number(b.valor), 0));
  const gastosUnicos = Math.abs(lancFiltered.filter(x => x.tipo === 'Saída' && x.recorrencia !== 'Recorrente').reduce((a,b) => a + Number(b.valor), 0));
  const percRecorrente = saidas > 0 ? (gastosRecorrentes / saidas) * 100 : 0;

  // ===== NEW: Daily average spending =====
  const diasUnicos = new Set(lancFiltered.filter(x => x.tipo === 'Saída').map(x => x.data)).size;
  const mediaDiaria = diasUnicos > 0 ? saidas / diasUnicos : 0;

  // ===== NEW: Savings rate =====
  const taxaPoupanca = entradas > 0 ? (sobra / entradas) * 100 : 0;

  // ===== NEW: Total transactions =====
  const totalTransacoes = lancFiltered.length;
  const transacoesEntrada = lancFiltered.filter(x => x.tipo === 'Entrada').length;
  const transacoesSaida = lancFiltered.filter(x => x.tipo === 'Saída').length;

  // ===== BIGGER ENTRY =====
  const maiorGasto = top5Gastos[0] || null;
  const maiorEntrada = [...lancFiltered].filter(x => x.tipo === 'Entrada').sort((a,b) => Number(b.valor) - Number(a.valor))[0] || null;

  // ===== Renda Extra (one-time entries) =====
  const rendaExtraCount = lancFiltered.filter(x => x.tipo === 'Entrada' && x.recorrencia === 'Única').reduce((a,b) => a + Number(b.valor), 0);
  const gastosUnicosMesCount = lancFiltered.filter(x => x.tipo === 'Saída' && x.recorrencia === 'Única').length;

  // ===== Alimentação =====
  const gastosAli = Math.abs(lancFiltered.filter(x => x.categoria?.toLowerCase() === 'alimentação').reduce((a,b) => a + Number(b.valor), 0));
  const percAlimentacao = entradas > 0 ? (gastosAli / entradas) * 100 : 0;

  // ===== Projeção =====
  const lancPrevAtual = selectedMonth === 0 ? (lancPrevistos || []) : (lancPrevistos || []).filter(x => getMesAnoKey(x.data) === `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`);
  const entPrevAtual = lancPrevAtual.filter(x => x.tipo === 'Entrada').reduce((a,b) => a + Number(b.valor), 0);
  const saiPrevAtual = Math.abs(lancPrevAtual.filter(x => x.tipo === 'Saída').reduce((a,b) => a + Number(b.valor), 0));
  const projecaoFinal = sobra + entPrevAtual - saiPrevAtual;

  // ===== SCORE =====
  let score = 0;
  if (percComprometida < 50) score += 25;
  else if (percComprometida <= 70) score += 15;
  if (sobra > sobraPrev && selectedMonth !== 0) score += 20;
  else if (selectedMonth === 0 && sobra > 0) score += 20;
  if (rendaExtraCount > 0) score += 15;
  if (gastosUnicosMesCount <= 2) score += 15;
  const atrasados = d.filter(dl => dl.status === 'Atrasado');
  if (atrasados.length === 0) score += 25;

  let classifText = "", classifColor = "", barColor = "";
  if (score >= 80) { classifText = "EXCELENTE"; classifColor = "text-emerald-400"; barColor = "bg-emerald-500"; }
  else if (score >= 60) { classifText = "BOM"; classifColor = "text-blue-400"; barColor = "bg-blue-500"; }
  else if (score >= 40) { classifText = "REGULAR"; classifColor = "text-amber-400"; barColor = "bg-amber-400"; }
  else { classifText = "CRÍTICO"; classifColor = "text-red-500"; barColor = "bg-red-500"; }

  // ===== CONSELHOS =====
  const conselhos: { title: string; desc: string; color: string; icon: React.ReactNode }[] = [];
  
  const vezesReserva = saidas > 0 ? (acumuladoGeral / saidas) : 0;
  if (vezesReserva < 3) {
    conselhos.push({ title: "Reserva de Emergência", desc: `Seu capital cobre apenas ${vezesReserva.toFixed(1)} meses de despesas. O ideal são 6+. Corte gastos não essenciais.`, color: "border-l-red-500", icon: <ShieldAlert className="w-5 text-red-500"/> });
  } else if (vezesReserva <= 6) {
    conselhos.push({ title: "Reserva em Construção", desc: `Capital cobre ${vezesReserva.toFixed(1)} meses. Alvo: 6 meses. Continue economizando.`, color: "border-l-amber-500", icon: <ShieldAlert className="w-5 text-amber-500"/> });
  } else {
    conselhos.push({ title: "Reserva Saudável", desc: `Reserva cobre ${vezesReserva.toFixed(1)} meses! Considere investimentos estruturados.`, color: "border-l-emerald-500", icon: <ShieldAlert className="w-5 text-emerald-500"/> });
  }

  if (percRecorrente > 70) {
    conselhos.push({ title: "Gastos Fixos Elevados", desc: `${percRecorrente.toFixed(0)}% das despesas são recorrentes. Renegocie contratos ou cancele assinaturas.`, color: "border-l-red-500", icon: <Repeat className="w-5 text-red-500"/> });
  } else if (percRecorrente >= 50) {
    conselhos.push({ title: "Gastos Fixos Moderados", desc: `${percRecorrente.toFixed(0)}% das despesas são fixas. Margem limitada para imprevistos.`, color: "border-l-amber-500", icon: <Repeat className="w-5 text-amber-500"/> });
  } else {
    conselhos.push({ title: "Gastos Fixos Controlados", desc: `Apenas ${percRecorrente.toFixed(0)}% fixos. Flexibilidade financeira saudável.`, color: "border-l-emerald-500", icon: <Repeat className="w-5 text-emerald-500"/> });
  }

  if (selectedMonth !== 0 && sobraPrev !== 0) {
    if (sobra > (sobraPrev * 1.05)) {
      conselhos.push({ title: "Tendência Positiva", desc: `Sobra cresceu ${formatCurrency(sobra - sobraPrev)} vs mês anterior. Mantenha o ritmo.`, color: "border-l-emerald-500", icon: <TrendingUp className="w-5 text-emerald-500"/> });
    } else if (sobra >= (sobraPrev * 0.95)) {
      conselhos.push({ title: "Estabilidade", desc: "Gastos estáveis frente ao mês anterior. Bom controle.", color: "border-l-blue-500", icon: <TrendingUp className="w-5 text-blue-500"/> });
    } else {
      conselhos.push({ title: "Tendência Negativa", desc: `Sobra caiu ${formatCurrency(sobraPrev - sobra)} vs mês anterior. Investigue as causas.`, color: "border-l-red-500", icon: <TrendingUp className="w-5 text-red-500"/> });
    }
  }

  if (taxaPoupanca >= 20) {
    conselhos.push({ title: "Taxa de Poupança Excelente", desc: `Você está poupando ${taxaPoupanca.toFixed(1)}% da renda. Padrão investidor!`, color: "border-l-emerald-500", icon: <Target className="w-5 text-emerald-500"/> });
  } else if (taxaPoupanca >= 10) {
    conselhos.push({ title: "Taxa de Poupança OK", desc: `${taxaPoupanca.toFixed(1)}% poupado. O ideal é 20%+. Revisite gastos secundários.`, color: "border-l-amber-500", icon: <Target className="w-5 text-amber-500"/> });
  } else if (taxaPoupanca >= 0) {
    conselhos.push({ title: "Poupança Crítica", desc: `Apenas ${taxaPoupanca.toFixed(1)}% poupado. Risco alto para emergências.`, color: "border-l-red-500", icon: <Target className="w-5 text-red-500"/> });
  }

  if (gastosUnicosMesCount > 5) {
    conselhos.push({ title: "Gastos de Impulso", desc: `${gastosUnicosMesCount} saídas pontuais detectadas. Avalie se foram planejadas.`, color: "border-l-red-500", icon: <ShoppingCart className="w-5 text-red-500"/> });
  } else if (gastosUnicosMesCount > 2) {
    conselhos.push({ title: "Gastos Pontuais Moderados", desc: `${gastosUnicosMesCount} saídas únicas. Mantenha o controle.`, color: "border-l-amber-500", icon: <ShoppingCart className="w-5 text-amber-500"/> });
  } else {
    conselhos.push({ title: "Controle de Impulso", desc: "Excelente controle sobre gastos pontuais.", color: "border-l-emerald-500", icon: <ShoppingCart className="w-5 text-emerald-500"/> });
  }

  if (percAlimentacao > 25) {
    conselhos.push({ title: "Alimentação Elevada", desc: `Custos com alimentação em ${percAlimentacao.toFixed(0)}% da renda (ideal: <20%).`, color: "border-l-red-500", icon: <PiggyBank className="w-5 text-red-500"/> });
  } else if (percAlimentacao > 15) {
    conselhos.push({ title: "Alimentação OK", desc: `${percAlimentacao.toFixed(0)}% da renda em alimentação. Dentro da faixa saudável.`, color: "border-l-emerald-500", icon: <PiggyBank className="w-5 text-emerald-500"/> });
  }

  if (atrasados.length > 0) {
    conselhos.push({ title: "Dívidas em Atraso", desc: `Você tem ${atrasados.length} dívida(s) atrasada(s). Regularize para evitar juros.`, color: "border-l-red-500", icon: <AlertTriangle className="w-5 text-red-500"/> });
  }

  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const periodoLabel = selectedMonth === 0 ? `Todo ${selectedYear}` : `${meses[selectedMonth - 1]}/${selectedYear}`;

  // Trend arrow helper
  const TrendArrow = ({ current, previous }: { current: number; previous: number }) => {
    if (selectedMonth === 0 || previous === 0) return null;
    const diff = ((current - previous) / Math.abs(previous)) * 100;
    if (diff > 2) return <span className="flex items-center gap-0.5 text-[10px] text-emerald-400 font-bold"><ArrowUpRight className="w-3 h-3"/> +{diff.toFixed(0)}%</span>;
    if (diff < -2) return <span className="flex items-center gap-0.5 text-[10px] text-red-400 font-bold"><ArrowDownRight className="w-3 h-3"/> {diff.toFixed(0)}%</span>;
    return <span className="flex items-center gap-0.5 text-[10px] text-slate-500 font-bold"><Minus className="w-3 h-3"/> Estável</span>;
  };

  return (
    <div className="flex flex-col h-full bg-[#020617] overflow-y-auto w-full pb-20 md:pb-0">
      {/* HEADER */}
      <div className="bg-gradient-to-b from-[#0F172A] to-transparent p-6 pb-4 w-full shrink-0 relative z-20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto">
           <div>
              <h1 className="text-white font-black text-xl md:text-2xl flex items-center gap-3 tracking-tight">
                <Gauge className="w-6 h-6 text-purple-400"/>
                Consultor Financeiro IA
              </h1>
              <p className="text-slate-500 text-xs md:text-sm mt-1 font-medium">Análise cognitiva em tempo real · <span className={classifColor}>{periodoLabel}</span></p>
           </div>
           
           <div className="flex items-center gap-2 flex-wrap">
             <div className="flex items-center bg-slate-900/80 rounded-xl p-1 border border-slate-800 shadow-inner">
                <select 
                  value={selectedMonth} 
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="bg-transparent text-slate-200 font-bold outline-none px-2 py-1.5 text-sm cursor-pointer"
                >
                  <option value={0} className="bg-slate-900">Todos</option>
                  {meses.map((m, i) => <option key={i} value={i+1} className="bg-slate-900">{m}</option>)}
                </select>
                <select 
                  value={selectedYear} 
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  className="bg-transparent text-slate-200 font-bold outline-none px-2 py-1.5 text-sm border-l border-slate-700 cursor-pointer"
                >
                  {[2024,2025,2026,2027].map(y => <option key={y} value={y} className="bg-slate-900">{y}</option>)}
                </select>
             </div>
           </div>
        </div>
        
        {/* TABS */}
        <div className="flex items-center gap-2 mt-5 overflow-x-auto no-scrollbar pb-1 max-w-7xl mx-auto">
          {([
            { key: "Planilha Manual" as TabType, icon: <PencilLine className="w-4 h-4"/>, label: "Planilha Manual" },
            { key: "Planilha IA" as TabType, icon: <Bot className="w-4 h-4"/>, label: "Planilha IA" },
          ]).map(tab => (
            <button 
              key={tab.key}
              onClick={() => setActiveTab(tab.key)} 
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === tab.key ? 'bg-purple-600/15 text-purple-400 border border-purple-500/30 shadow-[0_0_15px_rgba(147,51,234,0.15)]' : 'text-slate-500 bg-slate-900/50 border border-transparent hover:text-slate-300'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
          <span className="text-[10px] text-slate-600 font-medium ml-2 whitespace-nowrap">
            {totalTransacoes} transações · {periodoLabel}
          </span>
        </div>
      </div>

      <div className="p-4 md:p-8 flex flex-col xl:flex-row-reverse gap-6 mx-auto w-full max-w-7xl">
        
        {/* THERMOMETER + STATS SIDEBAR */}
        <div className="w-full xl:w-80 flex flex-col gap-4 shrink-0 z-10 relative">
          {/* Score */}
          <div className="glass-card p-6 md:p-8 flex flex-col items-center justify-center text-center xl:sticky top-6">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Termômetro Financeiro</h3>
            
            <div className={`text-6xl md:text-7xl font-black font-mono mb-2 mt-4 tracking-tighter ${classifColor}`}>
              {score}
            </div>
            
            <div className={`text-sm font-black mb-6 ${classifColor} tracking-[0.15em] uppercase`}>
              {classifText}
            </div>

            <div className="w-full bg-slate-900 rounded-full h-3 relative overflow-hidden shadow-inner border border-slate-800">
              <div className={`h-full rounded-full transition-all duration-1000 ease-out ${barColor}`} style={{ width: `${score}%` }}></div>
            </div>
            <div className="w-full flex justify-between text-[10px] uppercase font-bold text-slate-600 mt-2 tracking-wider">
              <span>Crítico</span>
              <span>Excelente</span>
            </div>
          </div>

          {/* Quick stats */}
          <div className="glass-card p-4 flex flex-col gap-3">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">⚡ Métricas Rápidas</h3>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400 font-medium">Taxa de Poupança</span>
              <span className={`text-xs font-mono font-black ${taxaPoupanca >= 20 ? 'text-emerald-400' : taxaPoupanca >= 0 ? 'text-amber-400' : 'text-red-400'}`}>{taxaPoupanca.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400 font-medium">Média Diária (Gastos)</span>
              <span className="text-xs font-mono font-black text-red-400">{formatCurrency(mediaDiaria)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400 font-medium">Fixos vs Variáveis</span>
              <span className="text-xs font-mono font-black text-slate-200">{percRecorrente.toFixed(0)}% / {(100 - percRecorrente).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400 font-medium">Transações</span>
              <span className="text-xs font-mono font-bold text-slate-300">{transacoesEntrada}↑ {transacoesSaida}↓</span>
            </div>
            {selectedMonth !== 0 && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-400 font-medium">vs Mês Anterior</span>
                <TrendArrow current={sobra} previous={sobraPrev} />
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-5">
          {/* KPI GRID */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            
            <div className={`glass-card p-4 md:p-5 border-l-4 ${sobra >= 0 ? 'border-l-emerald-500' : 'border-l-rose-500'}`}>
               <h3 className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-2">Situação {selectedMonth === 0 ? 'Anual' : 'do Mês'}</h3>
               <span className={`text-xl md:text-2xl font-black font-mono tracking-tight ${sobra >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                 {formatCurrency(sobra)}
               </span>
               {selectedMonth !== 0 && <div className="mt-1"><TrendArrow current={sobra} previous={sobraPrev} /></div>}
            </div>

            <div className={`glass-card p-4 md:p-5 border-l-4 ${percComprometida < 50 ? 'border-l-emerald-500' : percComprometida <= 70 ? 'border-l-amber-500' : 'border-l-rose-500'}`}>
               <h3 className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-2">Renda Comprometida</h3>
               <span className="text-xl md:text-2xl font-black font-mono tracking-tight text-slate-200">{percComprometida.toFixed(1)}%</span>
               <p className="text-[10px] text-slate-400 mt-1.5 font-bold">
                 {percComprometida < 50 && "🟢 Saudável"}
                 {percComprometida >= 50 && percComprometida <= 70 && "🟡 Atenção"}
                 {percComprometida > 70 && "🔴 Alerta"}
               </p>
            </div>

            <div className="glass-card p-4 md:p-5 border-l-4 border-l-blue-500">
               <h3 className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-2">Maior Saída</h3>
               {maiorGasto ? (
                 <>
                  <span className="text-sm font-bold text-slate-300 truncate block mb-1">{maiorGasto.descricao}</span>
                  <span className="text-red-400 font-mono font-black text-lg">{formatCurrency(Math.abs(Number(maiorGasto.valor)))}</span>
                 </>
               ) : <span className="text-slate-500 italic text-sm">Sem registros</span>}
            </div>

            <div className="glass-card p-4 md:p-5 border-l-4 border-l-purple-500">
               <h3 className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-2">Maior Entrada</h3>
               {maiorEntrada ? (
                 <>
                  <span className="text-sm font-bold text-slate-300 truncate block mb-1">{maiorEntrada.descricao}</span>
                  <span className="text-emerald-400 font-mono font-black text-lg">{formatCurrency(Math.abs(Number(maiorEntrada.valor)))}</span>
                 </>
               ) : <span className="text-slate-500 italic text-sm">Sem registros</span>}
            </div>

            <div className="glass-card p-4 md:p-5 border-l-4 border-l-indigo-500">
               <h3 className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-2">Evolução</h3>
               <span className="text-sm font-black text-slate-200 leading-tight block mt-1">
                 {selectedMonth !== 0 ? ((sobra - sobraPrev) > 0 ? `+${formatCurrency(sobra - sobraPrev)}` : formatCurrency(sobra - sobraPrev)) : formatCurrency(sobra)}
               </span>
               <p className="text-[10px] text-slate-500 mt-1 font-medium">
                 {selectedMonth !== 0 ? "vs mês anterior" : "resultado líquido do ano"}
               </p>
            </div>

            <div className="glass-card p-4 md:p-5 border-l-4 border-l-teal-500">
               <h3 className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-2">Fechamento Previsto</h3>
               <span className="text-xl font-black font-mono tracking-tight text-slate-200">{formatCurrency(projecaoFinal)}</span>
               <p className="text-[10px] text-slate-500 font-medium mt-0.5">{projecaoFinal > 0 ? "No azul" : "Atenção máxima"}</p>
            </div>
            
          </div>

          {/* TOP 5 GASTOS */}
          {top5Gastos.length > 0 && (
            <div>
              <div className="bg-slate-900/60 px-5 py-3 rounded-t-xl border border-slate-800/60 border-b-0 flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-red-400"/>
                <h2 className="text-white font-black text-xs uppercase tracking-[0.15em]">Top 5 Maiores Gastos</h2>
              </div>
              <div className="glass-card rounded-t-none flex flex-col divide-y divide-slate-800/40">
                {top5Gastos.map((g, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-black text-slate-600 w-5">{i+1}.</span>
                      <div className="min-w-0">
                        <span className="text-sm font-bold text-slate-200 truncate block">{g.descricao}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{g.data} · {g.categoria || 'Outros'}</span>
                      </div>
                    </div>
                    <span className="text-red-400 font-mono font-black text-sm whitespace-nowrap ml-3">{formatCurrency(Math.abs(Number(g.valor)))}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CATEGORY BREAKDOWN */}
          {categoriasMap.length > 0 && (
            <div>
              <div className="bg-slate-900/60 px-5 py-3 rounded-t-xl border border-slate-800/60 border-b-0 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-400"/>
                <h2 className="text-white font-black text-xs uppercase tracking-[0.15em]">Gastos por Categoria</h2>
              </div>
              <div className="glass-card rounded-t-none p-4">
                <div className="flex flex-col gap-3">
                  {categoriasMap.filter(c => c.saidas > 0).slice(0, 8).map((cat, i) => {
                    const pct = saidas > 0 ? (cat.saidas / saidas) * 100 : 0;
                    return (
                      <div key={i}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-300">{cat.nome}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-bold">{pct.toFixed(1)}%</span>
                            <span className="text-xs font-mono font-black text-red-400">{formatCurrency(cat.saidas)}</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-700" style={{ width: `${Math.min(pct, 100)}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* CONSELHOS */}
          <div>
            <div className="bg-slate-900/60 px-5 py-3 rounded-t-xl border border-slate-800/60 border-b-0 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400"/>
              <h2 className="text-white font-black text-xs uppercase tracking-[0.15em]">💡 Avaliação de Riscos ({conselhos.length})</h2>
            </div>
            <div className="flex flex-col gap-3 mt-0">
              {conselhos.map((c, i) => (
                <div key={i} className={`glass-card p-4 border-l-4 ${c.color} flex items-start gap-3`}>
                  <div className="p-2 bg-slate-800/50 rounded-xl shadow-inner mt-0.5 shrink-0">{c.icon}</div>
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-slate-200 text-sm mb-0.5 tracking-tight">{c.title}</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
