"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/types";
import { UploadCloud, FileText, CheckCircle2, ArrowRightLeft, Trash2, Loader2, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

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
  const [isUploading, setIsUploading] = useState(false);
  const [previewItems, setPreviewItems] = useState<ExtratoItem[] | null>(null);
  
  const supabase = createClient();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const toastId = toast.loading("Lendo Extrato Bancário. Isso pode levar alguns segundos...");
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/vision/extrato', { method: 'POST', body: formData });
      const aiData = await res.json();
      
      if (!res.ok || !Array.isArray(aiData)) {
         throw new Error(aiData.error || 'Falha ao extrair itens estruturados do documento.');
      }
      
      if (aiData.length === 0) {
         toast.error("Nenhuma transação encontrada na imagem.", { id: toastId });
         setIsUploading(false);
         return;
      }

      setPreviewItems(aiData);
      toast.success(`${aiData.length} transações encontradas!`, { id: toastId });
      
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
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
         <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
               <UploadCloud className="w-8 h-8"/>
            </div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight mb-2">Importar Arquivo de Extrato</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
               Arraste sua foto ou PDF do extrato bancário aqui. Nossa IA lerá todas as linhas e categorizará sozinho.
            </p>
            
            <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold cursor-pointer transition-colors shadow-sm flex items-center gap-2">
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
         <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
               <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Transações Detectadas ({previewItems.length})
               </h2>
               <div className="flex gap-2">
                  <button onClick={() => setPreviewItems(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg">
                     Cancelar
                  </button>
                  <button onClick={handleConfirmImport} className="px-4 py-2 text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-sm">
                     Confirmar e Salvar Tudo
                  </button>
               </div>
            </div>

            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                     <tr className="border-b border-slate-200/60 text-slate-400">
                        <th className="py-3 px-4 font-bold text-[10px] uppercase tracking-wider">Data</th>
                        <th className="py-3 px-4 font-bold text-[10px] uppercase tracking-wider">Descrição</th>
                        <th className="py-3 px-4 font-bold text-[10px] uppercase tracking-wider">Categoria / Tipo</th>
                        <th className="py-3 px-4 font-bold text-[10px] uppercase tracking-wider text-right">Valor</th>
                     </tr>
                  </thead>
                  <tbody>
                     {previewItems.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                           <td className="py-3 px-4 text-slate-600">{item.data}</td>
                           <td className="py-3 px-4 text-slate-800 font-semibold">{item.descricao}</td>
                           <td className="py-3 px-4">
                              <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs mr-2 border border-slate-200/50">{item.categoria}</span>
                              <span className={`px-2 py-1 rounded text-xs font-bold ${item.tipo === 'Entrada' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                 {item.tipo}
                              </span>
                           </td>
                           <td className={`py-3 px-4 text-right font-mono font-bold ${item.tipo === 'Entrada' ? 'text-emerald-600' : 'text-slate-800'}`}>
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
         <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
               <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-slate-400" /> Histórico de Extratos Automáticos
               </h3>
               <span className="text-xs text-slate-500 font-medium bg-white px-2 py-1 rounded border border-slate-200 shadow-sm flex items-center gap-1">
                 <Info className="w-3 h-3"/> Reflete no Resumo
               </span>
            </div>
            
            <div className="overflow-x-auto">
               <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                     <tr className="border-b border-slate-200/60 text-slate-400">
                        <th className="py-3 px-6 font-bold text-[10px] uppercase tracking-wider">Data</th>
                        <th className="py-3 px-6 font-bold text-[10px] uppercase tracking-wider">Descrição / Categoria</th>
                        <th className="py-3 px-6 font-bold text-[10px] uppercase tracking-wider">Tipo</th>
                        <th className="py-3 px-6 font-bold text-[10px] uppercase tracking-wider">Valor</th>
                        <th className="py-3 px-6 font-bold text-[10px] uppercase tracking-wider text-right">Ação</th>
                     </tr>
                  </thead>
                  <tbody>
                     {history.map((item, idx) => (
                        <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                           <td className="py-3 px-6 text-slate-600">{item.data.split('-').length === 3 ? item.data.split('-').reverse().join('/') : item.data}</td>
                           <td className="py-3 px-6">
                              <p className="text-slate-800 font-semibold">{item.descricao}</p>
                              <p className="text-xs text-slate-400">{item.categoria}</p>
                           </td>
                           <td className="py-3 px-6">
                              <span className={`px-2 py-1 rounded text-xs font-bold ${item.tipo === 'Entrada' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                 {item.tipo}
                              </span>
                           </td>
                           <td className={`py-3 px-6 font-mono font-bold ${item.tipo === 'Entrada' ? 'text-emerald-600' : 'text-slate-800'}`}>
                              {formatCurrency(Math.abs(item.valor))}
                           </td>
                           <td className="py-3 px-6 text-right">
                              <button onClick={() => handleDeleteHistory(item.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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
