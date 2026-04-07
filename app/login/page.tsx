"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus, Loader2, Sparkles } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
      } else {
        router.push("/dashboard/resumo");
        router.refresh();
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else {
        if (data.session) {
          router.push("/dashboard/resumo");
          router.refresh();
        } else {
          setSuccess("Conta criada! Verifique seu email ou faça login.");
          setIsLogin(true);
        }
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#09090b]">
      {/* Background effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-[120px]"></div>
        <div className="absolute top-[20%] left-[30%] w-[300px] h-[300px] bg-indigo-600/6 rounded-full blur-[100px]"></div>
      </div>

      <div className="bg-zinc-900/60 backdrop-blur-2xl border border-zinc-800/60 rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.7)] p-8 md:p-10 w-full max-w-md relative z-10 animate-fade-in">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex items-center justify-center bg-gradient-to-br from-violet-600/25 to-violet-800/15 w-11 h-11 rounded-2xl border border-violet-500/20 shadow-[0_0_20px_rgba(124,58,237,0.2)]">
              <span className="text-xl">💳</span>
            </div>
          </div>
          <h1 className="text-3xl font-black text-zinc-50 mb-1 font-sans lowercase flex items-center justify-center gap-1.5">
             finance<span className="text-violet-400 px-2 py-0.5 rounded-lg bg-violet-950/40 border border-violet-800/40 text-xl font-extrabold">hub</span>
          </h1>
          <p className="text-zinc-500 text-sm mt-3 flex items-center justify-center gap-1.5 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-violet-400/60" />
            Gestão Financeira Inteligente
          </p>
        </div>

        <div className="flex mb-6 bg-zinc-900/80 border border-zinc-800/60 rounded-xl p-1">
          <button
            onClick={() => { setIsLogin(true); setError(""); setSuccess(""); }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
              isLogin ? "bg-violet-600/15 text-violet-400 border border-violet-500/25 shadow-[0_0_12px_rgba(124,58,237,0.15)]" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <LogIn className="inline w-4 h-4 mr-1.5" /> Entrar
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(""); setSuccess(""); }}
            className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200 ${
              !isLogin ? "bg-violet-600/15 text-violet-400 border border-violet-500/25 shadow-[0_0_12px_rgba(124,58,237,0.15)]" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <UserPlus className="inline w-4 h-4 mr-1.5" /> Cadastrar
          </button>
        </div>

        {error && (
          <div className="bg-red-950/30 border border-red-900/40 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm font-medium">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-950/30 border border-emerald-900/40 text-emerald-400 px-4 py-3 rounded-xl mb-4 text-sm font-medium">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-900/60 border border-zinc-800/60 text-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 text-sm transition-all placeholder:text-zinc-600"
              placeholder="seu@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-500 mb-1.5 uppercase tracking-wider">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-900/60 border border-zinc-800/60 text-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50 text-sm transition-all placeholder:text-zinc-600"
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 px-4 rounded-xl hover:from-violet-500 hover:to-indigo-500 shadow-[0_4px_24px_rgba(124,58,237,0.35)] hover:shadow-[0_8px_32px_rgba(124,58,237,0.5)] transition-all duration-300 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isLogin ? (
              <><LogIn className="w-4 h-4" /> Entrar</>
            ) : (
              <><UserPlus className="w-4 h-4" /> Criar Conta</>
            )}
          </button>
        </form>

        <p className="text-center text-[10px] text-zinc-700 mt-6 font-mono uppercase tracking-widest">
          AI Powered • Supabase Edge
        </p>
      </div>
    </div>
  );
}
