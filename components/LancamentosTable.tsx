"use client";

import { useState, useRef, useEffect } from "react";
import { formatCurrency, CATEGORIAS } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Trash2, Plus, ArrowDownRight, ArrowUpRight, X, Save, TrendingUp } from "lucide-react";

interface Props {
  initialData: any[];
  userId: string;
  onDataChange: (newData: any[]) => void;
  currentTabMonth: number;
  currentTabYear: number;
}

const PARCELAMENTO_OPTIONS = [
  "1x (Única)", "2x", "3x", "4x", "5x", "6x", 
  "7x", "8x", "9x", "10x", "11x", "12x", "Fixo"
];

export default function LancamentosTable({ initialData, userId, onDataChange, currentTabMonth, currentTabYear }: Props) {
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [ghostLoading, setGhostLoading] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const supabase = createClient();

  // --- MOBILE STATE ---
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const [mobileForm, setMobileForm] = useState({
    id: "", descricao: "", categoria: "Outros", tipo: "Saída", 
    valor: "", parcelamento: "1x (Única)", data: ""
  });

  const openMobileAdd = () => {
    setMobileForm({
      id: "", descricao: "", categoria: "Outros", tipo: "Saída", 
      valor: "", parcelamento: "1x (Única)", data: `${currentTabYear}-${String(currentTabMonth).padStart(2, '0')}-01`
    });
    setMobileModalOpen(true);
  };

  const openMobileEdit = (item: any) => {
    setMobileForm({
      id: item.id, 
      descricao: item.descricao, 
      categoria: item.categoria, 
      tipo: item.tipo, 
      valor: Math.abs(item.valor).toString(), 
      parcelamento: item.recorrencia === "Única" ? "1x (Única)" : (item.recorrencia === "Recorrente" ? "Fixo" : "1x (Única)"), // Simplified for edit
      data: item.data
    });
    setMobileModalOpen(true);
  };

  const handleMobileSave = async () => {
    if (!mobileForm.descricao || !mobileForm.valor) {
       toast.error("Preencha descrição e valor");
       return;
    }
    toast.loading("Salvando...");
    
    let baseValor = Math.abs(Number(mobileForm.valor.replace(',', '.')));
    baseValor = mobileForm.tipo === "Saída" ? -baseValor : baseValor;

    if (mobileForm.id) {
      // EDIT
      const updatePayload = {
        descricao: mobileForm.descricao,
        categoria: mobileForm.categoria,
        tipo: mobileForm.tipo,
        valor: baseValor,
        data: mobileForm.data
      };
      const { error } = await supabase.from("lancamentos").update(updatePayload).eq("id", mobileForm.id);
      toast.dismiss();
      if (error) toast.error("Erro ao salvar!");
      else {
        toast.success("Atualizado com sucesso!");
        onDataChange(initialData.map(d => d.id === mobileForm.id ? { ...d, ...updatePayload } : d));
        setMobileModalOpen(false);
      }
    } else {
      // ADD
      let nMeses = 1;
      let recType = "Única";
      let origParcela = "1/1";
      
      if (mobileForm.parcelamento === "Fixo") {
         nMeses = 12;
         recType = "Recorrente";
         origParcela = "Fixa";
      } else {
         nMeses = parseInt(mobileForm.parcelamento) || 1;
         if (nMeses > 1) {
            recType = "Parcelado";
            origParcela = `1/${nMeses}`;
         }
      }

      const baseDate = new Date(mobileForm.data + "T00:00:00");
      const rows = [];
      
      for (let i = 0; i < nMeses; i++) {
         const future = new Date(baseDate);
         future.setMonth(future.getMonth() + i);
         const yyyy = future.getFullYear();
         const mm = String(future.getMonth() + 1).padStart(2, '0');
         const dd = String(future.getDate()).padStart(2, '0');
         
         const isLast = (i === nMeses - 1 && recType === "Parcelado");
         
         rows.push({
           user_id: userId,
           data: `${yyyy}-${mm}-${dd}`,
           descricao: mobileForm.descricao,
           categoria: mobileForm.categoria,
           tipo: mobileForm.tipo,
           recorrencia: recType,
           parcela: recType === "Recorrente" ? "Fixa" : (recType === "Única" ? "1/1" : `${i+1}/${nMeses}`),
           valor: baseValor,
           status: "Em aberto"
         });
      }

      const { data: generated, error } = await supabase.from("lancamentos").insert(rows).select();
      toast.dismiss();
      if (error) toast.error("Erro ao inserir!");
      else {
        toast.success("Adicionado!");
        onDataChange([...initialData, ...(generated || [])]);
        setMobileModalOpen(false);
      }
    }
  };
  // --- END MOBILE STATE ---

  const handleGhostClick = async (itemType: string, focusField: string) => {
    if (ghostLoading) return;
    setGhostLoading(`${itemType}-${focusField}`);

    const defaultDate = `${currentTabYear}-${String(currentTabMonth).padStart(2, '0')}-01`;
    const insertPayload = {
      user_id: userId,
      data: defaultDate,
      descricao: "",
      categoria: "Outros",
      tipo: itemType,
      recorrencia: "Única",
      parcela: "1/1",
      valor: itemType === "Saída" ? -0.01 : 0.01,
      status: "Em aberto",
      created_at: new Date().toISOString()
    };

    const { data: inserted, error } = await supabase
      .from("lancamentos")
      .insert([insertPayload])
      .select()
      .single();
    
    setGhostLoading(null);
    if (!error && inserted) {
       onDataChange([...initialData, inserted]);
       setEditingCell({ id: inserted.id, field: focusField });
    } else {
       toast.error("Erro de conexão ao iniciar célula.");
    }
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

    // FIRE MOTOR IF CHANGING PARCELAMENTO
    if (field === "parcelamento") {
      let nMeses = 1;
      let recType = "Parcelado";
      if (value === "Fixo") {
        nMeses = 12; // clone 12x forward
        recType = "Recorrente";
      } else {
        nMeses = parseInt(value);
      }

      setEditingCell(null);
      if (isNaN(nMeses) || nMeses <= 1) {
         // Revert to 1x
         const { error } = await supabase.from("lancamentos").update({ recorrencia: "Única", parcela: "1/1" }).eq("id", id);
         if (!error) onDataChange(initialData.map(d => d.id === id ? {...d, recorrencia: "Única", parcela: "1/1"} : d));
         return;
      }

      toast.loading(`Gerando parcelas futuras...`);
      // Update original
      const origParcela = recType === "Recorrente" ? "Fixa" : `1/${nMeses}`;
      await supabase.from("lancamentos").update({ recorrencia: recType, parcela: origParcela }).eq("id", id);
      
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

      const { data: generated, error } = await supabase.from("lancamentos").insert(forwardRows).select();
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

    // REGULAR UPDATE EXISTING ROW
    const updatePayload: any = {};
    if (field === "valor_digitado") { 
      let newValor = Math.abs(Number(value));
      newValor = item.tipo === "Saída" ? -newValor : newValor;
      updatePayload.valor = newValor;
    } else {
      updatePayload[field] = value;
      if (field === "tipo") {
          updatePayload.valor = value === "Saída" ? -Math.abs(item.valor) : Math.abs(item.valor);
      }
    }

    const optimisticData = [...initialData];
    optimisticData[itemIndex] = { ...item, ...updatePayload };
    onDataChange(optimisticData);
    setEditingCell(null);

    const { error } = await supabase.from("lancamentos").update(updatePayload).eq("id", id);
    if (error) toast.error("Erro ao salvar");
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string, field: string, type: string) => {
    if (e.key === "Escape") setEditingCell(null);
    if (e.key === "Enter") {
      updateItem(id, field, (e.target as HTMLInputElement).value, type);
    }
  };

  const deleteItem = async (id: string, isMobile = false) => {
    if (id.startsWith("ghost-")) return;
    if (!window.confirm("Deseja realmente excluir este lançamento?")) return;
    onDataChange(initialData.filter((d) => d.id !== id));
    await supabase.from("lancamentos").delete().eq("id", id);
    toast.success("Excluído");
    if (isMobile) setMobileModalOpen(false);
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
       editValue = Math.abs(item.valor).toString();
       if (isGhost) editValue = "";
    } else if (field === "parcelamento") {
       editValue = displayValue;
    }

    return (
      <td 
        className={`border-b border-slate-100 ${isEditing ? "bg-white ring-2 ring-blue-500 z-10 relative rounded border-none shadow-sm" : ""} transition-colors ${field === "valor_digitado" ? "bg-slate-50/30 font-mono" : ""} ${isGhost ? "opacity-60 hover:bg-slate-50 cursor-pointer" : "cursor-cell"} ${ghostLoading === `${item.tipo}-${field}` ? "animate-pulse" : ""}`}
        style={{ width, minWidth: width, maxWidth: width }}
        onDoubleClick={() => canEdit && !isGhost && setEditingCell({ id: item.id, field })}
        onClick={() => {
           if (!canEdit) return;
           if (isGhost) handleGhostClick(item.tipo, field);
           else setEditingCell({ id: item.id, field }); // One click on desktop to edit is faster!
        }}
      >
        {isEditing ? (
          type === "select" ? (
            <select
              ref={inputRef as React.RefObject<HTMLSelectElement>}
              className="w-full h-full border-none outline-none text-sm bg-transparent px-2 text-slate-800"
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
              className="w-full h-full border-none outline-none text-sm bg-transparent px-2 text-slate-800"
              defaultValue={editValue}
              onBlur={(e) => updateItem(item.id, field, e.target.value, item.tipo)}
              onKeyDown={(e) => handleKeyDown(e, item.id, field, item.tipo)}
              placeholder={isGhost ? "Digitar..." : ""}
              step={type === "number" ? "0.01" : undefined}
            />
          )
        ) : (
          <div className={`w-full h-full px-2 py-1.5 truncate flex items-center ${field === 'valor_digitado' ? 'justify-end font-mono' : ''}`}>
             <span className={`truncate text-slate-700 text-sm ${field === 'valor_digitado' && !isGhost && item.valor < 0 ? 'text-red-600' : ''} ${field === 'valor_digitado' && !isGhost && item.valor > 0 ? 'text-emerald-700' : ''}`}>
                {displayValue}
             </span>
          </div>
        )}
      </td>
    );
  };

  const renderRow = (item: any, sequenceIndex: number) => {
    const isGhost = item.id.startsWith("ghost-");
    let rowClass = item.tipo === "Entrada" ? "bg-emerald-50/20" : "bg-red-50/20";
    if (isGhost) rowClass = "opacity-60";

    return (
      <tr key={item.id} className={`${rowClass} hover:bg-slate-50 transition-colors group`}>
        <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-b border-slate-100 text-center text-xs font-medium text-slate-400 w-[40px] px-1 relative transition-colors">
           {!isGhost && <button onClick={() => deleteItem(item.id)} className="absolute top-1/2 -left-3 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-red-500 bg-white shadow-md rounded-full p-1.5 z-50 hover:bg-red-50 transition-all"><Trash2 className="w-3 h-3"/></button>}
           {isGhost ? "+" : sequenceIndex + 1}
        </td>
        {renderCell(item, "descricao", "250px")}
        {renderCell(item, "valor_digitado", "130px", "number")}
        {renderCell(item, "parcelamento", "120px", "select", PARCELAMENTO_OPTIONS)}
        <td className="border border-slate-300 px-2 py-1.5 text-xs text-slate-500 text-center bg-slate-50 opacity-80" style={{width: '70px'}}>
           {item.parcela || ""}
        </td>
        {renderCell(item, "data", "110px", "date")}
        {renderCell(item, "status", "110px", "select", ["Pago", "Em aberto"])}
        {renderCell(item, "categoria", "180px", "select", CATEGORIAS)}
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
    <div className="w-full h-full flex flex-col font-sans bg-transparent md:bg-white pb-24 md:pb-10 relative">
      
      {/* MOBILE FULL-SCREEN LIST VIEW */}
      <div className="md:hidden flex flex-col gap-3 px-3 py-2 overflow-auto relative">
         {initialData.length === 0 && (
            <div className="text-center py-20 text-slate-400">Nenhum lançamento no mês.</div>
         )}
         {initialData.map(item => (
           <div 
             key={item.id} 
             onClick={() => openMobileEdit(item)}
             className={`flex flex-col bg-white rounded-xl shadow-sm border p-4 active:scale-95 transition-transform ${item.tipo === 'Entrada' ? 'border-emerald-100' : 'border-red-100'}`}
           >
              <div className="flex justify-between items-start mb-2">
                 <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-full ${item.tipo === 'Entrada' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                       {item.tipo === 'Entrada' ? <ArrowUpRight className="w-4 h-4"/> : <ArrowDownRight className="w-4 h-4"/>}
                    </div>
                    <div>
                       <h4 className="font-bold text-slate-800 leading-tight">{item.descricao}</h4>
                       <span className="text-[10px] uppercase font-bold text-slate-400">{item.categoria}</span>
                    </div>
                 </div>
                 <div className="text-right">
                    <span className={`font-mono font-black text-lg ${item.valor < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                       {formatCurrency(item.valor)}
                    </span>
                 </div>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                 <span className="text-xs text-slate-500">{new Date(item.data + "T00:00:00").toLocaleDateString('pt-BR')}</span>
                 <div className="flex items-center gap-2">
                    {item.parcela && item.parcela !== "1/1" && (
                       <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">
                          {item.parcela}
                       </span>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${item.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                       {item.status}
                    </span>
                 </div>
              </div>
           </div>
         ))}
      </div>

      {/* MOBILE MULTIPLE ADD FAB */}
      <button 
        onClick={openMobileAdd}
        className="md:hidden fixed bottom-[84px] right-4 w-14 h-14 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center text-white shadow-[0_8px_30px_rgb(37,99,235,0.4)] active:scale-95 transition-all z-50"
      >
         <Plus className="w-7 h-7" />
      </button>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block flex-1 w-full overflow-auto relative bg-white rounded-2xl shadow-sm border border-slate-100/80 mb-4">
        <table className="w-max min-w-full border-collapse">
          <thead>
            <tr className="bg-slate-50/80 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
              <th className="sticky left-0 z-30 bg-slate-50/80 w-[40px] py-3"></th>
              <th className="py-3 px-3 text-left" style={{width: '250px'}}>Descrição</th>
              <th className="py-3 px-3 text-right" style={{width: '130px'}}>Valor (R$)</th>
              <th className="py-3 px-3 text-left" style={{width: '120px'}}>Parcelamento</th>
              <th className="py-3 px-3 text-left" style={{width: '70px'}}>Parc.</th>
              <th className="py-3 px-3 text-left" style={{width: '110px'}}>Data</th>
              <th className="py-3 px-3 text-left" style={{width: '110px'}}>Status</th>
              <th className="py-3 px-3 text-left" style={{width: '180px'}}>Categoria</th>
            </tr>
          </thead>
          <tbody>
            <tr>
               <td className="sticky left-0 bg-white z-20 pt-6"></td>
               <td colSpan={7} className="px-4 py-4 pt-6">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
                      Receitas
                    </span>
                  </div>
               </td>
            </tr>
            {entradas.map((item, i) => renderRow(item, i))}
            {ghostEntradas.map((item, i) => renderRow(item, entradas.length + i))}

            <tr>
               <td className="sticky left-0 bg-white z-20 pt-8"></td>
               <td colSpan={7} className="px-4 py-4 pt-8 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="bg-red-50 text-red-600 border border-red-100 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
                      Despesas
                    </span>
                  </div>
               </td>
            </tr>
            {saidas.map((item, i) => renderRow(item, i))}
            {ghostSaidas.map((item, i) => renderRow(item, saidas.length + i))}

            <tr className="h-6"><td colSpan={8}></td></tr>
            
            <tr className="bg-slate-50 border-t border-slate-200 sticky bottom-0 z-30 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.02)]">
              <td className="sticky left-0 bg-slate-50 border-r border-slate-200"></td>
              <td colSpan={2} className="px-4 py-4 font-bold uppercase tracking-widest text-slate-700">
                BALANÇO DO MÊS
              </td>
              <td colSpan={1}></td>
              <td colSpan={2} className="px-4 text-right text-xs font-semibold uppercase text-slate-400 align-middle border-l border-slate-200">
                <div>Total Entradas:</div>
                <div className="mt-1">Total Saídas:</div>
                <div className="text-slate-800 font-bold text-sm mt-2 pt-2 border-t border-slate-200">SALDO ACUMULADO:</div>
              </td>
              <td colSpan={2} className="px-4 text-left font-mono font-bold align-middle">
                <div className="text-emerald-500">{formatCurrency(totalEntradas)}</div>
                <div className="text-red-500 mt-1">{formatCurrency(totalSaidas)}</div>
                <div className={`text-base mt-2 pt-2 border-t border-slate-200 ${saldoFinal < 0 ? "text-red-500" : "text-emerald-500"}`}>
                   {formatCurrency(saldoFinal)}
                </div>
              </td>
              <td className="border border-slate-700"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* MOBILE ADD/EDIT MODAL FORMS */}
      {mobileModalOpen && (
        <div className="md:hidden fixed inset-0 z-[200] flex flex-col justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white rounded-t-3xl shadow-2xl p-6 px-5 flex flex-col gap-4 animate-in slide-in-from-bottom max-h-[90vh] overflow-auto">
              <div className="flex justify-between items-center mb-2">
                 <h2 className="text-xl font-bold text-slate-800">{mobileForm.id ? "Editar Lançamento" : "Novo Lançamento"}</h2>
                 <button onClick={() => setMobileModalOpen(false)} className="p-2 bg-slate-100 rounded-full active:scale-95 text-slate-600">
                    <X className="w-5 h-5" />
                 </button>
              </div>

              <div className="flex bg-slate-100 rounded-lg p-1 gap-1">
                 <button onClick={() => setMobileForm({...mobileForm, tipo: "Saída"})} className={`flex-1 py-2 rounded-md font-bold text-sm transition-colors ${mobileForm.tipo === "Saída" ? "bg-white shadow text-red-600" : "text-slate-500"}`}>Despesa</button>
                 <button onClick={() => setMobileForm({...mobileForm, tipo: "Entrada"})} className={`flex-1 py-2 rounded-md font-bold text-sm transition-colors ${mobileForm.tipo === "Entrada" ? "bg-white shadow text-emerald-600" : "text-slate-500"}`}>Receita</button>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Valor (R$)</label>
                <input type="number" step="0.01" value={mobileForm.valor} onChange={(e) => setMobileForm({...mobileForm, valor: e.target.value})} placeholder="0.00" className={`w-full text-3xl font-black font-mono bg-transparent border-b-2 py-2 outline-none ${mobileForm.tipo === "Saída" ? "border-red-200 text-red-600 focus:border-red-500" : "border-emerald-200 text-emerald-600 focus:border-emerald-500"}`} />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Descrição</label>
                <input type="text" value={mobileForm.descricao} onChange={(e) => setMobileForm({...mobileForm, descricao: e.target.value})} placeholder="Ex: Mercado" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </div>

              <div className="flex gap-3">
                 <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Categoria</label>
                    <select value={mobileForm.categoria} onChange={(e) => setMobileForm({...mobileForm, categoria: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 outline-none focus:border-blue-500">
                       {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
                 <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Data</label>
                    <input type="date" value={mobileForm.data} onChange={(e) => setMobileForm({...mobileForm, data: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 outline-none focus:border-blue-500" />
                 </div>
              </div>

              {!mobileForm.id && (
                <div>
                   <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">Parcelamento (Motor Inteligente)</label>
                   <select value={mobileForm.parcelamento} onChange={(e) => setMobileForm({...mobileForm, parcelamento: e.target.value})} className="w-full bg-slate-50 border border-blue-200 rounded-xl px-4 py-3 text-blue-700 font-bold outline-none focus:border-blue-500">
                      {PARCELAMENTO_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                 {mobileForm.id && (
                    <button onClick={() => deleteItem(mobileForm.id, true)} className="flex items-center justify-center p-4 bg-red-50 text-red-600 rounded-xl active:bg-red-100 transition-colors">
                       <Trash2 className="w-6 h-6" />
                    </button>
                 )}
                 <button onClick={handleMobileSave} className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white rounded-xl py-4 font-bold active:bg-blue-700 transition-colors shadow-lg">
                    <Save className="w-5 h-5"/> SALVAR
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
