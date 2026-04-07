import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ContasClient from "@/components/ContasClient";

export const dynamic = "force-dynamic";

export default async function ContasPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Fetch Contas for this user
  const { data: contas } = await supabase
    .from("contas")
    .select("*")
    .order("created_at", { ascending: true });

  // Fallback se ocorrer erro antes do usuário rodar o script SQL
  const safeContas = contas || [];

  return (
    <div className="w-full h-full flex flex-col bg-[#020617]">
      {/* Top Banner similar to the screenshots for Accounts */}
      <div className="bg-gradient-to-b from-[#0F172A] to-transparent px-5 md:px-6 py-5 md:py-6 shrink-0">
        <h1 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight">Cartões e Contas</h1>
        <p className="text-slate-500 mt-0.5 text-xs md:text-sm font-medium">Gerencie faturas, limites e controle de pagamento.</p>
      </div>
      
      <div className="flex-1 overflow-auto p-4 md:p-6 no-scrollbar">
         <ContasClient initialData={safeContas} userId={user.id} />
      </div>
    </div>
  );
}
