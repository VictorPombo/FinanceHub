"use client";

import { useEffect, useRef, useState } from "react";
import jspreadsheet from "jspreadsheet-ce";
import "jspreadsheet-ce/dist/jspreadsheet.css";
import "jsuites/dist/jsuites.css";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

interface Props {
  initialData: any[];
  userId: string;
  userCategories: string[];
  onDataChange: (newData: any[]) => void;
  currentTabMonth: number;
  currentTabYear: number;
  tableName?: string;
}

export default function DudaExcelTable({ initialData, userId, userCategories, onDataChange, currentTabMonth, currentTabYear, tableName }: Props) {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const leftInstance = useRef<any>(null);
  const rightInstance = useRef<any>(null);
  const supabase = createClient();
  const dbTable = tableName || "duda_lancamentos";

  // Organize Data
  const entradas = initialData.filter(d => d.tipo === "Entrada").sort((a,b) => a.ordem - b.ordem);
  const saidas = initialData.filter(d => d.tipo === "Saída").sort((a,b) => a.ordem - b.ordem);

  const getColName = (x: number) => {
    if (x === 1) return 'data';
    if (x === 2) return 'descricao';
    if (x === 3) return 'categoria';
    if (x === 4) return 'valor';
    return null;
  };

  const defaultDate = `${currentTabYear}-${String(currentTabMonth).padStart(2, '0')}-01`;

  // Internal Synchronization Function
  const handleCellChange = async (isEntrada: boolean, instance: any, cell: any, x: string, y: string, value: string) => {
    const list = isEntrada ? entradas : saidas;
    const rowIndex = parseInt(y);
    const colIndex = parseInt(x);
    const colName = getColName(colIndex);

    if (!colName) return;

    const item = list[rowIndex];

    // Se a linha não existe no banco, mas editamos ela (nova linha rolando final do excel)
    if (!item) {
        // Criar Fantasma
        const payloadToInsert = {
            user_id: userId,
            data: defaultDate,
            descricao: colName === 'descricao' ? value : "",
            categoria: colName === 'categoria' ? value : "Outros",
            tipo: isEntrada ? "Entrada" : "Saída",
            recorrencia: "Única",
            parcela: "1/1",
            valor: colName === 'valor' ? Math.abs(Number(value) || 0) * (isEntrada ? 1 : -1) : 0,
            status: "Em aberto",
            ordem: list.length
        };

        const { data, error } = await supabase.from(dbTable).insert([payloadToInsert]).select().single();
        if (data) {
           onDataChange([...initialData, data]); 
           // Inject raw ID back into the grid so future edits hit the right row
           instance.jspreadsheet.setValueFromCoords(0, rowIndex, data.id, true);
        }
    } else {
        // Update linha Existente
        const updatePayload: any = {};
        if (colName === 'valor') {
           updatePayload.valor = Math.abs(Number(value) || 0) * (isEntrada ? 1 : -1);
        } else {
           updatePayload[colName] = value;
        }

        const optimisticData = initialData.map(d => d.id === item.id ? { ...d, ...updatePayload } : d);
        onDataChange(optimisticData); // update global state slightly
        
        await supabase.from(dbTable).update(updatePayload).eq("id", item.id);
    }
  };

  const initGrid = (ref: any, instanceRef: any, dataItems: any[], isEntrada: boolean) => {
    if (ref.current) {
      if (instanceRef.current) {
        instanceRef.current.destroy();
      }

      // Format Data into 2D Array
      // Adding empty rows at the bottom for Excel UX
      const gridData = dataItems.map(d => [
        d.id,
        d.data,
        d.descricao,
        d.categoria,
        Math.abs(d.valor)
      ]);

      // Fill with up to 10 empty rows
      for(let i=0; i<15; i++) {
        gridData.push(["", "", "", "", ""]);
      }

      instanceRef.current = jspreadsheet(ref.current, {
        data: gridData,
        columns: [
          { type: 'hidden', title: 'ID' },
          { type: 'calendar', title: 'Data', options: { format: 'YYYY-MM-DD' }, width: 100 },
          { type: 'text', title: 'Descrição', width: 180 },
          { type: 'dropdown', title: 'Categoria', source: ['Outros', ...userCategories], autocomplete: true, width: 120 },
          { type: 'numeric', title: 'Valor (R$)', mask: 'U$ #.##,00', decimal: ',', width: 100 },
        ],
        allowInsertColumn: false,
        allowInsertRow: true,
        allowDeleteRow: true,
        allowDeleteColumn: false,
        contextMenu: function(obj, x, y, e) {
             const items = [];
             if (y != null) {
                 const rowIdx = parseInt(y.toString());
                 items.push({
                     title: 'Inserir Linha acima',
                     onclick: function() { obj.insertRow(1, rowIdx, 1); }
                 });
                 items.push({
                     title: 'Inserir Linha abaixo',
                     onclick: function() { obj.insertRow(1, rowIdx); }
                 });
                 items.push({
                     title: 'Deletar Linha',
                     onclick: function() { obj.deleteRow(rowIdx, 1); }
                 });
             }
             return items;
        },
        // @ts-ignore
        onchange: function(instance: any, cell: any, x: string|number, y: string|number, value: string) {
          handleCellChange(isEntrada, instance, cell, x.toString(), y.toString(), value);
        },
        // @ts-ignore
        ondeleterow: async function(instance: any, y: any, numOfRows: any, rowDOMElements: any, rowData: any[]) {
          // rowData contains the data of deleted rows
          const promises = rowData.map(r => {
             const id = r[0]; // first column is hidden ID
             if (id) return supabase.from(dbTable).delete().eq("id", id);
             return null;
          }).filter(Boolean);
          
          await Promise.all(promises);
          toast.success("Linha(s) apagada(s)", { position: 'bottom-center' });
        },
        text: {
           insertANewRowBefore: 'Inserir nova linha acima',
           insertANewRowAfter: 'Inserir nova linha abaixo',
           deleteSelectedRows: 'Apagar linha selecionada',
           copy: 'Copiar',
           paste: 'Colar',
        }
      });
    }
  };

  useEffect(() => {
    // Only init if we are on client (useEffect ensures this)
    // Avoid double init in StrictMode
    const timer = setTimeout(() => {
      initGrid(leftRef, leftInstance, entradas, true);
      initGrid(rightRef, rightInstance, saidas, false);
    }, 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData.length, currentTabMonth, currentTabYear]); // We re-render full grid if month changes

  return (
    <div className="flex flex-col md:flex-row w-full h-full gap-2 p-2 pb-24 overflow-x-auto bg-[#e6e6e6]">
      {/* Lado Esquerdo - Entradas */}
      <div className="flex-1 bg-white border border-[#D4D4D4] shadow-sm rounded-sm min-w-[500px]">
         <div className="bg-emerald-900/10 text-emerald-800 font-bold border-b border-[#D4D4D4] px-4 py-2 text-sm flex justify-between">
           <span>ENTRADAS</span>
           <span>JSpreadsheet Engine</span>
         </div>
         <div className="jspreadsheet-wrapper overflow-auto">
            <div ref={leftRef}></div>
         </div>
      </div>
      
      {/* Lado Direito - Saídas */}
      <div className="flex-1 bg-white border border-[#D4D4D4] shadow-sm rounded-sm min-w-[500px]">
         <div className="bg-red-900/10 text-red-800 font-bold border-b border-[#D4D4D4] px-4 py-2 text-sm">
           SAÍDAS
         </div>
         <div className="jspreadsheet-wrapper overflow-auto">
            <div ref={rightRef}></div>
         </div>
      </div>
    </div>
  );
}
