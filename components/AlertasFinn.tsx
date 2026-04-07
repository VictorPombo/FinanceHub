"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TrendingUp, AlertTriangle, BatteryWarning, Target, CheckCircle2, ChevronRight, Coins } from "lucide-react";

interface AlertaFinn {
  id: string;
  tipo_alerta: string;
  titulo: string;
  descricao: string;
  valor_sugerido: number | null;
  acao_tomada: boolean;
}

export default function AlertasFinn({ userId }: { userId: string }) {
  const [alertas, setAlertas] = useState<AlertaFinn[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!userId) return;
    const fetchAlertas = async () => {
      const { data, error } = await supabase
        .from("finn_insights")
        .select("*")
        .eq("user_id", userId)
        .eq("acao_tomada", false)
        .order("gerado_em", { ascending: false })
        .limit(3);

      if (!error && data) {
        // Ordenar por prioridade: verde (folga) > vermelho (critico/acelerado) > amarelo (concentracao/evolucao)
        const sorted = data.sort((a, b) => {
           const getPriority = (tipo: string) => {
              if (tipo === 'folga') return 3;
              if (tipo === 'critico' || tipo === 'acelerado') return 2;
              return 1;
           };
           return getPriority(b.tipo_alerta) - getPriority(a.tipo_alerta);
        });
        setAlertas(sorted);
      }
      setLoading(false);
    };

    fetchAlertas();
  }, [userId, supabase]);

  const handleMarcarResolvido = async (id: string) => {
     setAlertas(prev => prev.filter(x => x.id !== id));
     await supabase.from("finn_insights").update({ acao_tomada: true }).eq("id", id);
  };

  if (loading || alertas.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 mb-6">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
          <Target className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <h2 className="text-sm font-black text-zinc-200 tracking-tight">Finn <span className="text-indigo-400">Insights</span></h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {alertas.map((alerta) => {
          let borderColor = "border-zinc-800";
          let bgGradient = "from-zinc-900 to-zinc-900/80";
          let icon = <AlertTriangle className="w-5 h-5 text-zinc-400" />;
          let textColor = "text-zinc-400";
          
          if (alerta.tipo_alerta === 'folga') {
            borderColor = "border-emerald-500/30";
            bgGradient = "from-emerald-950/30 to-zinc-900";
            icon = <Coins className="w-5 h-5 text-emerald-400" />;
            textColor = "text-emerald-400";
          } else if (alerta.tipo_alerta === 'critico' || alerta.tipo_alerta === 'acelerado') {
            borderColor = "border-rose-500/30";
            bgGradient = "from-rose-950/30 to-zinc-900";
            icon = <BatteryWarning className="w-5 h-5 text-rose-400" />;
            textColor = "text-rose-400";
          } else {
            borderColor = "border-amber-500/30";
            bgGradient = "from-amber-950/30 to-zinc-900";
            icon = <TrendingUp className="w-5 h-5 text-amber-400" />;
            textColor = "text-amber-400";
          }

          return (
            <div key={alerta.id} className={`p-4 rounded-xl border ${borderColor} bg-gradient-to-br ${bgGradient} flex flex-col justify-between shadow-lg relative overflow-hidden group`}>
               <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg bg-zinc-900/50 border ${borderColor} shrink-0`}>
                     {icon}
                  </div>
                  <div>
                    <h3 className={`font-black text-xs uppercase tracking-wider mb-1 ${textColor}`}>{alerta.titulo}</h3>
                    <p className="text-xs text-zinc-300 font-medium leading-relaxed mb-4">{alerta.descricao}</p>
                  </div>
               </div>
               
               <div className="flex items-center justify-between mt-auto pt-2 border-t border-zinc-800/60">
                 {alerta.valor_sugerido ? (
                   <span className="text-sm font-mono font-black text-emerald-400">R$ {alerta.valor_sugerido}</span>
                 ) : (
                   <span className="text-xs text-zinc-500 italic">Análise diária</span>
                 )}
                 <button 
                  onClick={() => handleMarcarResolvido(alerta.id)}
                  className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-400 hover:text-white font-bold transition-colors">
                    Entendido <CheckCircle2 className="w-3 h-3" />
                 </button>
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
