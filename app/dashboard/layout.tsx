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
    <div className="flex flex-col h-screen w-full bg-[#020617] overflow-hidden text-slate-200">
      {/* Toolbar Superior */}
      <header className="bg-[#0B1121] border-b border-slate-800/50 px-6 py-3 flex items-center justify-between shrink-0 shadow-md relative z-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center bg-purple-600/20 w-8 h-8 rounded-lg border border-purple-500/30">
            <span className="text-xl">💳</span>
          </div>
          <span className="text-xl font-black tracking-tight text-slate-100 font-sans lowercase flex items-center gap-1">
            finance<span className="text-purple-500 px-1.5 py-0.5 rounded bg-purple-950/50 border border-purple-900/50 text-sm shadow-[0_0_10px_rgba(147,51,234,0.3)]">hub</span>
          </span>
        </div>
        <UserToolbar email={activeUser.email || "Usuário"} />
      </header>

      {/* Abas */}
      <nav className="shrink-0 bg-[#020617] border-b border-slate-800 shadow-sm relative z-40">
        <TabsNavigation />
      </nav>

      {/* Área de Conteúdo */}
      <main className="flex-1 overflow-auto bg-[#020617]">
        <div className="w-full h-full min-h-max py-2 md:py-6 px-2 md:px-6">
          <div className="max-w-[1400px] mx-auto w-full h-full">
             {children}
          </div>
        </div>
      </main>
    </div>
  );
}
