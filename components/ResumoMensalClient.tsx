"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { 
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line 
} from "recharts";
import { TrendingUp, TrendingDown, CheckCircle2, Clock, BarChart } from "lucide-react";

interface ResumoMes {
  mes: string;
  entradas: number;
  saidas: number;
  sobra: number;
  acumulado: number;
  comprometimento: number;
}

interface Props {
  data: ResumoMes[];
  config: { id: string; saldo_inicial: number } | null;
  user_id: string;
}

export default function ResumoMensalClient({ data, config, user_id }: Props) {
  const [saldoInicialStr, setSaldoInicialStr] = useState(config?.saldo_inicial?.toString() || "0");
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
      if (error) toast.error("Erro ao salvar saldo");
      else toast.success("Saldo inicial criado");
    }
  };

  const totals = data.reduce(
    (acc, c) => {
      acc.entradas += c.entradas;
      acc.saidas += c.saidas;
      acc.sobra += c.sobra;
      return acc;
    },
    { entradas: 0, saidas: 0, sobra: 0 }
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 bg-[#020617]">
      {/* GranaZen Style Soft Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
        <div className="bg-[#0B1121]/90 backdrop-blur-xl rounded-2xl p-5 shadow-lg border border-slate-800/80 flex flex-col hover:shadow-[0_0_20px_rgba(147,51,234,0.15)] transition-all">
          <div className="flex items-center gap-2 text-slate-400 mb-1 font-medium text-sm">
             <span className="text-purple-400 bg-purple-900/30 p-1.5 rounded-lg shadow-[0_0_10px_rgba(147,51,234,0.2)]"><BarChart className="w-4 h-4"/></span>
             Acumulado Geral
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight mt-2 mb-4">
             {formatCurrency(totals.sobra + Number(saldoInicialStr))}
          </div>
          <div className="flex items-center gap-3 mt-auto bg-slate-900/50 border border-slate-800 p-2 rounded-xl">
             <div className="flex flex-col">
               <span className="text-[10px] text-slate-500 font-bold uppercase">Saldo Inicial</span>
               <div className="flex items-center gap-1">
                 <span className="text-xs font-mono font-bold text-slate-400">R$</span>
                 <input
                   type="number"
                   value={saldoInicialStr}
                   onChange={(e) => setSaldoInicialStr(e.target.value)}
                   onBlur={handleUpdateSaldo}
                   className="w-20 bg-transparent border-b border-slate-700 outline-none focus:border-purple-500 font-mono text-xs font-bold text-slate-200 transition-colors"
                 />
               </div>
             </div>
          </div>
        </div>

        <div className="bg-[#0B1121]/90 backdrop-blur-xl rounded-2xl p-5 shadow-lg border border-slate-800/80 flex flex-col hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all">
          <div className="flex items-center gap-2 text-slate-400 mb-1 font-medium text-sm">
             <span className="text-emerald-400 bg-emerald-950/40 p-1.5 rounded-lg border border-emerald-900/50"><TrendingUp className="w-4 h-4"/></span>
             Receitas
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight mt-2 mb-4">
             {formatCurrency(totals.entradas)}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-auto">
             <div className="flex flex-col bg-emerald-950/20 border border-emerald-900/30 p-2 rounded-xl">
               <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Recebido</span>
               <span className="text-xs font-mono font-bold text-emerald-400 mt-1">{formatCurrency(totals.entradas)}</span>
             </div>
             <div className="flex flex-col bg-slate-900/40 border border-slate-800 p-2 rounded-xl">
               <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1"><Clock className="w-3 h-3"/> A receber</span>
               <span className="text-xs font-mono font-bold text-slate-400 mt-1">R$ 0,00</span>
             </div>
          </div>
        </div>

        <div className="bg-[#0B1121]/90 backdrop-blur-xl rounded-2xl p-5 shadow-lg border border-slate-800/80 flex flex-col hover:shadow-[0_0_20px_rgba(239,68,68,0.15)] transition-all">
          <div className="flex items-center gap-2 text-slate-400 mb-1 font-medium text-sm">
             <span className="text-red-400 bg-red-950/40 p-1.5 rounded-lg border border-red-900/50"><TrendingDown className="w-4 h-4"/></span>
             Despesas
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-100 tracking-tight mt-2 mb-4">
             {formatCurrency(Math.abs(totals.saidas))}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-auto">
             <div className="flex flex-col bg-slate-900/40 border border-slate-800 p-2 rounded-xl">
               <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Pago</span>
               <span className="text-xs font-mono font-bold text-slate-400 mt-1">R$ 0,00</span>
             </div>
             <div className="flex flex-col bg-red-950/20 border border-red-900/30 p-2 rounded-xl">
               <span className="text-[10px] text-red-500 font-bold flex items-center gap-1"><Clock className="w-3 h-3"/> A pagar</span>
               <span className="text-xs font-mono font-bold text-red-400 mt-1">{formatCurrency(Math.abs(totals.saidas))}</span>
             </div>
          </div>
        </div>
      </div>

      {/* Charts Box */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
        <div className="bg-[#0B1121]/90 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-800/80 p-5 h-80 flex flex-col hover:shadow-[0_0_20px_rgba(147,51,234,0.15)] transition-all">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-bold text-slate-300 tracking-tight">Entradas vs Saídas</h3>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
              <XAxis dataKey="mes" fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
              <YAxis fontSize={10} tickFormatter={(val) => `R$${val/1000}k`} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
              <Tooltip formatter={(value: any) => formatCurrency(Number(value))} cursor={{fill: '#0f172a'}} contentStyle={{backgroundColor: '#020617', borderRadius: '12px', borderColor: '#1e293b', color: '#f8fafc', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)'}} />
              <Legend iconType="circle" wrapperStyle={{fontSize: '11px', color: '#94a3b8'}} />
              <Bar dataKey="entradas" name="Entradas" fill="#34d399" radius={[4, 4, 0, 0]} barSize={12} />
              <Bar dataKey="saidas" name="Saídas" fill="#f87171" radius={[4, 4, 0, 0]} barSize={12} />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[#0B1121]/90 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-800/80 p-5 h-80 flex flex-col hover:shadow-[0_0_20px_rgba(147,51,234,0.15)] transition-all">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-bold text-slate-300 tracking-tight">Evolução Histórica</h3>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
              <XAxis dataKey="mes" fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
              <YAxis fontSize={10} tickFormatter={(val) => `R$${val/1000}k`} tickLine={false} axisLine={false} tick={{fill: '#94a3b8'}} />
              <Tooltip formatter={(value: any) => formatCurrency(Number(value))} contentStyle={{backgroundColor: '#020617', borderRadius: '12px', borderColor: '#1e293b', color: '#f8fafc', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.5)'}} />
              <Legend iconType="circle" wrapperStyle={{fontSize: '11px', color: '#94a3b8'}} />
              <Line type="monotone" dataKey="acumulado" name="Saldo Acumulado" stroke="#a855f7" strokeWidth={3} dot={{ r: 4, fill: '#a855f7', strokeWidth: 2, stroke: '#1e293b' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid Table */}
      <div className="bg-[#0B1121]/90 backdrop-blur-xl border border-slate-800/80 overflow-hidden mb-6 rounded-xl shadow-lg">
        <table className="excel-table w-full">
          <thead>
            <tr>
              <th className="text-left w-[15%] px-4 py-3 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 text-slate-300">Mês</th>
              <th className="text-right w-[15%] px-4 py-3 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 text-slate-300">Total Entradas</th>
              <th className="text-right w-[15%] px-4 py-3 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 text-slate-300">Total Saídas</th>
              <th className="text-right w-[15%] px-4 py-3 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 text-slate-300">Sobra do Mês</th>
              <th className="text-right w-[15%] px-4 py-3 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 text-slate-300">Acumulado</th>
              <th className="text-center w-[12.5%] px-4 py-3 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 text-slate-300">% Comprometida</th>
              <th className="text-center w-[12.5%] px-4 py-3 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 text-slate-300">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              let statusBg = "";
              let statusText = "";
              if (row.sobra > 0) { statusBg = "bg-emerald-950/40 text-emerald-400 border border-emerald-900/50 rounded"; statusText = "Positivo"; }
              else if (row.sobra === 0) { statusBg = "bg-orange-950/40 text-orange-400 border border-orange-900/50 rounded"; statusText = "Zerado"; }
              else { statusBg = "bg-red-950/40 text-red-500 border border-red-900/50 rounded"; statusText = "Negativo"; }

              return (
                <tr key={row.mes} className="hover:bg-slate-800/30 border-b border-slate-800/60 transition-colors">
                  <td className="font-medium text-slate-300 px-4 py-3">{row.mes}</td>
                  <td className="text-right font-mono text-emerald-400 px-4 py-3">{formatCurrency(row.entradas)}</td>
                  <td className="text-right font-mono text-red-400 px-4 py-3">{formatCurrency(row.saidas)}</td>
                  <td className={`text-right font-mono font-semibold px-4 py-3 ${row.sobra < 0 ? 'text-red-400' : 'text-emerald-400'}`}>{formatCurrency(row.sobra)}</td>
                  <td className="text-right font-mono font-bold text-purple-400 px-4 py-3">{formatCurrency(row.acumulado)}</td>
                  <td className="text-center font-mono text-sm px-4 py-3 text-slate-400">{row.comprometimento.toFixed(1)}%</td>
                  <td className="text-center px-4 py-3">
                     <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${statusBg}`}>{statusText}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-purple-950/40 text-purple-200 border-t border-purple-900/50 backdrop-blur-md">
              <td className="font-bold border-r border-purple-900/50 px-4 py-4">TOTAL GERAL</td>
              <td className="text-right font-mono font-bold border-r border-purple-900/50 text-emerald-400 px-4 py-4">{formatCurrency(totals.entradas)}</td>
              <td className="text-right font-mono font-bold border-r border-purple-900/50 text-red-400 px-4 py-4">{formatCurrency(totals.saidas)}</td>
              <td className="text-right font-mono font-bold border-r border-purple-900/50 px-4 py-4">{formatCurrency(totals.sobra)}</td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
