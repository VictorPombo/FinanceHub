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
    <div className="flex flex-col h-screen w-full bg-[#0F172A] overflow-hidden">
      {/* Toolbar Superior */}
      <header className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] border-b border-white/10 px-6 py-3 flex items-center justify-between shrink-0 shadow-lg relative z-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center bg-blue-600/20 w-8 h-8 rounded-lg border border-blue-500/30">
            <span className="text-xl">💎</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-white font-sans">
            Finance<span className="text-blue-500">Hub</span>
          </span>
        </div>
        <UserToolbar email={activeUser.email || "Usuário"} />
      </header>

      {/* Abas */}
      <nav className="shrink-0">
        <TabsNavigation />
      </nav>

      {/* Área de Conteúdo */}
      <main className="flex-1 overflow-auto bg-[#F8FAFC]">
        <div className="w-full h-full min-h-max border-t border-t-white shadow-inner">
          {children}
        </div>
      </main>
    </div>
  );
}
