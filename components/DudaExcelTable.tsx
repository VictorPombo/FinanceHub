"use client";

import { useState, useRef, useEffect } from "react";
import { formatCurrency } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";

interface Props {
  initialData: any[];
  userId: string;
  userCategories: string[];
  onDataChange: (newData: any[]) => void;
  currentTabMonth: number;
  currentTabYear: number;
}

const PARCELAMENTO_OPTIONS = [
  "1x (Única)", "2x", "3x", "4x", "5x", "6x", 
  "7x", "8x", "9x", "10x", "11x", "12x", "Fixo"
];

export default function DudaExcelTable({ initialData, userId, userCategories, onDataChange, currentTabMonth, currentTabYear }: Props) {
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const supabase = createClient();

  const handleGhostClick = async (itemType: string, focusField: string) => {
    const tempId = `temp-${Date.now()}`;
    const defaultDate = `${currentTabYear}-${String(currentTabMonth).padStart(2, '0')}-01`;
    const tempItem = {
      id: tempId,
      user_id: userId,
      data: defaultDate,
      descricao: "",
      categoria: "Outros",
      tipo: itemType,
      recorrencia: "Única",
      parcela: "1/1",
      valor: 0,
      status: "Em aberto",
      isDraft: true
    };

    onDataChange([...initialData, tempItem]);
    setTimeout(() => {
        setEditingCell({ id: tempId, field: focusField });
    }, 50);
  };

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  const updateItem = async (id: string, field: string, value: any, itemType: string) => {
    const itemIndex = initialData.findIndex((i) => i.id === id);
    if (itemIndex === -1) return;
    const item = initialData[itemIndex];
    const isTemp = String(id).startsWith("temp-");

    if (field === "parcelamento") {
      if (isTemp) {
         toast.error("Preencha descrição ou valor antes de parcelar.");
         setEditingCell(null);
         return;
      }
      let nMeses = 1;
      let recType = "Parcelado";
      if (value === "Fixo") {
        nMeses = 12;
        recType = "Recorrente";
      } else {
        nMeses = parseInt(value);
      }

      setEditingCell(null);
      if (isNaN(nMeses) || nMeses <= 1) {
         const { error } = await supabase.from("duda_lancamentos").update({ recorrencia: "Única", parcela: "1/1" }).eq("id", id);
         if (!error) onDataChange(initialData.map(d => d.id === id ? {...d, recorrencia: "Única", parcela: "1/1"} : d));
         return;
      }

      toast.loading(`Gerando parcelas futuras...`);
      const origParcela = recType === "Recorrente" ? "Fixa" : `1/${nMeses}`;
      await supabase.from("duda_lancamentos").update({ recorrencia: recType, parcela: origParcela }).eq("id", id);
      
      const baseDate = new Date(item.data + "T00:00:00");
      const forwardRows = [];
      
      for (let i = 1; i < nMeses; i++) {
         const future = new Date(baseDate);
         future.setMonth(future.getMonth() + i);
         const yyyy = future.getFullYear();
         const mm = String(future.getMonth() + 1).padStart(2, '0');
         const dd = String(future.getDate()).padStart(2, '0');
         
         forwardRows.push({
           user_id: userId,
           data: `${yyyy}-${mm}-${dd}`,
           descricao: item.descricao,
           categoria: item.categoria,
           tipo: item.tipo,
           recorrencia: recType,
           parcela: recType === "Recorrente" ? "Fixa" : `${i+1}/${nMeses}`,
           valor: item.valor,
           status: "Em aberto"
         });
      }

      const { data: generated, error } = await supabase.from("duda_lancamentos").insert(forwardRows).select();
      toast.dismiss();
      if (error) {
         toast.error("Erro no motor de parcelamento");
      } else {
         toast.success("Mágica de parcelamento concluída!");
         const origUpdated = { ...item, recorrencia: recType, parcela: origParcela };
         onDataChange([...initialData.map(d => d.id === id ? origUpdated : d), ...(generated || [])]);
      }
      return;
    }

    const updatePayload: any = {};
    if (field === "valor_digitado") { 
      let newValor = Math.abs(Number(String(value).replace(',', '.')));
      newValor = item.tipo === "Saída" ? -newValor : newValor;
      updatePayload.valor = newValor;
    } else {
      updatePayload[field] = value;
      if (field === "tipo") {
          updatePayload.valor = value === "Saída" ? -Math.abs(item.valor) : Math.abs(item.valor);
      }
    }

    if (item.recorrencia === 'Recorrente') {
       if (window.confirm(`Este é um registro Fixo. Deseja aplicar essa alteração para TODOS os meses futuros vinculados?`)) {
           toast.loading("Atualizando valores fixos futuros...");
           const { error: errMass } = await supabase.from("duda_lancamentos")
              .update(updatePayload)
              .eq("recorrencia", "Recorrente")
              .eq("descricao", item.descricao)
              .eq("tipo", item.tipo)
              .gte("data", item.data);
              
           toast.dismiss();
           if (errMass) { toast.error("Erro ao atualizar!"); return; }
           toast.success("Atualizado!");
           window.location.reload();
           return;
       }
    }

    const optimisticData = [...initialData];
    optimisticData[itemIndex] = { ...item, ...updatePayload };
    onDataChange(optimisticData);
    setEditingCell(null);

    if (isTemp) {
        const finalDesc = optimisticData[itemIndex].descricao;
        const finalVal = Math.abs(optimisticData[itemIndex].valor);
        
        if (!finalDesc || finalVal === 0) {
             return;
        }

        const payloadToInsert = { ...optimisticData[itemIndex] };
        delete payloadToInsert.id;
        delete payloadToInsert.isDraft;
        
        const { data, error } = await supabase.from("duda_lancamentos").insert([payloadToInsert]).select().single();
        if (data) onDataChange(optimisticData.map(d => d.id === id ? data : d));
        else if (error) toast.error("Erro ao salvar rascunho");
    } else {
        const { error } = await supabase.from("duda_lancamentos").update(updatePayload).eq("id", id);
        if (error) toast.error("Erro ao salvar");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string, field: string, type: string) => {
    if (e.key === "Escape") setEditingCell(null);
    if (e.key === "Enter") {
      updateItem(id, field, (e.target as HTMLInputElement).value, type);
    }
  };

  const deleteItem = async (id: string) => {
    if (id.startsWith("ghost-") || id.startsWith("temp-")) {
       onDataChange(initialData.filter(d => d.id !== id));
       return;
    }
    const item = initialData.find(d => d.id === id);
    if (!item) return;

    if (item.recorrencia === 'Recorrente') {
       if (window.confirm("Este lançamento é Fixo. Deseja excluir ele E TODOS OS FUTUROS subsequentes?")) {
          toast.loading("Excluindo...");
          await supabase.from("duda_lancamentos").delete()
              .eq("recorrencia", "Recorrente").eq("descricao", item.descricao).eq("tipo", item.tipo).gte("data", item.data);
          toast.dismiss();
          toast.success("Excluídos!");
          window.location.reload();
          return;
       }
    } else {
       if (!window.confirm("Deseja realmente excluir este lançamento da Duda?")) return;
    }

    onDataChange(initialData.filter((d) => d.id !== id));
    await supabase.from("duda_lancamentos").delete().eq("id", id);
    toast.success("Excluído");
  };

  const renderCell = (item: any, field: string, width: string, type: "text" | "number" | "select" | "date" = "text", options?: string[]) => {
    const isEditing = editingCell?.id === item.id && editingCell?.field === field;
    const isGhost = item.id.startsWith("ghost-");
    
    let displayValue = item[field] || "";
    if (field === "valor_digitado" && !isGhost) {
      displayValue = formatCurrency(item.valor);
    }
    if (field === "parcelamento") {
       if (item.recorrencia === "Única") displayValue = "1x (Única)";
       else if (item.recorrencia === "Recorrente") displayValue = "Fixo";
       else if (item.parcela) {
          const matched = item.parcela.match(/\/(\d+)/);
          displayValue = matched ? `${matched[1]}x` : item.parcela;
       }
    }
    if (field === "data" && !isEditing && !isGhost && displayValue) {
       const parts = displayValue.split('-');
       if (parts.length === 3) displayValue = `${parts[2]}/${parts[1]}`;
    }

    const canEdit = field !== "id" && field !== "valor_final" && field !== "parcela";
    if (isGhost && !isEditing) displayValue = ""; 

    let editValue = item[field] || "";
    if (field === "valor_digitado") {
       editValue = item.valor !== 0 ? Math.abs(item.valor).toString() : "";
       if (isGhost) editValue = "";
    } else if (field === "parcelamento") {
       editValue = displayValue;
    }

    return (
      <td 
        className={`${isEditing ? "cell-editing" : ""} ${isGhost ? "opacity-60 cursor-pointer hover:bg-slate-900" : "cursor-cell"}`}
        style={{ width, minWidth: width, maxWidth: width }}
        onDoubleClick={() => canEdit && !isGhost && setEditingCell({ id: item.id, field })}
        onClick={() => {
           if (!canEdit) return;
           if (isGhost) handleGhostClick(item.tipo, field);
           else setEditingCell({ id: item.id, field }); // single click edit for Excel feel!
        }}
      >
        {isEditing ? (
          type === "select" ? (
            <select
              ref={inputRef as React.RefObject<HTMLSelectElement>}
              className="inline-select"
              defaultValue={editValue}
              onBlur={(e) => updateItem(item.id, field, e.target.value, item.tipo)}
              onKeyDown={(e) => handleKeyDown(e, item.id, field, item.tipo)}
            >
              <option value="" disabled>Selecionar...</option>
              {options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type={type}
              className="inline-input"
              defaultValue={editValue}
              onBlur={(e) => updateItem(item.id, field, e.target.value, item.tipo)}
              onKeyDown={(e) => handleKeyDown(e, item.id, field, item.tipo)}
              placeholder={isGhost ? "Digitar..." : ""}
              step={type === "number" ? "0.01" : undefined}
            />
          )
        ) : (
          <div className="px-2 truncate">
             <span className={`${field === 'valor_digitado' && !isGhost && item.valor < 0 ? 'status-saida' : ''} ${field === 'valor_digitado' && !isGhost && item.valor > 0 ? 'status-entrada' : ''}`}>
                {displayValue}
             </span>
             {field === 'status' && !isGhost && (
                <span className={`px-2 py-0.5 ml-2 rounded-sm text-[10px] font-bold ${item.status === 'Pago' ? 'status-confirmado' : 'status-previsto'}`}>
                   {item.status === 'Pago' ? '✔' : '🕒'}
                </span>
             )}
          </div>
        )}
      </td>
    );
  };

  const renderRow = (item: any, sequenceIndex: number) => {
    const isGhost = item.id.startsWith("ghost-");
    let rowClass = item.tipo === "Entrada" ? "row-entrada" : "row-saida";
    if (isGhost) rowClass = "row-ghost";

    return (
      <tr key={item.id} className={rowClass}>
        <td className="excel-row-number group relative">
           {!isGhost && <button onClick={() => deleteItem(item.id)} className="absolute left-1 opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 bg-[#020617]"><Trash2 className="w-3 h-3"/></button>}
           {isGhost ? "+" : sequenceIndex + 1}
        </td>
        {renderCell(item, "descricao", "250px")}
        {renderCell(item, "valor_digitado", "130px", "number")}
        {renderCell(item, "parcelamento", "120px", "select", PARCELAMENTO_OPTIONS)}
        <td className="text-center text-slate-500 opacity-80" style={{width: '70px'}}>
           {item.parcela || ""}
        </td>
        {renderCell(item, "data", "110px", "date")}
        {renderCell(item, "status", "110px", "select", ["Pago", "Em aberto"])}
        {renderCell(item, "categoria", "180px", "select", userCategories && userCategories.length > 0 ? userCategories : [])}
      </tr>
    );
  };

  const entradas = initialData.filter(d => d.tipo === "Entrada");
  const saidas = initialData.filter(d => d.tipo === "Saída");

  const ghostEntradas = Array.from({length: 1}).map((_, i) => ({
    id: `ghost-entrada-${i}`, tipo: "Entrada", descricao: "", categoria: "", valor: 0, status: "", data: ""
  }));
  const ghostSaidas = Array.from({length: 1}).map((_, i) => ({
    id: `ghost-saida-${i}`, tipo: "Saída", descricao: "", categoria: "", valor: 0, status: "", data: ""
  }));

  const totalEntradas = entradas.reduce((acc, curr) => acc + Number(curr.valor), 0);
  const totalSaidas = saidas.reduce((acc, curr) => acc + Number(curr.valor), 0);
  const saldoFinal = totalEntradas + totalSaidas;

  return (
    <div className="w-full h-full flex flex-col font-mono bg-[#020617] pb-10 relative overflow-hidden">
      <div className="flex-1 w-full overflow-auto relative bg-[#020617]">
        <table className="excel-table">
          <thead>
            <tr>
              <th className="w-[40px] z-30"></th>
              <th style={{width: '250px'}}>Descrição</th>
              <th style={{width: '130px'}}>Valor (R$)</th>
              <th style={{width: '120px'}}>Parcelamento</th>
              <th style={{width: '70px'}}>Parc.</th>
              <th style={{width: '110px'}}>Data</th>
              <th style={{width: '110px'}}>Status</th>
              <th style={{width: '180px'}}>Categoria</th>
            </tr>
          </thead>
          <tbody>
            <tr>
               <td className="excel-row-number border-t-2 border-emerald-500/50"></td>
               <td colSpan={7} className="border-t-2 border-emerald-500/50 bg-[#0F172A] text-emerald-400 font-bold p-2 uppercase text-xs">
                  Receitas (Planilha Duda)
               </td>
            </tr>
            {entradas.map((item, i) => renderRow(item, i))}
            {ghostEntradas.map((item, i) => renderRow(item, entradas.length + i))}

            <tr>
               <td className="excel-row-number border-t-2 border-red-500/50"></td>
               <td colSpan={7} className="border-t-2 border-red-500/50 bg-[#0F172A] text-red-500 font-bold p-2 uppercase text-xs">
                  Despesas (Planilha Duda)
               </td>
            </tr>
            {saidas.map((item, i) => renderRow(item, i))}
            {ghostSaidas.map((item, i) => renderRow(item, saidas.length + i))}

            <tr className="excel-footer-row">
              <td className="excel-row-number"></td>
              <td colSpan={2} className="px-4 py-3 font-bold uppercase tracking-widest text-slate-300">
                BALANÇO MENSAL
              </td>
              <td colSpan={1}></td>
              <td colSpan={2} className="px-4 text-right text-[10px] font-semibold uppercase text-slate-500 border-l border-slate-700">
                <div>Total Entradas:</div>
                <div className="mt-1">Total Saídas:</div>
                <div className="text-slate-200 mt-2">SALDO ACUMULADO:</div>
              </td>
              <td colSpan={2} className="px-4 text-left font-bold">
                <div className="text-emerald-500">{formatCurrency(totalEntradas)}</div>
                <div className="text-red-500 mt-1">{formatCurrency(totalSaidas)}</div>
                <div className={`mt-2 ${saldoFinal < 0 ? "text-red-500" : "text-emerald-500"}`}>
                   {formatCurrency(saldoFinal)}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
