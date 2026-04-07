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

interface ColDef {
  id: string;
  field: string;
  defaultLabel: string;
  width: string;
}

const DEFAULT_LEFT_COLS: ColDef[] = [
  { id: 'L1', field: 'descricao', defaultLabel: 'A', width: '140px' },
  { id: 'L2', field: 'categoria', defaultLabel: 'B', width: '140px' },
  { id: 'L3', field: 'valor', defaultLabel: 'C', width: '100px' },
];

const DEFAULT_RIGHT_COLS: ColDef[] = [
  { id: 'R1', field: 'descricao', defaultLabel: 'G', width: '180px' },
  { id: 'R2', field: 'valor', defaultLabel: 'H', width: '100px' },
];

export default function DudaExcelTable({ initialData, userId, userCategories, onDataChange, currentTabMonth, currentTabYear }: Props) {
  const [editingCell, setEditingCell] = useState<{ side: 'left' | 'right', index: number, field: string } | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const supabase = createClient();

  // Column Orders
  const [leftCols, setLeftCols] = useState(DEFAULT_LEFT_COLS);
  const [rightCols, setRightCols] = useState(DEFAULT_RIGHT_COLS);

  // Row Orders (locally sorted by `ordem`)
  const [entradas, setEntradas] = useState<any[]>([]);
  const [saidas, setSaidas] = useState<any[]>([]);

  useEffect(() => {
    // Initial Hydration focusing on the `ordem` column
    const sortedEntradas = initialData.filter(d => d.tipo === "Entrada").sort((a,b) => (a.ordem || 0) - (b.ordem || 0));
    const sortedSaidas = initialData.filter(d => d.tipo === "Saída").sort((a,b) => (a.ordem || 0) - (b.ordem || 0));
    setEntradas(sortedEntradas);
    setSaidas(sortedSaidas);
  }, [initialData]);

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  // DRAG AND DROP STATE
  const [draggedCol, setDraggedCol] = useState<{ side: 'left'|'right', index: number } | null>(null);
  const [draggedRow, setDraggedRow] = useState<{ type: 'Entrada'|'Saída', index: number } | null>(null);
  const [draggedCell, setDraggedCell] = useState<{ isEntrada: boolean, index: number, field: string } | null>(null);

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

    // Ghost insertion - Here we use Blank ("") instead of "Outros" for categories!
    if (!item) {
        if (!value) return; 
        const payloadToInsert = {
            user_id: userId,
            data: defaultDate,
            descricao: isEntrada && field === 'descricao' ? value : "",
            categoria: isEntrada && field === 'categoria' ? value : "", // FIXED: Replaced "Outros" with ""
            tipo: isEntrada ? "Entrada" : "Saída",
            recorrencia: "Única",
            parcela: "1/1",
            valor: field === 'valor' ? (updatePayload.valor || 0) : 0,
            status: "Em aberto",
            ordem: list.length // Put at bottom
        };
        const { data, error } = await supabase.from("duda_lancamentos").insert([payloadToInsert]).select().single();
        if (data) {
            onDataChange([...initialData, data]); 
        }
    } else {
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

  // ---------------------------------------------
  // DND HANDLERS - COLUMNS
  // ---------------------------------------------
  const handleColDrop = (side: 'left'|'right', targetIndex: number) => {
      if(!draggedCol || draggedCol.side !== side || draggedCol.index === targetIndex) return;
      const srcIdx = draggedCol.index;
      if (side === 'left') {
         const newList = [...leftCols];
         const [removed] = newList.splice(srcIdx, 1);
         newList.splice(targetIndex, 0, removed);
         setLeftCols(newList);
      } else {
         const newList = [...rightCols];
         const [removed] = newList.splice(srcIdx, 1);
         newList.splice(targetIndex, 0, removed);
         setRightCols(newList);
      }
      setDraggedCol(null);
  };

  // ---------------------------------------------
  // DND HANDLERS - ROWS
  // ---------------------------------------------
  const handleRowDrop = async (type: 'Entrada'|'Saída', targetIndex: number) => {
      if (!draggedRow || draggedRow.type !== type || draggedRow.index === targetIndex) return;
      
      const srcIdx = draggedRow.index;
      const setter = type === 'Entrada' ? setEntradas : setSaidas;
      const currentList = type === 'Entrada' ? [...entradas] : [...saidas];
      
      const [removed] = currentList.splice(srcIdx, 1);
      currentList.splice(targetIndex, 0, removed);
      
      // Update ordems
      const updatedList = currentList.map((item, idx) => ({ ...item, ordem: idx }));
      setter(updatedList);
      setDraggedRow(null);

      // Async DB Sync - We do it in background without blocking
      updatedList.forEach(item => {
         if (item.id) {
             supabase.from("duda_lancamentos").update({ ordem: item.ordem }).eq("id", item.id).then();
         }
      });
  };

  // ---------------------------------------------
  // DND HANDLERS - CELLS
  // ---------------------------------------------
  const handleCellDrop = async (isEntrada: boolean, targetIndex: number, colDefField: string) => {
    if (!draggedCell || draggedCell.isEntrada !== isEntrada || draggedCell.field !== colDefField) return;
    if (draggedCell.index === targetIndex) {
        setDraggedCell(null);
        return;
    }

    const list = isEntrada ? [...entradas] : [...saidas];
    const setter = isEntrada ? setEntradas : setSaidas;
    
    const srcItemOrig = list[draggedCell.index];
    if (!srcItemOrig || !srcItemOrig.id) { 
        setDraggedCell(null); 
        return; 
    }

    // Clonando para não mutar estado diretamente
    const srcItem = { ...srcItemOrig };
    const targetItem = list[targetIndex] ? { ...list[targetIndex] } : null;

    const srcVal = srcItem[colDefField];
    const emptyVal = colDefField === 'valor' ? 0 : "";
    
    setDraggedCell(null);

    // 1. Limpa a Célula de Origem (Mover)
    srcItem[colDefField] = emptyVal;
    list[draggedCell.index] = srcItem;
    
    // 2. Preenche a Célula de Destino
    let targetPayloadToInsert = null;
    const targetId = targetItem?.id;
    
    if (targetItem && targetItem.id) {
       targetItem[colDefField] = colDefField === 'valor' ? (isEntrada ? Math.abs(Number(srcVal)) : -Math.abs(Number(srcVal))) : srcVal;
       list[targetIndex] = targetItem;
    } else {
       // Criaçao de linha Fantasma (Ghost row)
       const defaultDate = `${currentTabYear}-${String(currentTabMonth).padStart(2, '0')}-01`;
       
       let finalFormatedVal = srcVal;
       if (colDefField === 'valor') finalFormatedVal = isEntrada ? Math.abs(Number(srcVal)) : -Math.abs(Number(srcVal));

       targetPayloadToInsert = {
           user_id: userId,
           data: defaultDate,
           descricao: isEntrada && colDefField === 'descricao' ? srcVal : "",
           categoria: isEntrada && colDefField === 'categoria' ? srcVal : "",
           tipo: isEntrada ? "Entrada" : "Saída",
           recorrencia: "Única",
           parcela: "1/1",
           valor: colDefField === 'valor' ? finalFormatedVal : 0,
           status: "Em aberto",
           ordem: list.length
       };
    }

    setter(list); // Atualização Otimista na Interface
    toast.success("Quadrado movido!");

    // Atualização Assíncrona no Banco (Background)
    await supabase.from("duda_lancamentos").update({ [colDefField]: colDefField === 'valor' ? 0 : emptyVal }).eq("id", srcItem.id);
    
    if (targetItem && targetId) {
        let finalValToSave = srcVal;
        if (colDefField === 'valor') finalValToSave = isEntrada ? Math.abs(Number(srcVal)) : -Math.abs(Number(srcVal));
        await supabase.from("duda_lancamentos").update({ [colDefField]: finalValToSave }).eq("id", targetId);
    } else if (targetPayloadToInsert) {
        const { data } = await supabase.from("duda_lancamentos").insert([targetPayloadToInsert]).select().single();
        if (data) {
           list[targetIndex] = data;
           setter([...list]);
           // Atualiza array global silenciosamente
           onDataChange([...initialData, data]);
        }
    }
  };

  // ---------------------------------------------
  // RENDER CELLS
  // ---------------------------------------------
  const renderCellLeft = (index: number, colDef: ColDef) => {
    const item = entradas[index];
    const isEditing = editingCell?.side === 'left' && editingCell?.index === index && editingCell?.field === colDef.field;
    
    let displayValue = item ? item[colDef.field] : "";
    if (colDef.field === "valor" && item) displayValue = item.valor !== 0 ? formatCurrency(item.valor) : "";
    
    let editValue = item ? item[colDef.field] : "";
    if (colDef.field === "valor" && item) editValue = item.valor !== 0 ? Math.abs(item.valor).toString() : "";

    const type = colDef.field === "valor" ? "number" : "text";

    return (
      <td 
        key={`L-${index}-${colDef.id}`}
        className={`${isEditing ? "duda-cell-editing" : ""} cursor-cell !px-1 border border-[#D4D4D4] hover:bg-purple-50`}
        style={{ width: colDef.width, minWidth: colDef.width, maxWidth: colDef.width }}
        onDoubleClick={() => setEditingCell({ side: 'left', index, field: colDef.field })}
        onClick={() => { if(!item) setEditingCell({ side: 'left', index, field: colDef.field }) }}
        draggable={!isEditing && !!item}
        onDragStart={() => setDraggedCell({ isEntrada: true, index, field: colDef.field })}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
        onDrop={() => handleCellDrop(true, index, colDef.field)}
        title={item ? "Arraste e Solte este quadrado" : ""}
      >
        {isEditing ? (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={type}
            className="duda-inline-input"
            defaultValue={editValue}
            placeholder={!item && colDef.field === 'descricao' ? 'Cliente' : ''}
            onBlur={(e) => updateItem(true, index, colDef.field, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, true, index, colDef.field)}
            step={type === "number" ? "0.01" : undefined}
          />
        ) : (
          <div className={`truncate px-1 relative ${colDef.field === 'valor' ? 'text-right' : ''}`}>
             <span>{displayValue}</span>
          </div>
        )}
      </td>
    );
  };

  const renderCellRight = (index: number, colDef: ColDef) => {
     const dataIndex = index - 1; // Row offset
     const item = saidas[dataIndex];
     
     // G1 is reserved visually "SAIDAS" (When G is the field 'descricao')
     if (index === 0 && colDef.field === 'descricao') {
        return (
           <td key={`R-${index}-${colDef.id}`} className="border border-[#D4D4D4] text-red-600 font-bold px-2 relative" style={{ width: colDef.width, minWidth: colDef.width, maxWidth: colDef.width }}>
               SAIDAS
           </td>
        );
     }
     if (index === 0) {
         return <td key={`R-${index}-${colDef.id}`} className="border border-[#D4D4D4]" style={{ width: colDef.width, minWidth: colDef.width, maxWidth: colDef.width }}></td>;
     }

     const isEditing = editingCell?.side === 'right' && editingCell?.index === dataIndex && editingCell?.field === colDef.field;
     
     let displayValue = item ? item[colDef.field] : "";
     if (colDef.field === "valor" && item) displayValue = item.valor !== 0 ? formatCurrency(Math.abs(item.valor)) : "";
     
     let editValue = item ? item[colDef.field] : "";
     if (colDef.field === "valor" && item) editValue = item.valor !== 0 ? Math.abs(item.valor).toString() : "";
 
     const type = colDef.field === "valor" ? "number" : "text";
 
     return (
       <td 
         key={`R-${index}-${colDef.id}`}
         className={`${isEditing ? "duda-cell-editing" : ""} cursor-cell !px-1 border border-[#D4D4D4] hover:bg-purple-50`}
         style={{ width: colDef.width, minWidth: colDef.width, maxWidth: colDef.width }}
         onDoubleClick={() => setEditingCell({ side: 'right', index: dataIndex, field: colDef.field })}
         onClick={() => { if(!item) setEditingCell({ side: 'right', index: dataIndex, field: colDef.field }) }}
         draggable={!isEditing && !!item}
         onDragStart={() => setDraggedCell({ isEntrada: false, index: dataIndex, field: colDef.field })}
         onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
         onDrop={() => handleCellDrop(false, dataIndex, colDef.field)}
         title={item ? "Arraste e Solte este quadrado" : ""}
       >
         {isEditing ? (
           <input
             ref={inputRef as React.RefObject<HTMLInputElement>}
             type={type}
             className="duda-inline-input"
             defaultValue={editValue}
             placeholder={!item && colDef.field === 'descricao' ? 'Descrição saída' : ''}
             onBlur={(e) => updateItem(false, dataIndex, colDef.field, e.target.value)}
             onKeyDown={(e) => handleKeyDown(e, false, dataIndex, colDef.field)}
             step={type === "number" ? "0.01" : undefined}
           />
         ) : (
           <div className={`truncate px-1 relative ${colDef.field === 'valor' ? 'text-right' : ''}`}>
              <span>{displayValue}</span>
           </div>
         )}
       </td>
     );
  };

  const totalEntradas = entradas.reduce((acc, curr) => acc + Number(curr.valor), 0);
  const totalSaidas = saidas.reduce((acc, curr) => acc + Number(curr.valor), 0);
  const caixaLivre = totalEntradas + totalSaidas;
  const maxRowsCount = Math.max(entradas.length + 5, saidas.length + 6, 60);

  const tableRows = [];
  
  // Row loops
  for (let i = 0; i < maxRowsCount; i++) {
     const isEntradaSumRow = i === entradas.length + 2;
     const isSaidaSumRow = i === saidas.length + 3;

     // Row drag handling
     // Only allow dragging real data rows, not sum rows or ghost rows
     const isDraggableEntrada = i < entradas.length;
     const isDraggableSaida = i > 0 && i <= saidas.length;

     tableRows.push(
        <tr key={i} className="h-6">
           <td className="duda-row-number bg-[#E6E6E6] border-r border-b border-[#C0C0C0] text-center text-[10px] text-gray-500">{i + 1}</td>
           
           {/* LEFT SIDE: Entradas */}
           <td 
             className="border border-[#D4D4D4] w-[14px] bg-[#F3F4F6] cursor-grab hover:bg-[#E5E7EB] drag-handle transition-colors"
             draggable={isDraggableEntrada}
             onDragStart={() => isDraggableEntrada && setDraggedRow({ type: 'Entrada', index: i })}
             onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
             onDrop={() => isDraggableEntrada && handleRowDrop('Entrada', i)}
             title={isDraggableEntrada ? "Arraste para mover linha" : ""}
           >
              {isDraggableEntrada && <div className="w-1.5 h-3 border-l-2 border-r-2 border-slate-400 mx-auto opacity-50"></div>}
           </td>

           {leftCols.map(colDef => {
              if (isEntradaSumRow && colDef.field === 'valor') {
                 return <td key={`sumL-${colDef.field}`} className="border border-[#D4D4D4] px-1 text-right font-bold bg-yellow-200">{formatCurrency(totalEntradas)}</td>;
              }
              if (isEntradaSumRow) return <td key={`sumL-${colDef.field}`} className="border border-[#D4D4D4]"></td>;
              return renderCellLeft(i, colDef);
           })}
           
           {/* MIDDLE SPACERS */}
           <td className="border border-[#D4D4D4] w-[80px]"></td>
           <td className="border border-[#D4D4D4] w-[80px]"></td>
           <td className="border border-[#D4D4D4] w-[80px]"></td>

           {/* RIGHT SIDE: Saídas */}
           <td 
             className="border border-[#D4D4D4] w-[14px] bg-[#F3F4F6] cursor-grab hover:bg-[#E5E7EB] drag-handle transition-colors"
             draggable={isDraggableSaida}
             onDragStart={() => isDraggableSaida && setDraggedRow({ type: 'Saída', index: i - 1 })}
             onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
             onDrop={() => isDraggableSaida && handleRowDrop('Saída', i - 1)}
             title={isDraggableSaida ? "Arraste para mover linha" : ""}
           >
              {isDraggableSaida && <div className="w-1.5 h-3 border-l-2 border-r-2 border-slate-400 mx-auto opacity-50"></div>}
           </td>

           {rightCols.map(colDef => {
              if (isSaidaSumRow && colDef.field === 'valor') {
                 return <td key={`sumR-${colDef.field}`} className="border border-[#D4D4D4] px-1 text-right font-bold bg-yellow-200 text-red-600">{formatCurrency(Math.abs(totalSaidas))}</td>;
              }
              if (isSaidaSumRow) return <td key={`sumR-${colDef.field}`} className="border border-[#D4D4D4]"></td>;
              return renderCellRight(i, colDef);
           })}

           {/* END SPACERS */}
           <td className="border border-[#D4D4D4] w-[80px]"></td>
           <td className="border border-[#D4D4D4] w-[80px]"></td>
           <td className="border border-[#D4D4D4] w-[80px]"></td>

           {i === 0 ? <td className="border border-[#D4D4D4] px-2 font-semibold">Caixa &quot;Livre&quot;</td> : <td className="border border-[#D4D4D4] w-[100px]"></td>}
           {i === 0 ? <td className="border border-[#D4D4D4] px-2 text-right">{totalEntradas > 0 || totalSaidas < 0 ? caixaLivre.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : ""}</td> : <td className="border border-[#D4D4D4] w-[100px]"></td>}
        </tr>
     );
  }

  return (
    <div className="w-full overflow-x-auto relative mt-2 bg-white min-h-[700px] border border-[#d4d4d4] shadow-sm flex pb-28 md:pb-6">
       <table className="duda-excel-table border-collapse table-fixed w-max text-[#000000] text-[12px] font-sans">
          <thead>
            <tr className="bg-[#E6E6E6] text-center border-b border-[#C0C0C0] text-[11px] text-[#333] select-none h-6">
                <th className="font-normal border-r border-[#C0C0C0] w-[40px]"></th>
                
                <th className="font-normal border-r border-[#C0C0C0] w-[14px] bg-[#d9d9d9]" title="Handle Linhas (Esquerda)">↕</th>
                {leftCols.map((col, idx) => (
                    <th 
                      key={col.id} 
                      className="font-normal border-r border-[#C0C0C0] cursor-grab active:cursor-grabbing hover:bg-[#d0d0d0] transition-colors"
                      draggable
                      onDragStart={() => setDraggedCol({ side: 'left', index: idx })}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                      onDrop={() => handleColDrop('left', idx)}
                      title={`Coluna ${col.defaultLabel} (${col.field}) - Arraste para mover`}
                    >
                        {col.defaultLabel}
                    </th>
                ))}
                
                <th className="font-normal border-r border-[#C0C0C0]">Mkt</th>
                <th className="font-normal border-r border-[#C0C0C0]">Imp</th>
                <th className="font-normal border-r border-[#C0C0C0]">Custo</th>

                <th className="font-normal border-r border-[#C0C0C0] w-[14px] bg-[#d9d9d9]" title="Handle Linhas (Direita)">↕</th>
                {rightCols.map((col, idx) => (
                    <th 
                      key={col.id} 
                      className="font-normal border-r border-[#C0C0C0] cursor-grab active:cursor-grabbing hover:bg-[#d0d0d0] transition-colors"
                      draggable
                      onDragStart={() => setDraggedCol({ side: 'right', index: idx })}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                      onDrop={() => handleColDrop('right', idx)}
                      title={`Coluna ${col.defaultLabel} (${col.field}) - Arraste para mover`}
                    >
                        {col.defaultLabel}
                    </th>
                ))}

                <th className="font-normal border-r border-[#C0C0C0]">S1</th>
                <th className="font-normal border-r border-[#C0C0C0]">S2</th>
                <th className="font-normal border-r border-[#C0C0C0]">S3</th>
                <th className="font-normal border-r border-[#C0C0C0]">cx</th>
                <th className="font-normal border-r border-[#C0C0C0]">val</th>
            </tr>
          </thead>
          <tbody>
             {tableRows}
          </tbody>
       </table>
    </div>
  );
}
