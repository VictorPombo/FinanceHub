"use client";

import { useState, useMemo } from "react";
import LancamentosTotalizers from "./LancamentosTotalizers";
import LancamentosTable from "./LancamentosTable";
import { getMesAnoKey } from "@/lib/types";
import { Search, ChevronLeft, ChevronRight, Bot, MessageSquareText, X, Save } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  initialData: any[];
  user_id: string;
  userCategories: string[];
  tableName?: string;
  isReadOnly?: boolean;
}

const MONTHS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun", 
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

export default function LancamentosPageClient({ initialData, user_id, userCategories, tableName, isReadOnly }: Props) {
  const [data, setData] = useState(initialData);
  const [filterType, setFilterType] = useState<string>("Todos");
  const [filterStatus, setFilterStatus] = useState<string>("Todos");
  const [search, setSearch] = useState("");
  const [aiTextModalOpen, setAiTextModalOpen] = useState(false);
  const [aiTextInput, setAiTextInput] = useState("");
  const [isParsingText, setIsParsingText] = useState(false);
  const [parsingStatusMsg, setParsingStatusMsg] = useState("");
  
  // Year and Month State
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonthIndex, setCurrentMonthIndex] = useState(new Date().getMonth());
  
  const selectedMonthKey = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;

  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (!item.data || !item.data.startsWith(selectedMonthKey)) return false;
      if (item.origem === 'Extrato') return false;
      if (filterType !== "Todos" && item.tipo !== filterType) return false;
      if (filterStatus !== "Todos" && item.status !== filterStatus) return false;
      if (search && !item.descricao.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).sort((a, b) => {
      const diff = new Date(a.data).getTime() - new Date(b.data).getTime();
      if (diff === 0) return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
      return diff;
    });
  }, [data, selectedMonthKey, filterType, filterStatus, search]);

  // ======== TEXTO IA HANDLER (Background with persistent banner) ========
  const handleTextoIA = () => {
    if (!aiTextInput.trim()) { toast.error("Insira o texto primeiro"); return; }
    
    const textToProcess = aiTextInput;
    const yearToProcess = currentYear;
    
    setAiTextModalOpen(false);
    setAiTextInput("");
    setIsParsingText(true);
    setParsingStatusMsg("🤖 Analisando texto com Inteligência Artificial...");
    
    (async () => {
      try {
        const res = await fetch('/api/parse-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: textToProcess, currentYear: yearToProcess })
        });
        const aiData = await res.json();
        if (!res.ok) throw new Error(aiData.error || 'Erro na IA');
        if (!aiData.transactions || aiData.transactions.length === 0) {
          toast.error("Nenhuma transação identificada no texto.");
          setIsParsingText(false);
          setParsingStatusMsg("");
          return;
        }

        setParsingStatusMsg(`✅ ${aiData.transactions.length} transações encontradas! Salvando no banco...`);
        
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const targetTable = tableName || 'lancamentos';
        
        const payloads = aiData.transactions.map((tx: any) => {
          let finalVal = Number(tx.valor) || 0;
          finalVal = tx.tipo === 'Saída' ? -Math.abs(finalVal) : Math.abs(finalVal);
          
          let safeDate = tx.data || `${yearToProcess}-${String(currentMonthIndex+1).padStart(2,'0')}-01`;
          if (safeDate.includes('/')) {
            const parts = safeDate.split('/');
            if (parts.length === 3) safeDate = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
            if (parts.length === 2) safeDate = `${yearToProcess}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
          }
          if (safeDate.includes('-')) {
            const p = safeDate.split('-');
            if(p.length === 3) safeDate = `${p[0]}-${p[1].padStart(2,'0')}-${p[2].padStart(2,'0')}`;
          }

          return {
            user_id: user_id,
            descricao: tx.descricao || 'Desconhecido',
            valor: finalVal,
            data: safeDate,
            status: "Pago",
            tipo: tx.tipo,
            categoria: tx.categoria || "Outros",
            recorrencia: tx.recorrencia || "Única",
            parcela: "1/1"
          };
        });

        const { data: insertedRows, error } = await supabase.from(targetTable).insert(payloads).select();
        if (error) throw error;

        setData(prev => [...(insertedRows || []), ...prev]);
        
        if (insertedRows && insertedRows.length > 0) {
          const firstDate = insertedRows[0].data;
          if (firstDate) {
            const [yearStr, monthStr] = firstDate.split('-');
            if (monthStr && yearStr) {
              setCurrentMonthIndex(Number(monthStr) - 1);
              setCurrentYear(Number(yearStr));
            }
          }
        }
        
        toast.success(`${insertedRows?.length} transações inseridas com sucesso!`, { duration: 5000 });
        setParsingStatusMsg(`🎉 ${insertedRows?.length} lançamentos adicionados com sucesso!`);
        setTimeout(() => { setIsParsingText(false); setParsingStatusMsg(""); }, 4000);
        
      } catch (err: any) {
        toast.error(err.message);
        setParsingStatusMsg("");
        setIsParsingText(false);
      }
    })();
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#020617]">
      
      {/* ====== PERSISTENT AI LOADING BANNER ====== */}
      {isParsingText && (
        <div className="bg-gradient-to-r from-purple-900/90 via-indigo-900/90 to-purple-900/90 border-b border-purple-500/40 px-4 py-3 flex items-center justify-center gap-3 shrink-0 z-50 shadow-[0_4px_20px_rgba(147,51,234,0.3)]">
          <div className="w-4 h-4 border-2 border-purple-300 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-purple-100 text-sm font-bold tracking-wide">{parsingStatusMsg}</span>
        </div>
      )}
      
      <LancamentosTotalizers 
        lancamentos={filteredData} 
        currentMonthKey={selectedMonthKey} 
      />
      
      {/* YEAR, MONTHS TABS AND FILTERS */}
      <div className="bg-slate-900/50 backdrop-blur-xl border-b border-slate-800 px-3 py-1.5 shrink-0 flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
        
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
                className={`px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-bold rounded-lg transition-all shrink-0 ${currentMonthIndex === idx ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]' : 'bg-transparent text-slate-500 hover:bg-slate-800 hover:text-slate-300'}`}
             >
                {monthStr}
             </button>
           ))}
        </div>

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
                placeholder="Buscar..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full md:w-32 lg:w-48 pl-7 pr-2 py-1.5 border border-slate-800 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-purple-500 bg-slate-900/80 text-slate-200 placeholder-slate-500 transition-all"
              />
            </div>
            
            {!isReadOnly && (
              <>
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
                        const dbPayload = {
                          user_id: user_id,
                          descricao: aiData.descricao,
                          valor: aiData.tipo === "Saída" ? -Math.abs(aiData.valor) : Math.abs(aiData.valor),
                          data: aiData.data || new Date().toISOString().split('T')[0],
                          status: "Pago",
                          tipo: aiData.tipo || "Saída",
                          categoria: "Outros"
                        };
                        import('@/lib/supabase/client').then(async ({ createClient }) => {
                           const supabase = createClient();
                           const targetTable = tableName || 'lancamentos';
                           const { data: inserted, error } = await supabase.from(targetTable).insert([dbPayload]).select().single();
                           if (error) throw error;
                           setData([inserted, ...data]);
                           toast.success('Lançamento inserido!', { id: toastId });
                        });
                      } catch (err: any) {
                        toast.error(err.message, { id: toastId });
                      } finally {
                        e.target.value = '';
                      }
                    }}
                  />
                  <Bot className="w-4 h-4"/>
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] whitespace-nowrap px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    Scanner IA
                  </div>
                </label>

                <button 
                  onClick={() => setAiTextModalOpen(true)}
                  disabled={isParsingText}
                  className={`flex items-center justify-center w-8 h-[28px] text-white rounded cursor-pointer transition-colors shadow-sm relative group ${isParsingText ? 'bg-purple-900 animate-pulse' : 'bg-purple-600 hover:bg-purple-700'}`}
                >
                  <MessageSquareText className="w-4 h-4"/>
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] whitespace-nowrap px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    {isParsingText ? 'Processando...' : 'Texto IA'}
                  </div>
                </button>
              </>
            )}
            
            <button 
              onClick={async () => {
                 if(!window.confirm(`ATENÇÃO: Deseja APAGAR TODOS os dados desta aba?`)) return;
                 const toastId = toast.loading("Apagando...");
                 const { createClient } = await import('@/lib/supabase/client');
                 const supabase = createClient();
                 const targetTable = tableName || 'lancamentos';
                 const { error } = await supabase.from(targetTable).delete().eq('user_id', user_id);
                 if (error) { toast.error("Erro.", { id: toastId }); }
                 else { setData([]); toast.success("Apagado!", { id: toastId }); }
              }}
              className="flex items-center justify-center w-8 h-[28px] bg-red-950/40 hover:bg-red-800 border border-red-900/50 text-red-500 hover:text-white rounded cursor-pointer transition-colors shadow-sm relative group"
            >
               <span className="text-[12px] font-black">X</span>
               <div className="absolute -top-10 right-0 bg-red-900/90 border border-red-500 text-white text-[10px] whitespace-nowrap px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[100]">
                 Deletar Tudo
               </div>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-2">
        <LancamentosTable 
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

      {/* AI TEXT PARSING MODAL */}
      {aiTextModalOpen && (
         <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
            <div className="bg-[#0f172a] border border-slate-700 rounded-3xl shadow-2xl p-6 w-full max-w-2xl flex flex-col gap-4">
               <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-3">
                     <div className="p-2 bg-purple-600/20 text-purple-400 rounded-xl">
                        <MessageSquareText className="w-5 h-5"/>
                     </div>
                     <div>
                       <h2 className="text-xl font-black text-slate-200">Importação via Texto (IA)</h2>
                       <p className="text-xs text-slate-400 font-medium mt-1">Cole textos financeiros. A IA extrairá todas as transações automaticamente.</p>
                     </div>
                  </div>
                  <button onClick={() => setAiTextModalOpen(false)} className="p-2 bg-slate-800/50 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all">
                     <X className="w-5 h-5" />
                  </button>
               </div>

               <textarea 
                  value={aiTextInput}
                  onChange={(e) => setAiTextInput(e.target.value)}
                  placeholder={`Exemplo:\n\nEntradas:\nJoão da Silva R$350,00 12/05\nPiscina R$ 100,00 05/05\n\nSaídas:\nAluguel R$ 1.200,00 10/04\niFood R$ 45,90 03/04`}
                  className="w-full h-64 bg-slate-900/50 border border-slate-800 rounded-2xl p-4 text-slate-300 text-sm font-mono outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 resize-none no-scrollbar"
               />

               <div className="flex justify-end gap-3 mt-2">
                  <button 
                     onClick={handleTextoIA}
                     className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl px-6 py-3 font-bold shadow-lg shadow-purple-900/20 active:scale-95 transition-all"
                  >
                     <Bot className="w-5 h-5"/> GERAR LANÇAMENTOS
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
