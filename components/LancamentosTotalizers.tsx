"use client";

import { useMemo } from "react";
import { formatCurrency } from "@/lib/types";

interface Props {
  lancamentos: any[];
  currentMonthKey: string;
}

export default function LancamentosTotalizers({ lancamentos, currentMonthKey }: Props) {
  // Calculated dynamically
  const { totalEntradas, totalSaidas, saldoAtual, mesEntradas, mesSaidas } = useMemo(() => {
    let tEntradas = 0;
    let tSaidas = 0;
    let mEntradas = 0;
    let mSaidas = 0;

    lancamentos.forEach(l => {
      if (l.status === "Pago") {
        if (l.tipo === "Entrada") tEntradas += Number(l.valor);
        if (l.tipo === "Saída") tSaidas += Number(l.valor); // valor is negative in DB

        // Check if it matches current month YYYY-MM
        if (l.data.startsWith(currentMonthKey)) {
          if (l.tipo === "Entrada") mEntradas += Number(l.valor);
          if (l.tipo === "Saída") mSaidas += Number(l.valor);
        }
      }
    });

    return {
      totalEntradas: tEntradas,
      totalSaidas: tSaidas,
      saldoAtual: tEntradas + tSaidas, // Note: Saidas are negative in DB
      mesEntradas: mEntradas,
      mesSaidas: mSaidas,
    };
  }, [lancamentos, currentMonthKey]);

  return (
    <div className="w-full shrink-0 px-2 md:px-0">
      <div className="flex flex-col md:flex-row w-full bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] shadow-md border-b-[2px] border-blue-500 overflow-hidden md:rounded-t mx-auto md:w-[calc(100%-16px)] mt-1">
        <div className="flex-1 p-2 md:p-3 border-b md:border-b-0 md:border-r border-white/10 hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            <div className="text-slate-300 text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Total Entradas</div>
          </div>
          <div className="text-[#34D399] text-base md:text-lg font-black font-mono tracking-tight">{formatCurrency(totalEntradas)}</div>
        </div>
        <div className="flex-1 p-2 md:p-3 border-b md:border-b-0 md:border-r border-white/10 hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
            <div className="text-slate-300 text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Total Saídas</div>
          </div>
          <div className="text-[#F87171] text-base md:text-lg font-black font-mono tracking-tight">{formatCurrency(totalSaidas)}</div>
        </div>
        <div className="flex-1 p-2 md:p-3 hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            <div className="text-slate-300 text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Saldo Atual</div>
          </div>
          <div className={`text-base md:text-lg font-black font-mono tracking-tight ${saldoAtual < 0 ? "text-[#F87171]" : "text-white"}`}>
            {formatCurrency(saldoAtual)}
          </div>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row w-full bg-slate-100 border-b border-x border-slate-200 mx-auto md:w-[calc(100%-16px)] shadow-inner md:rounded-none overflow-hidden text-xs">
        <div className="flex-1 px-3 md:px-4 py-1.5 border-b md:border-b-0 md:border-r border-slate-200 flex items-center justify-between">
          <span className="text-slate-500 text-[9px] md:text-[10px] font-semibold uppercase tracking-widest">Mês Oculto</span>
          <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[9px] md:text-[10px] font-bold">Atual</span>
        </div>
        <div className="flex-1 px-3 md:px-4 py-1.5 border-b md:border-b-0 md:border-r border-slate-200 flex items-center justify-between">
          <span className="text-slate-500 text-[9px] md:text-[10px] font-semibold uppercase tracking-widest">Entradas (mês)</span>
          <span className="text-slate-800 text-xs md:text-sm font-black font-mono">{formatCurrency(mesEntradas)}</span>
        </div>
        <div className="flex-1 px-3 md:px-4 py-1.5 flex items-center justify-between">
          <span className="text-slate-500 text-[9px] md:text-[10px] font-semibold uppercase tracking-widest">Saídas (mês)</span>
          <span className="text-red-500 text-xs md:text-sm font-black font-mono">{formatCurrency(mesSaidas)}</span>
        </div>
      </div>
    </div>
  );
}
