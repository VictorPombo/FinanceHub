"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line 
} from "recharts";

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
      {/* Settings Panel */}
      <div className="glass-card p-6 flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
        <div className="flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">Painel Executivo Mensal</h2>
          <p className="text-sm text-slate-500 font-medium">Configure seu saldo inicial e acompanhe a evolução patrimonial</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          <label className="text-sm font-semibold text-slate-700 pl-2">Saldo Inicial:</label>
          <div className="relative group">
            <span className="absolute left-3 top-[7px] text-slate-400 text-sm font-bold">R$</span>
            <input
              type="number"
              value={saldoInicialStr}
              onChange={(e) => setSaldoInicialStr(e.target.value)}
              onBlur={handleUpdateSaldo}
              className="pl-9 pr-4 py-1.5 border border-slate-200 bg-slate-50 hover:bg-white rounded-md text-sm outline-none focus:ring-2 focus:ring-blue-500/50 font-mono w-36 transition-all shadow-inner font-bold text-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Grid Table */}
      <div className="bg-white border-x border-t border-gray-200 overflow-hidden mb-6">
        <table className="excel-table w-full">
          <thead>
            <tr>
              <th className="text-left w-[15%]">Mês</th>
              <th className="text-right w-[15%]">Total Entradas</th>
              <th className="text-right w-[15%]">Total Saídas</th>
              <th className="text-right w-[15%]">Sobra do Mês</th>
              <th className="text-right w-[15%]">Acumulado</th>
              <th className="text-center w-[12.5%]">% Comprometida</th>
              <th className="text-center w-[12.5%]">Status</th>
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
                  <td className="font-medium text-gray-700">{row.mes}</td>
                  <td className="text-right font-mono text-[#166534]">{formatCurrency(row.entradas)}</td>
                  <td className="text-right font-mono text-[#EF4444]">{formatCurrency(row.saidas)}</td>
                  <td className="text-right font-mono font-semibold">{formatCurrency(row.sobra)}</td>
                  <td className="text-right font-mono font-bold text-[#1C2B4A]">{formatCurrency(row.acumulado)}</td>
                  <td className="text-center font-mono text-sm">{row.comprometimento.toFixed(1)}%</td>
                  <td className={`text-center font-semibold text-xs ${statusBg}`}>{statusText}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-[#1C2B4A] text-white">
              <td className="font-bold border-r border-[#2a3f65]">TOTAL GERAL</td>
              <td className="text-right font-mono font-bold border-r border-[#2a3f65] text-green-300">{formatCurrency(totals.entradas)}</td>
              <td className="text-right font-mono font-bold border-r border-[#2a3f65] text-red-300">{formatCurrency(totals.saidas)}</td>
              <td className="text-right font-mono font-bold border-r border-[#2a3f65]">{formatCurrency(totals.sobra)}</td>
              <td colSpan={3}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Charts Box */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10 mt-6">
        <div className="glass-card p-6 h-96 flex flex-col hover:shadow-premium-hover transition-shadow duration-300">
          <div className="flex items-center gap-2 mb-6">
            <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Entradas vs Saídas</h3>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="mes" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickFormatter={(val) => `R$${val/1000}k`} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend iconType="circle" />
              <Bar dataKey="entradas" name="Entradas" fill="#22C55E" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saidas" name="Saídas" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6 h-96 flex flex-col hover:shadow-premium-hover transition-shadow duration-300">
          <div className="flex items-center gap-2 mb-6">
            <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Evolução do Acumulado</h3>
          </div>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="mes" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickFormatter={(val) => `R$${val/1000}k`} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend iconType="circle" />
              <Line type="monotone" dataKey="acumulado" name="Acumulado Histórico" stroke="#2563EB" strokeWidth={3} dot={{ r: 4, fill: '#2563EB', strokeWidth: 2, stroke: '#fff' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
