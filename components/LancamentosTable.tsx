"use client";

import { useState, useRef, useEffect } from "react";
import { formatCurrency } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Trash2, Plus, ArrowDownRight, ArrowUpRight, X, Save } from "lucide-react";

interface Props {
  initialData: any[];
  userId: string;
  userCategories: string[];
  onDataChange: (newData: any[]) => void;
  currentTabMonth: number;
  currentTabYear: number;
  tableName?: string;
  isReadOnly?: boolean;
}

const PARCELAMENTO_OPTIONS = [
  "1x (Única)", "2x", "3x", "4x", "5x", "6x", 
  "7x", "8x", "9x", "10x", "11x", "12x", "Fixo"
];

export default function LancamentosTable({ initialData, userId, userCategories, onDataChange, currentTabMonth, currentTabYear, tableName, isReadOnly }: Props) {
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const supabase = createClient();
  const dbTable = tableName || "lancamentos";

  // --- ADD ENGINE ---
  const handleAddNew = async (form: any, isDesktop = false) => {
    if (!form.descricao || !form.valor) {
       toast.error("Preencha descrição e valor");
       return false;
    }
    toast.loading("Salvando...");
    
    let baseValor = Math.abs(Number(String(form.valor).replace(',', '.')));
    baseValor = form.tipo === "Saída" ? -baseValor : baseValor;

    let nMeses = 1;
    let recType = "Única";
    let origParcela = "1/1";
    
    if (form.parcelamento === "Fixo") {
       nMeses = 12;
       recType = "Recorrente";
       origParcela = "Fixa";
    } else {
       nMeses = parseInt(form.parcelamento) || 1;
       if (nMeses > 1) {
          recType = "Parcelado";
          origParcela = `1/${nMeses}`;
       }
    }

    const baseDate = new Date(form.data + "T00:00:00");
    const rows = [];
    
    for (let i = 0; i < nMeses; i++) {
       const future = new Date(baseDate);
       future.setMonth(future.getMonth() + i);
       const yyyy = future.getFullYear();
       const mm = String(future.getMonth() + 1).padStart(2, '0');
       const dd = String(future.getDate()).padStart(2, '0');
       
       rows.push({
         user_id: userId,
         data: `${yyyy}-${mm}-${dd}`,
         descricao: form.descricao,
         categoria: form.categoria,
         tipo: form.tipo,
         recorrencia: recType,
         parcela: recType === "Recorrente" ? "Fixa" : (recType === "Única" ? "1/1" : `${i+1}/${nMeses}`),
         valor: baseValor,
         status: form.status || "Em aberto"
       });
    }

    const { data: generated, error } = await supabase.from(dbTable).insert(rows).select();
    toast.dismiss();
    if (error) {
       toast.error("Erro ao inserir!");
       return false;
    } else {
       toast.success("Adicionado!");
       onDataChange([...initialData, ...(generated || [])]);
       return true;
    }
  };

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
      parcelamento: item.recorrencia === "Única" ? "1x (Única)" : (item.recorrencia === "Recorrente" ? "Fixo" : "1x (Única)"),
      data: item.data
    });
    setMobileModalOpen(true);
  };

  const handleMobileSave = async () => {
    if (mobileForm.id) {
      if (!mobileForm.descricao || !mobileForm.valor) {
         toast.error("Preencha descrição e valor"); return;
      }
      toast.loading("Salvando...");
      let baseValor = Math.abs(Number(String(mobileForm.valor).replace(',', '.')));
      baseValor = mobileForm.tipo === "Saída" ? -baseValor : baseValor;

      const updatePayload = {
        descricao: mobileForm.descricao,
        categoria: mobileForm.categoria,
        tipo: mobileForm.tipo,
        valor: baseValor,
        data: mobileForm.data
      };
      const { error } = await supabase.from(dbTable).update(updatePayload).eq("id", mobileForm.id);
      toast.dismiss();
      if (error) toast.error("Erro ao salvar!");
      else {
        toast.success("Atualizado com sucesso!");
        onDataChange(initialData.map(d => d.id === mobileForm.id ? { ...d, ...updatePayload } : d));
        setMobileModalOpen(false);
      }
    } else {
      const success = await handleAddNew(mobileForm);
      if (success) setMobileModalOpen(false);
    }
  };
  // --- END MOBILE STATE ---

  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  const updateItem = async (id: string, field: string, value: any, itemType: string) => {
    const itemIndex = initialData.findIndex((i) => i.id === id);
    if (itemIndex === -1) return;
    const item = initialData[itemIndex];

    if (field === "parcelamento") {
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
         const { error } = await supabase.from(dbTable).update({ recorrencia: "Única", parcela: "1/1" }).eq("id", id);
         if (!error) onDataChange(initialData.map(d => d.id === id ? {...d, recorrencia: "Única", parcela: "1/1"} : d));
         return;
      }

      toast.loading(`Gerando parcelas futuras...`);
      const origParcela = recType === "Recorrente" ? "Fixa" : `1/${nMeses}`;
      await supabase.from(dbTable).update({ recorrencia: recType, parcela: origParcela }).eq("id", id);
      
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

      const { data: generated, error } = await supabase.from(dbTable).insert(forwardRows).select();
      toast.dismiss();
      if (error) {
         toast.error("Erro no motor de parcelamento");
      } else {
         toast.success("Parcelamento gerado!");
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
       if (window.confirm(`Este é um registro Fixo. Deseja aplicar a alteração para TODOS os meses subsequentes?`)) {
           toast.loading("Atualizando valores fixos futuros...");
           const { error: errMass } = await supabase.from(dbTable)
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

    const { error } = await supabase.from(dbTable).update(updatePayload).eq("id", id);
    if (error) toast.error("Erro ao salvar");
  };

  const handleKeyDown = (e: React.KeyboardEvent, id: string, field: string, type: string) => {
    if (e.key === "Escape") setEditingCell(null);
    if (e.key === "Enter") {
      updateItem(id, field, (e.target as HTMLInputElement).value, type);
    }
  };

  const deleteItem = async (id: string, isMobile = false) => {
    const item = initialData.find(d => d.id === id);
    if (!item) return;

    if (item.recorrencia === 'Recorrente') {
       if (window.confirm("Este lançamento é Fixo. Deseja excluir ele E TODOS OS FUTUROS subsequentes?")) {
          toast.loading("Excluindo...");
          await supabase.from(dbTable).delete()
              .eq("recorrencia", "Recorrente").eq("descricao", item.descricao).eq("tipo", item.tipo).gte("data", item.data);
          toast.dismiss();
          toast.success("Excluídos!");
          window.location.reload();
          return;
       }
    } else {
       if (!window.confirm("Deseja realmente excluir este lançamento?")) return;
    }

    onDataChange(initialData.filter((d) => d.id !== id));
    await supabase.from(dbTable).delete().eq("id", id);
    toast.success("Excluído");
    if (isMobile) setMobileModalOpen(false);
  };

  const renderCell = (item: any, field: string, width: string, type: "text" | "number" | "select" | "date" = "text", options?: string[]) => {
    const isEditing = editingCell?.id === item.id && editingCell?.field === field;
    
    let displayValue = item[field] || "";
    if (field === "valor_digitado") {
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
    if (field === "data" && !isEditing && displayValue) {
       const parts = displayValue.split('-');
       if (parts.length === 3) displayValue = `${parts[2]}/${parts[1]}`;
    }

    const canEdit = !isReadOnly && field !== "id" && field !== "valor_final" && field !== "parcela";

    let editValue = item[field] || "";
    if (field === "valor_digitado") {
       editValue = item.valor !== 0 ? Math.abs(item.valor).toString() : "";
    } else if (field === "parcelamento") {
       editValue = displayValue;
    }

    return (
      <td 
        className={`border-b border-zinc-800/20 ${isEditing ? "bg-zinc-800/80 ring-1 ring-purple-500/50 z-10 relative rounded shadow-sm" : ""} transition-colors ${field === "valor_digitado" ? "font-mono" : ""} cursor-pointer`}
        style={{ width, minWidth: width, maxWidth: width }}
        onDoubleClick={() => canEdit && setEditingCell({ id: item.id, field })}
        onClick={() => {
           if (!canEdit) return;
           setEditingCell({ id: item.id, field });
        }}
      >
        {isEditing ? (
          type === "select" ? (
            <select
              ref={inputRef as React.RefObject<HTMLSelectElement>}
              className="w-full h-full border-none outline-none text-sm bg-transparent px-2 text-zinc-200"
              defaultValue={editValue}
              onBlur={(e) => updateItem(item.id, field, e.target.value, item.tipo)}
              onKeyDown={(e) => handleKeyDown(e, item.id, field, item.tipo)}
            >
              <option value="" disabled className="bg-zinc-900 text-zinc-200">Selecionar...</option>
              {options?.map(opt => <option key={opt} value={opt} className="bg-zinc-900 text-zinc-200">{opt}</option>)}
            </select>
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type={type}
              className="w-full h-full border-none outline-none text-sm bg-transparent px-2 text-zinc-200 placeholder-slate-600"
              defaultValue={editValue}
              onBlur={(e) => updateItem(item.id, field, e.target.value, item.tipo)}
              onKeyDown={(e) => handleKeyDown(e, item.id, field, item.tipo)}
              step={type === "number" ? "0.01" : undefined}
            />
          )
        ) : (
          <div className={`w-full h-full px-2 py-2 truncate flex items-center ${field === 'valor_digitado' ? 'justify-end font-mono' : ''}`}>
             <span className={`truncate text-zinc-300 text-[13px] ${field === 'valor_digitado' && item.valor < 0 ? 'text-red-400' : ''} ${field === 'valor_digitado' && item.valor > 0 ? 'text-emerald-400' : ''}`}>
                {displayValue}
             </span>
          </div>
        )}
      </td>
    );
  };

  const renderRow = (item: any, sequenceIndex: number) => {
    const rowClass = item.tipo === "Entrada" ? "bg-emerald-950/5 hover:bg-emerald-900/10" : "bg-red-950/5 hover:bg-red-900/10";

    return (
      <tr key={item.id} className={`${rowClass} transition-colors group align-middle border-b border-zinc-800/30`}>
        <td className="sticky left-0 z-10 bg-[#09090b] group-hover:bg-[#060b18] text-center text-xs font-medium text-zinc-500 w-[50px] px-1 relative transition-colors border-b border-zinc-800/30">
           <div className="relative flex items-center justify-center w-full h-full min-h-[28px]">
              <button 
                 onClick={() => deleteItem(item.id)} 
                 className="absolute opacity-0 group-hover:opacity-100 text-red-500 shadow rounded-lg p-1.5 z-50 hover:text-red-400 hover:bg-zinc-800 transition-all"
                 title="Apagar linha"
              >
                 <Trash2 className="w-3.5 h-3.5"/>
              </button>
              <span className="opacity-40 group-hover:opacity-0 transition-opacity">{sequenceIndex + 1}</span>
           </div>
        </td>
        {renderCell(item, "descricao", "250px")}
        {renderCell(item, "valor_digitado", "130px", "number")}
        {renderCell(item, "parcelamento", "120px", "select", PARCELAMENTO_OPTIONS)}
        <td className="border-b border-zinc-800/20 px-2 py-2 text-xs text-zinc-500 text-center bg-zinc-900/20" style={{width: '70px'}}>
           {item.parcela || ""}
        </td>
        {renderCell(item, "data", "110px", "date")}
        {renderCell(item, "status", "110px", "select", ["Pago", "Em aberto"])}
        {renderCell(item, "categoria", "180px", "select", userCategories && userCategories.length > 0 ? userCategories : [])}
      </tr>
    );
  };

  // Dedicated Desktop Add Row
  const DesktopAddRow = ({ tipo }: { tipo: string }) => {
    const [form, setForm] = useState({
      descricao: "", valor: "", categoria: "Outros", parcelamento: "1x (Única)",
      data: `${currentTabYear}-${String(currentTabMonth).padStart(2, '0')}-01`, status: "Em aberto"
    });

    const submit = async () => {
      if (!form.descricao || !form.valor) return; // ignore incomplete
      const success = await handleAddNew({...form, tipo});
      if (success) {
         setForm({ ...form, descricao: "", valor: "" }); // reset
      }
    };

    const handleKey = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") submit();
    };

    return (
      <tr className="bg-zinc-900/30 border-b border-zinc-800/40 opacity-80 hover:opacity-100 transition-opacity">
        <td className="sticky left-0 z-10 bg-[#09090b] text-center w-[50px] border-b border-zinc-800/40">
           <button onClick={submit} className="p-1 rounded bg-violet-600/20 text-violet-400 hover:bg-violet-600/40 transition flex items-center justify-center mx-auto" title="Salvar Linha">
              <Plus className="w-3.5 h-3.5" />
           </button>
        </td>
        <td className="px-2 border-b border-zinc-800/20"><input type="text" placeholder="Adicionar descrição..." value={form.descricao} onChange={e => setForm({...form, descricao: e.target.value})} onKeyDown={handleKey} className="w-full bg-transparent text-[13px] text-zinc-200 outline-none border-none placeholder-slate-600 py-2" /></td>
        <td className="px-2 border-b border-zinc-800/20"><input type="number" step="0.01" placeholder="0.00" value={form.valor} onChange={e => setForm({...form, valor: e.target.value})} onKeyDown={handleKey} className="w-full bg-transparent text-[13px] text-zinc-200 outline-none border-none placeholder-slate-600 text-right font-mono py-2" /></td>
        <td className="px-2 border-b border-zinc-800/20"><select value={form.parcelamento} onChange={e => setForm({...form, parcelamento: e.target.value})} className="w-full bg-transparent text-[13px] text-zinc-200 outline-none border-none py-2"><option disabled value="">Parc...</option>{PARCELAMENTO_OPTIONS.map(o => <option key={o} value={o} className="bg-zinc-900 text-zinc-200">{o}</option>)}</select></td>
        <td className="px-2 border-b border-zinc-800/20 bg-zinc-900/20 text-center"><span className="text-xs text-zinc-600">-</span></td>
        <td className="px-2 border-b border-zinc-800/20"><input type="date" value={form.data} onChange={e => setForm({...form, data: e.target.value})} onKeyDown={handleKey} className="w-full bg-transparent text-xs text-zinc-200 outline-none border-none py-2" /></td>
        <td className="px-2 border-b border-zinc-800/20"><select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full bg-transparent text-[13px] text-zinc-200 outline-none border-none py-2"><option value="Pago" className="bg-zinc-900 text-zinc-200">Pago</option><option value="Em aberto" className="bg-zinc-900 text-zinc-200">Em aberto</option></select></td>
        <td className="px-2 border-b border-zinc-800/20"><select value={form.categoria} onChange={e => setForm({...form, categoria: e.target.value})} className="w-full bg-transparent text-[13px] text-zinc-200 outline-none border-none py-2">{(userCategories && userCategories.length > 0 ? userCategories : []).map(c => <option key={c} value={c} className="bg-zinc-900 text-zinc-200">{c}</option>)}</select></td>
      </tr>
    );
  };

  const entradas = initialData.filter(d => d.tipo === "Entrada");
  const saidas = initialData.filter(d => d.tipo === "Saída");

  return (
    <div className="w-full h-full flex flex-col font-sans bg-[#09090b] pb-24 md:pb-10 relative">
      
      {/* MOBILE FULL-SCREEN LIST VIEW */}
      <div className="md:hidden flex flex-col gap-3 px-3 py-2 overflow-auto relative">
         {initialData.length === 0 && (
            <div className="text-center py-20 text-zinc-500">Nenhum lançamento no mês.</div>
         )}
         {initialData.map(item => (
           <div 
             key={item.id} 
             onClick={() => openMobileEdit(item)}
             className={`flex flex-col bg-zinc-900/80 backdrop-blur-md rounded-xl shadow-lg border p-4 active:scale-95 transition-transform ${item.tipo === 'Entrada' ? 'border-emerald-900/50' : 'border-red-900/50'}`}
           >
              <div className="flex justify-between items-start mb-2">
                 <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-full ${item.tipo === 'Entrada' ? 'bg-emerald-950/50 text-emerald-400' : 'bg-red-950/50 text-red-500'}`}>
                       {item.tipo === 'Entrada' ? <ArrowUpRight className="w-4 h-4"/> : <ArrowDownRight className="w-4 h-4"/>}
                    </div>
                    <div>
                       <h4 className="font-bold text-zinc-200 leading-tight">{item.descricao}</h4>
                       <span className="text-[10px] uppercase font-bold text-zinc-500">{item.categoria}</span>
                    </div>
                 </div>
                 <div className="text-right">
                    <span className={`font-mono font-black text-lg ${item.valor < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                       {formatCurrency(item.valor)}
                    </span>
                 </div>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-zinc-800/50">
                 <span className="text-xs text-zinc-500">{new Date(item.data + "T00:00:00").toLocaleDateString('pt-BR')}</span>
                 <div className="flex items-center gap-2">
                    {item.parcela && item.parcela !== "1/1" && (
                       <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded text-[10px] font-bold">
                          {item.parcela}
                       </span>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${item.status === 'Pago' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900' : 'bg-orange-950/40 text-orange-400 border border-orange-900'}`}>
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
        className="md:hidden fixed bottom-[84px] right-4 w-14 h-14 bg-violet-600 hover:bg-violet-700 rounded-full flex items-center justify-center text-white shadow-[0_8px_25px_rgb(147,51,234,0.4)] active:scale-95 transition-all z-50"
      >
         <Plus className="w-7 h-7" />
      </button>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block flex-1 w-full overflow-auto relative bg-[#09090b] rounded-xl border border-zinc-800/50 shadow-2xl mb-4">
        <table className="w-max min-w-full border-collapse font-sans">
          <thead>
            <tr className="bg-[#09090b] text-zinc-400 text-xs font-semibold uppercase tracking-widest border-b border-zinc-800/60 sticky top-0 z-30 shadow-sm">
              <th className="sticky left-0 bg-[#09090b] w-[50px] py-3.5 border-b border-zinc-800/60"></th>
              <th className="py-3.5 px-3 text-left font-semibold" style={{width: '250px'}}>Descrição</th>
              <th className="py-3.5 px-3 text-right font-semibold" style={{width: '130px'}}>Valor (R$)</th>
              <th className="py-3.5 px-3 text-left font-semibold" style={{width: '120px'}}>Parcelamento</th>
              <th className="py-3.5 px-3 text-center font-semibold" style={{width: '70px'}}>Parc.</th>
              <th className="py-3.5 px-3 text-left font-semibold" style={{width: '110px'}}>Data</th>
              <th className="py-3.5 px-3 text-left font-semibold" style={{width: '110px'}}>Status</th>
              <th className="py-3.5 px-3 text-left font-semibold" style={{width: '180px'}}>Categoria</th>
            </tr>
          </thead>
          <tbody>
            <tr>
               <td className="sticky left-0 bg-[#09090b] z-20 pt-4"></td>
               <td colSpan={7} className="px-4 py-2 pt-5">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest bg-emerald-950/30 border border-emerald-900/50 shadow-sm">
                      Receitas
                    </span>
                  </div>
               </td>
            </tr>
            {entradas.map((item, i) => renderRow(item, i))}
            <DesktopAddRow tipo="Entrada" />

            <tr>
               <td className="sticky left-0 bg-[#09090b] z-20 pt-6"></td>
               <td colSpan={7} className="px-4 py-2 pt-8">
                  <div className="flex items-center gap-2">
                    <span className="text-red-400 text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-widest bg-red-950/30 border border-red-900/50 shadow-sm">
                      Despesas
                    </span>
                  </div>
               </td>
            </tr>
            {saidas.map((item, i) => renderRow(item, i))}
            <DesktopAddRow tipo="Saída" />
            <tr className="h-4"><td colSpan={8}></td></tr>
          </tbody>
        </table>
      </div>

      {/* MOBILE ADD/EDIT MODAL FORMS */}
      {mobileModalOpen && (
        <div className="md:hidden fixed inset-0 z-[200] flex flex-col justify-end bg-zinc-950/60 backdrop-blur-sm animate-in fade-in">
           <div className="bg-[#0f172a] border-t border-zinc-800 rounded-t-3xl shadow-2xl p-6 px-5 flex flex-col gap-4 animate-in slide-in-from-bottom max-h-[90vh] overflow-auto">
              <div className="flex justify-between items-center mb-2">
                 <h2 className="text-xl font-bold text-zinc-200">{mobileForm.id ? "Editar Lançamento" : "Novo Lançamento"}</h2>
                 <button onClick={() => setMobileModalOpen(false)} className="p-2 bg-zinc-800 rounded-full active:scale-95 text-zinc-400 hover:text-zinc-200">
                    <X className="w-5 h-5" />
                 </button>
              </div>

              <div className="flex bg-zinc-900 rounded-lg p-1 gap-1">
                 <button onClick={() => setMobileForm({...mobileForm, tipo: "Saída"})} className={`flex-1 py-2 rounded-md font-bold text-sm transition-colors ${mobileForm.tipo === "Saída" ? "bg-zinc-800 shadow text-red-500" : "text-zinc-500"}`}>Despesa</button>
                 <button onClick={() => setMobileForm({...mobileForm, tipo: "Entrada"})} className={`flex-1 py-2 rounded-md font-bold text-sm transition-colors ${mobileForm.tipo === "Entrada" ? "bg-zinc-800 shadow text-emerald-400" : "text-zinc-500"}`}>Receita</button>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Valor (R$)</label>
                <input type="number" step="0.01" value={mobileForm.valor} onChange={(e) => setMobileForm({...mobileForm, valor: e.target.value})} placeholder="0.00" className={`w-full text-3xl font-black font-mono bg-transparent border-b-2 py-2 outline-none ${mobileForm.tipo === "Saída" ? "border-red-900/50 text-red-500 focus:border-red-500" : "border-emerald-900/50 text-emerald-400 focus:border-emerald-500"}`} />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Descrição</label>
                <input type="text" value={mobileForm.descricao} onChange={(e) => setMobileForm({...mobileForm, descricao: e.target.value})} placeholder="Ex: Mercado" className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 outline-none focus:border-violet-500 focus:ring-1 focus:ring-purple-500/50" />
              </div>

              <div className="flex gap-3">
                 <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Categoria</label>
                    <select value={mobileForm.categoria} onChange={(e) => setMobileForm({...mobileForm, categoria: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 outline-none focus:border-violet-500">
                       {(userCategories && userCategories.length > 0 ? userCategories : []).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                 </div>
                 <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Data</label>
                    <input type="date" value={mobileForm.data} onChange={(e) => setMobileForm({...mobileForm, data: e.target.value})} className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 cursor-text outline-none focus:border-violet-500" style={{colorScheme: 'dark'}} />
                 </div>
              </div>

              {!mobileForm.id && (
                <div>
                   <label className="text-[10px] font-bold uppercase text-zinc-400 ml-1">Parcelamento (Motor Inteligente)</label>
                   <select value={mobileForm.parcelamento} onChange={(e) => setMobileForm({...mobileForm, parcelamento: e.target.value})} className="w-full bg-zinc-800 border border-violet-900/50 rounded-xl px-4 py-3 text-violet-400 font-bold outline-none focus:border-violet-500">
                      {PARCELAMENTO_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                </div>
              )}

              <div className="flex gap-3 mt-4">
                 {mobileForm.id && (
                    <button onClick={() => deleteItem(mobileForm.id, true)} className="flex items-center justify-center p-4 bg-red-950/40 text-red-500 border border-red-900/30 rounded-xl active:bg-red-950 transition-colors">
                       <Trash2 className="w-6 h-6" />
                    </button>
                 )}
                 <button onClick={handleMobileSave} className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl py-4 font-bold active:bg-violet-800 transition-colors shadow-lg shadow-violet-900/20">
                    <Save className="w-5 h-5"/> SALVAR
                 </button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
