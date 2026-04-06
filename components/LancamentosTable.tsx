"use client";

import { useState, useRef, useEffect } from "react";
import { formatCurrency, CATEGORIAS } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";

interface Props {
  initialData: any[];
}

export default function LancamentosTable({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  const updateItem = async (id: string, field: string, value: any) => {
    // Optimistic update
    const prevData = [...data];
    const index = data.findIndex((item) => item.id === id);
    if (index === -1) return;
    
    const row = { ...data[index] };

    // Special logic for valor
    if (field === "valor_digitado") {
      const numValue = Math.abs(Number(value)); // User types positive
      row.valor = row.tipo === "Saída" ? -numValue : numValue;
    } else {
      row[field] = value;
      // Re-evaluate valor if type changes
      if (field === "tipo") {
         row.valor = value === "Saída" ? -Math.abs(row.valor) : Math.abs(row.valor);
      }
    }

    const newData = [...data];
    newData[index] = row;
    setData(newData);
    setEditingCell(null);

    // Filter which fields go to supabase (valor_digitado is ephemeral)
    const updatePayload: any = { [field === "valor_digitado" ? "valor" : field]: row[field === "valor_digitado" ? "valor" : field] };
    if (field === "tipo" || field === "valor_digitado") {
        updatePayload.valor = row.valor; // Ensure valor is correctly saved when type or digit changes
    }
    
    // DB Update
    const { error } = await supabase
      .from("lancamentos")
      .update(updatePayload)
      .eq("id", id);

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      setData(prevData); // rollback
    }
  };

  const deleteItem = async (id: string) => {
    if (!window.confirm("Deseja realmente excluir este lançamento?")) return;
    const prevData = [...data];
    setData(data.filter(d => d.id !== id));
    
    const { error } = await supabase.from("lancamentos").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
      setData(prevData);
    } else {
      toast.success("Lançamento excluído");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string, field: string) => {
    if (e.key === "Escape") {
      setEditingCell(null);
    }
    if (e.key === "Enter") {
      const target = e.target as HTMLInputElement;
      updateItem(id, field, target.value);
    }
  };

  const renderCell = (item: any, field: string, width: string, type: "text" | "number" | "select" | "date" = "text", options?: string[]) => {
    const isEditing = editingCell?.id === item.id && editingCell?.field === field;
    
    let displayValue = item[field] || "";
    // Format Display
    if (field === "valor_digitado") {
      displayValue = Math.abs(item.valor).toString(); // show raw number for easier typing or empty
    }
    
    const canEdit = field !== "id" && field !== "mes"; // Add non-editable logic if needed

    return (
      <td 
        className={`${isEditing ? "cell-editing" : ""} transition-colors ${field === "valor_digitado" ? "bg-[#FFFDE7]" : ""}`}
        style={{ width, minWidth: width, maxWidth: width }}
        onDoubleClick={() => canEdit && setEditingCell({ id: item.id, field })}
        onClick={() => canEdit && setEditingCell({ id: item.id, field })}
      >
        {isEditing ? (
          type === "select" ? (
            <select
              ref={inputRef as React.RefObject<HTMLSelectElement>}
              className="inline-select"
              defaultValue={displayValue}
              onBlur={(e) => updateItem(item.id, field, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, item.id, field)}
            >
              {options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type={type}
              className="inline-input"
              defaultValue={displayValue}
              onBlur={(e) => updateItem(item.id, field, e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, item.id, field)}
              placeholder={field === "valor_digitado" ? "Digite o valor" : ""}
              step={type === "number" ? "0.01" : undefined}
            />
          )
        ) : (
          <div className={`w-full h-full truncate flex items-center ${field === 'valor_digitado' ? 'justify-end font-mono' : ''}`}>
             <span className={`truncate ${item.observacoes?.includes("ÚLTIMA PARCELA") && field === 'observacoes' ? 'text-red-600 font-bold' : ''}`}>
                {displayValue}
             </span>
          </div>
        )}
      </td>
    );
  };

  // Footer totals
  const totalEntradas = data.filter(d => d.tipo === "Entrada").reduce((acc, curr) => acc + Number(curr.valor), 0);
  const totalSaidas = data.filter(d => d.tipo === "Saída").reduce((acc, curr) => acc + Number(curr.valor), 0);
  const saldoFinal = totalEntradas + totalSaidas;

  return (
    <div className="w-full h-full flex flex-col pt-2 font-sans bg-white pb-10">
      <div className="flex-1 w-full overflow-auto relative">
        <table className="excel-table w-max min-w-full">
          <thead>
            <tr>
              <th className="w-[40px] min-w-[40px] max-w-[40px] sticky left-0 z-30 border-r border-[#2a3f65]"></th>
              <th style={{width: '110px'}}>Data</th>
              <th style={{width: '120px'}}>Mês</th>
              <th style={{width: '200px'}}>Descrição</th>
              <th style={{width: '140px'}}>Categoria</th>
              <th style={{width: '90px'}}>Tipo</th>
              <th style={{width: '110px'}}>Recorrência</th>
              <th style={{width: '80px'}}>Parcela</th>
              <th style={{width: '130px'}}>Valor Digitado</th>
              <th style={{width: '130px'}}>Valor (R$)</th>
              <th style={{width: '110px'}}>Status</th>
              <th style={{width: '180px'}}>Observações</th>
              <th style={{width: '80px'}}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => {
              // Row styling
              let rowClass = "";
              if (item.tipo === "Entrada") rowClass += " row-entrada";
              if (item.tipo === "Saída") rowClass += " row-saida";
              
              let textStyle = "";
              if (item.status === "Previsto") textStyle += " text-gray-500 italic";
              if (item.status === "Cancelado") textStyle += " text-gray-500 line-through";

              return (
                <tr key={item.id} className={`${rowClass} ${textStyle}`}>
                  <td className="excel-row-number sticky left-0 z-10 bg-[#F3F4F6]">{index + 1}</td>
                  {renderCell(item, "data", "110px", "date")}
                  <td className="truncate" style={{width: '120px'}}>{new Date(item.data + "T00:00:00").toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</td>
                  {renderCell(item, "descricao", "200px")}
                  {renderCell(item, "categoria", "140px", "select", CATEGORIAS)}
                  {renderCell(item, "tipo", "90px", "select", ["Entrada", "Saída"])}
                  {renderCell(item, "recorrencia", "110px", "select", ["Recorrente", "Única", "Parcelado"])}
                  {renderCell(item, "parcela", "80px")}
                  {renderCell(item, "valor_digitado", "130px", "number")}
                  <td className={`font-mono text-right font-medium pr-2 ${item.valor < 0 ? 'text-[#EF4444]' : 'text-[#166534]'}`} style={{width: '130px'}}>
                    {formatCurrency(item.valor)}
                  </td>
                  {renderCell(item, "status", "110px", "select", ["Confirmado", "Previsto", "Cancelado"])}
                  {renderCell(item, "observacoes", "180px")}
                  <td className="text-center" style={{width: '80px'}}>
                    <button onClick={() => deleteItem(item.id)} className="text-gray-400 hover:text-red-500 mx-auto block p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
            
            {/* Total Footer Row */}
            <tr className="excel-footer-row">
              <td className="sticky left-0 bg-[#1C2B4A] z-20"></td>
              <td colSpan={7} className="text-right pr-4 uppercase tracking-wide">TOTAL:</td>
              <td className="text-right font-mono text-gray-400">{formatCurrency(data.reduce((a,c) => Math.abs(c.valor) + a, 0))} (Abs)</td>
              <td className={`text-right font-mono ${saldoFinal < 0 ? 'text-red-300' : 'text-green-300'}`}>{formatCurrency(saldoFinal)}</td>
              <td colSpan={3}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
