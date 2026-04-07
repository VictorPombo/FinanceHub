"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function UserToolbar({ email }: { email: string }) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-zinc-500 truncate max-w-[150px] sm:max-w-xs font-medium" title={email}>
        {email}
      </span>
      <button 
        onClick={handleLogout}
        className="flex items-center gap-1.5 text-sm bg-zinc-900/80 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 px-3.5 py-1.5 rounded-xl transition-all duration-200 shadow-sm"
      >
        <LogOut className="w-3.5 h-3.5" />
        Sair
      </button>
    </div>
  );
}
