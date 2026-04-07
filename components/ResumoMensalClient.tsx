"use client";

import { useState, useMemo } from "react";
import { formatCurrency, getMesAnoKey, getMesAno } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { 
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line 
} from "recharts";
import { TrendingUp, TrendingDown, CheckCircle2, Clock, BarChart2, Bot, PencilLine, ListFilter } from "lucide-react";

interface Props {
  rawData: any[];
  config: { id: string; saldo_inicial: number } | null;
  user_id: string;
}

export default function ResumoMensalClient({ rawData, config, user_id }: Props) {
  const [saldoInicialStr, setSaldoInicialStr] = useState(config?.saldo_inicial?.toString() || "0");
  const [origemFilter, setOrigemFilter] = useState<"Upload IA" | "Manual">("Manual");
  const dataAtual = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(dataAtual.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(dataAtual.getFullYear());
  const supabase = createClient();

  const handleUpdateSaldo = async () => {
    const val = Number(saldoInicialStr);
    if (isNaN(val)) {
      toast.error("Valor inválido");
      return;
    }

    if (config) {
      const { error } = await supabase.from("configuracoes").update({ saldo_inicial: val }).eq("id", config.id);
      if (error) toast.error("Erro ao salvar saldo");
      else toast.success("Saldo salvo");
    } else {
      const { error } = await supabase.from("configuracoes").insert([{ user_id, saldo_inicial: val }]);
      if (error) toast.error("Erro ao criar saldo inicial");
      else toast.success("Saldo inicial criado");
    }
  };

  // 1. Filtragem por Origem
  // 2. Agrupamento por Mês
  const processedData = useMemo(() => {
    // A. Filtrar
    const filtered = rawData.filter((item: any) => {
      const isAI = item.origem === "Upload IA";
      if (origemFilter === "Upload IA") return isAI;
      if (origemFilter === "Manual") return !isAI;
    });

    // B. Grouping
    const grouped: Record<string, { entradas: number; saidas: number }> = {};
    filtered.forEach(l => {
      const mesKey = getMesAnoKey(l.data);
      if (!grouped[mesKey]) grouped[mesKey] = { entradas: 0, saidas: 0 };
      
      if (l.tipo === "Entrada") {
        grouped[mesKey].entradas += Number(l.valor);
      } else {
        grouped[mesKey].saidas += Math.abs(Number(l.valor));
      }
    });

    // C. Chronological Acc
    const mesesOrdenados = Object.keys(grouped).sort();
    const result: any[] = [];
    let currentAcumulado = Number(saldoInicialStr) || 0;

    mesesOrdenados.forEach((mesKey) => {
      const { entradas, saidas } = grouped[mesKey];
      const sobra = entradas - saidas;
      currentAcumulado += sobra;

      const comprometimento = entradas > 0 ? (saidas / entradas) * 100 : 0;

      result.push({
        mes: getMesAno(mesKey + "-01"),
        entradas,
        saidas,
        sobra,
        acumulado: currentAcumulado,
        comprometimento,
      });
    });

    return result;
  }, [rawData, origemFilter, saldoInicialStr]);

  const mesesOptions = [
    { value: 1, label: 'Jan' }, { value: 2, label: 'Fev' }, { value: 3, label: 'Mar' },
    { value: 4, label: 'Abr' }, { value: 5, label: 'Mai' }, { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' }, { value: 8, label: 'Ago' }, { value: 9, label: 'Set' },
    { value: 10, label: 'Out' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dez' }
  ];

  const anosOptions = [2024, 2025, 2026, 2027];

  // Filtramos os totais apenas para o mes/ano selecionado
  const mesKeySelecionado = getMesAno(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`);
  
  const currentMonthData = processedData.find(d => d.mes === mesKeySelecionado);
  
  const totals = { 
     entradas: currentMonthData?.entradas || 0, 
     saidas: currentMonthData?.saidas || 0, 
     sobra: currentMonthData?.sobra || 0,
     acumulado: currentMonthData?.acumulado || Number(saldoInicialStr) || 0
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto w-full bg-[#020617] text-slate-100 font-sans">
      
      {/* HEADER SECTION WITH FILTER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between p-6 pb-2 border-b border-transparent gap-4 shrink-0">
        <div>
           <h1 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-emerald-400 mb-1">
             Resumo Inteligente
           </h1>
           <p className="text-sm font-medium text-slate-400">Visão consolidada do mês selecionado e evolução histórica.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month/Year Filter */}
          <div className="flex items-center bg-slate-900/50 rounded-xl p-1 border border-slate-800 shadow-inner">
             <select 
               value={selectedMonth} 
               onChange={e => setSelectedMonth(Number(e.target.value))}
               className="bg-transparent text-slate-200 font-bold outline-none px-2 py-1 text-sm cursor-pointer"
             >
                {mesesOptions.map(m => <option key={m.value} value={m.value} className="bg-slate-900 text-slate-200">{m.label}</option>)}
             </select>
             <select 
               value={selectedYear} 
               onChange={e => setSelectedYear(Number(e.target.value))}
               className="bg-transparent text-slate-200 font-bold outline-none px-2 py-1 text-sm border-l border-slate-700 cursor-pointer"
             >
                {anosOptions.map(y => <option key={y} value={y} className="bg-slate-900 text-slate-200">{y}</option>)}
             </select>
          </div>

        {/* The Origem Filter */}
        <div className="flex items-center bg-slate-900/50 rounded-xl p-1 border border-slate-800 shadow-inner">
           <button 
             onClick={() => setOrigemFilter("Manual")}
             className={`flex-1 md:flex-none flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${origemFilter === 'Manual' ? 'bg-pink-600/20 text-pink-400 shadow-[0_0_15px_rgba(219,39,119,0.2)]' : 'text-slate-500 hover:text-slate-300'}`}
           >
              <PencilLine className="w-4 h-4" /> Planilha Manual
           </button>
           <button 
             onClick={() => setOrigemFilter("Upload IA")}
             className={`flex-1 md:flex-none flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${origemFilter === 'Upload IA' ? 'bg-emerald-600/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'text-slate-500 hover:text-slate-300'}`}
           >
              <Bot className="w-4 h-4" /> Uploads IA
           </button>
        </div>
        </div>
      </div>

      <div className="p-6">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#060b18] backdrop-blur-xl rounded-2xl p-4 md:p-6 shadow-2xl border border-slate-800/60 flex flex-col hover:border-purple-500/30 transition-all relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-indigo-600 opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
               <span className="font-bold text-sm tracking-widest uppercase">Caixa no Mês Atual</span>
               <span className="p-2 bg-purple-950/30 rounded-xl"><BarChart2 className="w-5 h-5 text-purple-400"/></span>
            </div>
            <div className="text-3xl md:text-4xl font-black text-slate-50 tracking-tighter mt-1 mb-4 font-mono">
               {formatCurrency(totals.acumulado)}
            </div>
            <div className="flex items-center gap-3 mt-auto bg-slate-900/40 border border-slate-800/80 p-3 rounded-xl hover:bg-slate-900/80 transition-colors">
               <div className="flex flex-col flex-1">
                 <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Saldo Inicial da Carteira</span>
                 <div className="flex items-center gap-1 mt-0.5">
                   <span className="text-xs font-mono font-bold text-slate-400">R$</span>
                   <input
                     type="number"
                     value={saldoInicialStr}
                     onChange={(e) => setSaldoInicialStr(e.target.value)}
                     onBlur={handleUpdateSaldo}
                     className="w-24 bg-transparent border-b border-slate-700 outline-none focus:border-purple-500 font-mono text-sm font-black text-slate-200 transition-colors"
                   />
                 </div>
               </div>
            </div>
          </div>

          <div className="bg-[#060b18] backdrop-blur-xl rounded-2xl p-4 md:p-6 shadow-2xl border border-slate-800/60 flex flex-col hover:border-emerald-500/30 transition-all relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-teal-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
               <span className="font-bold text-sm tracking-widest uppercase">Receitas ({origemFilter})</span>
               <span className="p-2 bg-emerald-950/30 rounded-xl"><TrendingUp className="w-5 h-5 text-emerald-400"/></span>
            </div>
            <div className="text-3xl md:text-4xl font-black text-emerald-400 tracking-tighter mt-1 mb-4 font-mono shadow-emerald-500/20 drop-shadow-md">
               {formatCurrency(totals.entradas)}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-auto">
               <div className="flex flex-col bg-emerald-950/20 border border-emerald-900/30 p-2.5 rounded-xl">
                 <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1 uppercase tracking-widest"><CheckCircle2 className="w-3 h-3"/> Recebido</span>
                 <span className="text-sm font-mono font-bold text-emerald-400 mt-1">{formatCurrency(totals.entradas)}</span>
               </div>
               <div className="flex flex-col bg-slate-900/40 border border-slate-800/80 p-2.5 rounded-xl opacity-50 grayscale">
                 <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1 uppercase tracking-widest"><Clock className="w-3 h-3"/> A receber</span>
                 <span className="text-sm font-mono font-bold text-slate-400 mt-1">R$ 0,00</span>
               </div>
            </div>
          </div>

          <div className="bg-[#060b18] backdrop-blur-xl rounded-2xl p-4 md:p-6 shadow-2xl border border-slate-800/60 flex flex-col hover:border-red-500/30 transition-all relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-rose-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
               <span className="font-bold text-sm tracking-widest uppercase">Despesas ({origemFilter})</span>
               <span className="p-2 bg-red-950/30 rounded-xl"><TrendingDown className="w-5 h-5 text-red-500"/></span>
            </div>
            <div className="text-3xl md:text-4xl font-black text-red-500 tracking-tighter mt-1 mb-4 font-mono shadow-red-500/20 drop-shadow-md">
               {formatCurrency(Math.abs(totals.saidas))}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-auto">
               <div className="flex flex-col bg-slate-900/40 border border-slate-800/80 p-2.5 rounded-xl opacity-50 grayscale">
                 <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1 uppercase tracking-widest"><CheckCircle2 className="w-3 h-3"/> Pago</span>
                 <span className="text-sm font-mono font-bold text-slate-400 mt-1">R$ 0,00</span>
               </div>
               <div className="flex flex-col bg-red-950/20 border border-red-900/30 p-2.5 rounded-xl">
                 <span className="text-[10px] text-red-500 font-bold flex items-center gap-1 uppercase tracking-widest"><Clock className="w-3 h-3"/> A pagar</span>
                 <span className="text-sm font-mono font-bold text-red-400 mt-1">{formatCurrency(Math.abs(totals.saidas))}</span>
               </div>
            </div>
          </div>
        </div>

        {/* Charts Box */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-[#060b18] backdrop-blur-xl rounded-2xl shadow-xl border border-slate-800/60 p-6 h-80 flex flex-col hover:shadow-[0_0_20px_rgba(147,51,234,0.05)] transition-all">
            <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase mb-6 text-center">Entradas vs Saídas</h3>
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.5} />
                <XAxis dataKey="mes" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} tick={{fill: '#64748b'}} dy={10} />
                <YAxis fontSize={10} tickFormatter={(val) => `R$ ${val/1000}k`} tickLine={false} axisLine={false} tick={{fill: '#64748b'}} dx={-10} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} cursor={{fill: '#0f172a', opacity: 0.4}} contentStyle={{backgroundColor: '#020617', borderRadius: '12px', borderColor: '#1e293b', color: '#f8fafc', fontWeight: 'bold', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.5)', padding: '12px'}} />
                <Legend iconType="circle" wrapperStyle={{fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', paddingTop: '20px'}} />
                <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={16} />
                <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={16} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-[#060b18] backdrop-blur-xl rounded-2xl shadow-xl border border-slate-800/60 p-6 h-80 flex flex-col hover:shadow-[0_0_20px_rgba(147,51,234,0.05)] transition-all">
            <h3 className="text-xs font-black text-slate-400 tracking-widest uppercase mb-6 text-center">Evolução Histórica Patrimonial</h3>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={processedData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.5} />
                <XAxis dataKey="mes" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} tick={{fill: '#64748b'}} dy={10} />
                <YAxis fontSize={10} tickFormatter={(val) => `R$ ${val/1000}k`} tickLine={false} axisLine={false} tick={{fill: '#64748b'}} dx={-10} />
                <Tooltip formatter={(value: any) => formatCurrency(Number(value))} cursor={{stroke: '#334155', strokeWidth: 1}} contentStyle={{backgroundColor: '#020617', borderRadius: '12px', borderColor: '#1e293b', color: '#f8fafc', fontWeight: 'bold', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.5)', padding: '12px'}} />
                <Legend iconType="circle" wrapperStyle={{fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', paddingTop: '20px'}} />
                <Line type="monotone" dataKey="acumulado" name="Saldo Acumulado" stroke="#a855f7" strokeWidth={3} dot={{ r: 4, fill: '#0f172a', strokeWidth: 2, stroke: '#a855f7' }} activeDot={{ r: 6, fill: '#a855f7', stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grid Table */}
        <div className="bg-[#060b18] backdrop-blur-xl border border-slate-800/60 overflow-x-auto w-full mb-12 rounded-2xl shadow-2xl">
          <table className="w-full min-w-[750px] md:min-w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#020617]">
                <th className="w-[15%] px-5 py-4 text-xs font-bold uppercase tracking-widest border-b border-slate-800/60 text-slate-400">Mês</th>
                <th className="text-right w-[15%] px-5 py-4 text-xs font-bold uppercase tracking-widest border-b border-slate-800/60 text-slate-400">Entradas</th>
                <th className="text-right w-[15%] px-5 py-4 text-xs font-bold uppercase tracking-widest border-b border-slate-800/60 text-slate-400">Saídas</th>
                <th className="text-right w-[15%] px-5 py-4 text-xs font-bold uppercase tracking-widest border-b border-slate-800/60 text-slate-400">Sobra/Déficit</th>
                <th className="text-right w-[15%] px-5 py-4 text-xs font-bold uppercase tracking-widest border-b border-slate-800/60 text-slate-400">Caixa</th>
                <th className="text-center w-[12.5%] px-5 py-4 text-xs font-bold uppercase tracking-widest border-b border-slate-800/60 text-slate-400">% Compromet.</th>
                <th className="text-right w-[12.5%] px-5 py-4 text-xs font-bold uppercase tracking-widest border-b border-slate-800/60 text-slate-400">Desempenho</th>
              </tr>
            </thead>
            <tbody>
              {processedData.length === 0 && (
                 <tr><td colSpan={7} className="text-center py-10 text-slate-500 font-medium text-sm">Nenhum dado financeiro processado para a origem selecionada.</td></tr>
              )}
              {processedData.map((row) => {
                let statusBg = "";
                let statusText = "";
                if (row.sobra > 0) { statusBg = "bg-emerald-950/40 text-emerald-400 border-emerald-900/50"; statusText = "Superávit"; }
                else if (row.sobra === 0) { statusBg = "bg-orange-950/40 text-orange-400 border-orange-900/50"; statusText = "Zerado"; }
                else { statusBg = "bg-red-950/40 text-red-500 border-red-900/50"; statusText = "Déficit"; }

                return (
                  <tr key={row.mes} className="hover:bg-slate-800/30 border-b border-slate-800/40 transition-colors group">
                    <td className="font-bold text-sm text-slate-200 px-5 py-4">{row.mes}</td>
                    <td className="text-right font-mono text-sm text-emerald-400 px-5 py-4 tracking-tight">{formatCurrency(row.entradas)}</td>
                    <td className="text-right font-mono text-sm text-red-500 px-5 py-4 tracking-tight">{formatCurrency(row.saidas)}</td>
                    <td className={`text-right font-mono text-sm font-bold px-5 py-4 ${row.sobra < 0 ? 'text-red-500' : 'text-emerald-400'}`}>{formatCurrency(row.sobra)}</td>
                    <td className="text-right font-mono text-sm font-black text-purple-400 px-5 py-4">{formatCurrency(row.acumulado)}</td>
                    <td className="text-center font-mono text-xs font-medium px-5 py-4 text-slate-400 bg-slate-900/10 group-hover:bg-transparent">{row.comprometimento.toFixed(1)}%</td>
                    <td className="text-right px-5 py-4">
                       <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-md border shadow-sm inline-block ${statusBg}`}>{statusText}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gradient-to-r from-purple-950/30 to-slate-900/80 text-purple-200 border-t-2 border-purple-900/50">
                <td className="font-black text-sm uppercase tracking-widest border-r border-slate-800/50 px-5 py-5 text-slate-100">BALANÇO TOTAL</td>
                <td className="text-right font-mono text-base font-black border-r border-slate-800/50 text-emerald-400 px-5 py-5">{formatCurrency(totals.entradas)}</td>
                <td className="text-right font-mono text-base font-black border-r border-slate-800/50 text-red-500 px-5 py-5">{formatCurrency(totals.saidas)}</td>
                <td className={`text-right font-mono text-base font-black border-r border-slate-800/50 px-5 py-5 ${totals.sobra < 0 ? 'text-red-500' : 'text-emerald-400'}`}>{formatCurrency(totals.sobra)}</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
