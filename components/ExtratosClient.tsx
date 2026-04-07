"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/types";
import { UploadCloud, FileText, CheckCircle2, ArrowRightLeft, Trash2, Loader2, Info, Bot, ListOrdered } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useExtratoQueue } from "@/contexts/ExtratoQueueContext";
import LancamentosPageClient from "./LancamentosPageClient";
import { useRouter } from "next/navigation";

interface ExtratoItem {
  id?: string;
  descricao: string;
  valor: number;
  tipo: string;
  data: string;
  categoria: string;
  status?: string;
}

export default function ExtratosClient({ userId, initialHistory, userCategories }: { userId: string, initialHistory: any[], userCategories: string[] }) {
  const [history, setHistory] = useState(initialHistory);
  const [activeTab, setActiveTab] = useState<"Upload" | "Planilha">("Upload");
  const { isUploading, uploadExtrato, previewItems, setPreviewItems } = useExtratoQueue();
  const supabase = createClient();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadExtrato(file);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
     if (!previewItems || previewItems.length === 0) return;
     const toastId = toast.loading("Registrando transações...");
     const payload = previewItems.map(item => {
        // Sanitize Valor
        let parsedVal = typeof item.valor === 'string' ? Number((item.valor as string).replace(/\./g, '').replace(',', '.')) : Number(item.valor);
        if (isNaN(parsedVal)) parsedVal = 0;
        const absValor = Math.abs(parsedVal);
        
        // Sanitize Tipo
        const isEntrada = String(item.tipo).toLowerCase().trim().includes("entrada");
        const finalTipo = isEntrada ? 'Entrada' : 'Saída';
        const finalValor = finalTipo === 'Saída' ? -absValor : absValor;

        // Sanitize Data
        let safeDate = item.data || new Date().toISOString().split('T')[0];
        if (safeDate.includes('/')) {
           const parts = safeDate.split('/');
           if (parts.length === 3) safeDate = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
        }

        return {
           user_id: userId,
           descricao: (item.descricao || "Lançamento via Extrato").substring(0, 255),
           valor: finalValor,
           tipo: finalTipo,
           data: safeDate,
           categoria: (item.categoria || "Outros").substring(0, 100),
           status: "Pago",
           recorrencia: "Única",
           parcela: "1/1",
           origem: "Extrato"
        };
     });
     
     const { data: inserted, error } = await supabase.from('ia_lancamentos').insert(payload).select();
     if (error) {
        console.error("Supabase Insert Error:", error);
        toast.error(`Erro: ${error.message || "Falha ao salvar."}`, { id: toastId, duration: 6000 });
     } else {
        toast.success("Importação concluída!", { id: toastId });
        setHistory([...(inserted || []), ...history].slice(0, 100));
        setPreviewItems(null);
     }
  };

  const handleDeleteHistory = async (id: string) => {
     if(!window.confirm("Deletar esta transação do extrato?")) return;
     const { error } = await supabase.from('ia_lancamentos').delete().eq('id', id);
     if (!error) {
        setHistory(history.filter(h => h.id !== id));
        toast.success("Excluída!");
     }
  };

  const router = useRouter();

  const handleDeleteAll = async () => {
     if(!window.confirm("APAGAR TODOS os lançamentos IA? Isso esvaziará a Planilha IA inteira.")) return;
     const toastId = toast.loading("Apagando...");
     const { error } = await supabase.from('ia_lancamentos').delete().eq('user_id', userId);
     if (error) { toast.error("Erro", { id: toastId }); }
     else { 
         setHistory([]); 
         toast.success("Todos os registros excluídos!", { id: toastId }); 
         router.refresh(); // FORCES THE SERVER TO CLEAR CACHE
     }
  };

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full pb-20 md:pb-0 h-full">

       {/* LOCAL TABS */}
       <div className="flex items-center gap-2 glass-card p-2 rounded-2xl w-max relative z-10 shrink-0">
          <button 
            onClick={() => setActiveTab("Upload")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'Upload' ? 'bg-purple-600/20 text-purple-400 shadow-[0_0_15px_rgba(147,51,234,0.3)] border border-purple-500/30' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}
          >
            <UploadCloud className="w-4 h-4"/>
            Importar
          </button>
          <button 
            onClick={() => setActiveTab("Planilha")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'Planilha' ? 'bg-emerald-600/20 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-500/30' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}
          >
            <ListOrdered className="w-4 h-4"/>
            Planilha Inteligente
          </button>
       </div>

       {activeTab === "Planilha" ? (
         <div className="flex-1 mt-2">
            <LancamentosPageClient 
              initialData={history}
              user_id={userId}
              userCategories={userCategories}
              tableName="ia_lancamentos"
              isReadOnly={true}
            />
         </div>
       ) : (
         <>
           {/* UPLOAD ZONE */}
       {!previewItems && (
         <div className="glass-card p-8 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 bg-purple-900/30 text-purple-400 rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(147,51,234,0.15)]">
               <UploadCloud className="w-7 h-7"/>
            </div>
            <h2 className="text-lg font-black text-slate-100 tracking-tight mb-1">Importar Extrato</h2>
            <p className="text-slate-500 text-xs max-w-md mx-auto mb-5">
               Arraste sua foto ou PDF do extrato bancário. A IA lerá todas as linhas e categorizará automaticamente.
            </p>
            
            <label className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-bold cursor-pointer transition-all active:scale-95 shadow-[0_0_15px_rgba(147,51,234,0.3)] flex items-center gap-2 text-sm">
               {isUploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</> : <><FileText className="w-4 h-4" /> Selecionar Arquivo</>}
               <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} disabled={isUploading}/>
            </label>
         </div>
       )}

       {/* PREVIEW */}
       {previewItems && (
         <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-5">
               <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" /> {previewItems.length} Transações Detectadas
               </h2>
               <div className="flex gap-2">
                  <button onClick={() => setPreviewItems(null)} className="px-3 py-1.5 text-xs font-bold text-slate-400 hover:bg-slate-800/50 rounded-lg transition-colors">
                     Cancelar
                  </button>
                  <button onClick={handleConfirmImport} className="px-4 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-[0_0_10px_rgba(16,185,129,0.2)] transition-all">
                     Salvar Tudo
                  </button>
               </div>
            </div>

            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                     <tr className="border-b border-slate-800 text-slate-500">
                        <th className="py-2.5 px-3 font-bold text-[9px] uppercase tracking-wider">Data</th>
                        <th className="py-2.5 px-3 font-bold text-[9px] uppercase tracking-wider">Descrição</th>
                        <th className="py-2.5 px-3 font-bold text-[9px] uppercase tracking-wider">Cat. / Tipo</th>
                        <th className="py-2.5 px-3 font-bold text-[9px] uppercase tracking-wider text-right">Valor</th>
                     </tr>
                  </thead>
                  <tbody>
                     {previewItems.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/20 transition-colors">
                           <td className="py-2.5 px-3 text-slate-400 text-xs">{item.data}</td>
                           <td className="py-2.5 px-3 text-slate-200 font-semibold text-xs">{item.descricao}</td>
                           <td className="py-2.5 px-3">
                              <span className="bg-slate-800/50 text-slate-400 px-1.5 py-0.5 rounded text-[10px] mr-1 border border-slate-700/50">{item.categoria}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${item.tipo === 'Entrada' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50' : 'bg-red-950/40 text-red-500 border-red-900/50'}`}>
                                 {item.tipo}
                              </span>
                           </td>
                           <td className={`py-2.5 px-3 text-right font-mono font-bold text-xs ${item.tipo === 'Entrada' ? 'text-emerald-400' : 'text-slate-300'}`}>
                              {formatCurrency(item.valor)}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
       )}

       {/* HISTORY */}
       {!previewItems && history.length > 0 && (
         <div className="glass-card overflow-hidden">
            <div className="bg-slate-900/40 border-b border-slate-800/60 px-5 py-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
               <div className="flex flex-col gap-0.5">
                  <h3 className="font-bold text-sm text-slate-300 flex items-center gap-2">
                     <ArrowRightLeft className="w-4 h-4 text-slate-500" /> Histórico de Extratos
                  </h3>
                  <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                    <Info className="w-3 h-3"/> Reflete no Resumo IA
                  </span>
               </div>
               <button onClick={handleDeleteAll}
                 className="px-3 py-1.5 text-[10px] font-bold text-red-500 bg-red-950/20 hover:bg-red-900/30 border border-red-900/30 rounded-lg transition-colors flex items-center gap-1">
                 <Trash2 className="w-3 h-3"/> Limpar Tudo
               </button>
            </div>
            
            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                     <tr className="border-b border-slate-800 text-slate-500">
                        <th className="py-2.5 px-5 font-bold text-[9px] uppercase tracking-wider">Data</th>
                        <th className="py-2.5 px-5 font-bold text-[9px] uppercase tracking-wider">Descrição</th>
                        <th className="py-2.5 px-5 font-bold text-[9px] uppercase tracking-wider">Tipo</th>
                        <th className="py-2.5 px-5 font-bold text-[9px] uppercase tracking-wider">Valor</th>
                        <th className="py-2.5 px-5 font-bold text-[9px] uppercase tracking-wider text-right">Ação</th>
                     </tr>
                  </thead>
                  <tbody>
                     {history.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/20 transition-colors">
                           <td className="py-2.5 px-5 text-slate-400 text-xs">{item.data?.split('-').length === 3 ? item.data.split('-').reverse().join('/') : item.data}</td>
                           <td className="py-2.5 px-5">
                              <p className="text-slate-200 font-semibold text-xs">{item.descricao}</p>
                              <p className="text-[10px] text-slate-600">{item.categoria}</p>
                           </td>
                           <td className="py-2.5 px-5">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${item.tipo === 'Entrada' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50' : 'bg-red-950/40 text-red-500 border-red-900/50'}`}>
                                 {item.tipo}
                              </span>
                           </td>
                           <td className={`py-2.5 px-5 font-mono font-bold text-xs ${item.tipo === 'Entrada' ? 'text-emerald-400' : 'text-slate-300'}`}>
                              {formatCurrency(Math.abs(item.valor))}
                           </td>
                           <td className="py-2.5 px-5 text-right">
                              <button onClick={() => handleDeleteHistory(item.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-colors">
                                 <Trash2 className="w-3.5 h-3.5"/>
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
       )}
       </>
       )}
    </div>
  );
}
