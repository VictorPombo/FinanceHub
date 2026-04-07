import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Save, CreditCard, Landmark } from "lucide-react";
import toast from "react-hot-toast";

interface Conta {
  id?: string;
  nome?: string;
  tipo?: string;
  cor?: string;
  saldo_limite?: number;
  dia_fechamento?: number | null;
  dia_vencimento?: number | null;
  status?: string;
}

interface Props {
  conta: Conta | null;
  userId: string;
  onClose: () => void;
  onSave: (saved: any) => void;
}

const CORES = [
  { cor: '#8B5CF6', nome: 'Roxo Nubank' },
  { cor: '#F97316', nome: 'Laranja Inter' },
  { cor: '#EF4444', nome: 'Vermelho Bradesco / Santander' },
  { cor: '#F43F5E', nome: 'Rosa' },
  { cor: '#3B82F6', nome: 'Azul Itaú / Visa' },
  { cor: '#10B981', nome: 'Verde Sicredi' },
  { cor: '#F59E0B', nome: 'Amarelo BB' },
  { cor: '#1E293B', nome: 'Preto Black/Infinite' },
];

export default function ContasModal({ conta, userId, onClose, onSave }: Props) {
  const [nome, setNome] = useState(conta?.nome || "");
  const [tipo, setTipo] = useState(conta?.tipo || "Cartão de Crédito");
  const [cor, setCor] = useState(conta?.cor || CORES[0].cor);
  const [limite, setLimite] = useState(conta?.saldo_limite?.toString() || "");
  const [diaFechamento, setDiaFechamento] = useState(conta?.dia_fechamento?.toString() || "");
  const [diaVencimento, setDiaVencimento] = useState(conta?.dia_vencimento?.toString() || "");

  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  const handleSave = async () => {
    if (!nome) return toast.error("Informe o nome da conta");
    if (!limite) return toast.error("Informe o Limite ou Saldo atual");

    setSaving(true);
    const payload = {
      user_id: userId,
      nome,
      tipo,
      cor,
      saldo_limite: Number(limite),
      dia_fechamento: tipo === 'Cartão de Crédito' ? Number(diaFechamento) : null,
      dia_vencimento: tipo === 'Cartão de Crédito' ? Number(diaVencimento) : null,
      status: conta?.status || "Ativas"
    };

    if (conta?.id) {
      const { data, error } = await supabase.from('contas').update(payload).eq('id', conta.id).select().single();
      if (error) toast.error("Erro ao atualizar");
      else {
         onSave(data);
         toast.success("Atualizado");
         onClose();
      }
    } else {
      const { data, error } = await supabase.from('contas').insert([payload]).select().single();
      if (error) toast.error("Erro ao criar");
      else {
         onSave(data);
         toast.success("Criado com sucesso");
         onClose();
      }
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-[0_20px_50px_rgb(0,0,0,0.15)] flex flex-col max-h-screen">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">
            {conta?.id ? "Editar Conta/Cartão" : "Nova Conta/Cartão"}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5">
           
           <div className="grid grid-cols-2 gap-3 mb-6">
              <button 
                onClick={() => setTipo('Cartão de Crédito')}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border ${tipo === 'Cartão de Crédito' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 font-bold' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              >
                 <CreditCard className="w-6 h-6"/>
                 <span className="text-xs">Cartão de Crédito</span>
              </button>
              <button 
                onClick={() => setTipo('Conta Corrente')}
                className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border ${tipo === 'Conta Corrente' ? 'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
              >
                 <Landmark className="w-6 h-6"/>
                 <span className="text-xs">Conta Corrente</span>
              </button>
           </div>

           <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Nome do Cartão/Banco</label>
              <input 
                type="text" value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Ex: Nubank, Azul Visa Infinite..."
                className="w-full mt-1.5 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all shadow-sm"
              />
           </div>

           <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                {tipo === 'Cartão de Crédito' ? "Limite Total do Cartão" : "Saldo Atual da Conta"}
              </label>
              <div className="relative mt-1.5">
                 <span className="absolute left-4 top-2.5 text-slate-400 font-bold">R$</span>
                 <input 
                   type="number" value={limite} onChange={e => setLimite(e.target.value)}
                   placeholder="0.00"
                   className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white shadow-sm font-mono"
                 />
              </div>
           </div>

           {tipo === 'Cartão de Crédito' && (
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Dia Fechamento</label>
                   <input 
                     type="number" value={diaFechamento} onChange={e => setDiaFechamento(e.target.value)} placeholder="Ex: 5"
                     className="w-full mt-1.5 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white shadow-sm font-mono text-center"
                   />
                </div>
                <div>
                   <label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Dia Vencimento</label>
                   <input 
                     type="number" value={diaVencimento} onChange={e => setDiaVencimento(e.target.value)} placeholder="Ex: 15"
                     className="w-full mt-1.5 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white shadow-sm font-mono text-center"
                   />
                </div>
             </div>
           )}

           <div>
              <label className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2 block">Cor de Identificação</label>
              <div className="flex flex-wrap gap-2">
                 {CORES.map(c => (
                    <button 
                      key={c.cor}
                      onClick={() => setCor(c.cor)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${cor === c.cor ? 'border-white ring-2 ring-slate-800 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: c.cor }}
                      title={c.nome}
                    />
                 ))}
              </div>
           </div>

        </div>
        
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3 shrink-0 rounded-b-2xl">
          <button onClick={onClose} className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl text-sm hover:bg-gray-100 transition-colors">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl text-sm flex items-center justify-center shadow-[0_8px_20px_rgb(79,70,229,0.3)] hover:bg-indigo-700 hover:-translate-y-0.5 transition-all">
            {saving ? "Salvando..." : <><Save className="w-4 h-4 mr-2" /> Salvar</>}
          </button>
        </div>
      </div>
    </div>
  );
}
