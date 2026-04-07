"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/types";
import { UploadCloud, FileText, CheckCircle2, ArrowRightLeft, Trash2, Loader2, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { useExtratoQueue } from "@/contexts/ExtratoQueueContext";

interface ExtratoItem {
  id?: string;
  descricao: string;
  valor: number;
  tipo: string;
  data: string;
  categoria: string;
  status?: string; // used locally before saving
}

export default function ExtratosClient({ userId, initialHistory }: { userId: string, initialHistory: any[] }) {
  const [history, setHistory] = useState(initialHistory);
  const { isUploading, uploadExtrato, previewItems, setPreviewItems } = useExtratoQueue();
  
  const supabase = createClient();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Fire and Forget para Background
    uploadExtrato(file);
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
     if (!previewItems || previewItems.length === 0) return;
     
     const toastId = toast.loading("Registrando transações...");
     
     // Build Payload
     const payload = previewItems.map(item => {
        const absValor = Math.abs(Number(item.valor));
        const finalValor = item.tipo === 'Saída' ? -absValor : absValor;
        return {
           user_id: userId,
           descricao: item.descricao,
           valor: finalValor,
           tipo: item.tipo,
           data: item.data || new Date().toISOString().split('T')[0],
           categoria: item.categoria || "Outros",
           status: "Pago", // Extrato already happened usually
           recorrencia: "Única",
           parcela: "1/1",
           origem: "Extrato" // The Magic Key!
        };
     });

     const { data: inserted, error } = await supabase.from('lancamentos').insert(payload).select();
     
     if (error) {
        toast.error("Erro ao salvar no banco de dados.", { id: toastId });
     } else {
        toast.success("Importação Concluída com sucesso!", { id: toastId });
        setHistory([...(inserted || []), ...history].slice(0, 100)); // Update history
        setPreviewItems(null);
     }
  };

  const handleDeleteHistory = async (id: string) => {
     if(!window.confirm("Deseja deletar essa transação do extrato importado? O valor será removido do saldo.")) return;
     const { error } = await supabase.from('lancamentos').delete().eq('id', id);
     if (!error) {
        setHistory(history.filter(h => h.id !== id));
        toast.success("Transação excluída!");
     }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
       
       {!previewItems && (
         <div className="bg-[#0B1121]/90 backdrop-blur-xl rounded-2xl p-8 shadow-sm border border-slate-800/80 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-purple-900/30 text-purple-400 rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(147,51,234,0.2)]">
               <UploadCloud className="w-8 h-8"/>
            </div>
            <h2 className="text-xl font-bold text-slate-100 tracking-tight mb-2">Importar Arquivo de Extrato</h2>
            <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
               Arraste sua foto ou PDF do extrato bancário aqui. Nossa IA lerá todas as linhas e categorizará sozinho.
            </p>
            
            <label className="bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-bold cursor-pointer transition-colors shadow-[0_0_15px_rgba(147,51,234,0.4)] hover:shadow-[0_0_25px_rgba(147,51,234,0.6)] flex items-center gap-2">
               {isUploading ? <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</> : <><FileText className="w-5 h-5" /> Selecionar Arquivo</>}
               <input 
                  type="file" 
                  accept="image/*,application/pdf"
                  className="hidden" 
                  onChange={handleFileUpload}
                  disabled={isUploading}
               />
            </label>
         </div>
       )}

       {/* PREVIEW MODE AFTER UPLOAD */}
       {previewItems && (
         <div className="bg-[#0B1121]/90 backdrop-blur-xl rounded-2xl p-6 shadow-sm border border-slate-800/80">
            <div className="flex items-center justify-between mb-6">
               <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Transações Detectadas ({previewItems.length})
               </h2>
               <div className="flex gap-2">
                  <button onClick={() => setPreviewItems(null)} className="px-4 py-2 text-sm font-bold text-slate-400 hover:bg-slate-800/50 rounded-lg transition-colors">
                     Cancelar
                  </button>
                  <button onClick={handleConfirmImport} className="px-4 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all">
                     Confirmar e Salvar Tudo
                  </button>
               </div>
            </div>

            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                     <tr className="border-b border-slate-800 text-slate-500">
                        <th className="py-3 px-4 font-bold text-[10px] uppercase tracking-wider">Data</th>
                        <th className="py-3 px-4 font-bold text-[10px] uppercase tracking-wider">Descrição</th>
                        <th className="py-3 px-4 font-bold text-[10px] uppercase tracking-wider">Categoria / Tipo</th>
                        <th className="py-3 px-4 font-bold text-[10px] uppercase tracking-wider text-right">Valor</th>
                     </tr>
                  </thead>
                  <tbody>
                     {previewItems.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30 transition-colors">
                           <td className="py-3 px-4 text-slate-400">{item.data}</td>
                           <td className="py-3 px-4 text-slate-200 font-semibold">{item.descricao}</td>
                           <td className="py-3 px-4">
                              <span className="bg-slate-800/50 text-slate-400 px-2 py-1 rounded text-xs mr-2 border border-slate-700/50">{item.categoria}</span>
                              <span className={`px-2 py-1 rounded text-xs font-bold border ${item.tipo === 'Entrada' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50' : 'bg-red-950/40 text-red-500 border-red-900/50'}`}>
                                 {item.tipo}
                              </span>
                           </td>
                           <td className={`py-3 px-4 text-right font-mono font-bold ${item.tipo === 'Entrada' ? 'text-emerald-400' : 'text-slate-300'}`}>
                              {formatCurrency(item.valor)}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
       )}

       {/* HISTORY VIEWER */}
       {!previewItems && history.length > 0 && (
         <div className="bg-[#0B1121]/50 rounded-2xl shadow-sm border border-slate-800/80 overflow-hidden backdrop-blur-sm">
            <div className="bg-slate-900/40 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
               <h3 className="font-bold text-slate-300 flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-slate-500" /> Histórico de Extratos Automáticos
               </h3>
               <span className="text-xs text-slate-400 font-medium bg-slate-800/50 px-2 py-1 rounded border border-slate-700/50 shadow-sm flex items-center gap-1">
                 <Info className="w-3 h-3"/> Reflete no Resumo
               </span>
            </div>
            
            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                     <tr className="border-b border-slate-800 text-slate-500">
                        <th className="py-3 px-6 font-bold text-[10px] uppercase tracking-wider">Data</th>
                        <th className="py-3 px-6 font-bold text-[10px] uppercase tracking-wider">Descrição / Categoria</th>
                        <th className="py-3 px-6 font-bold text-[10px] uppercase tracking-wider">Tipo</th>
                        <th className="py-3 px-6 font-bold text-[10px] uppercase tracking-wider">Valor</th>
                        <th className="py-3 px-6 font-bold text-[10px] uppercase tracking-wider text-right">Ação</th>
                     </tr>
                  </thead>
                  <tbody>
                     {history.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30 transition-colors">
                           <td className="py-3 px-6 text-slate-400">{item.data.split('-').length === 3 ? item.data.split('-').reverse().join('/') : item.data}</td>
                           <td className="py-3 px-6">
                              <p className="text-slate-200 font-semibold">{item.descricao}</p>
                              <p className="text-xs text-slate-500">{item.categoria}</p>
                           </td>
                           <td className="py-3 px-6">
                              <span className={`px-2 py-1 rounded text-xs font-bold border ${item.tipo === 'Entrada' ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50' : 'bg-red-950/40 text-red-500 border-red-900/50'}`}>
                                 {item.tipo}
                              </span>
                           </td>
                           <td className={`py-3 px-6 font-mono font-bold ${item.tipo === 'Entrada' ? 'text-emerald-400' : 'text-slate-300'}`}>
                              {formatCurrency(Math.abs(item.valor))}
                           </td>
                           <td className="py-3 px-6 text-right">
                              <button onClick={() => handleDeleteHistory(item.id)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors">
                                 <Trash2 className="w-4 h-4"/>
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         </div>
       )}

    </div>
  );
}
