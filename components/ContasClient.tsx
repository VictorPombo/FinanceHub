"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/types";
import { CreditCard, Landmark, Plus, Edit2, Trash2, ArrowRight, CheckCircle } from "lucide-react";
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

  // Track which cards have been marked as "Pago"
  const [faturaPaga, setFaturaPaga] = useState<Record<string, boolean>>({});

  const filteredData = data.filter(c => c.status === activeTab);

  const handleTogglePago = (id: string) => {
    setFaturaPaga(prev => {
      const newState = { ...prev, [id]: !prev[id] };
      if (newState[id]) {
        toast.success("Fatura marcada como PAGA ✅");
      } else {
        toast("Fatura desmarcada", { icon: '🔄' });
      }
      return newState;
    });
  };

  const handleDelete = async (id: string) => {
    if(!window.confirm("Deseja realmente deletar esta conta?")) return;
    const { error } = await supabase.from('contas').delete().eq('id', id);
    if (error) {
       toast.error("Erro ao deletar");
       return;
    }
    toast.success("Conta removida");
    setData(data.filter(c => c.id !== id));
  };

  const handleArchive = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "Ativa" ? "Arquivada" : "Ativa";
    const { error } = await supabase.from('contas').update({ status: newStatus }).eq('id', id);
    if (!error) {
       toast.success(newStatus === "Arquivada" ? "Conta arquivada" : "Conta ativada");
       setData(data.map(c => c.id === id ? { ...c, status: newStatus } : c));
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto w-full">
       
       {/* CONTROLS ROW */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#0B1121]/90 backdrop-blur-xl p-4 rounded-2xl shadow-sm border border-slate-800/80">
         
         <div className="flex items-center gap-2 p-1 bg-slate-900/80 rounded-xl w-full md:w-max">
           <button 
             onClick={() => setActiveTab("Ativa")}
             className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'Ativa' ? 'bg-purple-600/20 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)] border border-purple-500/30' : 'text-slate-500 hover:text-slate-300'}`}
           >
             Ativas
           </button>
           <button 
             onClick={() => setActiveTab("Arquivada")}
             className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'Arquivada' ? 'bg-purple-600/20 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.3)] border border-purple-500/30' : 'text-slate-500 hover:text-slate-300'}`}
           >
             Arquivadas
           </button>
         </div>

         <button 
           onClick={() => { setEditingConta(null); setIsModalOpen(true); }}
           className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl font-bold transition-transform active:scale-95 shadow-[0_0_15px_rgba(147,51,234,0.4)] text-sm w-full md:w-max"
         >
           <Plus className="w-4 h-4"/>
           Nova Conta / Cartão
         </button>
       </div>

       {/* GRID VIEWS */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredData.map(conta => {
             const isPago = faturaPaga[conta.id] || false;
             const gastoDummy = conta.tipo === 'Cartão de Crédito' ? (isPago ? 0 : conta.saldo_limite * 0.15) : 0;
             const disponivel = conta.saldo_limite - gastoDummy;

             return (
               <div key={conta.id} className={`bg-slate-900/40 backdrop-blur-xl rounded-[24px] p-6 border flex flex-col relative overflow-hidden group hover:shadow-[0_0_20px_rgba(147,51,234,0.15)] transition-all ${isPago ? 'border-emerald-500/40' : 'border-slate-800/60'}`}>
                  {/* Decorative Color Bar on top edge representing the card color */}
                  <div className="absolute top-0 left-0 right-0 h-2 opacity-80" style={{ backgroundColor: isPago ? '#10B981' : conta.cor, boxShadow: `0 0 15px ${isPago ? '#10B981' : conta.cor}` }}></div>
                  
                  {/* Avatar / Headers */}
                  <div className="flex items-start justify-between mb-6 pt-2">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: conta.cor, boxShadow: `0 0 10px ${conta.cor}` }}>
                           {conta.tipo === 'Cartão de Crédito' ? <CreditCard className="w-5 h-5"/> : <Landmark className="w-5 h-5"/>}
                        </div>
                        <div>
                           <h3 className="font-extrabold text-slate-200 text-lg tracking-tight -mb-1">{conta.nome}</h3>
                           <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{conta.tipo}</span>
                        </div>
                     </div>
                     {isPago && (
                        <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-500/30 uppercase tracking-wider animate-pulse">
                           ✅ Pago
                        </span>
                     )}
                  </div>

                  {/* Main Values Grid based on GranaZen Faturas */}
                  <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800/50 flex-1 flex flex-col justify-center mb-6">
                     {conta.tipo === 'Cartão de Crédito' ? (
                       <>
                         <div className="flex justify-between items-end mb-4 pb-4 border-b border-slate-800/60">
                            <div>
                               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Fatura Atual</p>
                               <span className={`text-2xl font-black tracking-tight ${isPago ? 'text-emerald-400 line-through opacity-60' : 'text-red-400'}`}>{formatCurrency(conta.saldo_limite * 0.15)}</span>
                               {isPago && <p className="text-emerald-400 text-xs font-bold mt-1">Fatura quitada</p>}
                            </div>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                               <p className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Limite Disponível</p>
                               <p className="font-mono text-sm font-bold text-emerald-400">{formatCurrency(disponivel)}</p>
                            </div>
                            <div>
                               <p className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Limite Total</p>
                               <p className="font-mono text-sm font-bold text-slate-200">{formatCurrency(conta.saldo_limite)}</p>
                            </div>
                            <div>
                               <p className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Fecha Dia</p>
                               <p className="font-mono text-sm font-bold text-slate-200">{conta.dia_fechamento || '--'}</p>
                            </div>
                            <div>
                               <p className="text-[10px] text-slate-500 font-bold uppercase mb-0.5">Vence Dia</p>
                               <p className="font-mono text-sm font-bold text-slate-200">{conta.dia_vencimento || '--'}</p>
                            </div>
                         </div>
                       </>
                     ) : (
                       // Conta Corrente view
                       <div className="flex flex-col justify-center items-center py-4">
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Saldo Atual</p>
                            <span className="text-3xl font-black text-slate-200 tracking-tight">{formatCurrency(conta.saldo_limite)}</span>
                            <div className="mt-4 text-xs text-slate-500 font-medium px-4 py-1.5 bg-slate-900/50 rounded-full border border-slate-800">
                               Conta Padrão 
                            </div>
                       </div>
                     )}
                  </div>

                  {/* Actions Base */}
                  <div className="flex items-center gap-2 mt-auto">
                     {conta.tipo === 'Cartão de Crédito' && (
                       <button 
                         onClick={() => handleTogglePago(conta.id)}
                         className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                           isPago 
                             ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                             : 'bg-slate-800/50 hover:bg-emerald-900/30 border border-slate-700/50 text-slate-300 hover:text-emerald-400 hover:border-emerald-500/30'
                         }`}
                       >
                          <CheckCircle className="w-4 h-4"/>
                          {isPago ? 'Pago ✅' : 'Marcar como Pago'}
                       </button>
                     )}
                     {!conta.tipo.includes('Cartão') && (
                       <button className="flex-1 bg-slate-800/50 hover:bg-slate-700/50 border border-slate-700/50 text-slate-300 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2">
                          Ajustar Saldo
                       </button>
                     )}
                     
                     <button onClick={() => {setEditingConta(conta); setIsModalOpen(true);}} className="w-10 h-10 flex items-center justify-center bg-slate-800/50 border border-slate-700 rounded-xl text-slate-400 hover:text-purple-400 hover:bg-purple-900/30 transition-colors">
                        <Edit2 className="w-4 h-4"/>
                     </button>
                     <button onClick={() => handleDelete(conta.id)} className="w-10 h-10 flex items-center justify-center bg-slate-800/50 border border-slate-700 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-900/30 transition-colors">
                        <Trash2 className="w-4 h-4"/>
                     </button>
                  </div>
               </div>
             )
          })}
       </div>

       {filteredData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
             <CreditCard className="w-12 h-12 text-slate-600 mb-4" />
             <p className="text-lg font-bold text-slate-300">Nenhuma conta encontrada</p>
             <p className="text-slate-500 text-sm">Adicione seu primeiro cartão ou conta bancária clicando em Nova Conta.</p>
          </div>
       )}

       {isModalOpen && (
          <ContasModal 
            conta={editingConta}
            userId={userId}
            onClose={() => setIsModalOpen(false)}
            onSave={(saved) => {
               if (editingConta) {
                  setData(data.map(d => d.id === saved.id ? saved : d));
               } else {
                  setData([saved, ...data]);
               }
            }}
          />
       )}
    </div>
  );
}
