import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ConsultorClient from "@/components/ConsultorClient";

export default async function ConsultorPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const activeUser = user;
  if (!activeUser) redirect("/");

  // Fetch all 4 data origins required for AI consultancy
  const [
    { data: lancamentos },
    { data: dudaLancamentos },
    { data: iaLancamentos },
    { data: dividas },
    { data: config },
    { data: lancPrevistos }
  ] = await Promise.all([
    supabase.from("lancamentos").select("*").eq("user_id", activeUser.id).in("status", ["Pago", "Concluído", "Confirmado", "Em aberto"]),
    supabase.from("duda_lancamentos").select("*").eq("user_id", activeUser.id),
    supabase.from("ia_lancamentos").select("*").eq("user_id", activeUser.id),
    supabase.from("dividas").select("*").eq("user_id", activeUser.id),
    supabase.from("configuracoes").select("saldo_inicial").eq("user_id", activeUser.id).single(),
    supabase.from("lancamentos").select("*").eq("user_id", activeUser.id).eq("status", "Previsto")
  ]);

  return (
    <ConsultorClient 
      lancamentos={lancamentos || []}
      dudaLancamentos={dudaLancamentos || []}
      iaLancamentos={iaLancamentos || []}
      dividas={dividas || []}
      config={config || null}
      lancPrevistos={lancPrevistos || []}
    />
  );
}
