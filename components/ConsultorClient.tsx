"use client";

import { useState, useMemo } from "react";
import { formatCurrency, getMesAnoKey } from "@/lib/types";
import { 
  PiggyBank, ArrowDownWideNarrow, TrendingUp, AlertTriangle, 
  ShoppingCart, ShieldAlert, Award, Bot, PencilLine,
  Globe, Gauge
} from "lucide-react";

interface Props {
  lancamentos: any[];
  dudaLancamentos: any[];
  iaLancamentos: any[];
  dividas: any[];
  config: { saldo_inicial: number } | null;
  lancPrevistos: any[];
}

type TabType = "Geral" | "Lançamentos" | "Uploads IA";

export default function ConsultorClient({ lancamentos, dudaLancamentos, iaLancamentos, dividas, config, lancPrevistos }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("Geral");
  
  const dataDeHoje = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(dataDeHoje.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(dataDeHoje.getFullYear());

  const l = useMemo(() => {
    switch(activeTab) {
      case "Geral": return [...lancamentos, ...iaLancamentos];
      case "Lançamentos": return [...lancamentos];
      case "Uploads IA": return [...iaLancamentos];
    }
  }, [activeTab, lancamentos, iaLancamentos]);

  const d = dividas || [];
  const saldo_inicial = config?.saldo_inicial || 0;

  const currentMesKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  
  const dataPrevia = new Date(selectedYear, selectedMonth - 1, 1);
  dataPrevia.setMonth(dataPrevia.getMonth() - 1);
  const prevMesKey = `${dataPrevia.getFullYear()}-${String(dataPrevia.getMonth() + 1).padStart(2, '0')}`;

  const lancAtual = l.filter(x => getMesAnoKey(x.data) === currentMesKey);
  const entradasAtual = lancAtual.filter(x => x.tipo === 'Entrada').reduce((a,b) => a + Number(b.valor), 0);
  const saidasAtual = Math.abs(lancAtual.filter(x => x.tipo === 'Saída').reduce((a,b) => a + Number(b.valor), 0));
  const sobraAtual = entradasAtual - saidasAtual;
  const percComprometida = entradasAtual > 0 ? (saidasAtual / entradasAtual) * 100 : 0;
  
  const maiorGasto = [...lancAtual].filter(x => x.tipo === 'Saída').sort((a,b) => Math.abs(Number(b.valor)) - Math.abs(Number(a.valor)))[0] || null;
  const rendaExtraCount = lancAtual.filter(x => x.tipo === 'Entrada' && x.recorrencia === 'Única').reduce((a,b) => a + Number(b.valor), 0);
  const gastosUnicosMesCount = lancAtual.filter(x => x.tipo === 'Saída' && x.recorrencia === 'Única').length;

  const lancPrev = l.filter(x => getMesAnoKey(x.data) === prevMesKey);
  const entradasPrev = lancPrev.filter(x => x.tipo === 'Entrada').reduce((a,b) => a + Number(b.valor), 0);
  const saidasPrev = Math.abs(lancPrev.filter(x => x.tipo === 'Saída').reduce((a,b) => a + Number(b.valor), 0));
  const sobraPrev = entradasPrev - saidasPrev;

  const totalEntradasAll = l.filter(x => x.tipo === 'Entrada').reduce((a,b) => a + Number(b.valor), 0);
  const totalSaidasAll = Math.abs(l.filter(x => x.tipo === 'Saída').reduce((a,b) => a + Number(b.valor), 0));
  const acumuladoGeral = Number(saldo_inicial) + totalEntradasAll - totalSaidasAll;

  const gastosAli = Math.abs(lancAtual.filter(x => x.categoria?.toLowerCase() === 'alimentação').reduce((a,b) => a + Number(b.valor), 0));
  const percAlimentacao = entradasAtual > 0 ? (gastosAli / entradasAtual) * 100 : 0;

  const gastosFixos = Math.abs(lancAtual.filter(x => x.tipo === 'Saída' && x.recorrencia === 'Recorrente').reduce((a,b) => a + Number(b.valor), 0));
  const percGastosFixos = entradasAtual > 0 ? (gastosFixos / entradasAtual) * 100 : 0;

  const lancPrevAtual = (lancPrevistos || []).filter(x => getMesAnoKey(x.data) === currentMesKey);
  const entPrevAtual = lancPrevAtual.filter(x => x.tipo === 'Entrada').reduce((a,b) => a + Number(b.valor), 0);
  const saiPrevAtual = Math.abs(lancPrevAtual.filter(x => x.tipo === 'Saída').reduce((a,b) => a + Number(b.valor), 0));
  const projecaoFinal = sobraAtual + entPrevAtual - saiPrevAtual;

  let score = 0;
  if (percComprometida < 50) score += 25;
  else if (percComprometida <= 70) score += 15;
  if (sobraAtual > sobraPrev) score += 20;
  if (rendaExtraCount > 0) score += 15;
  if (gastosUnicosMesCount <= 2) score += 15;
  const atrasados = d.filter(dl => dl.status === 'Atrasado');
  if (atrasados.length === 0) score += 25;

  let classifText = "", classifColor = "", classifBg = "", barColor = "";
  if (score >= 80) { classifText = "EXCELENTE"; classifColor = "text-emerald-400"; classifBg = "from-emerald-500"; barColor = "bg-emerald-500"; }
  else if (score >= 60) { classifText = "BOM"; classifColor = "text-blue-400"; classifBg = "from-blue-500"; barColor = "bg-blue-500"; }
  else if (score >= 40) { classifText = "REGULAR"; classifColor = "text-amber-400"; classifBg = "from-amber-500"; barColor = "bg-amber-400"; }
  else { classifText = "CRÍTICO"; classifColor = "text-red-500"; classifBg = "from-red-600"; barColor = "bg-red-500"; }

  const conselhos: { title: string; desc: string; color: string; icon: React.ReactNode }[] = [];
  
  const mediaSaidasTrilhas = saidasAtual;
  const vezesReserva = mediaSaidasTrilhas > 0 ? (acumuladoGeral / mediaSaidasTrilhas) : 0;
  if (vezesReserva < 3) {
    conselhos.push({ title: "Reserva de Emergência", desc: "Seu capital cobre menos de 3 meses. Corte gastos não essenciais.", color: "border-l-red-500", icon: <ShieldAlert className="w-5 text-red-500"/> });
  } else if (vezesReserva <= 6) {
    conselhos.push({ title: "Reserva em Construção", desc: "Você se mantém alguns meses. Continue economizando.", color: "border-l-amber-500", icon: <ShieldAlert className="w-5 text-amber-500"/> });
  } else {
    conselhos.push({ title: "Reserva Saudável", desc: "Boa reserva! Considere investimentos estruturados.", color: "border-l-emerald-500", icon: <ShieldAlert className="w-5 text-emerald-500"/> });
  }

  if (percGastosFixos > 70) {
    conselhos.push({ title: "Gastos Fixos Elevados", desc: "Custos recorrentes acima de 70% da renda. Revise faturas.", color: "border-l-red-500", icon: <ArrowDownWideNarrow className="w-5 text-red-500"/> });
  } else if (percGastosFixos >= 50) {
    conselhos.push({ title: "Gastos Fixos", desc: "Margem limitada. Ajuste um gasto grande por mês.", color: "border-l-amber-500", icon: <ArrowDownWideNarrow className="w-5 text-amber-500"/> });
  } else {
    conselhos.push({ title: "Gastos Fixos Controlados", desc: "Custos engessados sob controle. Ótimo para o futuro.", color: "border-l-emerald-500", icon: <ArrowDownWideNarrow className="w-5 text-emerald-500"/> });
  }

  if (sobraAtual > (sobraPrev * 1.05)) {
    conselhos.push({ title: "Tendência Positiva", desc: "Mês superou o anterior. Mantenha o fluxo.", color: "border-l-emerald-500", icon: <TrendingUp className="w-5 text-emerald-500"/> });
  } else if (sobraAtual >= (sobraPrev * 0.95)) {
    conselhos.push({ title: "Estabilidade", desc: "Gastos estáveis frente ao mês anterior.", color: "border-l-blue-500", icon: <TrendingUp className="w-5 text-blue-500"/> });
  } else {
    conselhos.push({ title: "Tendência Negativa", desc: "Saldo decrescente. Revise as novidades na fatura.", color: "border-l-red-500", icon: <TrendingUp className="w-5 text-red-500"/> });
  }

  if (gastosUnicosMesCount > 2) {
    conselhos.push({ title: "Gastos de Impulso", desc: `${gastosUnicosMesCount} saídas pontuais este mês. Avalie se foram planejadas.`, color: "border-l-red-500", icon: <ShoppingCart className="w-5 text-red-500"/> });
  } else {
    conselhos.push({ title: "Controle de Gastos", desc: "Excelente controle sobre gastos pontuais.", color: "border-l-emerald-500", icon: <ShoppingCart className="w-5 text-emerald-500"/> });
  }

  if (percAlimentacao > 20) {
    conselhos.push({ title: "Alimentação Alta", desc: "Custos com comida excedem 20% da renda.", color: "border-l-red-500", icon: <PiggyBank className="w-5 text-red-500"/> });
  } else {
    conselhos.push({ title: "Alimentação OK", desc: "Custos com alimentação dentro do saudável (< 20%).", color: "border-l-emerald-500", icon: <PiggyBank className="w-5 text-emerald-500"/> });
  }

  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

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
              <p className="text-slate-500 text-xs md:text-sm mt-1 font-medium">Análise baseada em regras cognitivas em tempo real</p>
           </div>
           
           <div className="flex items-center gap-2">
             <div className="flex items-center bg-slate-900/80 rounded-xl p-1 border border-slate-800 shadow-inner">
                <select 
                  value={selectedMonth} 
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                  className="bg-transparent text-slate-200 font-bold outline-none px-2 py-1.5 text-sm cursor-pointer"
                >
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
            { key: "Geral" as TabType, icon: <Globe className="w-4 h-4"/>, label: "Visão Geral" },
            { key: "Lançamentos" as TabType, icon: <PencilLine className="w-4 h-4"/>, label: "Lançamentos" },
            { key: "Uploads IA" as TabType, icon: <Bot className="w-4 h-4"/>, label: "Uploads IA" },
          ]).map(tab => (
            <button 
              key={tab.key}
              onClick={() => setActiveTab(tab.key)} 
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === tab.key ? 'bg-purple-600/15 text-purple-400 border border-purple-500/30 shadow-[0_0_15px_rgba(147,51,234,0.15)]' : 'text-slate-500 bg-slate-900/50 border border-transparent hover:text-slate-300'}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 md:p-8 flex flex-col xl:flex-row-reverse gap-6 mx-auto w-full max-w-7xl">
        
        {/* THERMOMETER */}
        <div className="w-full xl:w-80 flex flex-col gap-6 shrink-0 z-10 relative">
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
        </div>

        <div className="flex-1 flex flex-col gap-5">
          {/* KPI GRID */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            
            <div className={`glass-card p-4 md:p-5 border-l-4 ${sobraAtual >= 0 ? 'border-l-emerald-500' : 'border-l-rose-500'}`}>
               <h3 className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-2">Situação do Mês</h3>
               <span className={`text-xl md:text-2xl font-black font-mono tracking-tight ${sobraAtual >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                 {formatCurrency(sobraAtual)}
               </span>
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
               <h3 className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-2">Renda Extra</h3>
               <span className="text-xl md:text-2xl font-black font-mono tracking-tight text-purple-400">{formatCurrency(rendaExtraCount)}</span>
               <p className="text-[10px] text-slate-500 mt-1 font-medium">{rendaExtraCount > 0 ? "Aproveite para investir" : "Apenas recorrente"}</p>
            </div>

            <div className="glass-card p-4 md:p-5 border-l-4 border-l-indigo-500">
               <h3 className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-2">Evolução</h3>
               <span className="text-sm font-black text-slate-200 leading-tight block mt-1">
                 {(sobraAtual - sobraPrev) > 0 ? `+${formatCurrency(sobraAtual - sobraPrev)}` : formatCurrency(sobraAtual - sobraPrev)}
               </span>
               <span className="text-[10px] text-slate-500 mt-0.5 block font-medium">vs mês anterior</span>
            </div>

            <div className="glass-card p-4 md:p-5 border-l-4 border-l-teal-500">
               <h3 className="text-[10px] text-slate-500 font-bold tracking-widest uppercase mb-2">Fechamento Previsto</h3>
               <span className="text-xl font-black font-mono tracking-tight text-slate-200">{formatCurrency(projecaoFinal)}</span>
               <p className="text-[10px] text-slate-500 font-medium mt-0.5">{projecaoFinal > 0 ? "No azul" : "Atenção máxima"}</p>
            </div>
            
          </div>

          {/* CONSELHOS */}
          <div>
            <div className="bg-slate-900/60 px-5 py-3 rounded-t-xl border border-slate-800/60 border-b-0">
              <h2 className="text-white font-black text-xs uppercase tracking-[0.15em]">💡 Avaliação de Riscos</h2>
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
