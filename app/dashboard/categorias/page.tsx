import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CategoriasClient from "@/components/CategoriasClient";

export default async function CategoriasPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const activeUser = user;
  if (!activeUser) redirect("/");

  const { data: lancamentos } = await supabase
    .from("lancamentos")
    .select("categoria, tipo, valor, status")
    .eq("user_id", activeUser.id)
    .eq("status", "Confirmado");

  return (
    <CategoriasClient initialData={lancamentos || []} />
  );
}
