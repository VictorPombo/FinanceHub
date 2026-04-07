import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import TabsNavigation from "@/components/TabsNavigation";
import UserToolbar from "@/components/UserToolbar";
import { ExtratoQueueProvider } from "@/contexts/ExtratoQueueContext";

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
    <div className="flex flex-col h-screen w-full bg-[#09090b] overflow-hidden text-zinc-200">
      {/* Toolbar Superior */}
      <header className="bg-[#09090b]/80 backdrop-blur-xl border-b border-zinc-800/40 px-6 py-3.5 flex items-center justify-between shrink-0 relative z-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center bg-gradient-to-br from-violet-600/25 to-violet-800/15 w-9 h-9 rounded-xl border border-violet-500/20 shadow-[0_0_16px_rgba(124,58,237,0.15)]">
            <span className="text-lg">💳</span>
          </div>
          <span className="text-xl font-black tracking-tight text-zinc-50 font-sans lowercase flex items-center gap-1.5">
            finance<span className="text-violet-400 px-2 py-0.5 rounded-lg bg-violet-950/40 border border-violet-800/40 text-sm font-extrabold shadow-[0_0_12px_rgba(124,58,237,0.2)]">hub</span>
          </span>
        </div>
        <UserToolbar email={activeUser.email || "Usuário"} />
      </header>

      {/* Abas */}
      <nav className="shrink-0 bg-[#09090b] border-b border-zinc-800/30 relative z-40">
        <TabsNavigation />
      </nav>

      {/* Área de Conteúdo */}
      <main className="flex-1 overflow-auto bg-[#09090b]">
        <div className="w-full h-full min-h-max py-2 md:py-6 px-2 md:px-6 pb-28 md:pb-6">
          <ExtratoQueueProvider>
            <div className="max-w-[1400px] mx-auto w-full h-full">
               {children}
            </div>
          </ExtratoQueueProvider>
        </div>
      </main>
    </div>
  );
}
