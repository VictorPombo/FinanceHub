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
      if (l.status === "Pago" || l.status === "Em aberto") {
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
      <div className="flex flex-col md:flex-row w-full bg-gradient-to-r from-[#09090b] via-[#18181b] to-[#09090b] shadow-xl border-b-[2px] border-violet-600 overflow-hidden md:rounded-t mx-auto md:w-[calc(100%-16px)] mt-1">
        <div className="flex-1 p-2 md:p-3 border-b md:border-b-0 md:border-r border-white/5 hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]"></span>
            <div className="text-zinc-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Total Entradas</div>
          </div>
          <div className="text-emerald-400 text-base md:text-lg font-black font-mono tracking-tight">{formatCurrency(totalEntradas)}</div>
        </div>
        <div className="flex-1 p-2 md:p-3 border-b md:border-b-0 md:border-r border-white/5 hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></span>
            <div className="text-zinc-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Total Saídas</div>
          </div>
          <div className="text-red-400 text-base md:text-lg font-black font-mono tracking-tight">{formatCurrency(totalSaidas)}</div>
        </div>
        <div className="flex-1 p-2 md:p-3 hover:bg-white/5 transition-colors">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]"></span>
            <div className="text-zinc-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Saldo Atual</div>
          </div>
          <div className={`text-base md:text-lg font-black font-mono tracking-tight ${saldoAtual < 0 ? "text-red-400" : "text-white"}`}>
            {formatCurrency(saldoAtual)}
          </div>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row w-full bg-[#09090b] border-b border-x border-zinc-800 mx-auto md:w-[calc(100%-16px)] md:rounded-b overflow-hidden text-xs">
        <div className="flex-1 px-3 md:px-4 py-1.5 border-b md:border-b-0 md:border-r border-zinc-800 flex items-center justify-between">
          <span className="text-zinc-500 text-[9px] md:text-[10px] font-semibold uppercase tracking-widest">Mês Oculto</span>
          <span className="bg-violet-900/40 border border-violet-800/50 text-violet-400 px-1.5 py-0.5 rounded text-[9px] md:text-[10px] font-bold shadow-sm">Atual</span>
        </div>
        <div className="flex-1 px-3 md:px-4 py-1.5 border-b md:border-b-0 md:border-r border-zinc-800 flex items-center justify-between">
          <span className="text-zinc-500 text-[9px] md:text-[10px] font-semibold uppercase tracking-widest">Entradas (mês)</span>
          <span className="text-emerald-400 text-xs md:text-sm font-black font-mono">{formatCurrency(mesEntradas)}</span>
        </div>
        <div className="flex-1 px-3 md:px-4 py-1.5 flex items-center justify-between">
          <span className="text-zinc-500 text-[9px] md:text-[10px] font-semibold uppercase tracking-widest">Saídas (mês)</span>
          <span className="text-red-400 text-xs md:text-sm font-black font-mono">{formatCurrency(mesSaidas)}</span>
        </div>
      </div>
    </div>
  );
}
