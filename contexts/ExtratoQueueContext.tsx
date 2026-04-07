"use client";

import React, { createContext, useContext, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

interface ExtratoItem {
  id?: string;
  descricao: string;
  valor: number;
  tipo: string;
  data: string;
  categoria: string;
  status?: string;
}

interface ExtratoQueueContextData {
  uploadExtrato: (file: File) => Promise<void>;
  previewItems: ExtratoItem[] | null;
  setPreviewItems: (items: ExtratoItem[] | null) => void;
  isUploading: boolean;
}

const ExtratoQueueContext = createContext<ExtratoQueueContextData>({} as ExtratoQueueContextData);

export function ExtratoQueueProvider({ children }: { children: React.ReactNode }) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewItems, setPreviewItems] = useState<ExtratoItem[] | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const uploadExtrato = async (file: File) => {
    setIsUploading(true);
    toast.success("Extrato em processamento pela IA em 2º Plano! Continue usando o app livremente.", { duration: 4000 });
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/vision/extrato', { method: 'POST', body: formData });
      const aiData = await res.json();
      
      if (!res.ok || !Array.isArray(aiData)) {
         throw new Error(aiData.error || 'Falha ao extrair itens.');
      }
      
      if (aiData.length === 0) {
         toast.error("Nenhuma transação encontrada no arquivo.");
         return;
      }

      setPreviewItems(aiData);
      
      if (pathname !== '/dashboard/extratos') {
         toast((t) => (
           <span className="flex items-center gap-2 cursor-pointer" onClick={() => {toast.dismiss(t.id); router.push('/dashboard/extratos');}}>
             Extrato de {aiData.length} itens finalizado! <b>Clique para ir até a aba revisar</b>.
           </span>
         ), { duration: 10000 });
      } else {
         toast.success(`${aiData.length} transações prontas para revisão!`);
      }
      
    } catch (err: any) {
      toast.error(`Erro no extrato: ${err.message}`, { duration: 6000 });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ExtratoQueueContext.Provider value={{ uploadExtrato, previewItems, setPreviewItems, isUploading }}>
      {children}
      
      {/* Widget Global Visível em todas as telas */}
      {isUploading && (
         <div className="fixed bottom-24 right-4 md:right-8 bg-[#060b18]/95 backdrop-blur-xl border border-purple-500/50 shadow-[0_0_30px_rgba(147,51,234,0.3)] p-4 rounded-2xl flex items-center gap-4 animate-in slide-in-from-bottom-2" style={{ position: 'fixed', bottom: '96px', right: '24px', zIndex: 999999 }}>
           <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
           <div>
             <p className="text-sm font-bold text-slate-100">Lendo Extrato (IA)...</p>
             <p className="text-[11px] text-slate-400 uppercase tracking-widest mt-0.5">Trabalhando no fundo</p>
           </div>
        </div>
      )}
    </ExtratoQueueContext.Provider>
  );
}

export const useExtratoQueue = () => useContext(ExtratoQueueContext);
