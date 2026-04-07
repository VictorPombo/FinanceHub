"use client";

import { useState, useRef, useEffect } from "react";
import { formatCurrency } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Trash2, Plus } from "lucide-react";

interface Props {
  initialData: any[];
  user_id: string;
}

export default function DividasTable({ initialData, user_id }: Props) {
  const [data, setData] = useState(initialData);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  const handleCreateNew = async () => {
    const newRecord = {
      user_id,
      devedor: "Novo Devedor",
      valor_total: 0,
      num_parcelas: 1,
      valor_parcela: 0,
      total_recebido: 0,
      previsao_final: "Mês/Ano",
      status: "Em andamento"
    };

    const { data: inserted, error } = await supabase.from("dividas").insert([newRecord]).select().single();
    if (error) toast.error("Erro: " + error.message);
    else {
      setData(prev => [...prev, inserted]);
      toast.success("Dívida adicionada");
    }
  };

  const updateItem = async (id: string, field: string, value: any) => {
    const prevData = [...data];
    const index = data.findIndex(d => d.id === id);
    if (index === -1) return;
    
    const row = { ...data[index], [field]: value };

    // Auto calculate if missing logic
    if (field === "valor_total" || field === "num_parcelas") {
        if (row.num_parcelas > 0) {
           row.valor_parcela = Number(row.valor_total) / Number(row.num_parcelas);
        }
    }

    if (field === "total_recebido" && Number(row.total_recebido) >= Number(row.valor_total)) {
        row.status = "Quitado";
    } else if (field === "total_recebido" && row.status === "Quitado") {
        row.status = "Em andamento";
    }

    const newData = [...data];
    newData[index] = row;
    setData(newData);
    setEditingCell(null);

    const { error } = await supabase.from("dividas").update(row).eq("id", id);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      setData(prevData);
    }
  };

  const deleteItem = async (id: string) => {
    if (!window.confirm("Excluir esta dívida?")) return;
    const prevData = [...data];
    setData(data.filter(d => d.id !== id));
    
    const { error } = await supabase.from("dividas").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
      setData(prevData);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string, field: string) => {
    if (e.key === "Escape") setEditingCell(null);
    if (e.key === "Enter") updateItem(id, field, (e.target as HTMLInputElement).value);
  };

  const renderCell = (item: any, field: string, width: string, type: "text" | "number" | "select" = "text", options?: string[]) => {
    const isEditing = editingCell?.id === item.id && editingCell?.field === field;
    const displayValue = item[field] || (type === "number" ? "0" : "");
    const canEdit = field !== "id";

    return (
      <td 
        className={`${isEditing ? "cell-editing" : ""} transition-colors p-2`}
        style={{ width, minWidth: width, maxWidth: width }}
        onDoubleClick={() => canEdit && setEditingCell({ id: item.id, field })}
        onClick={() => canEdit && setEditingCell({ id: item.id, field })}
      >
        {isEditing ? (
          type === "select" ? (
             <select ref={inputRef as React.RefObject<HTMLSelectElement>} className="inline-select" defaultValue={displayValue} onBlur={(e) => updateItem(item.id, field, e.target.value)} onKeyDown={(e) => handleKeyDown(e, item.id, field)}>
               {options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
             </select>
          ) : (
            <input ref={inputRef as React.RefObject<HTMLInputElement>} type={type} className="inline-input" defaultValue={displayValue} onBlur={(e) => updateItem(item.id, field, e.target.value)} onKeyDown={(e) => handleKeyDown(e, item.id, field)} step={type === "number" ? "0.01" : undefined} />
          )
        ) : (
          <div className={`w-full h-full truncate ${type === 'number' ? 'text-right font-mono' : ''}`}>
             {type === 'number' && (field === 'valor_total' || field === 'valor_parcela' || field === 'total_recebido') ? formatCurrency(Number(displayValue)) : displayValue}
          </div>
        )}
      </td>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-[#F8FAFC]">
      <div className="p-4 bg-white border-b border-zinc-200 shadow-[0_4px_10px_rgba(0,0,0,0.02)] flex items-center shrink-0 relative z-30">
        <button onClick={handleCreateNew} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]">
          <Plus className="w-4 h-4 mr-2" /> Cadastrar Dívida
        </button>
      </div>

      <div className="flex-1 w-full overflow-auto">
        <table className="excel-table w-max min-w-full">
          <thead>
            <tr>
              <th className="w-[40px] min-w-[40px] max-w-[40px] sticky left-0 z-30 border-r border-[#2a3f65]"></th>
              <th style={{width: '200px'}}>Devedor</th>
              <th style={{width: '150px'}}>Valor Total</th>
              <th style={{width: '100px'}}>Nº Parcelas</th>
              <th style={{width: '140px'}}>Valor/Parcela</th>
              <th style={{width: '150px'}}>Total Recebido</th>
              <th style={{width: '150px'}}>Falta Receber</th>
              <th style={{width: '120px'}}>Previsão Final</th>
              <th style={{width: '140px'}}>Status</th>
              <th style={{width: '80px'}}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => {
              const faltaReceber = Number(item.valor_total) - Number(item.total_recebido);
              
              let statusClass = "bg-gray-100 text-gray-800";
              if (item.status === "Em andamento") statusClass = "bg-orange-100 text-orange-800";
              if (item.status === "Quitado") statusClass = "bg-green-100 text-green-800";
              if (item.status === "Atrasado") statusClass = "bg-red-100 text-red-800";

              return (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="excel-row-number sticky left-0 z-10">{index + 1}</td>
                  {renderCell(item, "devedor", "200px")}
                  {renderCell(item, "valor_total", "150px", "number")}
                  {renderCell(item, "num_parcelas", "100px", "number")}
                  {renderCell(item, "valor_parcela", "140px", "number")}
                  {renderCell(item, "total_recebido", "150px", "number")}
                  <td className="text-right font-mono font-medium" style={{width: '150px'}}>{formatCurrency(faltaReceber)}</td>
                  {renderCell(item, "previsao_final", "120px")}
                  <td style={{width: '140px'}} className="text-center" onDoubleClick={() => setEditingCell({ id: item.id, field: "status" })} onClick={() => setEditingCell({ id: item.id, field: "status" })}>
                     {editingCell?.id === item.id && editingCell?.field === "status" ? (
                        <select ref={inputRef as any} className="inline-select outline-2 outline-blue-500" defaultValue={item.status} onBlur={(e) => updateItem(item.id, "status", e.target.value)} onKeyDown={(e) => handleKeyDown(e, item.id, "status")}>
                          <option value="Em andamento">Em andamento</option>
                          <option value="Quitado">Quitado</option>
                          <option value="Atrasado">Atrasado</option>
                        </select>
                     ) : (
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${statusClass}`}>{item.status}</span>
                     )}
                  </td>
                  <td className="text-center" style={{width: '80px'}}>
                    <button onClick={() => deleteItem(item.id)} className="text-gray-400 hover:text-red-500 mx-auto block p-1"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
