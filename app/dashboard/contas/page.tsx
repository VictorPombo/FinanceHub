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
    <div className="w-full h-full flex flex-col bg-[#f4f5f7]">
      {/* Top Banner similar to the screenshots for Accounts */}
      <div className="bg-white border-b border-gray-200 px-6 py-8 shadow-sm">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Meus Cartões e Contas</h1>
        <p className="text-slate-500 mt-1 max-w-2xl font-medium">
          Organize suas finanças centralizando contas bancárias e gerencie a fatura, limites e datas de fechamento dos seus cartões de crédito.
        </p>
      </div>
      
      <div className="flex-1 overflow-auto p-4 md:p-6 no-scrollbar">
         <ContasClient initialData={safeContas} userId={user.id} />
      </div>
    </div>
  );
}
