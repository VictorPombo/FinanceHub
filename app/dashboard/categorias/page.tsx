import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import CategoriasClient from "@/components/CategoriasClient";

export default async function CategoriasPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Puxa Lançamentos Confirmados e Pagos para gerar os Gráficos
  const { data: lancamentos } = await supabase
    .from("lancamentos")
    .select("categoria, tipo, valor, status")
    .eq("user_id", user.id)
    .in("status", ["Confirmado", "Pago"]);

  // Puxa Categorias customizadas
  const { data: categorias } = await supabase
    .from("categorias")
    .select("*")
    .eq("user_id", user.id)
    .order("nome", { ascending: true });

  return (
    <div className="flex-1 overflow-hidden bg-[#020617] relative flex flex-col">
       <CategoriasClient 
          initialData={lancamentos || []} 
          userId={user.id} 
          initialCategories={categorias || []} 
       />
    </div>
  );
}
