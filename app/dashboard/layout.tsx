import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TabsNavigation from "@/components/TabsNavigation";
import UserToolbar from "@/components/UserToolbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const activeUser = user;
  if (!activeUser) redirect("/");

  return (
    <div className="flex flex-col h-screen w-full bg-[#f4f5f7] overflow-hidden text-slate-800">
      {/* Toolbar Superior */}
      <header className="bg-[#483d8b] px-6 py-3 flex items-center justify-between shrink-0 shadow-md relative z-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center bg-white/10 w-8 h-8 rounded-lg border border-white/20">
            <span className="text-xl">💰</span>
          </div>
          <span className="text-xl font-black tracking-tighter text-white font-sans lowercase">
            finance<span className="text-emerald-400">hub</span>
          </span>
        </div>
        <UserToolbar email={activeUser.email || "Usuário"} />
      </header>

      {/* Abas */}
      <nav className="shrink-0 bg-white border-b border-slate-200 shadow-sm relative z-40">
        <TabsNavigation />
      </nav>

      {/* Área de Conteúdo */}
      <main className="flex-1 overflow-auto bg-[#f4f5f7]">
        <div className="w-full h-full min-h-max py-2 md:py-6 px-2 md:px-6">
          <div className="max-w-[1400px] mx-auto w-full h-full">
             {children}
          </div>
        </div>
      </main>
    </div>
  );
}
