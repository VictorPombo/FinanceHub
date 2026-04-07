"use client";

import { useState, useMemo } from "react";
import { formatCurrency, getMesAnoKey, getMesAno } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { 
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line 
} from "recharts";
import { TrendingUp, TrendingDown, CheckCircle2, Clock, Wallet, Bot, PencilLine } from "lucide-react";

interface Props {
  rawData: any[];
  config: { id: string; saldo_inicial: number } | null;
  user_id: string;
}

export default function ResumoMensalClient({ rawData, config, user_id }: Props) {
  const [saldoInicialStr, setSaldoInicialStr] = useState(config?.saldo_inicial?.toString() || "0");
  const [origemFilter, setOrigemFilter] = useState<"Upload IA" | "Manual">("Manual");
  const dataAtual = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<number>(dataAtual.getFullYear());
  const supabase = createClient();

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

  return (
    <div className="flex flex-col h-full overflow-y-auto w-full bg-[#020617] text-slate-100 pb-20 md:pb-0">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-5 md:p-6 pb-4 gap-4 shrink-0 bg-gradient-to-b from-[#0F172A] to-transparent">
        <div>
           <h1 className="text-xl md:text-2xl font-black tracking-tight shimmer-text">
             Resumo Inteligente
           </h1>
           <p className="text-xs font-medium text-slate-500 mt-0.5">Visão consolidada e evolução histórica</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Month/Year */}
          <div className="flex items-center bg-slate-900/80 rounded-xl p-1 border border-slate-800 shadow-inner">
             <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}
               className="bg-transparent text-slate-200 font-bold outline-none px-2 py-1.5 text-sm cursor-pointer">
                <option value={0} className="bg-slate-900">Todos</option>
                {meses.map((m, i) => <option key={i} value={i+1} className="bg-slate-900">{m}</option>)}
             </select>
             <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
               className="bg-transparent text-slate-200 font-bold outline-none px-2 py-1.5 text-sm border-l border-slate-700 cursor-pointer">
                {[2024,2025,2026,2027].map(y => <option key={y} value={y} className="bg-slate-900">{y}</option>)}
             </select>
          </div>

          {/* Origem */}
          <div className="flex items-center bg-slate-900/80 rounded-xl p-1 border border-slate-800 shadow-inner">
             <button onClick={() => setOrigemFilter("Manual")}
               className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${origemFilter === 'Manual' ? 'bg-pink-600/15 text-pink-400 shadow-[0_0_10px_rgba(219,39,119,0.15)]' : 'text-slate-500 hover:text-slate-300'}`}>
                <PencilLine className="w-3.5 h-3.5" /> Manual
             </button>
             <button onClick={() => setOrigemFilter("Upload IA")}
               className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${origemFilter === 'Upload IA' ? 'bg-emerald-600/15 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]' : 'text-slate-500 hover:text-slate-300'}`}>
                <Bot className="w-3.5 h-3.5" /> Uploads IA
             </button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mb-6">
          
          {/* CAIXA */}
          <div className="glass-card p-5 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-60 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center justify-between text-slate-400 mb-3">
               <span className="font-bold text-[10px] tracking-[0.15em] uppercase">{isAllMonths ? 'Caixa Anual' : 'Caixa no Mês'}</span>
               <Wallet className="w-4 h-4 text-purple-400"/>
            </div>
            <div className="text-2xl md:text-3xl font-black text-slate-50 tracking-tighter font-mono mb-4">
               {formatCurrency(currentTotals.acumulado)}
            </div>
            <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800/60 p-3 rounded-xl">
               <div className="flex flex-col flex-1">
                 <span className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.15em]">Saldo Inicial</span>
                 <div className="flex items-center gap-1 mt-0.5">
                   <span className="text-[10px] font-mono font-bold text-slate-400">R$</span>
                   <input type="number" value={saldoInicialStr} onChange={(e) => setSaldoInicialStr(e.target.value)} onBlur={handleUpdateSaldo}
                     className="w-24 bg-transparent border-b border-slate-700 outline-none focus:border-purple-500 font-mono text-sm font-black text-slate-200 transition-colors"/>
                 </div>
               </div>
            </div>
          </div>

          {/* RECEITAS */}
          <div className="glass-card p-5 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-teal-500 opacity-60 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center justify-between text-slate-400 mb-3">
               <span className="font-bold text-[10px] tracking-[0.15em] uppercase">Receitas</span>
               <TrendingUp className="w-4 h-4 text-emerald-400"/>
            </div>
            <div className="text-2xl md:text-3xl font-black text-emerald-400 tracking-tighter font-mono mb-4">
               {formatCurrency(currentTotals.entradas)}
            </div>
            <div className="grid grid-cols-2 gap-2">
               <div className="flex flex-col bg-emerald-950/20 border border-emerald-900/30 p-2 rounded-xl">
                 <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-1 uppercase tracking-widest"><CheckCircle2 className="w-3 h-3"/> Recebido</span>
                 <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5">{formatCurrency(entradasPagas)}</span>
               </div>
               <div className={`flex flex-col p-2 rounded-xl ${entradasAReceber > 0 ? 'bg-amber-950/20 border border-amber-900/30' : 'bg-slate-900/40 border border-slate-800/60 opacity-50'}`}>
                 <span className="text-[9px] text-amber-500 font-bold flex items-center gap-1 uppercase tracking-widest"><Clock className="w-3 h-3"/> A receber</span>
                 <span className="text-xs font-mono font-bold text-amber-400 mt-0.5">{formatCurrency(entradasAReceber)}</span>
               </div>
            </div>
          </div>

          {/* DESPESAS */}
          <div className="glass-card p-5 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-rose-500 opacity-60 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center justify-between text-slate-400 mb-3">
               <span className="font-bold text-[10px] tracking-[0.15em] uppercase">Despesas</span>
               <TrendingDown className="w-4 h-4 text-red-500"/>
            </div>
            <div className="text-2xl md:text-3xl font-black text-red-500 tracking-tighter font-mono mb-4">
               {formatCurrency(Math.abs(currentTotals.saidas))}
            </div>
            <div className="grid grid-cols-2 gap-2">
               <div className={`flex flex-col p-2 rounded-xl ${saidasPagas > 0 ? 'bg-red-950/20 border border-red-900/30' : 'bg-slate-900/40 border border-slate-800/60 opacity-50'}`}>
                 <span className="text-[9px] text-red-500 font-bold flex items-center gap-1 uppercase tracking-widest"><CheckCircle2 className="w-3 h-3"/> Pago</span>
                 <span className="text-xs font-mono font-bold text-red-400 mt-0.5">{formatCurrency(saidasPagas)}</span>
               </div>
               <div className={`flex flex-col p-2 rounded-xl ${saidasAPagar > 0 ? 'bg-orange-950/20 border border-orange-900/30' : 'bg-slate-900/40 border border-slate-800/60 opacity-50'}`}>
                 <span className="text-[9px] text-orange-500 font-bold flex items-center gap-1 uppercase tracking-widest"><Clock className="w-3 h-3"/> A pagar</span>
                 <span className="text-xs font-mono font-bold text-orange-400 mt-0.5">{formatCurrency(saidasAPagar)}</span>
               </div>
            </div>
          </div>
        </div>

        {/* CHARTS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5 mb-6">
          <div className="glass-card p-5 h-72 md:h-80 flex flex-col">
            <h3 className="text-[10px] font-black text-slate-500 tracking-[0.15em] uppercase mb-4 text-center">Entradas vs Saídas</h3>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.4} />
                <XAxis dataKey="mes" fontSize={10} fontWeight={600} tickLine={false} axisLine={false} tick={{fill: '#64748b'}} dy={8} />
                <YAxis fontSize={9} tickFormatter={(val) => `${val/1000}k`} tickLine={false} axisLine={false} tick={{fill: '#475569'}} dx={-5} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} cursor={{fill: '#0f172a', opacity: 0.4}} contentStyle={{backgroundColor: '#020617', borderRadius: '12px', borderColor: '#1e293b', color: '#f8fafc', fontWeight: 'bold', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.5)', padding: '10px', fontSize: '12px'}} />
                <Legend iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold', color: '#94a3b8', paddingTop: '12px'}} />
                <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={14} />
                <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={14} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card p-5 h-72 md:h-80 flex flex-col">
            <h3 className="text-[10px] font-black text-slate-500 tracking-[0.15em] uppercase mb-4 text-center">Evolução Patrimonial</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.4} />
                <XAxis dataKey="mes" fontSize={10} fontWeight={600} tickLine={false} axisLine={false} tick={{fill: '#64748b'}} dy={8} />
                <YAxis fontSize={9} tickFormatter={(val) => `${val/1000}k`} tickLine={false} axisLine={false} tick={{fill: '#475569'}} dx={-5} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} cursor={{stroke: '#334155', strokeWidth: 1}} contentStyle={{backgroundColor: '#020617', borderRadius: '12px', borderColor: '#1e293b', color: '#f8fafc', fontWeight: 'bold', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.5)', padding: '10px', fontSize: '12px'}} />
                <Line type="monotone" dataKey="acumulado" name="Saldo Acumulado" stroke="#a855f7" strokeWidth={3} dot={{ r: 3, fill: '#0f172a', strokeWidth: 2, stroke: '#a855f7' }} activeDot={{ r: 5, fill: '#a855f7', stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TABLE */}
        <div className="glass-card overflow-x-auto w-full mb-8">
          <table className="w-full min-w-[700px] text-left border-collapse">
            <thead>
              <tr className="bg-[#020617]">
                <th className="w-[15%] px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] border-b border-slate-800/60 text-slate-500">Mês</th>
                <th className="text-right w-[15%] px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] border-b border-slate-800/60 text-slate-500">Entradas</th>
                <th className="text-right w-[15%] px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] border-b border-slate-800/60 text-slate-500">Saídas</th>
                <th className="text-right w-[15%] px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] border-b border-slate-800/60 text-slate-500">Sobra</th>
                <th className="text-right w-[15%] px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] border-b border-slate-800/60 text-slate-500">Caixa</th>
                <th className="text-center w-[12%] px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] border-b border-slate-800/60 text-slate-500">Comprom.</th>
                <th className="text-right w-[13%] px-4 py-3.5 text-[10px] font-bold uppercase tracking-[0.12em] border-b border-slate-800/60 text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {processedData.length === 0 && (
                 <tr><td colSpan={7} className="text-center py-10 text-slate-600 font-medium text-sm">Nenhum dado para a origem selecionada.</td></tr>
              )}
              {processedData.map((row) => {
                let statusBg = "", statusText = "";
                if (row.sobra > 0) { statusBg = "bg-emerald-950/40 text-emerald-400 border-emerald-900/50"; statusText = "Superávit"; }
                else if (row.sobra === 0) { statusBg = "bg-amber-950/40 text-amber-400 border-amber-900/50"; statusText = "Zerado"; }
                else { statusBg = "bg-red-950/40 text-red-500 border-red-900/50"; statusText = "Déficit"; }

                return (
                  <tr key={row.mes} className="hover:bg-slate-800/20 border-b border-slate-800/30 transition-colors">
                    <td className="font-bold text-sm text-slate-300 px-4 py-3">{row.mes}</td>
                    <td className="text-right font-mono text-sm text-emerald-400 px-4 py-3">{formatCurrency(row.entradas)}</td>
                    <td className="text-right font-mono text-sm text-red-500 px-4 py-3">{formatCurrency(row.saidas)}</td>
                    <td className={`text-right font-mono text-sm font-bold px-4 py-3 ${row.sobra < 0 ? 'text-red-500' : 'text-emerald-400'}`}>{formatCurrency(row.sobra)}</td>
                    <td className="text-right font-mono text-sm font-black text-purple-400 px-4 py-3">{formatCurrency(row.acumulado)}</td>
                    <td className="text-center font-mono text-xs text-slate-400 px-4 py-3">{row.comprometimento.toFixed(1)}%</td>
                    <td className="text-right px-4 py-3">
                       <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md border ${statusBg}`}>{statusText}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gradient-to-r from-purple-950/30 to-slate-900/80 border-t-2 border-purple-900/50">
                <td className="font-black text-xs uppercase tracking-[0.15em] px-4 py-4 text-slate-200">Balanço Total</td>
                <td className="text-right font-mono text-sm font-black text-emerald-400 px-4 py-4">{formatCurrency(tableTotals.entradas)}</td>
                <td className="text-right font-mono text-sm font-black text-red-500 px-4 py-4">{formatCurrency(tableTotals.saidas)}</td>
                <td className={`text-right font-mono text-sm font-black px-4 py-4 ${tableTotals.sobra < 0 ? 'text-red-500' : 'text-emerald-400'}`}>{formatCurrency(tableTotals.sobra)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
