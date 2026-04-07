import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ResumoMensalClient from "@/components/ResumoMensalClient";

export default async function ResumoMensalPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const activeUser = user;
  if (!activeUser) redirect("/");

  // Fetch Configuracoes (Saldo Inicial)
  const { data: configRows } = await supabase
    .from("configuracoes")
    .select("*")
    .eq("user_id", activeUser.id)
    .single();

  // Fetch Lançamentos genéricos (Manual)
  const { data: dudaRows } = await supabase
    .from("lancamentos")
    .select("*")
    .eq("user_id", activeUser.id)
    .in("status", ["Pago", "Concluído", "Confirmado", "Em aberto"]);

  // Fetch IA (Extratos)
  const { data: iaRows } = await supabase
    .from("ia_lancamentos")
    .select("*")
    .eq("user_id", activeUser.id)
    .in("status", ["Pago", "Concluído", "Confirmado", "Em aberto"]);

  // Inject logical origem flag, but completely ignore legacy internal origins that Lancamentos itself hides
  const manual = (dudaRows || [])
    .filter(r => r.origem !== "Extrato")  // Filters OUT ghost files from legacy uploads
    .map(r => ({ ...r, origem: "Manual" }));
    
  const ia = (iaRows || []).map(r => ({ ...r, origem: "Upload IA" }));

  // Combina para a página cliente
  const mergedData = [...manual, ...ia].sort((a,b) => new Date(a.data).getTime() - new Date(b.data).getTime());

  return (
    <ResumoMensalClient 
      rawData={mergedData} 
      config={configRows || null}
      user_id={activeUser.id} 
    />
  );
}
