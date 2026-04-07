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

  // Fetch Lancamentos de Origem = Extrato
  // Limit to avoid huge payloads if not necessary, but since it's an import page we want to see recent imports.
  const { data: historico } = await supabase
    .from("lancamentos")
    .select("*")
    .eq("user_id", user.id)
    .eq("origem", "Extrato")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="w-full h-full flex flex-col bg-[#020617]">
      <div className="bg-[#0F172A] border-b border-slate-800/80 px-6 py-6 shadow-sm shrink-0">
        <h1 className="text-2xl font-black text-slate-100 tracking-tight">Importação de Extratos</h1>
        <p className="text-slate-400 mt-1 max-w-2xl font-medium text-sm">
          Faça upload da foto ou PDF do seu extrato bancário. A Inteligência Artificial lerá todas as transações, organizará as categorias e integrará tudo ao seu Saldo Mensal sem poluir seus Lançamentos Manuais.
        </p>
      </div>
      
      <div className="flex-1 overflow-auto p-4 md:p-6 no-scrollbar">
         <ExtratosClient userId={user.id} initialHistory={historico || []} />
      </div>
    </div>
  );
}
