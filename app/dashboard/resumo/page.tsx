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

  // Fetch RECENT Lancamentos Confirmados to group on the Client Side (so they can toggle Origem)
  const { data: lancamentos } = await supabase
    .from("lancamentos")
    .select("*")
    .eq("user_id", activeUser.id)
    .in("status", ["Pago", "Confirmado", "Em aberto"])
    .order("data", { ascending: true });

  return (
    <ResumoMensalClient 
      rawData={lancamentos || []} 
      config={configRows || null}
      user_id={activeUser.id} 
    />
  );
}
