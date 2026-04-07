"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/types";
import { CreditCard, Landmark, Plus, Edit2, Trash2, ArrowRight } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"Ativas" | "Arquivadas">("Ativas");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<Conta | null>(null);
  
  const supabase = createClient();

  const filteredData = data.filter(c => c.status === activeTab);

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
    const newStatus = currentStatus === "Ativas" ? "Arquivadas" : "Ativas";
    const { error } = await supabase.from('contas').update({ status: newStatus }).eq('id', id);
    if (!error) {
       toast.success(newStatus === "Arquivadas" ? "Conta arquivada" : "Conta ativada");
       setData(data.map(c => c.id === id ? { ...c, status: newStatus } : c));
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1400px] mx-auto w-full">
       
       {/* CONTROLS ROW */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
         
         <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-full md:w-max">
           <button 
             onClick={() => setActiveTab("Ativas")}
             className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'Ativas' ? 'bg-white text-slate-800 shadow shadow-black/5' : 'text-slate-500 hover:text-slate-700'}`}
           >
             Ativas
           </button>
           <button 
             onClick={() => setActiveTab("Arquivadas")}
             className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'Arquivadas' ? 'bg-white text-slate-800 shadow shadow-black/5' : 'text-slate-500 hover:text-slate-700'}`}
           >
             Arquivadas
           </button>
         </div>

         <button 
           onClick={() => { setEditingConta(null); setIsModalOpen(true); }}
           className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold transition-transform active:scale-95 shadow-sm text-sm w-full md:w-max"
         >
           <Plus className="w-4 h-4"/>
           Nova Conta / Cartão
         </button>
       </div>

       {/* GRID VIEWS */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredData.map(conta => {
             // Simulando saldo disp gasto aleatorio baseado no limite para fins visuais se for Cartão
             // Em um sistema real, cruzaríamos com os Lancamentos cujo status='Em aberto' para esse cartão
             const gastoDummy = conta.tipo === 'Cartão de Crédito' ? (conta.saldo_limite * 0.15) : 0;
             const disponivel = conta.saldo_limite - gastoDummy;

             return (
               <div key={conta.id} className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-200 flex flex-col relative overflow-hidden group hover:shadow-md transition-shadow">
                  {/* Decorative Color Bar on top edge representing the card color */}
                  <div className="absolute top-0 left-0 right-0 h-2 opacity-80" style={{ backgroundColor: conta.cor }}></div>
                  
                  {/* Avatar / Headers */}
                  <div className="flex items-start justify-between mb-6 pt-2">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: conta.cor }}>
                           {conta.tipo === 'Cartão de Crédito' ? <CreditCard className="w-5 h-5"/> : <Landmark className="w-5 h-5"/>}
                        </div>
                        <div>
                           <h3 className="font-extrabold text-slate-800 text-lg tracking-tight -mb-1">{conta.nome}</h3>
                           <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{conta.tipo}</span>
                        </div>
                     </div>
                  </div>

                  {/* Main Values Grid based on GranaZen Faturas */}
                  <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex-1 flex flex-col justify-center mb-6">
                     {conta.tipo === 'Cartão de Crédito' ? (
                       <>
                         <div className="flex justify-between items-end mb-4 pb-4 border-b border-slate-200/60">
                            <div>
                               <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Fatura Atual</p>
                               <span className="text-2xl font-black text-red-500 tracking-tight">{formatCurrency(gastoDummy)}</span>
                            </div>
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                               <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Limite Disponível</p>
                               <p className="font-mono text-sm font-bold text-emerald-600">{formatCurrency(disponivel)}</p>
                            </div>
                            <div>
                               <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Limite Total</p>
                               <p className="font-mono text-sm font-bold text-slate-800">{formatCurrency(conta.saldo_limite)}</p>
                            </div>
                            <div>
                               <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5 animate-pulse">Fecha Dia</p>
                               <p className="font-mono text-sm font-bold text-slate-800">{conta.dia_fechamento || '--'}</p>
                            </div>
                            <div>
                               <p className="text-[10px] text-slate-400 font-bold uppercase mb-0.5">Vence Dia</p>
                               <p className="font-mono text-sm font-bold text-slate-800">{conta.dia_vencimento || '--'}</p>
                            </div>
                         </div>
                       </>
                     ) : (
                       // Conta Corrente view
                       <div className="flex flex-col justify-center items-center py-4">
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Saldo Atual</p>
                            <span className="text-3xl font-black text-slate-800 tracking-tight">{formatCurrency(conta.saldo_limite)}</span>
                            <div className="mt-4 text-xs text-slate-400 font-medium px-4 py-1.5 bg-white rounded-full border border-slate-200">
                               Conta Padrão 
                            </div>
                       </div>
                     )}
                  </div>

                  {/* Actions Base */}
                  <div className="flex items-center gap-2 mt-auto">
                     {conta.tipo === 'Cartão de Crédito' && (
                       <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2">
                          Detalhes da Fatura <ArrowRight className="w-3 h-3"/>
                       </button>
                     )}
                     {!conta.tipo.includes('Cartão') && (
                       <button className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2">
                          Ajustar Saldo
                       </button>
                     )}
                     
                     <button onClick={() => {setEditingConta(conta); setIsModalOpen(true);}} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                        <Edit2 className="w-4 h-4"/>
                     </button>
                     <button onClick={() => handleDelete(conta.id)} className="w-10 h-10 flex items-center justify-center bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4"/>
                     </button>
                  </div>
               </div>
             )
          })}
       </div>

       {filteredData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-dashed border-slate-300">
             <CreditCard className="w-12 h-12 text-slate-300 mb-4" />
             <p className="text-lg font-bold text-slate-600">Nenhuma conta encontrada</p>
             <p className="text-slate-400 text-sm">Adicione seu primeiro cartão ou conta bancária clicando em Nova Conta.</p>
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
