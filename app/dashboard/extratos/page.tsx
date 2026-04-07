import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ExtratosClient from "@/components/ExtratosClient";

export const dynamic = "force-dynamic";

export default async function ExtratosPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: historico } = await supabase
    .from("ia_lancamentos")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const { data: categorias } = await supabase
    .from("categorias")
    .select("nome")
    .eq("user_id", user.id)
    .order("nome", { ascending: true });
    
  const customCategories = (categorias || []).map(c => c.nome);

  return (
    <div className="w-full h-full flex flex-col bg-[#020617]">
      <div className="bg-gradient-to-b from-[#0F172A] to-transparent px-5 md:px-6 py-5 md:py-6 shrink-0">
        <h1 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight">Extratos & Planilha IA</h1>
        <p className="text-slate-500 mt-0.5 text-xs md:text-sm font-medium">Faça upload de extratos ou gerencie a Planilha Inteligente.</p>
      </div>
      
      <div className="flex-1 overflow-auto p-4 md:p-6 no-scrollbar">
         <ExtratosClient userId={user.id} initialHistory={historico || []} userCategories={customCategories} />
      </div>
    </div>
  );
}
