"use client";

import { useState, useMemo } from "react";
import DudaExcelTable from "./DudaExcelTable";
import { formatCurrency } from "@/lib/types";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  initialData: any[];
  user_id: string;
  userCategories: string[];
}

const MONTHS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", 
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

export default function PlanilhaDudaClient({ initialData, user_id, userCategories }: Props) {
  const [data, setData] = useState(initialData);
  const [filterType, setFilterType] = useState<string>("Todos");
  const [search, setSearch] = useState("");
  
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonthIndex, setCurrentMonthIndex] = useState(new Date().getMonth());
  
  const selectedMonthKey = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;

  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (!item.data || !item.data.startsWith(selectedMonthKey)) return false;
      if (filterType !== "Todos" && item.tipo !== filterType) return false;
      if (search && !item.descricao.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).sort((a, b) => {
      const diff = new Date(a.data).getTime() - new Date(b.data).getTime();
      if (diff === 0) return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      return diff;
    });
  }, [data, selectedMonthKey, filterType, search]);

  const { mesEntradas, mesSaidas } = useMemo(() => {
    let tEntradas = 0;
    let tSaidas = 0;
    filteredData.forEach(l => {
      if (l.tipo === "Entrada") tEntradas += Number(l.valor);
      if (l.tipo === "Saída") tSaidas += Number(l.valor);
    });
    return { mesEntradas: tEntradas, mesSaidas: tSaidas, saldoAtual: tEntradas + tSaidas };
  }, [filteredData]);

  return (
    <div className="flex flex-col h-full w-full bg-[#020617]">
      {/* TOTALIZADORES DUDA */}
      <div className="w-full shrink-0 px-2 md:px-0">
        <div className="flex flex-col md:flex-row w-full bg-gradient-to-r from-pink-950/20 via-pink-900/10 to-[#020617] shadow-xl border-b-[2px] border-pink-600 overflow-hidden md:rounded-t mx-auto md:w-[calc(100%-16px)] mt-4">
          <div className="flex-1 p-2 md:p-3 border-b md:border-b-0 md:border-r border-white/5 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <div className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Total Entradas (Duda)</div>
            </div>
            <div className="text-emerald-400 text-base md:text-lg font-black font-mono tracking-tight">{formatCurrency(mesEntradas)}</div>
          </div>
          <div className="flex-1 p-2 md:p-3 border-b md:border-b-0 md:border-r border-white/5 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              <div className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Total Saídas (Duda)</div>
            </div>
            <div className="text-red-400 text-base md:text-lg font-black font-mono tracking-tight">{formatCurrency(mesSaidas)}</div>
          </div>
          <div className="flex-1 p-2 md:p-3 hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-500"></span>
              <div className="text-slate-400 text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Saldo (Duda)</div>
            </div>
            <div className={`text-base md:text-lg font-black font-mono tracking-tight ${(mesEntradas + mesSaidas) < 0 ? "text-red-400" : "text-white"}`}>
              {formatCurrency(mesEntradas + mesSaidas)}
            </div>
          </div>
        </div>
      </div>
      
      {/* HEADER NAV */}
      <div className="bg-slate-900/50 backdrop-blur-xl border-b border-slate-800 px-3 py-1.5 shrink-0 flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mt-1">
        <div className="flex items-center bg-slate-900/50 rounded-lg p-0.5 w-full md:w-auto justify-between md:justify-start border border-slate-800/60">
           <button onClick={() => setCurrentYear(y => y - 1)} className="p-1.5 md:p-1 hover:bg-slate-800 rounded transition-all text-slate-400">
             <ChevronLeft className="w-4 h-4 md:w-3.5 md:h-3.5"/>
           </button>
           <span className="font-bold text-slate-200 px-4 md:px-3 text-base md:text-sm">{currentYear}</span>
           <button onClick={() => setCurrentYear(y => y + 1)} className="p-1.5 md:p-1 hover:bg-slate-800 rounded transition-all text-slate-400">
             <ChevronRight className="w-4 h-4 md:w-3.5 md:h-3.5"/>
           </button>
        </div>

        <div className="flex flex-1 gap-0.5 md:gap-1 overflow-x-auto no-scrollbar justify-center">
           {MONTHS.map((monthStr, idx) => (
             <button
                key={idx}
                onClick={() => setCurrentMonthIndex(idx)}
                className={`px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-bold rounded-lg transition-all shrink-0 ${currentMonthIndex === idx ? 'bg-pink-600 text-white shadow-[0_0_15px_rgba(219,39,119,0.4)]' : 'bg-transparent text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}
             >
                {monthStr}
             </button>
           ))}
        </div>

        <div className="flex flex-wrap gap-1.5 w-full md:w-auto justify-center md:justify-end">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full md:w-32 lg:w-48 pl-7 pr-2 py-1.5 border border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-pink-500 bg-slate-900/80 text-slate-200 placeholder-slate-500 transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-2 relative">
        <DudaExcelTable 
          initialData={filteredData} 
          userId={user_id} 
          userCategories={userCategories}
          onDataChange={(newData: any[]) => {
            const newIds = new Set(newData.map(n => n.id));
            const baseKeep = data.filter(d => !newIds.has(d.id) && !(d.data.startsWith(selectedMonthKey) && (filterType === 'Todos' || d.tipo === filterType)));
            setData([...baseKeep, ...newData]);
          }} 
          currentTabMonth={currentMonthIndex + 1}
          currentTabYear={currentYear}
        />
      </div>
    </div>
  );
}
