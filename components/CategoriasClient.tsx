"use client";

import { useMemo, useState, useEffect } from "react";
import { formatCurrency } from "@/lib/types";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Plus, Trash2, Tags } from "lucide-react";

interface CategoriaDb {
  id: string;
  nome: string;
}

interface Props {
  initialData: any[];
  userId: string;
  initialCategories: CategoriaDb[];
}

const DEFAULT_CATEGORIAS = [
  "Recebimento", "Moradia", "Alimentação", "Serviços", 
  "Transporte", "Saúde", "Educação", "Lazer", 
  "Dívida", "Investimento", "Outros"
];

const COLORS = [
  "#10b981", "#8b5cf6", "#f43f5e", "#f59e0b", "#3b82f6",
  "#06b6d4", "#ec4899", "#6366f1", "#14b8a6", "#e11d48", "#64748b"
];

export default function CategoriasClient({ initialData, userId, initialCategories }: Props) {
  const [categorias, setCategorias] = useState<CategoriaDb[]>(initialCategories);
  const [newCatName, setNewCatName] = useState("");
  const supabase = createClient();

  useEffect(() => {
    // Seed default categories if user has absolutely 0 categories
    const seedDefaults = async () => {
      if (initialCategories.length === 0) {
        const payload = DEFAULT_CATEGORIAS.map(c => ({ user_id: userId, nome: c }));
        const { data } = await supabase.from("categorias").insert(payload).select();
        if (data) setCategorias(data);
      }
    };
    seedDefaults();
  }, [initialCategories, userId, supabase]);

  const catNamesList = categorias.map(c => c.nome);

  const metrics = useMemo(() => {
    let totalOverallSaidas = 0;
    const catMap: Record<string, { entradas: number, saidas: number }> = {};
    
    // Inicia zeradas
    catNamesList.forEach(c => catMap[c] = { entradas: 0, saidas: 0 });

    initialData.forEach(l => {
      const cat = l.categoria || "Outros";
      if (!catMap[cat]) catMap[cat] = { entradas: 0, saidas: 0 };
      
      if (l.tipo === "Entrada") {
        catMap[cat].entradas += Number(l.valor);
      } else if (l.tipo === "Saída") {
        catMap[cat].saidas += Math.abs(Number(l.valor));
        totalOverallSaidas += Math.abs(Number(l.valor));
      }
    });

    const result = Object.keys(catMap).map(c => {
      const p = catMap[c];
      const saldo = p.entradas - p.saidas;
      const perc = totalOverallSaidas > 0 ? (p.saidas / totalOverallSaidas) * 100 : 0;
      return { 
        categoria: c, 
        entradas: p.entradas, 
        saidas: p.saidas, 
        saldo, 
        perc 
      };
    }).sort((a,b) => b.saidas - a.saidas); // Order by saidas desc

    return result;
  }, [initialData, catNamesList]);

  // Data for the Pie Chart - Only include categories with Saídas
  const pieData = metrics.filter(m => m.saidas > 0).map(m => ({
    name: m.categoria,
    value: m.saidas
  }));

  const handleAddCat = async () => {
     if (!newCatName.trim()) return;
     if (catNamesList.includes(newCatName.trim())) {
        toast.error("Categoria já existe");
        return;
     }

     const { data, error } = await supabase.from("categorias").insert([{ user_id: userId, nome: newCatName.trim() }]).select().single();
     if (error) {
        toast.error("Erro ao criar categoria");
     } else {
        setCategorias([...categorias, data].sort((a,b) => a.nome.localeCompare(b.nome)));
        setNewCatName("");
        toast.success("Categoria criada!");
     }
  };

  const handleDeleteCat = async (id: string, name: string) => {
     if (!window.confirm(`Tem certeza que deseja deletar a categoria '${name}'? Ela sumirá das opções de seleção das tabelas.`)) return;
     
     const { error } = await supabase.from("categorias").delete().eq("id", id);
     if (error) {
        toast.error("Erro ao deletar");
     } else {
        setCategorias(categorias.filter(c => c.id !== id));
        toast.success("Deletada com sucesso!");
     }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 backdrop-blur-md p-3 border border-slate-800 shadow-xl rounded-xl text-slate-200">
          <p className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-1">{payload[0].name}</p>
          <p className="text-rose-500 font-mono text-base font-black tracking-tight">{formatCurrency(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col md:flex-row h-full overflow-hidden bg-[#020617] text-slate-100 font-sans">
      
      {/* Table & CRUD Section */}
      <div className="w-full md:w-[60%] flex flex-col h-full overflow-hidden border-r border-slate-800/50 bg-[#020617]">
        
        {/* Adicionar Categoria UI */}
        <div className="p-4 border-b border-slate-800/60 bg-slate-900/30 shrink-0">
           <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-3">
              <Tags className="w-4 h-4 text-purple-400"/>
              Gerenciamento Dinâmico de Categorias
           </h2>
           <div className="flex gap-2">
              <input 
                 type="text" 
                 placeholder="Nova categoria. Ex: Lanches" 
                 value={newCatName}
                 onChange={e => setNewCatName(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && handleAddCat()}
                 className="flex-1 bg-slate-900/80 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 placeholder-slate-600 outline-none focus:border-purple-500 transition-colors"
              />
              <button onClick={handleAddCat} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(147,51,234,0.3)] transition-all flex items-center gap-2">
                 <Plus className="w-4 h-4" /> Adicionar
              </button>
           </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="sticky top-0 z-20">
              <tr>
                <th className="w-[30%] px-4 py-3 bg-[#060b18] border-b border-slate-800/60 text-xs text-slate-400 font-bold uppercase tracking-wider">Custo / Categoria</th>
                <th className="text-right px-4 py-3 bg-[#060b18] border-b border-slate-800/60 text-xs text-slate-400 font-bold uppercase tracking-wider">Entradas</th>
                <th className="text-right px-4 py-3 bg-[#060b18] border-b border-slate-800/60 text-xs text-slate-400 font-bold uppercase tracking-wider">Saídas</th>
                <th className="text-center px-4 py-3 bg-[#060b18] border-b border-slate-800/60 text-xs text-slate-400 font-bold uppercase tracking-wider">%</th>
                <th className="text-right px-4 py-3 bg-[#060b18] border-b border-slate-800/60 w-[50px]"></th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((row, i) => {
                const dbCat = categorias.find(c => c.nome === row.categoria);
                return (
                  <tr key={row.categoria} className="hover:bg-slate-800/20 border-b border-slate-800/40 transition-colors group">
                    <td className="font-semibold text-slate-200 px-4 py-3.5">
                      <div className="flex items-center gap-2.5 shrink-0">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: pieData.find(p => p.name === row.categoria) ? COLORS[i % COLORS.length] : '#1e293b' }}></div>
                        {row.categoria}
                      </div>
                    </td>
                    <td className="text-right font-mono text-emerald-400/90 tracking-tight px-4 py-3">{formatCurrency(row.entradas)}</td>
                    <td className="text-right font-mono font-bold text-rose-400 tracking-tight px-4 py-3">{formatCurrency(row.saidas)}</td>
                    <td className="text-center font-mono text-xs text-slate-500 bg-slate-900/20 px-4 py-3">{row.perc.toFixed(1)}%</td>
                    <td className="text-right px-4 py-3">
                       {dbCat && (
                          <button onClick={() => handleDeleteCat(dbCat.id, dbCat.nome)} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded transition-all">
                             <Trash2 className="w-3.5 h-3.5" />
                          </button>
                       )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analytics Section */}
      <div className="w-full md:w-[40%] h-full flex flex-col p-6 lg:p-8 bg-gradient-to-br from-[#020617] to-[#0f172a] shadow-inner relative">
        <div className="flex-1 w-full bg-[#060b18] border border-slate-800/60 rounded-[2rem] p-6 shadow-2xl flex flex-col relative overflow-hidden backdrop-blur-xl">
          
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-emerald-500 to-rose-500 opacity-50"></div>
          
          <h2 className="text-xs font-black text-slate-400 mb-6 shrink-0 uppercase tracking-widest text-center">
            Distribuição de Gastos Globais
          </h2>
          
          <div className="flex-1 w-full relative">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius="65%"
                  outerRadius="85%"
                  paddingAngle={3}
                  cornerRadius={4}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center"
                  wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-slate-500 italic font-medium text-sm">
              Nenhuma saída faturada.
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
