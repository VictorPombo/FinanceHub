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
    <div className="flex flex-col h-full overflow-y-auto p-6 bg-[#F8FAFC]">
      {/* GranaZen Style Soft Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/50 flex flex-col hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-slate-500 mb-1 font-medium text-sm">
             <span className="text-blue-500 bg-blue-50 p-1.5 rounded-lg"><BarChart className="w-4 h-4"/></span>
             Acumulado Geral
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight mt-2 mb-4">
             {formatCurrency(totals.sobra + Number(saldoInicialStr))}
          </div>
          <div className="flex items-center gap-3 mt-auto bg-slate-50 p-2 rounded-xl">
             <div className="flex flex-col">
               <span className="text-[10px] text-slate-400 font-bold uppercase">Saldo Inicial</span>
               <div className="flex items-center gap-1">
                 <span className="text-xs font-mono font-bold text-slate-600">R$</span>
                 <input
                   type="number"
                   value={saldoInicialStr}
                   onChange={(e) => setSaldoInicialStr(e.target.value)}
                   onBlur={handleUpdateSaldo}
                   className="w-20 bg-transparent border-b border-slate-300 outline-none focus:border-blue-500 font-mono text-xs font-bold text-slate-700"
                 />
               </div>
             </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/50 flex flex-col hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-slate-500 mb-1 font-medium text-sm">
             <span className="text-emerald-500 bg-emerald-50 p-1.5 rounded-lg"><TrendingUp className="w-4 h-4"/></span>
             Receitas
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight mt-2 mb-4">
             {formatCurrency(totals.entradas)}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-auto">
             <div className="flex flex-col bg-emerald-50/50 p-2 rounded-xl">
               <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Recebido</span>
               <span className="text-xs font-mono font-bold text-emerald-700 mt-1">{formatCurrency(totals.entradas)}</span>
             </div>
             <div className="flex flex-col bg-slate-50 p-2 rounded-xl">
               <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1"><Clock className="w-3 h-3"/> A receber</span>
               <span className="text-xs font-mono font-bold text-slate-600 mt-1">R$ 0,00</span>
             </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100/50 flex flex-col hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-slate-500 mb-1 font-medium text-sm">
             <span className="text-red-500 bg-red-50 p-1.5 rounded-lg"><TrendingDown className="w-4 h-4"/></span>
             Despesas
          </div>
          <div className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight mt-2 mb-4">
             {formatCurrency(Math.abs(totals.saidas))}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-auto">
             <div className="flex flex-col bg-slate-50 p-2 rounded-xl">
               <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> Pago</span>
               <span className="text-xs font-mono font-bold text-slate-600 mt-1">R$ 0,00</span>
             </div>
             <div className="flex flex-col bg-red-50/50 p-2 rounded-xl">
               <span className="text-[10px] text-red-600 font-bold flex items-center gap-1"><Clock className="w-3 h-3"/> A pagar</span>
               <span className="text-xs font-mono font-bold text-red-700 mt-1">{formatCurrency(Math.abs(totals.saidas))}</span>
             </div>
          </div>
        </div>
      </div>

      {/* Charts Box */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 p-5 h-80 flex flex-col hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-bold text-slate-700 tracking-tight">Entradas vs Saídas</h3>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="mes" fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#64748b'}} />
              <YAxis fontSize={10} tickFormatter={(val) => `R$${val/1000}k`} tickLine={false} axisLine={false} tick={{fill: '#64748b'}} />
              <Tooltip formatter={(value: any) => formatCurrency(Number(value))} cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Legend iconType="circle" wrapperStyle={{fontSize: '11px'}} />
              <Bar dataKey="entradas" name="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={12} />
              <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={12} />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100/50 p-5 h-80 flex flex-col hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-sm font-bold text-slate-700 tracking-tight">Evolução Histórica</h3>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="mes" fontSize={10} tickLine={false} axisLine={false} tick={{fill: '#64748b'}} />
              <YAxis fontSize={10} tickFormatter={(val) => `R$${val/1000}k`} tickLine={false} axisLine={false} tick={{fill: '#64748b'}} />
              <Tooltip formatter={(value: any) => formatCurrency(Number(value))} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
              <Legend iconType="circle" wrapperStyle={{fontSize: '11px'}} />
              <Line type="monotone" dataKey="acumulado" name="Saldo Acumulado" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid Table */}
      <div className="bg-white border-x border-t border-gray-200 overflow-hidden mb-6 rounded-xl shadow-sm">
        <table className="excel-table w-full">
          <thead>
            <tr>
              <th className="text-left w-[15%] px-4 py-3 bg-slate-50 border-b border-slate-200">Mês</th>
              <th className="text-right w-[15%] px-4 py-3 bg-slate-50 border-b border-slate-200">Total Entradas</th>
              <th className="text-right w-[15%] px-4 py-3 bg-slate-50 border-b border-slate-200">Total Saídas</th>
              <th className="text-right w-[15%] px-4 py-3 bg-slate-50 border-b border-slate-200">Sobra do Mês</th>
              <th className="text-right w-[15%] px-4 py-3 bg-slate-50 border-b border-slate-200">Acumulado</th>
              <th className="text-center w-[12.5%] px-4 py-3 bg-slate-50 border-b border-slate-200">% Comprometida</th>
              <th className="text-center w-[12.5%] px-4 py-3 bg-slate-50 border-b border-slate-200">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              let statusBg = "";
              let statusText = "";
              if (row.sobra > 0) { statusBg = "bg-green-100"; statusText = "✅ Positivo"; }
              else if (row.sobra === 0) { statusBg = "bg-yellow-100"; statusText = "⚠️ Zerado"; }
              else { statusBg = "bg-red-100"; statusText = "❌ Negativo"; }

              return (
                <tr key={row.mes} className="hover:bg-gray-50 border-b border-gray-200">
                  <td className="font-medium text-gray-700 px-4 py-3">{row.mes}</td>
                  <td className="text-right font-mono text-[#166534] px-4 py-3">{formatCurrency(row.entradas)}</td>
                  <td className="text-right font-mono text-[#EF4444] px-4 py-3">{formatCurrency(row.saidas)}</td>
                  <td className="text-right font-mono font-semibold px-4 py-3">{formatCurrency(row.sobra)}</td>
                  <td className="text-right font-mono font-bold text-[#1C2B4A] px-4 py-3">{formatCurrency(row.acumulado)}</td>
                  <td className="text-center font-mono text-sm px-4 py-3">{row.comprometimento.toFixed(1)}%</td>
                  <td className={`text-center font-semibold text-xs px-2 py-3 ${statusBg}`}>{statusText}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-[#1C2B4A] text-white">
              <td className="font-bold border-r border-[#2a3f65] px-4 py-4">TOTAL GERAL</td>
              <td className="text-right font-mono font-bold border-r border-[#2a3f65] text-green-300 px-4 py-4">{formatCurrency(totals.entradas)}</td>
              <td className="text-right font-mono font-bold border-r border-[#2a3f65] text-red-300 px-4 py-4">{formatCurrency(totals.saidas)}</td>
              <td className="text-right font-mono font-bold border-r border-[#2a3f65] px-4 py-4">{formatCurrency(totals.sobra)}</td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
