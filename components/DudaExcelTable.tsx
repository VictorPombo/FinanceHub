"use client";

import { useEffect, useRef } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<any>(null);
  const supabase = createClient();
  const dbTable = tableName || "duda_lancamentos";

  // Organize Data
  const entradas = initialData.filter(d => d.tipo === "Entrada").sort((a,b) => a.ordem - b.ordem);
  const saidas = initialData.filter(d => d.tipo === "Saída").sort((a,b) => a.ordem - b.ordem);

  const defaultDate = `${currentTabYear}-${String(currentTabMonth).padStart(2, '0')}-01`;

  // Constants mapping
  const COL_ENTRADA_DESC = 0; // A
  const COL_ENTRADA_CAT = 1;  // B
  const COL_ENTRADA_VALOR = 2;// C
  const COL_SAIDA_DESC = 6;   // G
  const COL_SAIDA_VALOR = 7;  // H
  
  const COL_CAIXA_TITLE = 18; // S
  const COL_CAIXA_VALOR = 19; // T
  
  const COL_ENTRADA_ID = 20;  // U
  const COL_SAIDA_ID = 21;    // V

  const handleCellChange = async (instance: any, x: string, y: string, value: string) => {
    const colIndex = parseInt(x);
    const rowIndex = parseInt(y);

    // Ignorar edições nos cabeçalhos estéticos ou formulários estáticos
    if (colIndex === COL_SAIDA_DESC && rowIndex === 0) return; // "SAIDAS" header
    if (colIndex === COL_CAIXA_TITLE || colIndex === COL_CAIXA_VALOR) return; // S3, T3 formulas

    const isEntrada = [COL_ENTRADA_DESC, COL_ENTRADA_CAT, COL_ENTRADA_VALOR].includes(colIndex);
    const isSaida = [COL_SAIDA_DESC, COL_SAIDA_VALOR].includes(colIndex);
    
    if (!isEntrada && !isSaida) return; // Editou coluna vazia (D, E, F...)

    const idColIndex = isEntrada ? COL_ENTRADA_ID : COL_SAIDA_ID;
    
    // As in JSpreadsheet, data might not be immediately available via instance.getData if it's async,
    // but getValueFromCoords is synchronous.
    const id = instance.jspreadsheet.getValueFromCoords(idColIndex, rowIndex);

    // Map column to db field
    let field = "";
    if (colIndex === COL_ENTRADA_DESC || colIndex === COL_SAIDA_DESC) field = "descricao";
    if (colIndex === COL_ENTRADA_CAT) field = "categoria";
    if (colIndex === COL_ENTRADA_VALOR || colIndex === COL_SAIDA_VALOR) field = "valor";

    let finalValue: any = value;
    if (field === "valor") {
        finalValue = Math.abs(Number(value.replace(/[^0-9.-]+/g, "")) || 0) * (isEntrada ? 1 : -1);
    }

    if (!id || id === "") {
        // Inserir novo
        // Precisamos coletar os dados atuais da linha para não inserir nulo se ela editar primeiro a categoria
        const descRow = instance.jspreadsheet.getValueFromCoords(isEntrada ? COL_ENTRADA_DESC : COL_SAIDA_DESC, rowIndex) || "";
        const catRow = isEntrada ? (instance.jspreadsheet.getValueFromCoords(COL_ENTRADA_CAT, rowIndex) || "") : "Outros";
        let valRow = instance.jspreadsheet.getValueFromCoords(isEntrada ? COL_ENTRADA_VALOR : COL_SAIDA_VALOR, rowIndex) || "0";
        valRow = Math.abs(Number(valRow.toString().replace(/[^0-9.-]+/g, "")) || 0) * (isEntrada ? 1 : -1);

        const payload = {
            user_id: userId,
            data: defaultDate,
            descricao: field === 'descricao' ? value : descRow,
            categoria: field === 'categoria' ? value : catRow,
            tipo: isEntrada ? "Entrada" : "Saída",
            recorrencia: "Única",
            parcela: "1/1",
            valor: field === 'valor' ? finalValue : valRow,
            status: "Em aberto",
            ordem: rowIndex
        };

        const { data, error } = await supabase.from(dbTable).insert([payload]).select().single();
        if (data) {
           onDataChange([...initialData, data]); 
           instance.jspreadsheet.setValueFromCoords(idColIndex, rowIndex, data.id, true); // true = force sem disparar onchange
        }
    } else {
        // Atualizar existente
        const updatePayload: any = { [field]: finalValue };
        const optimisticData = initialData.map(d => d.id === id ? { ...d, ...updatePayload } : d);
        onDataChange(optimisticData); 
        await supabase.from(dbTable).update(updatePayload).eq("id", id);
    }
  };

  const initGrid = () => {
    if (!containerRef.current) return;
    if (instanceRef.current) {
        instanceRef.current.destroy();
    }

    const maxRows = Math.max(entradas.length, saidas.length + 1) + 20; // +20 empty padding
    const gridData = [];

    // Preencher Linhas
    for (let i = 0; i < maxRows; i++) {
        const row = Array(22).fill(""); 
        
        // Entradas A-C (0-2)
        if (entradas[i]) {
            row[COL_ENTRADA_DESC] = entradas[i].descricao;
            row[COL_ENTRADA_CAT] = entradas[i].categoria;
            row[COL_ENTRADA_VALOR] = Math.abs(entradas[i].valor);
            row[COL_ENTRADA_ID] = entradas[i].id;
        }

        // Saídas G-H (6-7)
        // Row 0 is "SAIDAS" title. Saídas start from Row 1.
        if (i === 0) {
            row[COL_SAIDA_DESC] = "SAIDAS";
        } else if (saidas[i - 1]) {
            row[COL_SAIDA_DESC] = saidas[i - 1].descricao;
            row[COL_SAIDA_VALOR] = Math.abs(saidas[i - 1].valor);
            row[COL_SAIDA_ID] = saidas[i - 1].id;
        }

        // Caixa Livre no S3 (Linha 2, cols 18-19)
        if (i === 2) {
            row[COL_CAIXA_TITLE] = 'Caixa "Livre"';
            row[COL_CAIXA_VALOR] = `=SUM(C1:C1000) - SUM(H2:H1000)`; // Excel formula magic!
        }

        gridData.push(row);
    }

    // Configuração JSpreadsheet Baseada exatemente na imagem da Duda!
    instanceRef.current = jspreadsheet(containerRef.current, {
        data: gridData,
        minDimensions: [22, maxRows],
        columns: [
            { type: 'text', title: 'Grupo', width: 140 },               // A: Entrada Desc
            { type: 'dropdown', title: 'Responsável', source: ['Outros', ...userCategories], autocomplete: true, width: 140 }, // B: Entrada Cat/Resp
            { type: 'numeric', title: 'R$ Valor', mask: 'R$ #.##,00', decimal: ',', width: 110 }, // C: Entrada Valor
            { type: 'text', title: '', width: 50 }, // D
            { type: 'text', title: '', width: 50 }, // E
            { type: 'text', title: '', width: 50 }, // F
            { type: 'text', title: 'Beneficiário', width: 160 }, // G: Saida Desc
            { type: 'numeric', title: 'R$ Valor', mask: '#.##,00', decimal: ',', width: 90 }, // H: Saida Valor
            { type: 'text', title: '', width: 40 }, // I
            { type: 'text', title: '', width: 40 }, // J
            { type: 'text', title: '', width: 40 }, // K
            { type: 'text', title: '', width: 40 }, // L
            { type: 'text', title: '', width: 40 }, // M
            { type: 'text', title: '', width: 40 }, // N
            { type: 'text', title: '', width: 40 }, // O
            { type: 'text', title: '', width: 40 }, // P
            { type: 'text', title: '', width: 40 }, // Q
            { type: 'text', title: '', width: 40 }, // R
            { type: 'text', title: 'Métricas', width: 120 }, // S: Caixa Livre
            { type: 'numeric', title: 'Resultado', mask: 'R$ #.##,00', decimal: ',', width: 120 }, // T: Valor Caixa
            { type: 'hidden', title: 'ID E' }, // U
            { type: 'hidden', title: 'ID S' }, // V
        ],
        style: {
            'G1': 'color: #cc0000; font-weight: bold; background-color: #f7f7f7;', // "SAIDAS" red text
            'S3': 'font-weight: bold; text-align: right;', // Caixa Livre Label
            'T3': 'font-weight: bold; background-color: #fdfd96; color: #333;', // Yellow background for Result
        },
        allowInsertColumn: true,
        allowInsertRow: true,
        allowDeleteRow: true,
        allowDeleteColumn: true,
        wordWrap: true,
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
             handleCellChange(instance, x.toString(), y.toString(), value);
        },
        // @ts-ignore
        ondeleterow: async function(instance: any, y: any, numOfRows: any, rowDOMElements: any, rowData: any[]) {
             const promises = rowData.map(r => {
                const idEntrada = r[COL_ENTRADA_ID];
                const idSaida = r[COL_SAIDA_ID];
                const deletes = [];
                if (idEntrada && idEntrada !== "") deletes.push(supabase.from(dbTable).delete().eq("id", idEntrada));
                if (idSaida && idSaida !== "") deletes.push(supabase.from(dbTable).delete().eq("id", idSaida));
                return deletes;
             }).flat();
             
             if(promises.length > 0) {
                 await Promise.all(promises);
                 toast.success("Linha(s) apagada(s) do banco!", { position: 'bottom-center' });
             }
        },
        text: {
           insertANewRowBefore: 'Inserir nova linha acima',
           insertANewRowAfter: 'Inserir nova linha abaixo',
           deleteSelectedRows: 'Apagar linha selecionada',
           copy: 'Copiar',
           paste: 'Colar',
        }
    });

  };

  useEffect(() => {
    const timer = setTimeout(() => {
      initGrid();
    }, 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData.length, currentTabMonth, currentTabYear]); 

  return (
    <div className="w-full h-full overflow-auto bg-white p-2">
       <div className="jspreadsheet-wrapper">
          <div ref={containerRef}></div>
       </div>
    </div>
  );
}
