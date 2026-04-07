import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PlanilhaDudaClient from "@/components/PlanilhaDudaClient";

export default async function DudaPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Busca os lançamentos APENAS da tabela dúvida_lancamentos
  const { data: lancamentos, error } = await supabase
    .from("duda_lancamentos")
    .select("*")
    .eq("user_id", user.id)
    .order("data", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao carregar lançamentos da Duda:", error);
  }

  return (
    <div className="flex-1 overflow-hidden bg-[#020617] relative flex flex-col pt-1">
      <PlanilhaDudaClient initialData={lancamentos || []} user_id={user.id} />
    </div>
  );
}
