"use client";

import { useState, useMemo } from "react";
import DudaExcelTable from "./DudaExcelTable";
import { formatCurrency } from "@/lib/types";

interface Props {
  initialData: any[];
  user_id: string;
  userCategories: string[];
  tableName?: string;
  title?: string;
}

const MONTHS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", 
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

export default function PlanilhaDudaClient({ initialData, user_id, userCategories, tableName, title }: Props) {
  const [data, setData] = useState(initialData);
  const [filterType, setFilterType] = useState<string>("Todos");
  
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonthIndex, setCurrentMonthIndex] = useState(new Date().getMonth());
  
  const selectedMonthKey = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;

  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (!item.data || !item.data.startsWith(selectedMonthKey)) return false;
      if (filterType !== "Todos" && item.tipo !== filterType) return false;
      return true;
    }).sort((a, b) => {
      const diff = new Date(a.data).getTime() - new Date(b.data).getTime();
      if (diff === 0) return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      return diff;
    });
  }, [data, selectedMonthKey, filterType]);

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] w-full duda-container">
      
      {/* EXCEL TOP RIBBON */}
      <div className="flex flex-col border-b border-[#D4D4D4] bg-[#F3F3F3]">
        {/* Ribbon Tabs */}
        <div className="flex items-center pt-1 px-1 gap-1 text-[13px]">
          <div className="bg-[#217346] text-white px-4 py-1 pb-1.5 font-semibold cursor-pointer">ARQUIVO</div>
          <div className="bg-white text-[#217346] border-t border-l border-r border-[#D4D4D4] border-b-white px-4 py-1 pb-1.5 font-semibold cursor-pointer z-10 relative top-[1px]">PÁGINA INICIAL</div>
          <div className="text-[#333] hover:text-[#217346] px-4 py-1 font-semibold cursor-pointer">INSERIR</div>
          <div className="text-[#333] hover:text-[#217346] px-4 py-1 font-semibold cursor-pointer">LAYOUT DA PÁGINA</div>
          <div className="text-[#333] hover:text-[#217346] px-4 py-1 font-semibold cursor-pointer">FÓRMULAS</div>
          <div className="text-[#333] hover:text-[#217346] px-4 py-1 font-semibold cursor-pointer">DADOS</div>
          <div className="text-[#333] hover:text-[#217346] px-4 py-1 font-semibold cursor-pointer">REVISÃO</div>
          <div className="text-[#333] hover:text-[#217346] px-4 py-1 font-semibold cursor-pointer">EXIBIÇÃO</div>
        </div>
        
        {/* Ribbon Tools (Fake visual) */}
        <div className="bg-white border-t border-b border-[#D4D4D4] h-[80px] flex items-center px-4 gap-6">
           <div className="flex flex-col items-center justify-center text-[#555] cursor-not-allowed opacity-50">
             <div className="w-8 h-8 bg-gray-200 rounded mb-1 border border-gray-300 flex items-center justify-center">✂️</div>
             <span className="text-[10px]">Recortar</span>
           </div>
           <div className="flex flex-col items-center justify-center text-[#555] cursor-not-allowed opacity-50">
             <div className="w-8 h-8 bg-gray-200 rounded mb-1 border border-gray-300 flex items-center justify-center">📋</div>
             <span className="text-[10px]">Colar</span>
           </div>
           <div className="h-16 w-px bg-gray-300"></div>
           <div className="flex flex-col">
              <div className="flex gap-2">
                 <select className="border border-gray-300 text-sm px-2 py-0.5" disabled><option>Calibri</option></select>
                 <select className="border border-gray-300 text-sm px-2 py-0.5" disabled><option>12</option></select>
              </div>
              <div className="flex gap-1 mt-1 text-sm font-serif">
                 <button className="border border-transparent hover:border-gray-300 px-2 font-bold opacity-50 cursor-not-allowed">N</button>
                 <button className="border border-transparent hover:border-gray-300 px-2 italic opacity-50 cursor-not-allowed">I</button>
                 <button className="border border-transparent hover:border-gray-300 px-2 underline opacity-50 cursor-not-allowed">S</button>
              </div>
              <div className="text-[10px] text-center mt-1 text-gray-500">Fonte</div>
           </div>
           <div className="h-16 w-px bg-gray-300"></div>
           
           {/* Year Selector injected into ribbon! */}
           <div className="flex items-center gap-2">
             <span className="text-xs text-gray-600 font-semibold">ANO CONTÁBIL:</span>
             <button onClick={() => setCurrentYear(y => y - 1)} className="border border-gray-300 bg-gray-100 hover:bg-gray-200 px-2 rounded text-xs">◀</button>
             <span className="text-sm font-bold text-[#217346] w-12 text-center">{currentYear}</span>
             <button onClick={() => setCurrentYear(y => y + 1)} className="border border-gray-300 bg-gray-100 hover:bg-gray-200 px-2 rounded text-xs">▶</button>
           </div>
        </div>

        {/* Formula Bar */}
        <div className="bg-white flex items-center px-1 border-b border-[#D4D4D4] h-[26px]">
           <div className="w-10 text-center font-semibold text-gray-500 text-xs border-r border-[#D4D4D4] h-full flex items-center justify-center">fx</div>
           <div className="flex-1 px-3 text-gray-400 text-xs italic font-bold">
             {title || "Planilha Excel Oficial"}
           </div>
        </div>
        
        {/* EXCEL TOP TABS (MONTHS) */}
        <div className="h-[30px] bg-[#F3F3F3] border-b border-[#D4D4D4] flex items-center shrink-0 w-full overflow-x-auto no-scrollbar px-2 shadow-inner">
           <div className="flex items-center gap-2 mr-4 text-gray-500">
             <button className="hover:text-black">◀</button>
             <button className="hover:text-black">▶</button>
           </div>
           <div className="flex items-end h-full pt-1">
             {MONTHS.map((monthStr, idx) => {
               const isActive = currentMonthIndex === idx;
               return (
                 <button
                   key={idx}
                   onClick={() => setCurrentMonthIndex(idx)}
                   className={`
                      px-4 py-1 text-xs font-semibold border-t border-l border-r border-[#D4D4D4]
                      ${isActive 
                        ? "bg-white text-[#217346] border-b-transparent shadow-[0_-2px_0_#217346_inset] h-[26px]" 
                        : "bg-[#E6E6E6] text-gray-600 hover:bg-[#F3F3F3] h-[24px] mt-[2px]"}
                      rounded-t-sm mx-[1px] transition-colors whitespace-nowrap
                   `}
                   style={{ zIndex: isActive ? 10 : 1, marginBottom: isActive ? '-1px' : '0' }}
                 >
                   {monthStr} ({currentYear})
                 </button>
               );
             })}
             <button className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-200 ml-1 rounded">➕</button>
           </div>
        </div>
      </div>

      {/* SPREADSHEET AREA */}
      <div className="flex-1 overflow-auto bg-white relative no-scrollbar">
        <DudaExcelTable 
          initialData={filteredData} 
          userId={user_id} 
          userCategories={userCategories}
          tableName={tableName}
          onDataChange={(newData: any[]) => {
            const newIds = new Set(newData.map(n => n.id));
            const baseKeep = data.filter(d => !newIds.has(d.id) && !(d.data.startsWith(selectedMonthKey) && (filterType === 'Todos' || d.tipo === filterType)));
            setData([...baseKeep, ...newData]);
          }} 
          currentTabMonth={currentMonthIndex + 1}
          currentTabYear={currentYear}
        />
      </div>

      {/* EXCEL STATUS BAR WRAPPER - STICKY TO VP */}
      <div className="sticky bottom-16 md:bottom-0 z-50 flex flex-col w-full shadow-[0_-5px_20px_rgba(0,0,0,0.15)] md:shadow-none">
        <div className="h-[22px] bg-[#217346] text-white flex items-center justify-between px-4 text-[11px] shrink-0 pb-safe md:pb-0">
          <div className="flex items-center gap-4">
             <span>PRONTO</span>
          </div>
          <div className="flex items-center gap-4">
             <span>100%</span>
             <div className="flex gap-1 w-16 bg-white/20 h-1.5 mt-0.5 items-center">
               <div className="w-2 h-3 bg-white ml-8 shadow-sm"></div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
