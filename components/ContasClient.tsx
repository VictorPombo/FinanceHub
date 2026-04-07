"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { formatCurrency } from "@/lib/types";
import { CreditCard, Landmark, Plus, Edit2, Trash2, CheckCircle, ChevronLeft, ChevronRight, AlertCircle, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import ContasModal from "./ContasModal";

export interface FaturaCartao {
  mes: string;
  valor: number;
  status: "Pendente" | "Pago" | "Atrasado";
}

export interface Conta {
  id: string;
  user_id: string;
  nome: string;
  tipo: string;
  cor: string;
  saldo_limite: number;
  dia_fechamento: number | null;
  dia_vencimento: number | null;
  status: string;
  faturas?: FaturaCartao[];
}

interface Props {
  initialData: Conta[];
  userId: string;
}

// ----------------------------------------------------------------------
// Sub-Componente do Card Individual para gerenciar estado das Faturas
// ----------------------------------------------------------------------
function ContaCard({
  conta,
  onUpdate,
  onDelete,
  onEditConta,
}: {
  conta: Conta;
  onUpdate: (c: Conta) => void;
  onDelete: (id: string) => void;
  onEditConta: (c: Conta) => void;
}) {
  const supabase = createClient();

  // Mês Atual do Seletor no formato "YYYY-MM"
  const currentSystemMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentSystemMonth);

  const [isEditingValor, setIsEditingValor] = useState(false);
  const [tempValor, setTempValor] = useState("");

  const faturas = conta.faturas || [];
  const currentFatura = faturas.find((f) => f.mes === selectedMonth) || {
    mes: selectedMonth,
    valor: 0,
    status: "Pendente",
  };

  // Limit Calculation
  const limiteConsumido =
    faturas
      .filter((f) => f.status !== "Pago")
      .reduce((acc, f) => acc + Number(f.valor), 0);
  const disponivel = Math.max(0, conta.saldo_limite - limiteConsumido);
  const percentUsado = Math.min(100, conta.saldo_limite > 0 ? (limiteConsumido / conta.saldo_limite) * 100 : 0);

  const isPago = currentFatura.status === "Pago";
  const isAtrasado = currentFatura.status === "Atrasado";

  // Helpers para Mês
  const changeMonth = (offset: number) => {
    const [y, m] = selectedMonth.split("-").map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    setSelectedMonth(d.toISOString().slice(0, 7));
    setIsEditingValor(false);
  };

  const getMonthName = (YYYY_MM: string) => {
    const [y, m] = YYYY_MM.split("-").map(Number);
    const mesStr = new Date(y, m - 1, 1).toLocaleString("pt-BR", { month: "short" });
    return `${mesStr}/${y}`.toUpperCase();
  };

  const saveFatura = async (newVal: number, newStatus: string) => {
    const updatedFaturas = [...faturas];
    const idx = updatedFaturas.findIndex((f) => f.mes === selectedMonth);

    if (idx >= 0) {
      updatedFaturas[idx] = { mes: selectedMonth, valor: newVal, status: newStatus as any };
    } else {
      updatedFaturas.push({ mes: selectedMonth, valor: newVal, status: newStatus as any });
    }

    const { error } = await supabase.from("contas").update({ faturas: updatedFaturas }).eq("id", conta.id);
    if (!error) {
       onUpdate({ ...conta, faturas: updatedFaturas });
       setIsEditingValor(false);
       if (newStatus === "Pago") toast.success("Fatura liquidada!");
    } else {
       toast.error("Erro ao salvar fatura.");
    }
  };

  const startEditing = () => {
    setTempValor(currentFatura.valor > 0 ? currentFatura.valor.toString() : "");
    setIsEditingValor(true);
  };

  const confirmEditValue = () => {
    const val = Math.abs(Number(tempValor.replace(",", ".")) || 0);
    saveFatura(val, currentFatura.status);
  };

  // Dinamic Color Setup
  let cardBorderClass = "";
  let ribbonColor = conta.cor;
  
  if (conta.tipo === "Cartão de Crédito") {
     if (isAtrasado) {
       cardBorderClass = "border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]";
       ribbonColor = "#EF4444";
     } else if (isPago) {
       cardBorderClass = "border-emerald-500/30";
       ribbonColor = "#10B981";
     }
  }

  return (
    <div className={`glass-card p-5 flex flex-col relative overflow-hidden transition-all duration-300 ${cardBorderClass}`}>
      <div className="absolute top-0 left-0 right-0 h-1.5 opacity-80 rounded-t-2xl transition-colors" style={{ backgroundColor: ribbonColor }}></div>

      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-4 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0" style={{ backgroundColor: conta.cor }}>
            {conta.tipo === "Cartão de Crédito" ? <CreditCard className="w-5 h-5" /> : <Landmark className="w-5 h-5" />}
          </div>
          <div className="mr-2">
            <h3 className="font-black text-slate-200 text-base tracking-tight truncate">{conta.nome}</h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{conta.tipo}</span>
          </div>
        </div>
        
        {/* Status Tag */}
        {conta.tipo === "Cartão de Crédito" && (
            <div className="flex shrink-0">
               {isAtrasado && (
                  <span className="bg-red-500/15 text-red-400 text-[9px] font-black px-2 py-1 rounded-full border border-red-500/25 uppercase tracking-wider flex items-center gap-1">
                     <AlertCircle className="w-3 h-3" /> Atrasado
                  </span>
               )}
               {isPago && (
                  <span className="bg-emerald-500/15 text-emerald-400 text-[9px] font-black px-2 py-1 rounded-full border border-emerald-500/25 uppercase tracking-wider flex items-center gap-1">
                     <CheckCircle className="w-3 h-3" /> Pago
                  </span>
               )}
               {!isPago && !isAtrasado && (
                  <span className="bg-amber-500/15 text-amber-500 text-[9px] font-black px-2 py-1 rounded-full border border-amber-500/25 uppercase tracking-wider">
                     Pendente
                  </span>
               )}
            </div>
        )}
      </div>

      {/* Corpo */}
      <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/40 flex-1 flex flex-col justify-center mb-4 relative">
        
        {conta.tipo === "Cartão de Crédito" ? (
          <>
            {/* Seletor Mês a Mês */}
            <div className="flex items-center justify-center gap-3 mb-4 bg-[#020617] p-1.5 rounded-lg border border-slate-800/60">
               <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white"><ChevronLeft className="w-4 h-4"/></button>
               <span className="text-xs font-bold font-mono tracking-widest text-slate-300 min-w-[70px] text-center">{getMonthName(selectedMonth)}</span>
               <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-white"><ChevronRight className="w-4 h-4"/></button>
            </div>

            <div className="flex justify-between items-end mb-4 pb-4 border-b border-slate-800/50">
              <div className="w-full">
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Fatura Mês Selecionado</p>
                {isEditingValor ? (
                   <div className="flex items-center gap-2">
                       <span className="text-slate-400 font-bold">R$</span>
                       <input 
                          type="number" 
                          autoFocus
                          value={tempValor}
                          onChange={(e) => setTempValor(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && confirmEditValue()}
                          className="bg-slate-900 border border-purple-500 text-slate-100 font-black text-lg px-2 py-1 rounded w-full outline-none"
                       />
                       <button onClick={confirmEditValue} className="p-2 bg-purple-600 hover:bg-purple-500 rounded text-white"><Save className="w-4 h-4"/></button>
                   </div>
                ) : (
                   <div className="flex items-center gap-2 group cursor-pointer w-max" onClick={startEditing}>
                      <span className={`text-2xl font-black tracking-tight transition-colors ${
                         isAtrasado ? 'text-red-400' : isPago ? 'text-emerald-400 opacity-80' : 'text-slate-200'
                      }`}>
                         {formatCurrency(currentFatura.valor)}
                      </span>
                      <Edit2 className="w-3.5 h-3.5 text-slate-600 group-hover:text-purple-400 transition-colors" />
                   </div>
                )}
              </div>
            </div>

            {/* Limite Total e Detalhes */}
            <div className="flex flex-col gap-3">
               <div>
                  <div className="flex justify-between items-center mb-1.5">
                     <p className="text-[9px] text-slate-500 font-bold uppercase">Limite Contratado</p>
                     <p className="font-mono text-xs font-bold text-slate-300">{formatCurrency(conta.saldo_limite)}</p>
                  </div>
                  {/* Progress Bar de Limite Usado Geral */}
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                     <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${percentUsado}%` }}></div>
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-2 mt-2">
                 <div>
                   <p className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">Disponível</p>
                   <p className="font-mono text-[11px] font-black text-emerald-400 truncate">{formatCurrency(disponivel)}</p>
                 </div>
                 <div>
                   <p className="text-[9px] text-slate-500 font-bold uppercase mb-0.5">Fecha / Vence</p>
                   <p className="font-mono text-[11px] font-bold text-slate-400">{conta.dia_fechamento || '--'} / {conta.dia_vencimento || '--'}</p>
                 </div>
               </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col justify-center items-center py-6">
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-2">Saldo / Limite Geral</p>
            <span className="text-2xl font-black text-slate-200 tracking-tight">{formatCurrency(conta.saldo_limite)}</span>
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2 mt-auto">
        {conta.tipo === "Cartão de Crédito" && (
           <div className="flex-1 flex gap-1 bg-slate-900/50 p-1 rounded-xl border border-slate-700/50">
              <button 
                 onClick={() => saveFatura(currentFatura.valor, isPago ? 'Pendente' : 'Pago')}
                 className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1
                 ${isPago ? 'bg-emerald-500 text-slate-950 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400'}`}
              >
                 {isPago ? 'Reverter' : 'Pagar'}
              </button>
              <button 
                 onClick={() => saveFatura(currentFatura.valor, isAtrasado ? 'Pendente' : 'Atrasado')}
                 className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1
                 ${isAtrasado ? 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'text-slate-400 hover:bg-red-500/20 hover:text-red-400'}`}
              >
                 {isAtrasado ? 'Normalizar' : 'Atrasar'}
              </button>
           </div>
        )}
        <button
          onClick={() => onEditConta(conta)}
          className="w-9 h-9 shrink-0 flex items-center justify-center bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-purple-400 hover:bg-purple-900/20 transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(conta.id)}
          className="w-9 h-9 shrink-0 flex items-center justify-center bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}


// ----------------------------------------------------------------------
// Componente Principal
// ----------------------------------------------------------------------
export default function ContasClient({ initialData, userId }: Props) {
  const [data, setData] = useState<Conta[]>(initialData);
  const [activeTab, setActiveTab] = useState<"Ativa" | "Arquivada">("Ativa");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingConta, setEditingConta] = useState<Conta | null>(null);
  const supabase = createClient();

  const filteredData = data.filter((c) => c.status === activeTab);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente deletar esta conta?")) return;
    const { error } = await supabase.from("contas").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao deletar");
      return;
    }
    toast.success("Conta removida");
    setData(data.filter((c) => c.id !== id));
  };

  const handleUpdate = (updatedConta: Conta) => {
     setData(data.map(d => d.id === updatedConta.id ? updatedConta : d));
  };

  return (
    <div className="flex flex-col gap-5 max-w-[1400px] mx-auto w-full pb-20 md:pb-0 font-sans">
      {/* CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 glass-card p-4 shadow-xl">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/80 rounded-xl w-full md:w-max">
          <button
            onClick={() => setActiveTab("Ativa")}
            className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === "Ativa"
                ? "bg-purple-600/15 text-purple-400 border border-purple-500/25"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Ativas
          </button>
          <button
            onClick={() => setActiveTab("Arquivada")}
            className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === "Arquivada"
                ? "bg-purple-600/15 text-purple-400 border border-purple-500/25"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Arquivadas
          </button>
        </div>

        <button
          onClick={() => {
            setEditingConta(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all active:scale-95 shadow-[0_0_15px_rgba(147,51,234,0.3)] text-sm w-full md:w-max"
        >
          <Plus className="w-4 h-4" /> Nova Conta / Cartão
        </button>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredData.map((conta) => (
          <ContaCard 
             key={conta.id} 
             conta={conta} 
             onUpdate={handleUpdate} 
             onDelete={handleDelete} 
             onEditConta={(c) => {setEditingConta(c); setIsModalOpen(true);}} 
          />
        ))}
      </div>

      {filteredData.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 glass-card border-dashed border-slate-700/50">
          <CreditCard className="w-12 h-12 text-slate-700 mb-4 opacity-70" />
          <p className="text-base font-bold text-slate-400">Nenhuma conta encontrada</p>
          <p className="text-slate-600 text-xs mt-1">
            Clique em &quot;Nova Conta / Cartão&quot; para adicionar.
          </p>
        </div>
      )}

      {isModalOpen && (
        <ContasModal
          conta={editingConta as any}
          userId={userId}
          onClose={() => setIsModalOpen(false)}
          onSave={(saved) => {
            const castedSaved = saved as any as Conta;
            if (editingConta) {
              setData(data.map((d) => (d.id === castedSaved.id ? castedSaved : d)));
            } else {
              setData([castedSaved, ...data]);
            }
          }}
        />
      )}
    </div>
  );
}
