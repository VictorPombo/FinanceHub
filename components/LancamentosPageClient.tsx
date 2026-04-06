"use client";

import { useState, useMemo } from "react";
import LancamentosTotalizers from "./LancamentosTotalizers";
import LancamentosTable from "./LancamentosTable";
import { getMesAnoKey, getMesAno } from "@/lib/types";
import { Search, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

interface Props {
  initialData: any[];
  user_id: string;
}

export default function LancamentosPageClient({ initialData, user_id }: Props) {
  const [data, setData] = useState(initialData);
  const [filterMonth, setFilterMonth] = useState<string>("Todos");
  const [filterType, setFilterType] = useState<string>("Todos");
  const [filterStatus, setFilterStatus] = useState<string>("Todos");
  const [search, setSearch] = useState("");
  
  const supabase = createClient();

  // Extract unique months from data for the dropdown
  const monthsAvailable = useMemo(() => {
    const keys = new Set<string>();
    data.forEach(d => keys.add(getMesAnoKey(d.data)));
    return Array.from(keys).sort((a,b) => b.localeCompare(a)); // Descending
  }, [data]);

  const currentMonthFilterKey = filterMonth === "Todos" 
    ? getMesAnoKey(new Date().toISOString()) 
    : filterMonth;

  // Filter Data
  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (filterMonth !== "Todos" && getMesAnoKey(item.data) !== filterMonth) return false;
      if (filterType !== "Todos" && item.tipo !== filterType) return false;
      if (filterStatus !== "Todos" && item.status !== filterStatus) return false;
      if (search && !item.descricao.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }).sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
  }, [data, filterMonth, filterType, filterStatus, search]);

  const handleCreateNew = async () => {
    const today = new Date().toISOString().split('T')[0];
    const newRecord = {
      user_id,
      data: today,
      descricao: "Novo Lançamento",
      categoria: "Outros",
      tipo: "Saída",
      recorrencia: "Única",
      parcela: null,
      valor: -0.01,
      status: "Previsto",
      observacoes: ""
    };

    const { data: inserted, error } = await supabase
      .from("lancamentos")
      .insert([newRecord])
      .select()
      .single();

    if (error) {
      toast.error("Erro ao inserir: " + error.message);
    } else {
      setData((prev) => [...prev, inserted]);
      toast.success("Linha em branco adicionada!");
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <LancamentosTotalizers 
        lancamentos={filteredData} 
        currentMonthKey={currentMonthFilterKey} 
      />
      
      {/* Toolbar Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-white border-b border-gray-200 shrink-0">
        <button 
          onClick={handleCreateNew}
          className="flex items-center bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4 mr-1" /> Novo Lançamento
        </button>
        
        <div className="h-6 w-px bg-gray-300 mx-1"></div>
        
        <select 
          value={filterMonth} 
          onChange={e => setFilterMonth(e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="Todos">Todos os Meses</option>
          {monthsAvailable.map(m => (
            <option key={m} value={m}>{getMesAno(m)}</option>
          ))}
        </select>

        <select 
          value={filterType} 
          onChange={e => setFilterType(e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="Todos">Todos Tipos</option>
          <option value="Entrada">Entradas</option>
          <option value="Saída">Saídas</option>
        </select>

        <select 
          value={filterStatus} 
          onChange={e => setFilterStatus(e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="Todos">Todos Status</option>
          <option value="Confirmado">Confirmado</option>
          <option value="Previsto">Previsto</option>
          <option value="Cancelado">Cancelado</option>
        </select>

        <div className="relative ml-auto">
          <Search className="w-4 h-4 absolute left-2.5 top-2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar descrição..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <LancamentosTable initialData={filteredData} />
      </div>
    </div>
  );
}
