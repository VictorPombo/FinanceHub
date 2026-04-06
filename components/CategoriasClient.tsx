"use client";

import { useMemo } from "react";
import { formatCurrency, CATEGORIAS } from "@/lib/types";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface Props {
  initialData: any[];
}

const COLORS = [
  "#2563EB", "#16A34A", "#DC2626", "#D97706", "#7C3AED",
  "#0891B2", "#DB2777", "#4F46E5", "#059669", "#E11D48", "#475569"
];

export default function CategoriasClient({ initialData }: Props) {
  
  const metrics = useMemo(() => {
    let totalOverallSaidas = 0;
    const catMap: Record<string, { entradas: number, saidas: number }> = {};
    CATEGORIAS.forEach(c => catMap[c] = { entradas: 0, saidas: 0 });

    initialData.forEach(l => {
      const cat = l.categoria || "Outros";
      if (!catMap[cat]) catMap[cat] = { entradas: 0, saidas: 0 };
      
      if (l.tipo === "Entrada") {
        catMap[cat].entradas += Number(l.valor);
      } else if (l.tipo === "Saída") {
        catMap[cat].saidas += Math.abs(Number(l.valor));
        totalOverallSaidas += Math.abs(Number(l.valor));
      }
    });

    const result = Object.keys(catMap).map(c => {
      const p = catMap[c];
      const saldo = p.entradas - p.saidas;
      const perc = totalOverallSaidas > 0 ? (p.saidas / totalOverallSaidas) * 100 : 0;
      return { 
        categoria: c, 
        entradas: p.entradas, 
        saidas: p.saidas, 
        saldo, 
        perc 
      };
    }).sort((a,b) => b.saidas - a.saidas); // Order by saidas desc

    return result;
  }, [initialData]);

  // Data for the Pie Chart - Only include categories with Saídas
  const pieData = metrics.filter(m => m.saidas > 0).map(m => ({
    name: m.categoria,
    value: m.saidas
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-sm rounded">
          <p className="font-semibold text-sm mb-1">{payload[0].name}</p>
          <p className="text-[#EF4444] font-mono text-sm">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-white">
      {/* Table Section */}
      <div className="w-full md:w-1/2 flex flex-col h-full overflow-auto border-r border-[#2563EB]">
        <table className="excel-table w-full relative">
          <thead>
            <tr>
              <th className="text-left w-[25%] bg-[#1C2B4A]">Categoria</th>
              <th className="text-right w-[20%]">Total Entradas</th>
              <th className="text-right w-[20%]">Total Saídas</th>
              <th className="text-right w-[20%]">Saldo</th>
              <th className="text-center w-[15%]">% das Saídas</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((row, i) => (
              <tr key={row.categoria} className="hover:bg-gray-50 border-b border-gray-200">
                <td className="font-medium text-gray-700">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pieData.find(p => p.name === row.categoria) ? COLORS[i % COLORS.length] : '#E5E7EB' }}></div>
                    {row.categoria}
                  </div>
                </td>
                <td className="text-right font-mono text-[#166534]">{formatCurrency(row.entradas)}</td>
                <td className="text-right font-mono text-[#EF4444]">{formatCurrency(row.saidas)}</td>
                <td className={`text-right font-mono font-semibold ${row.saldo < 0 ? 'text-[#EF4444]' : row.saldo > 0 ? 'text-[#166534]' : 'text-gray-400'}`}>
                  {formatCurrency(row.saldo)}
                </td>
                <td className="text-center font-mono text-sm text-gray-500">{row.perc.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Analytics Section */}
      <div className="w-full md:w-1/2 h-full flex flex-col p-8 bg-[#F8FAFC] shadow-inner relative z-10">
        <div className="glass-card flex-1 w-full min-h-[300px] p-6 flex flex-col hover:shadow-premium-hover transition-all duration-300">
          <h2 className="text-sm font-extrabold text-slate-500 mb-6 shrink-0 uppercase tracking-widest text-center">Distribuição Exata de Saídas</h2>
          <div className="flex-1 w-full relative">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius="60%"
                  outerRadius="80%"
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center"
                  wrapperStyle={{ fontSize: '11px', paddingTop: '20px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-slate-400 italic font-medium text-sm">
              Nenhuma saída classificada
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
