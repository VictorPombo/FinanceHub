"use client";

import { useState, useMemo } from "react";
import DudaExcelTable from "./DudaExcelTable";
import { formatCurrency } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Copy, Scissors, Plus, X } from "lucide-react";

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
  
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonthIndex, setCurrentMonthIndex] = useState(new Date().getMonth());
  
  // Font States
  const [fontFamily, setFontFamily] = useState("Calibri");
  const [fontSize, setFontSize] = useState("12");
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  // Paste State
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const supabase = createClient();

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

  const handleCopy = () => {
     let csv = "Descricao\tCategoria\tValor\n";
     filteredData.forEach(d => {
         csv += `${d.descricao}\t${d.categoria}\t${d.valor}\n`;
     });
     navigator.clipboard.writeText(csv);
     toast.success("Planilha Mensal copiada (área de transferência).");
  };

  const processPaste = async () => {
     if (!pasteText.trim()) return;
     const toastId = toast.loading("Processando tabela...");
     
     const rows = pasteText.split('\n').filter(r => r.trim());
     const novasEntradas: any[] = [];
     const defaultDate = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}-01`;

     rows.forEach(row => {
         const cols = row.split('\t');
         if (cols.length >= 2) {
             const desc = cols[0]?.trim() || "";
             const cat = cols[1]?.trim() || "";
             const valStr = (cols[2] || "").replace(/[R$\s\.]/g, '').replace(',', '.');
             const val = Number(valStr) || 0;
             
             if (desc) {
                 novasEntradas.push({
                     user_id: user_id,
                     data: defaultDate,
                     descricao: desc,
                     categoria: cat,
                     tipo: val >= 0 ? "Entrada" : "Saída",
                     recorrencia: "Única",
                     parcela: "1/1",
                     valor: Math.abs(val),
                     status: "Em aberto",
                     ordem: 999 
                 });
             }
         }
     });

     if (novasEntradas.length === 0) {
         toast.error("Nenhum dado válido reconhecido.", { id: toastId });
         return;
     }

     const { data: inserted, error } = await supabase.from("duda_lancamentos").insert(novasEntradas).select();
     if (error) {
         toast.error("Erro ao salvar", { id: toastId });
     } else {
         toast.success(`${inserted?.length || 0} novas linhas coladas!`, { id: toastId });
         setData([...data, ...(inserted || [])]);
         setShowPasteModal(false);
         setPasteText("");
     }
  };

  const tableStyles: React.CSSProperties = {
     fontFamily: fontFamily === "Calibri" ? "sans-serif" : "inherit",
     fontSize: `${fontSize}px`,
     fontWeight: isBold ? 'bold' : 'normal',
     fontStyle: isItalic ? 'italic' : 'normal',
     textDecoration: isUnderline ? 'underline' : 'none'
  };

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] w-full duda-container">
      
      {/* EXCEL TOP RIBBON */}
      <div className="flex flex-col border-b border-[#D4D4D4] bg-[#F3F3F3]">
        {/* Ribbon Tabs */}
        <div className="flex items-center pt-1 px-1 gap-1 text-[13px] overflow-x-auto no-scrollbar">
          <div className="bg-[#217346] text-white px-4 py-1 pb-1.5 font-semibold cursor-pointer shrink-0">ARQUIVO</div>
          <div className="bg-white text-[#217346] border-t border-l border-r border-[#D4D4D4] border-b-white px-4 py-1 pb-1.5 font-semibold cursor-pointer z-10 relative top-[1px] shrink-0">PÁGINA INICIAL</div>
          <div className="text-[#333] hover:text-[#217346] hover:bg-gray-200 px-4 py-1 font-semibold cursor-pointer transition-colors shrink-0">INSERIR</div>
          <div className="text-[#333] hover:text-[#217346] hover:bg-gray-200 px-4 py-1 font-semibold cursor-pointer transition-colors shrink-0">LAYOUT DA PÁGINA</div>
          <div className="text-[#333] hover:text-[#217346] hover:bg-gray-200 px-4 py-1 font-semibold cursor-pointer transition-colors shrink-0">FÓRMULAS</div>
          <div className="text-[#333] hover:text-[#217346] hover:bg-gray-200 px-4 py-1 font-semibold cursor-pointer transition-colors shrink-0">DADOS</div>
          <div className="text-[#333] hover:text-[#217346] hover:bg-gray-200 px-4 py-1 font-semibold cursor-pointer transition-colors shrink-0">REVISÃO</div>
          <div className="text-[#333] hover:text-[#217346] hover:bg-gray-200 px-4 py-1 font-semibold cursor-pointer transition-colors shrink-0">EXIBIÇÃO</div>
        </div>
        
        {/* Ribbon Tools */}
        <div className="bg-white border-t border-b border-[#D4D4D4] h-[80px] flex items-center px-4 gap-6 overflow-x-auto no-scrollbar shrink-0">
           <div className="flex gap-4">
               {/* Controls Hoverable */}
               <button onClick={() => toast("Selecione uma célula para Recortar", { icon: '✂️' })} className="flex flex-col items-center justify-center text-[#555] hover:text-[#217346] transition-colors group">
                 <div className="w-8 h-8 bg-[#F3F4F6] group-hover:bg-[#E5E7EB] group-active:bg-gray-300 rounded mb-1 border border-gray-300 flex items-center justify-center transition-all bg-opacity-80"><Scissors className="w-4 h-4 text-[#555] group-hover:text-[#217346]" /></div>
                 <span className="text-[10px]">Recortar</span>
               </button>
               <button onClick={() => setShowPasteModal(true)} className="flex flex-col items-center justify-center text-[#555] hover:text-[#217346] transition-colors group">
                 <div className="w-8 h-8 bg-[#F3F4F6] group-hover:bg-[#E5E7EB] group-active:bg-gray-300 rounded mb-1 border border-gray-300 flex items-center justify-center transition-all bg-opacity-80"><Copy className="w-4 h-4 text-[#555] group-hover:text-[#217346]" /></div>
                 <span className="text-[10px]">Colar Tabela</span>
               </button>
           </div>
           
           <div className="h-16 w-px bg-gray-300 shrink-0"></div>
           
           <div className="flex flex-col shrink-0">
              <div className="flex gap-2">
                 <select value={fontFamily} onChange={e => setFontFamily(e.target.value)} className="border border-gray-300 text-sm px-2 py-0.5 hover:border-gray-400 cursor-pointer outline-none focus:border-[#217346]">
                     <option value="Calibri">Calibri</option>
                     <option value="Arial">Arial</option>
                     <option value="Times New Roman">Times New Roman</option>
                 </select>
                 <select value={fontSize} onChange={e => setFontSize(e.target.value)} className="border border-gray-300 text-sm px-2 py-0.5 hover:border-gray-400 cursor-pointer outline-none focus:border-[#217346]">
                     <option value="10">10</option>
                     <option value="11">11</option>
                     <option value="12">12</option>
                     <option value="14">14</option>
                 </select>
              </div>
              <div className="flex gap-1 mt-1 text-sm font-serif">
                 <button onClick={() => setIsBold(!isBold)} className={`border px-2 font-bold transition-colors cursor-pointer ${isBold ? 'border-gray-400 bg-gray-200' : 'border-transparent hover:border-gray-300'}`}>N</button>
                 <button onClick={() => setIsItalic(!isItalic)} className={`border px-2 italic transition-colors cursor-pointer ${isItalic ? 'border-gray-400 bg-gray-200' : 'border-transparent hover:border-gray-300'}`}>I</button>
                 <button onClick={() => setIsUnderline(!isUnderline)} className={`border px-2 underline transition-colors cursor-pointer ${isUnderline ? 'border-gray-400 bg-gray-200' : 'border-transparent hover:border-gray-300'}`}>S</button>
              </div>
              <div className="text-[10px] text-center mt-1 text-gray-500">Fonte</div>
           </div>
           
           <div className="h-16 w-px bg-gray-300 shrink-0"></div>
           
           {/* Year Selector injected into ribbon! */}
           <div className="flex items-center gap-2 shrink-0">
             <span className="text-xs text-gray-600 font-semibold">ANO CONTÁBIL:</span>
             <button onClick={() => setCurrentYear(y => y - 1)} className="border border-gray-300 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 px-3 py-1 rounded text-xs transition-colors cursor-pointer shadow-sm">◀</button>
             <input type="number" value={currentYear} onChange={e => setCurrentYear(Number(e.target.value))} className="text-sm font-bold text-[#217346] w-14 text-center outline-none border border-transparent hover:border-gray-300 rounded focus:border-[#217346] py-0.5" />
             <button onClick={() => setCurrentYear(y => y + 1)} className="border border-gray-300 bg-gray-100 hover:bg-gray-200 active:bg-gray-300 px-3 py-1 rounded text-xs transition-colors cursor-pointer shadow-sm">▶</button>
           </div>
        </div>

        {/* Formula Bar */}
        <div className="bg-white flex items-center px-1 border-b border-[#D4D4D4] h-[26px]">
           <div className="w-10 text-center font-semibold text-gray-500 text-xs border-r border-[#D4D4D4] h-full flex items-center justify-center">fx</div>
           <input type="text" className="flex-1 px-3 text-gray-600 text-xs italic outline-none" value={"=SUM(L1:L) - SUM(R1:R)"} readOnly />
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
      <div className="flex-1 overflow-auto bg-white relative no-scrollbar" style={tableStyles}>
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

      {showPasteModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200">
             <div className="flex justify-between items-center bg-[#217346] text-white p-4">
                <h3 className="font-bold flex items-center gap-2 font-sans"><Copy className="w-4 h-4"/> Importar do Excel</h3>
                <button onClick={() => setShowPasteModal(false)} className="hover:bg-white/20 p-1 rounded transition-colors"><X className="w-5 h-5"/></button>
             </div>
             <div className="p-5 font-sans">
                <p className="text-gray-600 text-sm mb-3">
                  Copie suas linhas do Excel contendo <strong>Descrição</strong>, <strong>Categoria</strong> e <strong>Valor</strong> e cole abaixo. 
                  (A coluna Valor determinará Entrada/Saída).
                </p>
                <textarea 
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                  className="w-full h-40 border border-gray-300 rounded-md p-3 text-sm focus:border-[#217346] focus:ring-1 focus:ring-[#217346] outline-none resize-none mx-auto block text-black"
                  placeholder="Exemplo:\nPadaria   Alimentação   -20.50\nSalario   Receita      4500.00"
                ></textarea>
                <div className="mt-5 flex justify-end gap-2">
                   <button onClick={() => setShowPasteModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm font-semibold transition-colors">Cancelar</button>
                   <button onClick={processPaste} className="px-4 py-2 bg-[#217346] text-white rounded-md hover:bg-[#1a5c38] text-sm font-semibold transition-colors shadow-sm">Importar Dados</button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
