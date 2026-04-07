"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogIn, UserPlus, Loader2 } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#020617]">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-[#020617] to-[#020617]"></div>
      <div className="bg-[#0B1121]/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-[0_0_50px_rgba(147,51,234,0.1)] p-8 w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-100 mb-2 font-sans lowercase flex items-center justify-center gap-1">
             💳 finance<span className="text-purple-500 px-1.5 pt-1 rounded bg-purple-950/50 border border-purple-900/50 text-xl shadow-[0_0_10px_rgba(147,51,234,0.3)]">hub</span>
          </h1>
          <p className="text-slate-400 text-sm mt-3">Sistema Financeiro de Alta Performance</p>
        </div>

        <div className="flex mb-6 bg-slate-900/80 border border-slate-800 rounded-lg p-1">
          <button
            onClick={() => { setIsLogin(true); setError(""); setSuccess(""); }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              isLogin ? "bg-purple-600/20 shadow-[0_0_10px_rgba(168,85,247,0.3)] text-purple-400 border border-purple-500/30" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <LogIn className="inline w-4 h-4 mr-1" /> Entrar
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(""); setSuccess(""); }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              !isLogin ? "bg-purple-600/20 shadow-[0_0_10px_rgba(168,85,247,0.3)] text-purple-400 border border-purple-500/30" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <UserPlus className="inline w-4 h-4 mr-1" /> Cadastrar
          </button>
        </div>

        {error && (
          <div className="bg-red-950/40 border border-red-900/50 text-red-400 px-4 py-3 rounded mb-4 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 px-4 py-3 rounded mb-4 text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800 text-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm transition-all"
              placeholder="seu@email.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-800 text-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 text-sm transition-all"
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-2.5 px-4 rounded-md hover:bg-purple-500 shadow-[0_0_15px_rgba(147,51,234,0.4)] hover:shadow-[0_0_25px_rgba(147,51,234,0.6)] transition-all font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
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

        <p className="text-center text-xs text-slate-600 mt-6 font-mono">
          AI Powered • Supabase Edge
        </p>
      </div>
    </div>
  );
}
