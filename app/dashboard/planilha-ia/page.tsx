import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import LancamentosPageClient from "@/components/LancamentosPageClient";

export default async function PlanilhaIaPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Busca os lançamentos APENAS da nova tabela de IA ia_lancamentos
  const { data: lancamentos, error } = await supabase
    .from("ia_lancamentos")
    .select("*")
    .eq("user_id", user.id)
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar lançamentos da IA:", error);
  }

  // Fetch Categorias 
  const { data: categorias } = await supabase
    .from("categorias")
    .select("nome")
    .eq("user_id", user.id)
    .order("nome", { ascending: true });

  const customCategories = (categorias || []).map(c => c.nome);

  return (
    <LancamentosPageClient 
      initialData={lancamentos || []} 
      user_id={user.id} 
      userCategories={customCategories}
      tableName="ia_lancamentos"
    />
  );
}
