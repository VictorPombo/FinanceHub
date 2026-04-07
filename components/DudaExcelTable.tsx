"use client";

import { useState, useRef, useEffect } from "react";
import { formatCurrency } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

interface Props {
  initialData: any[];
  userId: string;
  userCategories: string[];
  onDataChange: (newData: any[]) => void;
  currentTabMonth: number;
  currentTabYear: number;
}

export default function DudaExcelTable({ initialData, userId, userCategories, onDataChange, currentTabMonth, currentTabYear }: Props) {
  const [editingCell, setEditingCell] = useState<{ side: 'left' | 'right', index: number, field: string } | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  // Separate data keeping their visual index intact
  const entradas = initialData.filter(d => d.tipo === "Entrada");
  const saidas = initialData.filter(d => d.tipo === "Saída");

  const updateItem = async (isEntrada: boolean, index: number, field: string, value: any) => {
    const list = isEntrada ? entradas : saidas;
    const item = list[index];
    const defaultDate = `${currentTabYear}-${String(currentTabMonth).padStart(2, '0')}-01`;

    const updatePayload: any = {};
    if (field === "valor") {
        const valNum = Math.abs(Number(String(value).replace(',', '.')));
        updatePayload.valor = isEntrada ? valNum : -valNum;
    } else {
        updatePayload[field] = value;
    }

    // Ghost insertion
    if (!item) {
        if (!value) return; // ignore empty typing on ghosts
        const payloadToInsert = {
            user_id: userId,
            data: defaultDate,
            descricao: isEntrada && field === 'descricao' ? value : "",
            categoria: isEntrada && field === 'categoria' ? value : "Outros",
            tipo: isEntrada ? "Entrada" : "Saída",
            recorrencia: "Única",
            parcela: "1/1",
            valor: field === 'valor' ? updatePayload.valor : 0,
            status: "Em aberto"
        };
        const { data, error } = await supabase.from("duda_lancamentos").insert([payloadToInsert]).select().single();
        if (data) {
            onDataChange([...initialData, data]);
        }
    } else {
        // Update existing
        const optimisticData = initialData.map(d => d.id === item.id ? { ...d, ...updatePayload } : d);
        onDataChange(optimisticData);
        
        const { error } = await supabase.from("duda_lancamentos").update(updatePayload).eq("id", item.id);
        if (error) toast.error("Erro ao salvar");
    }
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, isEntrada: boolean, index: number, field: string) => {
    if (e.key === "Escape") setEditingCell(null);
    if (e.key === "Enter") {
      updateItem(isEntrada, index, field, (e.target as HTMLInputElement).value);
    }
  };

  const renderCellLeft = (index: number, colLetter: string, field: string, width: string) => {
    const item = entradas[index];
    const isEditing = editingCell?.side === 'left' && editingCell?.index === index && editingCell?.field === field;
    
    let displayValue = item ? item[field] : "";
    if (field === "valor" && item) {
       displayValue = item.valor !== 0 ? formatCurrency(item.valor) : "";
    }
    let editValue = item ? item[field] : "";
    if (field === "valor" && item) {
       editValue = item.valor !== 0 ? Math.abs(item.valor).toString() : "";
    }

    const type = field === "valor" ? "number" : "text";

    return (
      <td 
        className={`${isEditing ? "duda-cell-editing" : ""} cursor-cell !px-1 border border-[#D4D4D4]`}
        style={{ width, minWidth: width, maxWidth: width }}
        onDoubleClick={() => setEditingCell({ side: 'left', index, field })}
        onClick={() => { if(!item) setEditingCell({ side: 'left', index, field }) }}
      >
        {isEditing ? (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={type}
            className="duda-inline-input"
            defaultValue={editValue}
            placeholder={!item && field === 'descricao' ? 'Cliente' : ''}
            onBlur={(e) => updateItem(true, index, field, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, true, index, field)}
            step={type === "number" ? "0.01" : undefined}
          />
        ) : (
          <div className={`truncate px-1 relative ${field === 'valor' ? 'text-right' : ''}`}>
             <span>{displayValue}</span>
          </div>
        )}
      </td>
    );
  };

  const renderCellRight = (index: number, colLetter: string, field: string, width: string) => {
     // G1 is reserved for visual "SAIDAS" string in the screenshot
     if (index === 0 && colLetter === 'G') {
        return (
           <td className="border border-[#D4D4D4] text-red-600 font-bold px-2 relative" style={{ width, minWidth: width, maxWidth: width }}>
               SAIDAS
           </td>
        );
     }
     if (index === 0 && colLetter === 'H') {
         // H1 is just empty next to SAIDAS
         return <td className="border border-[#D4D4D4]" style={{ width, minWidth: width, maxWidth: width }}></td>;
     }

     // Map array index for Right side (it starts at index 1 visually but maps to array index 0)
     const dataIndex = index - 1;
     const item = saidas[dataIndex];
     const isEditing = editingCell?.side === 'right' && editingCell?.index === dataIndex && editingCell?.field === field;
     
     let displayValue = item ? item[field] : "";
     if (field === "valor" && item) {
        displayValue = item.valor !== 0 ? formatCurrency(Math.abs(item.valor)) : "";
     }
     let editValue = item ? item[field] : "";
     if (field === "valor" && item) {
        editValue = item.valor !== 0 ? Math.abs(item.valor).toString() : "";
     }
 
     const type = field === "valor" ? "number" : "text";
 
     return (
       <td 
         className={`${isEditing ? "duda-cell-editing" : ""} cursor-cell !px-1 border border-[#D4D4D4]`}
         style={{ width, minWidth: width, maxWidth: width }}
         onDoubleClick={() => setEditingCell({ side: 'right', index: dataIndex, field })}
         onClick={() => { if(!item) setEditingCell({ side: 'right', index: dataIndex, field }) }}
       >
         {isEditing ? (
           <input
             ref={inputRef as React.RefObject<HTMLInputElement>}
             type={type}
             className="duda-inline-input"
             defaultValue={editValue}
             placeholder={!item && field === 'descricao' ? 'Descrição saída' : ''}
             onBlur={(e) => updateItem(false, dataIndex, field, e.target.value)}
             onKeyDown={(e) => handleKeyDown(e, false, dataIndex, field)}
             step={type === "number" ? "0.01" : undefined}
           />
         ) : (
           <div className={`truncate px-1 relative ${field === 'valor' ? 'text-right' : ''}`}>
              <span>{displayValue}</span>
           </div>
         )}
       </td>
     );
  };

  const totalEntradas = entradas.reduce((acc, curr) => acc + Number(curr.valor), 0);
  const totalSaidas = saidas.reduce((acc, curr) => acc + Number(curr.valor), 0); // saidas are negative already
  const caixaLivre = totalEntradas + totalSaidas;

  const maxRowsCount = Math.max(entradas.length + 5, saidas.length + 6, 60);

  const rows = [];
  for (let i = 0; i < maxRowsCount; i++) {
     
     // Row Sum logic just mimicking the screenshot exactly!
     // We will drop the sums visually at the end of the lists.
     const isEntradaSumRow = i === entradas.length + 2;
     const isSaidaSumRow = i === saidas.length + 3;

     rows.push(
        <tr key={i} className="h-6">
           <td className="duda-row-number bg-[#E6E6E6] border-r border-b border-[#C0C0C0] text-center text-[10px] text-gray-500">{i + 1}</td>
           
           {/* LEFT SIDE: Entradas */}
           {/* A */} {renderCellLeft(i, 'A', 'descricao', '140px')}
           {/* B */} {renderCellLeft(i, 'B', 'categoria', '140px')}
           {/* C */} {isEntradaSumRow ? (
               <td className="border border-[#D4D4D4] px-1 text-right font-bold bg-yellow-200">{formatCurrency(totalEntradas)}</td>
           ) : renderCellLeft(i, 'C', 'valor', '100px')}
           
           {/* MIDDLE SPACERS: D, E, F */}
           <td className="border border-[#D4D4D4] w-[80px]"></td>
           <td className="border border-[#D4D4D4] w-[80px]"></td>
           <td className="border border-[#D4D4D4] w-[80px]"></td>

           {/* RIGHT SIDE: Saídas */}
           {/* G */} {renderCellRight(i, 'G', 'descricao', '180px')}
           {/* H */} {isSaidaSumRow ? (
               <td className="border border-[#D4D4D4] px-1 text-right font-bold bg-yellow-200 text-red-600">{formatCurrency(Math.abs(totalSaidas))}</td>
           ) : renderCellRight(i, 'H', 'valor', '100px')}

           {/* END SPACERS: I, J, K */}
           <td className="border border-[#D4D4D4] w-[80px]"></td>
           <td className="border border-[#D4D4D4] w-[80px]"></td>
           <td className="border border-[#D4D4D4] w-[80px]"></td>

           {/* L: Caixa Livre Label */}
           {i === 0 ? (
               <td className="border border-[#D4D4D4] px-2 font-semibold">Caixa &quot;Livre&quot;</td>
           ) : (
               <td className="border border-[#D4D4D4] w-[100px]"></td>
           )}

           {/* M: Caixa Livre Value */}
           {i === 0 ? (
               <td className="border border-[#D4D4D4] px-2 text-right">{totalEntradas > 0 || totalSaidas < 0 ? caixaLivre.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ""}</td>
           ) : (
               <td className="border border-[#D4D4D4] w-[100px]"></td>
           )}
        </tr>
     );
  }

  return (
    <div className="w-full overflow-x-auto relative mt-2 bg-white min-h-[700px] border border-[#d4d4d4] shadow-sm flex">
       <table className="duda-excel-table border-collapse table-fixed w-max text-[#000000] text-[12px] font-sans">
          <thead>
            <tr className="bg-[#E6E6E6] text-center border-b border-[#C0C0C0] text-[11px] text-[#333] select-none h-6">
                <th className="font-normal border-r border-[#C0C0C0] w-[40px]"></th>
                <th className="font-normal border-r border-[#C0C0C0]">A</th>
                <th className="font-normal border-r border-[#C0C0C0]">B</th>
                <th className="font-normal border-r border-[#C0C0C0]">C</th>
                <th className="font-normal border-r border-[#C0C0C0]">D</th>
                <th className="font-normal border-r border-[#C0C0C0]">E</th>
                <th className="font-normal border-r border-[#C0C0C0]">F</th>
                <th className="font-normal border-r border-[#C0C0C0]">G</th>
                <th className="font-normal border-r border-[#C0C0C0]">H</th>
                <th className="font-normal border-r border-[#C0C0C0]">I</th>
                <th className="font-normal border-r border-[#C0C0C0]">J</th>
                <th className="font-normal border-r border-[#C0C0C0]">K</th>
                <th className="font-normal border-r border-[#C0C0C0]">L</th>
                <th className="font-normal border-r border-[#C0C0C0]">M</th>
            </tr>
          </thead>
          <tbody>
             {rows}
          </tbody>
       </table>
    </div>
  );
}
