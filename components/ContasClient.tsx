"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/types";
import { CreditCard, Landmark, Plus, Edit2, Trash2, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import ContasModal from "./ContasModal";

interface Conta {
  id: string;
  nome: string;
  tipo: string;
  cor: string;
  saldo_limite: number;
  dia_fechamento: number | null;
  dia_vencimento: number | null;
  status: string;
}

interface Props {
  initialData: Conta[];
  userId: string;
}

export default function ContasClient({ initialData, userId }: Props) {
  const [data, setData] = useState<Conta[]>(initialData);
  const [activeTab, setActiveTab] = useState<"Ativa" | "Arquivada">("Ativa");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<Conta | null>(null);
  const supabase = createClient();

  const [faturaPaga, setFaturaPaga] = useState<Record<string, boolean>>({});
  const filteredData = data.filter(c => c.status === activeTab);

  const handleTogglePago = (id: string) => {
    setFaturaPaga(prev => {
      const newState = { ...prev, [id]: !prev[id] };
      toast(newState[id] ? "Fatura marcada como PAGA ✅" : "Fatura desmarcada 🔄");
      return newState;
    });
  };

  const handleDelete = async (id: string) => {
    if(!window.confirm("Deseja realmente deletar esta conta?")) return;
    const { error } = await supabase.from('contas').delete().eq('id', id);
    if (error) { toast.error("Erro ao deletar"); return; }
    toast.success("Conta removida");
    setData(data.filter(c => c.id !== id));
  };

  return (
    <div className="flex flex-col gap-5 max-w-[1400px] mx-auto w-full pb-20 md:pb-0">
       
       {/* CONTROLS */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 glass-card p-4">
         <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-xl w-full md:w-max">
           <button onClick={() => setActiveTab("Ativa")}
             className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'Ativa' ? 'bg-purple-600/15 text-purple-400 border border-purple-500/25' : 'text-slate-500 hover:text-slate-300'}`}>
             Ativas
           </button>
           <button onClick={() => setActiveTab("Arquivada")}
             className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'Arquivada' ? 'bg-purple-600/15 text-purple-400 border border-purple-500/25' : 'text-slate-500 hover:text-slate-300'}`}>
             Arquivadas
           </button>
         </div>

         <button onClick={() => { setEditingConta(null); setIsModalOpen(true); }}
           className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all active:scale-95 shadow-[0_0_15px_rgba(147,51,234,0.3)] text-sm w-full md:w-max">
           <Plus className="w-4 h-4"/> Nova Conta / Cartão
         </button>
       </div>

       {/* GRID */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredData.map(conta => {
             const isPago = faturaPaga[conta.id] || false;
             const gastoDummy = conta.tipo === 'Cartão de Crédito' ? (isPago ? 0 : conta.saldo_limite * 0.15) : 0;
             const disponivel = conta.saldo_limite - gastoDummy;

             return (
               <div key={conta.id} className={`glass-card p-5 flex flex-col relative overflow-hidden ${isPago ? 'border-emerald-500/30' : ''}`}>
                  {/* Color bar */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 opacity-80 rounded-t-2xl" style={{ backgroundColor: isPago ? '#10B981' : conta.cor }}></div>
                  
                  {/* Header */}
                  <div className="flex items-start justify-between mb-5 pt-2">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: conta.cor }}>
                           {conta.tipo === 'Cartão de Crédito' ? <CreditCard className="w-5 h-5"/> : <Landmark className="w-5 h-5"/>}
                        </div>
                        <div>
                           <h3 className="font-black text-slate-200 text-base tracking-tight">{conta.nome}</h3>
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{conta.tipo}</span>
                        </div>
                     </div>
                     {isPago && (
                        <span className="bg-emerald-500/15 text-emerald-400 text-[9px] font-black px-2 py-1 rounded-full border border-emerald-500/25 uppercase tracking-wider">
                           ✅ Pago
                        </span>
                     )}
                  </div>

                  {/* Values */}
                  <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/40 flex-1 flex flex-col justify-center mb-4">
                     {conta.tipo === 'Cartão de Crédito' ? (
                       <>
                         <div className="flex justify-between items-end mb-3 pb-3 border-b border-slate-800/50">
                            <div>
                               <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1">Fatura Atual</p>
                               <span className={`text-xl font-black tracking-tight ${isPago ? 'text-emerald-400 line-through opacity-60' : 'text-red-400'}`}>{formatCurrency(conta.saldo_limite * 0.15)}</span>
                               {isPago && <p className="text-emerald-400 text-[10px] font-bold mt-0.5">Quitada</p>}
                            </div>
                         </div>
                         <div className="grid grid-cols-2 gap-3">
                            <div>
                               <p className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">Disponível</p>
                               <p className="font-mono text-sm font-bold text-emerald-400">{formatCurrency(disponivel)}</p>
                            </div>
                            <div>
                               <p className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">Limite</p>
                               <p className="font-mono text-sm font-bold text-slate-300">{formatCurrency(conta.saldo_limite)}</p>
                            </div>
                            <div>
                               <p className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">Fecha</p>
                               <p className="font-mono text-sm font-bold text-slate-300">{conta.dia_fechamento || '--'}</p>
                            </div>
                            <div>
                               <p className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">Vence</p>
                               <p className="font-mono text-sm font-bold text-slate-300">{conta.dia_vencimento || '--'}</p>
                            </div>
                         </div>
                       </>
                     ) : (
                       <div className="flex flex-col justify-center items-center py-3">
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-2">Saldo Atual</p>
                            <span className="text-2xl font-black text-slate-200 tracking-tight">{formatCurrency(conta.saldo_limite)}</span>
                       </div>
                     )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-auto">
                     {conta.tipo === 'Cartão de Crédito' && (
                       <button onClick={() => handleTogglePago(conta.id)}
                         className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${isPago ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' : 'bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/30'}`}>
                          <CheckCircle className="w-3.5 h-3.5"/>
                          {isPago ? 'Pago' : 'Marcar Pago'}
                       </button>
                     )}
                     <button onClick={() => {setEditingConta(conta); setIsModalOpen(true);}} className="w-9 h-9 flex items-center justify-center bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-purple-400 hover:bg-purple-900/20 transition-colors">
                        <Edit2 className="w-3.5 h-3.5"/>
                     </button>
                     <button onClick={() => handleDelete(conta.id)} className="w-9 h-9 flex items-center justify-center bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-colors">
                        <Trash2 className="w-3.5 h-3.5"/>
                     </button>
                  </div>
               </div>
             )
          })}
       </div>

       {filteredData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 glass-card">
             <CreditCard className="w-10 h-10 text-slate-700 mb-3" />
             <p className="text-base font-bold text-slate-400">Nenhuma conta encontrada</p>
             <p className="text-slate-600 text-xs mt-1">Clique em &quot;Nova Conta / Cartão&quot; para adicionar.</p>
          </div>
       )}

       {isModalOpen && (
          <ContasModal 
            conta={editingConta}
            userId={userId}
            onClose={() => setIsModalOpen(false)}
            onSave={(saved) => {
               if (editingConta) { setData(data.map(d => d.id === saved.id ? saved : d)); }
               else { setData([saved, ...data]); }
            }}
          />
       )}
    </div>
  );
}
