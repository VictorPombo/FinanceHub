import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard/lancamentos");
  }

  const login = async (formData: FormData) => {
    "use server";
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) redirect("/dashboard/lancamentos");
  };

  const signup = async (formData: FormData) => {
    "use server";
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({ email, password });
    if (!error) redirect("/dashboard/lancamentos");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 relative overflow-hidden">
      <div className="z-10 bg-white p-8 rounded-2xl shadow-xl w-96 border border-slate-100 relative">
        <h1 className="text-2xl font-black text-slate-800 text-center mb-2 tracking-tight">Finance<span className="text-blue-600">Hub</span></h1>
        <p className="text-sm text-slate-500 text-center mb-8">Entre ou crie sua conta para continuar</p>
        
        <form className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase">Email</label>
            <input name="email" type="email" placeholder="seu@email.com" required className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-600 uppercase">Senha</label>
            <input name="password" type="password" placeholder="••••••••" required className="w-full mt-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" />
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <button formAction={login} className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-md hover:shadow-lg">Acessar</button>
            <button formAction={signup} className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg transition-colors">Criar Conta</button>
          </div>
        </form>
      </div>
      {/* Background Decor */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[800px] h-[800px] bg-blue-500/10 blur-[120px] rounded-full point-events-none"></div>
      <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[600px] h-[600px] bg-emerald-500/10 blur-[100px] rounded-full point-events-none"></div>
    </div>
  );
}
