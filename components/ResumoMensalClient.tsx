"use client";

import { useState, useMemo, useEffect } from "react";
import { formatCurrency, getMesAnoKey, getMesAno } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { 
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line 
} from "recharts";
import { TrendingUp, TrendingDown, CheckCircle2, Clock, Wallet, Bot, PencilLine, CalendarDays, DollarSign, ArrowRightLeft } from "lucide-react";
import AlertasFinn from "./AlertasFinn";

interface Props {
  rawData: any[];
  config: { id: string; saldo_inicial: number } | null;
  user_id: string;
}

export default function ResumoMensalClient({ rawData, config, user_id }: Props) {
  const [saldoInicialStr, setSaldoInicialStr] = useState(config?.saldo_inicial?.toString() || "0");
  const [origemFilter, setOrigemFilter] = useState<"Upload IA" | "Manual">("Manual");
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [realMonth, setRealMonth] = useState(-1);
  const [realYear, setRealYear] = useState(-1);
  
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"A Pagar" | "Pago" | "A Receber" | "Recebido">("A Pagar");
  const [modalIsLoading, setModalIsLoading] = useState(false);

  // Baixa form states
  const [baixaSelectedId, setBaixaSelectedId] = useState<string>("");
  const [baixaDate, setBaixaDate] = useState(new Date().toISOString().split('T')[0]);
  const [baixaTipo, setBaixaTipo] = useState<"total" | "parcial">("total");
  const [baixaValorParcial, setBaixaValorParcial] = useState("");

  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const d = new Date();
    setRealMonth(d.getMonth() + 1);
    setRealYear(d.getFullYear());

    const saved = localStorage.getItem("resumoOrigemFilter");
    if (saved === "Upload IA" || saved === "Manual") {
      setOrigemFilter(saved);
    }
  }, []);

  const handleOrigemChange = (val: "Upload IA" | "Manual") => {
    setOrigemFilter(val);
    localStorage.setItem("resumoOrigemFilter", val);
  };

  const handleUpdateSaldo = async () => {
    const val = Number(saldoInicialStr);
    if (isNaN(val)) { toast.error("Valor inválido"); return; }
    if (config) {
      const { error } = await supabase.from("configuracoes").update({ saldo_inicial: val }).eq("id", config.id);
      if (error) toast.error("Erro ao salvar saldo");
      else toast.success("Saldo salvo");
    } else {
      const { error } = await supabase.from("configuracoes").insert([{ user_id, saldo_inicial: val }]);
      if (error) toast.error("Erro ao criar saldo");
      else toast.success("Saldo inicial criado");
    }
  };

  const processedData = useMemo(() => {
    const filtered = rawData.filter((item: any) => {
      const isAI = item.origem === "Upload IA";
      if (origemFilter === "Upload IA") return isAI;
      return !isAI;
    });

    const grouped: Record<string, { entradas: number; saidas: number }> = {};
    filtered.forEach(l => {
      const mesKey = getMesAnoKey(l.data);
      if (!grouped[mesKey]) grouped[mesKey] = { entradas: 0, saidas: 0 };
      if (l.tipo === "Entrada") grouped[mesKey].entradas += Number(l.valor);
      else grouped[mesKey].saidas += Math.abs(Number(l.valor));
    });

    const mesesOrdenados = Object.keys(grouped).sort();
    const result: any[] = [];
    let currentAcumulado = Number(saldoInicialStr) || 0;

    mesesOrdenados.forEach((mesKey) => {
      const { entradas, saidas } = grouped[mesKey];
      const sobra = entradas - saidas;
      currentAcumulado += sobra;
      const comprometimento = entradas > 0 ? (saidas / entradas) * 100 : 0;
      result.push({ mes: getMesAno(mesKey + "-01"), entradas, saidas, sobra, acumulado: currentAcumulado, comprometimento });
    });
    return result;
  }, [rawData, origemFilter, saldoInicialStr]);

  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  const isAllMonths = selectedMonth === 0;
  const mesKeySelecionado = isAllMonths ? null : getMesAno(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`);
  const currentMonthData = isAllMonths ? null : processedData.find(d => d.mes === mesKeySelecionado);

  // Compute real pago/a receber from raw data
  const currentMonthRaw = rawData.filter((item: any) => {
    const isCorrectOrigin = origemFilter === "Upload IA" ? item.origem === "Upload IA" : item.origem !== "Upload IA";
    if (isAllMonths) {
      const itemYear = new Date(item.data + 'T00:00:00').getFullYear();
      return itemYear === selectedYear && isCorrectOrigin;
    }
    const isCorrectMonth = getMesAnoKey(item.data) === `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
    return isCorrectMonth && isCorrectOrigin;
  });

  const entradasPagas = currentMonthRaw.filter((r: any) => r.tipo === 'Entrada' && r.status === 'Pago').reduce((a: number, b: any) => a + Number(b.valor), 0);
  const entradasAReceber = currentMonthRaw.filter((r: any) => r.tipo === 'Entrada' && r.status !== 'Pago').reduce((a: number, b: any) => a + Number(b.valor), 0);
  const saidasPagas = Math.abs(currentMonthRaw.filter((r: any) => r.tipo === 'Saída' && r.status === 'Pago').reduce((a: number, b: any) => a + Number(b.valor), 0));
  const saidasAPagar = Math.abs(currentMonthRaw.filter((r: any) => r.tipo === 'Saída' && r.status !== 'Pago').reduce((a: number, b: any) => a + Number(b.valor), 0));

  const tableTotals = processedData.reduce((acc, curr) => ({
    entradas: acc.entradas + curr.entradas,
    saidas: acc.saidas + curr.saidas,
    sobra: acc.sobra + curr.sobra
  }), { entradas: 0, saidas: 0, sobra: 0 });

  const currentTotals = isAllMonths ? {
     entradas: tableTotals.entradas,
     saidas: tableTotals.saidas,
     sobra: tableTotals.sobra,
     acumulado: (Number(saldoInicialStr) || 0) + tableTotals.sobra
  } : { 
     entradas: currentMonthData?.entradas || 0, 
     saidas: currentMonthData?.saidas || 0, 
     sobra: currentMonthData?.sobra || 0,
     acumulado: currentMonthData?.acumulado || Number(saldoInicialStr) || 0
  };

  const getModalItems = () => {
    let filtered = currentMonthRaw;
    if (modalType === "Recebido") filtered = filtered.filter((x: any) => x.tipo === "Entrada" && x.status === "Pago");
    if (modalType === "A Receber") filtered = filtered.filter((x: any) => x.tipo === "Entrada" && x.status !== "Pago");
    if (modalType === "Pago") filtered = filtered.filter((x: any) => x.tipo === "Saída" && x.status === "Pago");
    if (modalType === "A Pagar") filtered = filtered.filter((x: any) => x.tipo === "Saída" && x.status !== "Pago");
    return filtered;
  };

  const getPendingItems = () => {
    if (modalType === "Recebido" || modalType === "A Receber") {
      return currentMonthRaw.filter((x: any) => x.tipo === "Entrada" && x.status !== "Pago");
    }
    return currentMonthRaw.filter((x: any) => x.tipo === "Saída" && x.status !== "Pago");
  };

  const getCompletedItems = () => {
    if (modalType === "Recebido" || modalType === "A Receber") {
      return currentMonthRaw.filter((x: any) => x.tipo === "Entrada" && x.status === "Pago");
    }
    return currentMonthRaw.filter((x: any) => x.tipo === "Saída" && x.status === "Pago");
  };

  const openModal = (type: typeof modalType) => {
    setModalType(type);
    setBaixaSelectedId("");
    setBaixaDate(new Date().toISOString().split('T')[0]);
    setBaixaTipo("total");
    setBaixaValorParcial("");
    setModalOpen(true);
  };

  const handleBaixa = async () => {
    if (!baixaSelectedId) { toast.error("Selecione um lançamento!"); return; }
    const item = currentMonthRaw.find((x: any) => x.id === baixaSelectedId);
    if (!item) { toast.error("Item não encontrado."); return; }

    const table = item.origem === "Upload IA" ? "ia_lancamentos" : "lancamentos";
    const valorOriginal = Math.abs(Number(item.valor));
    setModalIsLoading(true);

    try {
      if (baixaTipo === "total") {
        // Total: update status to Pago + update date
        const { error } = await supabase.from(table).update({ status: "Pago", data: baixaDate }).eq("id", item.id);
        if (error) throw error;
        toast.success("Baixa total realizada!");
      } else {
        // Partial: split the row
        const parcialVal = Number(baixaValorParcial);
        if (isNaN(parcialVal) || parcialVal <= 0) { toast.error("Valor parcial inválido!"); setModalIsLoading(false); return; }
        if (parcialVal >= valorOriginal) { toast.error("Valor parcial deve ser menor que o total. Use Baixa Total."); setModalIsLoading(false); return; }

        const resto = valorOriginal - parcialVal;
        const valorResto = item.tipo === "Saída" ? -resto : resto;
        const valorPago = item.tipo === "Saída" ? -parcialVal : parcialVal;

        // 1. Update original row with remaining value (still pending)
        const { error: errUpdate } = await supabase.from(table).update({ valor: valorResto }).eq("id", item.id);
        if (errUpdate) throw errUpdate;

        // 2. Insert clone with paid portion
        const { id, created_at, ...cloneBase } = item;
        const clone = { ...cloneBase, valor: valorPago, status: "Pago", data: baixaDate, descricao: `${item.descricao} (parcial)` };
        delete clone.origem; // origem is injected client-side, not a DB column
        const { error: errInsert } = await supabase.from(table).insert([clone]);
        if (errInsert) throw errInsert;

        toast.success(`Baixa parcial: R$ ${parcialVal.toFixed(2)} registrado, R$ ${resto.toFixed(2)} pendente.`);
      }
      router.refresh();
      setBaixaSelectedId("");
      setBaixaTipo("total");
      setBaixaValorParcial("");
    } catch (err: any) {
      toast.error("Erro ao processar baixa: " + (err?.message || "desconhecido"));
    } finally {
      setModalIsLoading(false);
    }
  };

  const handleUndoStatus = async (item: any) => {
    setModalIsLoading(true);
    const table = item.origem === "Upload IA" ? "ia_lancamentos" : "lancamentos";
    const { error } = await supabase.from(table).update({ status: "Pendente" }).eq("id", item.id);
    if (error) toast.error("Erro ao reverter status!");
    else { toast.success("Revertido para pendente."); router.refresh(); }
    setModalIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto w-full bg-[#09090b] text-zinc-100 pb-20 md:pb-0">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-5 md:p-6 pb-4 gap-4 shrink-0 bg-gradient-to-b from-[#18181b] to-transparent">
        <div>
           <h1 className="text-xl md:text-2xl font-black tracking-tight shimmer-text">
             Resumo Inteligente
           </h1>
           <p className="text-xs font-medium text-zinc-500 mt-0.5">Visão consolidada e evolução histórica</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Month/Year */}
          <div className="flex items-center bg-zinc-900/80 rounded-xl p-1 border border-zinc-800 shadow-inner">
             <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
               className={`bg-transparent font-bold outline-none px-2 py-1.5 text-sm cursor-pointer transition-colors ${
                 selectedMonth === realMonth && selectedYear === realYear 
                   ? 'text-violet-400' 
                   : 'text-zinc-200'
               }`}>
                <option value={0} className="bg-zinc-900">Todos</option>
                {meses.map((m, i) => {
                  const isCurrent = realMonth === i + 1 && selectedYear === realYear;
                  return <option key={i} value={i+1} className="bg-zinc-900">
                    {m} {isCurrent ? '(Atual) 📍' : ''}
                  </option>;
                })}
             </select>
             <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
               className="bg-transparent text-zinc-200 font-bold outline-none px-2 py-1.5 text-sm border-l border-zinc-700 cursor-pointer">
                {[2024,2025,2026,2027].map(y => <option key={y} value={y} className="bg-zinc-900">{y}</option>)}
             </select>
          </div>

          {/* Origem */}
          <div className="flex items-center bg-zinc-900/80 rounded-xl p-1 border border-zinc-800 shadow-inner">
             <button onClick={() => handleOrigemChange("Manual")}
               className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${origemFilter === 'Manual' ? 'bg-pink-600/15 text-pink-400 shadow-[0_0_10px_rgba(219,39,119,0.15)]' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <PencilLine className="w-3.5 h-3.5" /> Manual
             </button>
             <button onClick={() => handleOrigemChange("Upload IA")}
               className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${origemFilter === 'Upload IA' ? 'bg-emerald-600/15 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]' : 'text-zinc-500 hover:text-zinc-300'}`}>
                <Bot className="w-3.5 h-3.5" /> Uploads IA
             </button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 pb-2">
        <AlertasFinn userId={user_id} />
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mb-6">
          
          {/* CAIXA */}
          <div className="glass-card p-5 relative overflow-hidden group flex flex-col">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-600 to-indigo-600 opacity-60 group-hover:opacity-100 transition-opacity"></div>

            {/* Label */}
            <div className="flex items-center justify-between text-zinc-400 mb-1">
               <span className="font-bold text-[10px] tracking-[0.15em] uppercase text-violet-400">{isAllMonths ? 'Sobra Anual' : 'Caixa no Mês (Sobra)'}</span>
               <Wallet className="w-4 h-4 text-violet-400"/>
            </div>

            {/* Sobra HERO + Acumulado compacto — MESMA LINHA */}
            <div className="flex items-end justify-between mb-4">
               <div className={`text-2xl md:text-3xl font-black tracking-tighter font-mono ${currentTotals.sobra >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(currentTotals.sobra)}
               </div>
               <div className="flex flex-col items-end">
                  <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Acumulado</span>
                  <span className="text-xs font-mono font-bold text-zinc-300">{formatCurrency(currentTotals.acumulado)}</span>
               </div>
            </div>

            {/* Saldo Inicial - embaixo */}
            <div className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-800/60 p-2.5 rounded-xl mt-auto">
               <div className="flex flex-col flex-1">
                 <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.15em]">Saldo Inicial Base</span>
                 <div className="flex items-center gap-1 mt-0.5">
                   <span className="text-[10px] font-mono font-bold text-zinc-400">R$</span>
                   <input type="number" value={saldoInicialStr} onChange={(e) => setSaldoInicialStr(e.target.value)} onBlur={handleUpdateSaldo}
                     className="w-24 bg-transparent border-b border-zinc-700 outline-none focus:border-violet-500 font-mono text-sm font-black text-zinc-200 transition-colors"/>
                 </div>
               </div>
            </div>
          </div>

          {/* RECEITAS */}
          <div className="glass-card p-5 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-teal-500 opacity-60 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center justify-between text-zinc-400 mb-3">
               <span className="font-bold text-[10px] tracking-[0.15em] uppercase">Receitas</span>
               <TrendingUp className="w-4 h-4 text-emerald-400"/>
            </div>
            <div className="text-2xl md:text-3xl font-black text-emerald-400 tracking-tighter font-mono mb-4">
               {formatCurrency(currentTotals.entradas)}
            </div>
            <div className="grid grid-cols-2 gap-3">
               <button onClick={() => openModal("Recebido")} className="flex flex-col bg-emerald-950/20 border border-emerald-900/30 p-3.5 rounded-xl text-left cursor-pointer hover:scale-[1.03] transition-transform shadow-sm hover:shadow-emerald-900/40">
                 <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1.5 uppercase tracking-widest"><CheckCircle2 className="w-3.5 h-3.5"/> Recebido</span>
                 <span className="text-base font-mono font-black text-emerald-400 mt-1.5">{formatCurrency(entradasPagas)}</span>
               </button>
               <button onClick={() => openModal("A Receber")} className={`flex flex-col p-3.5 rounded-xl text-left cursor-pointer hover:scale-[1.03] transition-transform shadow-sm hover:shadow-amber-900/40 ${entradasAReceber > 0 ? 'bg-amber-950/20 border border-amber-900/30' : 'bg-zinc-900/40 border border-zinc-800/60 opacity-50'}`}>
                 <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1.5 uppercase tracking-widest"><Clock className="w-3.5 h-3.5"/> A receber</span>
                 <span className="text-base font-mono font-black text-amber-400 mt-1.5">{formatCurrency(entradasAReceber)}</span>
               </button>
            </div>
          </div>

          {/* DESPESAS */}
          <div className="glass-card p-5 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-rose-500 opacity-60 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center justify-between text-zinc-400 mb-3">
               <span className="font-bold text-[10px] tracking-[0.15em] uppercase">Despesas</span>
               <TrendingDown className="w-4 h-4 text-red-500"/>
            </div>
            <div className="text-2xl md:text-3xl font-black text-red-500 tracking-tighter font-mono mb-4">
               {formatCurrency(Math.abs(currentTotals.saidas))}
            </div>
            <div className="grid grid-cols-2 gap-3">
               <button onClick={() => openModal("Pago")} className={`flex flex-col p-3.5 rounded-xl text-left cursor-pointer hover:scale-[1.03] transition-transform shadow-sm hover:shadow-red-900/40 ${saidasPagas > 0 ? 'bg-red-950/20 border border-red-900/30' : 'bg-zinc-900/40 border border-zinc-800/60 opacity-50'}`}>
                 <span className="text-[10px] text-red-500 font-bold flex items-center gap-1.5 uppercase tracking-widest"><CheckCircle2 className="w-3.5 h-3.5"/> Pago</span>
                 <span className="text-base font-mono font-black text-red-400 mt-1.5">{formatCurrency(saidasPagas)}</span>
               </button>
               <button onClick={() => openModal("A Pagar")} className={`flex flex-col p-3.5 rounded-xl text-left cursor-pointer hover:scale-[1.03] transition-transform shadow-sm hover:shadow-orange-900/40 ${saidasAPagar > 0 ? 'bg-orange-950/20 border border-orange-900/30' : 'bg-zinc-900/40 border border-zinc-800/60 opacity-50'}`}>
                 <span className="text-[10px] text-orange-500 font-bold flex items-center gap-1.5 uppercase tracking-widest"><Clock className="w-3.5 h-3.5"/> A pagar</span>
                 <span className="text-base font-mono font-black text-orange-400 mt-1.5">{formatCurrency(saidasAPagar)}</span>
               </button>
            </div>
          </div>
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5 mb-6">
          <div className="glass-card p-5 h-72 md:h-80 flex flex-col">
            <h3 className="text-[10px] font-black text-zinc-500 tracking-[0.15em] uppercase mb-4 text-center">Entradas vs Saídas</h3>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.4} />
                <XAxis dataKey="mes" fontSize={10} fontWeight={600} tickLine={false} axisLine={false} tick={{fill: '#71717a'}} dy={8} />
                <YAxis fontSize={9} tickFormatter={(val) => `${val/1000}k`} tickLine={false} axisLine={false} tick={{fill: '#52525b'}} dx={-5} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} cursor={{fill: '#0f172a', opacity: 0.4}} contentStyle={{backgroundColor: '#09090b', borderRadius: '12px', borderColor: '#27272a', color: '#f8fafc', fontWeight: 'bold', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.5)', padding: '10px', fontSize: '12px'}} />
                <Legend iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', paddingTop: '12px'}} />
                <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={14} />
                <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={14} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card p-5 h-72 md:h-80 flex flex-col">
            <h3 className="text-[10px] font-black text-zinc-500 tracking-[0.15em] uppercase mb-4 text-center">Evolução Patrimonial</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" opacity={0.4} />
                <XAxis dataKey="mes" fontSize={10} fontWeight={600} tickLine={false} axisLine={false} tick={{fill: '#71717a'}} dy={8} />
                <YAxis fontSize={9} tickFormatter={(val) => `${val/1000}k`} tickLine={false} axisLine={false} tick={{fill: '#52525b'}} dx={-5} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} cursor={{stroke: '#3f3f46', strokeWidth: 1}} contentStyle={{backgroundColor: '#09090b', borderRadius: '12px', borderColor: '#27272a', color: '#f8fafc', fontWeight: 'bold', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.5)', padding: '10px', fontSize: '12px'}} />
                <Line type="monotone" dataKey="acumulado" name="Saldo Acumulado" stroke="#a855f7" strokeWidth={3} dot={{ r: 3, fill: '#0f172a', strokeWidth: 2, stroke: '#a855f7' }} activeDot={{ r: 5, fill: '#a855f7', stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TABLE */}
        <div className="glass-card overflow-x-auto w-full mb-8">
          <table className="w-full min-w-[700px] text-left border-collapse">
            <thead>
              <tr className="bg-[#09090b]">
                <th className="w-[15%] px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] border-b border-zinc-800/60 text-zinc-500">Mês</th>
                <th className="text-right w-[15%] px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] border-b border-zinc-800/60 text-zinc-500">Entradas</th>
                <th className="text-right w-[15%] px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] border-b border-zinc-800/60 text-zinc-500">Saídas</th>
                <th className="text-right w-[15%] px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] border-b border-zinc-800/60 text-zinc-500">Sobra</th>
                <th className="text-right w-[15%] px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] border-b border-zinc-800/60 text-zinc-500">Caixa</th>
                <th className="text-center w-[12%] px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] border-b border-zinc-800/60 text-zinc-500">Comprom.</th>
                <th className="text-right w-[13%] px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] border-b border-zinc-800/60 text-zinc-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {processedData.length === 0 && (
                 <tr><td colSpan={7} className="text-center py-10 text-zinc-600 font-medium text-sm">Nenhum dado para a origem selecionada.</td></tr>
              )}
              {processedData.map((row) => {
                let statusBg = "", statusText = "";
                if (row.sobra > 0) { statusBg = "bg-emerald-950/40 text-emerald-400 border-emerald-900/50"; statusText = "Superávit"; }
                else if (row.sobra === 0) { statusBg = "bg-amber-950/40 text-amber-400 border-amber-900/50"; statusText = "Zerado"; }
                else { statusBg = "bg-red-950/40 text-red-500 border-red-900/50"; statusText = "Déficit"; }

                return (
                  <tr key={row.mes} className="hover:bg-zinc-800/20 border-b border-zinc-800/30 transition-colors">
                    <td className="font-bold text-sm text-zinc-300 px-4 py-3">{row.mes}</td>
                    <td className="text-right font-mono text-sm text-emerald-400 px-4 py-3">{formatCurrency(row.entradas)}</td>
                    <td className="text-right font-mono text-sm text-red-500 px-4 py-3">{formatCurrency(row.saidas)}</td>
                    <td className={`text-right font-mono text-sm font-bold px-4 py-3 ${row.sobra < 0 ? 'text-red-500' : 'text-emerald-400'}`}>{formatCurrency(row.sobra)}</td>
                    <td className="text-right font-mono text-sm font-black text-violet-400 px-4 py-3">{formatCurrency(row.acumulado)}</td>
                    <td className="text-center font-mono text-xs text-zinc-400 px-4 py-3">{row.comprometimento.toFixed(1)}%</td>
                    <td className="text-right px-4 py-3">
                       <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md border ${statusBg}`}>{statusText}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gradient-to-r from-violet-950/30 to-zinc-900/80 border-t-2 border-violet-900/50">
                <td className="font-black text-xs uppercase tracking-[0.15em] px-4 py-4 text-zinc-200">Balanço Total</td>
                <td className="text-right font-mono text-sm font-black text-emerald-400 px-4 py-4">{formatCurrency(tableTotals.entradas)}</td>
                <td className="text-right font-mono text-sm font-black text-red-500 px-4 py-4">{formatCurrency(tableTotals.saidas)}</td>
                <td className={`text-right font-mono text-sm font-black px-4 py-4 ${tableTotals.sobra < 0 ? 'text-red-500' : 'text-emerald-400'}`}>{formatCurrency(tableTotals.sobra)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
      
      {/* ADVANCED SETTLEMENT MODAL */}
      {modalOpen && (() => {
        const isEntrada = modalType === "Recebido" || modalType === "A Receber";
        const pendingItems = getPendingItems();
        const completedItems = getCompletedItems();
        const selectedItem = pendingItems.find((x: any) => x.id === baixaSelectedId);
        const selectedItemValor = selectedItem ? Math.abs(Number(selectedItem.valor)) : 0;

        return (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
           <div className="bg-[#0f172a] border border-zinc-800 p-5 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
              {/* HEADER */}
              <div className="flex justify-between items-center mb-5 border-b border-zinc-800/80 pb-3">
                 <h2 className="text-white font-black text-base uppercase tracking-wider flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5 text-violet-400"/>
                    {isEntrada ? 'Gestão de Receitas' : 'Gestão de Despesas'}
                 </h2>
                 <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white font-bold px-2 py-0.5 text-2xl leading-none">&times;</button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col gap-5">
                {/* --- FORM: REGISTRAR BAIXA --- */}
                <div className="p-4 bg-gradient-to-b from-zinc-900/80 to-zinc-950/60 rounded-xl border border-zinc-800">
                  <h3 className="text-[10px] font-black text-violet-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5"/>
                    Registrar {isEntrada ? 'Recebimento' : 'Pagamento'}
                  </h3>

                  {pendingItems.length === 0 ? (
                    <p className="text-zinc-500 text-sm text-center py-4">Nenhum item pendente no período.</p>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {/* 1. Select item */}
                      <div>
                        <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.15em] block mb-1">Lançamento</label>
                        <select value={baixaSelectedId} onChange={e => setBaixaSelectedId(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg p-2.5 outline-none focus:border-violet-500 transition-colors cursor-pointer">
                          <option value="">Selecione...</option>
                          {pendingItems.map((item: any) => (
                            <option key={item.id} value={item.id} className="bg-zinc-900">
                              {item.descricao} — {formatCurrency(Math.abs(Number(item.valor)))} ({new Date(item.data + 'T12:00:00').toLocaleDateString('pt-BR')})
                            </option>
                          ))}
                        </select>
                      </div>

                      {baixaSelectedId && (
                        <>
                          {/* Selected item preview */}
                          <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50 flex items-center justify-between">
                            <div>
                              <p className="text-zinc-200 font-bold text-sm uppercase">{selectedItem?.descricao}</p>
                              <p className="text-zinc-500 text-[10px] mt-0.5">{selectedItem?.categoria || 'Outros'}</p>
                            </div>
                            <span className={`font-mono font-black text-lg ${isEntrada ? 'text-emerald-400' : 'text-red-400'}`}>
                              {formatCurrency(selectedItemValor)}
                            </span>
                          </div>

                          {/* 2. Date */}
                          <div>
                            <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.15em] block mb-1 flex items-center gap-1">
                              <CalendarDays className="w-3 h-3"/> Data da Baixa
                            </label>
                            <input type="date" value={baixaDate} onChange={e => setBaixaDate(e.target.value)}
                              className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg p-2.5 outline-none focus:border-violet-500 transition-colors"/>
                          </div>

                          {/* 3. Total / Parcial toggle */}
                          <div>
                            <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.15em] block mb-1.5">Tipo</label>
                            <div className="flex gap-2">
                              <button onClick={() => { setBaixaTipo("total"); setBaixaValorParcial(""); }}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                                  baixaTipo === 'total' 
                                    ? 'bg-violet-600/20 border-violet-500/40 text-violet-300 shadow-[0_0_12px_rgba(168,85,247,0.15)]' 
                                    : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                                }`}>
                                💯 Total
                              </button>
                              <button onClick={() => setBaixaTipo("parcial")}
                                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
                                  baixaTipo === 'parcial' 
                                    ? 'bg-amber-600/20 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)]' 
                                    : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                                }`}>
                                ✂️ Parcial
                              </button>
                            </div>
                          </div>

                          {/* 4. Partial value input */}
                          {baixaTipo === "parcial" && (
                            <div>
                              <label className="text-[9px] text-zinc-500 font-bold uppercase tracking-[0.15em] block mb-1">
                                Valor {isEntrada ? 'Recebido' : 'Pago'} (de {formatCurrency(selectedItemValor)})
                              </label>
                              <div className="flex items-center gap-2">
                                <span className="text-zinc-400 font-mono text-sm font-bold">R$</span>
                                <input type="number" step="0.01" min="0.01" max={selectedItemValor - 0.01}
                                  value={baixaValorParcial} onChange={e => setBaixaValorParcial(e.target.value)}
                                  placeholder="0,00"
                                  className="flex-1 bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg p-2.5 outline-none focus:border-amber-500 font-mono transition-colors"/>
                              </div>
                              {baixaValorParcial && Number(baixaValorParcial) > 0 && Number(baixaValorParcial) < selectedItemValor && (
                                <p className="text-[10px] text-amber-400/80 mt-1.5 font-medium">
                                  💡 Restante após baixa: {formatCurrency(selectedItemValor - Number(baixaValorParcial))}
                                </p>
                              )}
                            </div>
                          )}

                          {/* SUBMIT */}
                          <button disabled={modalIsLoading} onClick={handleBaixa}
                            className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs uppercase tracking-[0.15em] font-black rounded-xl shadow-lg shadow-violet-900/30 disabled:opacity-50 transition-all mt-1">
                            {modalIsLoading ? 'Processando...' : `Confirmar ${baixaTipo === 'total' ? 'Baixa Total' : 'Baixa Parcial'}`}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* --- COMPLETED LIST --- */}
                {completedItems.length > 0 && (
                  <div className="p-4 bg-zinc-900/40 rounded-xl border border-zinc-800/60">
                    <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5"/>
                      Já {isEntrada ? 'Recebidos' : 'Pagos'} ({completedItems.length})
                    </h3>
                    <div className="flex flex-col gap-1.5">
                      {completedItems.map((item: any) => (
                        <div key={item.id} className="p-2.5 bg-zinc-950/40 rounded-lg border border-zinc-800/40 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-zinc-300 font-bold text-xs truncate uppercase">{item.descricao}</p>
                            <p className="text-zinc-600 text-[9px] uppercase font-bold tracking-widest mt-0.5">
                              {new Date(item.data + "T12:00:00").toLocaleDateString('pt-BR')} · {item.categoria || 'Outros'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`font-mono font-black text-sm ${isEntrada ? 'text-emerald-400' : 'text-red-400'}`}>
                              {formatCurrency(Math.abs(Number(item.valor)))}
                            </span>
                            <button disabled={modalIsLoading} onClick={() => handleUndoStatus(item)}
                              className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-[9px] uppercase tracking-wider font-bold rounded-md disabled:opacity-50 transition-colors">
                              Desfazer
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
           </div>
        </div>
        );
      })()}

    </div>
  );
}
