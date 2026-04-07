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
      <span className="text-sm text-slate-400 truncate max-w-[150px] sm:max-w-xs" title={email}>
        {email}
      </span>
      <button 
        onClick={handleLogout}
        className="flex items-center gap-1 text-sm bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded-md transition-colors shadow-sm"
      >
        <LogOut className="w-4 h-4" />
        Sair
      </button>
    </div>
  );
}
