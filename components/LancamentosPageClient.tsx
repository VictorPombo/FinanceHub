"use client";

import { useState, useMemo } from "react";
import LancamentosTotalizers from "./LancamentosTotalizers";
import LancamentosTable from "./LancamentosTable";
import { getMesAnoKey } from "@/lib/types";
import { Search, ChevronLeft, ChevronRight, Bot } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  initialData: any[];
  user_id: string;
}

const MONTHS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", 
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

export default function LancamentosPageClient({ initialData, user_id }: Props) {
  const [data, setData] = useState(initialData);
  const [filterType, setFilterType] = useState<string>("Todos");
  const [filterStatus, setFilterStatus] = useState<string>("Todos");
  const [search, setSearch] = useState("");
  
  // Year and Month State
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonthIndex, setCurrentMonthIndex] = useState(new Date().getMonth()); // 0-11
  
  const selectedMonthKey = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;

  // Filter Data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      // item.data -> "YYYY-MM-DD"
      if (!item.data || !item.data.startsWith(selectedMonthKey)) return false;
      if (item.origem === 'Extrato') return false;
      if (filterType !== "Todos" && item.tipo !== filterType) return false;
      if (filterStatus !== "Todos" && item.status !== filterStatus) return false;
      if (search && !item.descricao.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).sort((a, b) => {
      const diff = new Date(a.data).getTime() - new Date(b.data).getTime();
      if (diff === 0) {
        return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      }
      return diff;
    });
  }, [data, selectedMonthKey, filterType, filterStatus, search]);

  return (
    <div className="flex flex-col h-full w-full bg-[#020617]">
      <LancamentosTotalizers 
        lancamentos={filteredData} 
        currentMonthKey={selectedMonthKey} 
      />
      
      {/* YEAR, MONTHS TABS AND FILTERS */}
      <div className="bg-slate-900/50 backdrop-blur-xl border-b border-slate-800 px-3 py-1.5 shrink-0 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
        
        {/* Year Selector */}
        <div className="flex items-center bg-slate-900/50 rounded-lg p-0.5 w-full md:w-auto justify-between md:justify-start border border-slate-800/60">
           <button onClick={() => setCurrentYear(y => y - 1)} className="p-1.5 md:p-1 hover:bg-slate-800 rounded transition-all text-slate-400">
             <ChevronLeft className="w-4 h-4 md:w-3.5 md:h-3.5"/>
           </button>
           <span className="font-bold text-slate-200 px-4 md:px-3 text-base md:text-sm">{currentYear}</span>
           <button onClick={() => setCurrentYear(y => y + 1)} className="p-1.5 md:p-1 hover:bg-slate-800 rounded transition-all text-slate-400">
             <ChevronRight className="w-4 h-4 md:w-3.5 md:h-3.5"/>
           </button>
        </div>

        {/* The 12 Months Tabs */}
        <div className="flex flex-1 gap-0.5 md:gap-1 overflow-x-auto no-scrollbar justify-center">
           {MONTHS.map((monthStr, idx) => (
             <button
                key={idx}
                onClick={() => setCurrentMonthIndex(idx)}
                className={`px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-bold rounded-lg transition-all shrink-0 ${currentMonthIndex === idx ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]' : 'bg-transparent text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}
             >
                {monthStr}
             </button>
           ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto justify-center md:justify-end">
          <select 
            value={filterStatus} 
            onChange={e => setFilterStatus(e.target.value)}
            className="flex-1 md:flex-none text-xs border border-slate-800 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-slate-900/80 text-slate-200"
          >
            <option value="Todos">Todos Status</option>
            <option value="Pago">Pago</option>
            <option value="Em aberto">Em aberto</option>
          </select>

          <div className="relative w-full md:w-auto flex items-center gap-1">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar Transações..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full md:w-32 lg:w-48 pl-7 pr-2 py-1.5 border border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 bg-slate-900/80 text-slate-200 placeholder-slate-500 transition-all"
              />
            </div>
            
            <label className="flex items-center justify-center w-8 h-[28px] bg-indigo-600 hover:bg-indigo-700 text-white rounded cursor-pointer transition-colors shadow-sm relative group">
              <input 
                type="file" 
                accept="image/*,application/pdf"
                className="hidden" 
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  
                  const toastId = toast.loading('Lendo comprovante com IA...');
                  try {
                    const formData = new FormData();
                    formData.append('file', file);
                    
                    const res = await fetch('/api/vision', { method: 'POST', body: formData });
                    const aiData = await res.json();
                    
                    if (!res.ok || !aiData.descricao || aiData.valor === undefined) {
                       throw new Error(aiData.error || 'Não foi possível extrair os dados');
                    }
                    
                    // Insert directly to supabase
                    const dbPayload = {
                      user_id: user_id,
                      descricao: aiData.descricao,
                      valor: aiData.tipo === "Saída" ? -Math.abs(aiData.valor) : Math.abs(aiData.valor),
                      data: aiData.data || new Date().toISOString().split('T')[0],
                      status: "Pago",
                      tipo: aiData.tipo || "Saída",
                      categoria: "Outros", // AI could extract this too in the future
                      criado_por: "Upload IA"
                    };
                    
                    // Use client to insert
                    import('@/lib/supabase/client').then(async ({ createClient }) => {
                       const supabase = createClient();
                       const { data: inserted, error } = await supabase.from('lancamentos').insert([dbPayload]).select().single();
                       if (error) throw error;
                       
                       setData([inserted, ...data]);
                       toast.success('Leitura Concluída e Lançamento inserido!', { id: toastId });
                    });
                    
                  } catch (err: any) {
                    toast.error(err.message, { id: toastId });
                  } finally {
                    e.target.value = ''; // Reset file input
                  }
                }}
              />
              <span className="text-sm rounded-md"><Bot className="w-4 h-4"/></span>
              
              {/* Tooltip */}
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] whitespace-nowrap px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Scanner de Comprovante IA
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-2">
        <LancamentosTable 
          initialData={filteredData} 
          userId={user_id} 
          onDataChange={(newData: any[]) => {
            // Need to update the MASTER list (data), not just the filtered.
            // Since onDataChange currently acts like it returns exactly the same items but modified/inserted,
            // we have to merge them carefully.
            
            // To simplify direct mutation without losing unrelated data:
            // Let's pass the newly appended items or deeply merge.
            // Actually, if LancamentosTable passes back just the filtered slice + insertions:
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
