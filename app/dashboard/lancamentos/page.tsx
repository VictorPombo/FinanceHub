import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LancamentosPageClient from "@/components/LancamentosPageClient";

export default async function LancamentosPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const activeUser = user;
  if (!activeUser) redirect("/");

  // Fetch all lancamentos for the user
    const { data: lancamentos } = await supabase
      .from("lancamentos")
      .select("*")
      .eq("user_id", activeUser.id)
      .order("data", { ascending: true });

  // Fetch Categorias
    const { data: categorias } = await supabase
      .from("categorias")
      .select("nome")
      .eq("user_id", activeUser.id)
      .order("nome", { ascending: true });

  const customCategories = (categorias || []).map(c => c.nome);

  return (
    <LancamentosPageClient 
      initialData={lancamentos || []} 
      user_id={activeUser.id}
      userCategories={customCategories}
    />
  );
}
