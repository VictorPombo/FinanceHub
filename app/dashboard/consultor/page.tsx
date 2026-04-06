import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatCurrency, getMesAnoKey } from "@/lib/types";
import { 
  PiggyBank, ArrowDownWideNarrow, TrendingUp, AlertTriangle, 
  ShoppingCart, ShieldAlert, Award
} from "lucide-react";

export default async function ConsultorPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const activeUser = user;
  if (!activeUser) redirect("/");

  // Fetch Lancamentos, Dividas and Configuracoes
  const [
    { data: lancamentos },
    { data: dividas },
    { data: config }
  ] = await Promise.all([
    supabase.from("lancamentos").select("*").eq("user_id", activeUser.id).eq("status", "Confirmado"),
    supabase.from("dividas").select("*").eq("user_id", activeUser.id),
    supabase.from("configuracoes").select("saldo_inicial").eq("user_id", activeUser.id).single()
  ]);

  const l = lancamentos || [];
  const d = dividas || [];
  const saldo_inicial = config?.saldo_inicial || 0;

  // Calculos de datas
  const dataAtual = new Date();
  const dataPrevia = new Date(dataAtual);
  dataPrevia.setMonth(dataPrevia.getMonth() - 1);
  
  const currentMesKey = getMesAnoKey(dataAtual.toISOString());
  const prevMesKey = getMesAnoKey(dataPrevia.toISOString());

  // === DADOS MÊS ATUAL ===
  const lancAtual = l.filter(x => getMesAnoKey(x.data) === currentMesKey);
  const entradasAtual = lancAtual.filter(x => x.tipo === 'Entrada').reduce((a,b) => a + Number(b.valor), 0);
  const saidasAtual = Math.abs(lancAtual.filter(x => x.tipo === 'Saída').reduce((a,b) => a + Number(b.valor), 0));
  const sobraAtual = entradasAtual - saidasAtual;
  const percComprometida = entradasAtual > 0 ? (saidasAtual / entradasAtual) * 100 : 0;
  
  const maiorGasto = lancAtual.filter(x => x.tipo === 'Saída').sort((a,b) => Math.abs(Number(b.valor)) - Math.abs(Number(a.valor)))[0] || null;
  const rendaExtraCount = lancAtual.filter(x => x.tipo === 'Entrada' && x.recorrencia === 'Única').reduce((a,b) => a + Number(b.valor), 0);
  const gastosUnicosMesCount = lancAtual.filter(x => x.tipo === 'Saída' && x.recorrencia === 'Única').length;

  // === DADOS MÊS ANTERIOR ===
  const lancPrev = l.filter(x => getMesAnoKey(x.data) === prevMesKey);
  const entradasPrev = lancPrev.filter(x => x.tipo === 'Entrada').reduce((a,b) => a + Number(b.valor), 0);
  const saidasPrev = Math.abs(lancPrev.filter(x => x.tipo === 'Saída').reduce((a,b) => a + Number(b.valor), 0));
  const sobraPrev = entradasPrev - saidasPrev;

  // Acumulados (Total da conta considerando saldo inicial)
  const totalEntradasAll = l.filter(x => x.tipo === 'Entrada').reduce((a,b) => a + Number(b.valor), 0);
  const totalSaidasAll = Math.abs(l.filter(x => x.tipo === 'Saída').reduce((a,b) => a + Number(b.valor), 0));
  const acumuladoGeral = Number(saldo_inicial) + totalEntradasAll - totalSaidasAll;

  // Gastos com Alimentação mês atual
  const gastosAli = Math.abs(lancAtual.filter(x => x.categoria === 'Alimentação').reduce((a,b) => a + Number(b.valor), 0));
  const percAlimentacao = entradasAtual > 0 ? (gastosAli / entradasAtual) * 100 : 0;

  // Gastos Fixos
  const gastosFixos = Math.abs(lancAtual.filter(x => x.tipo === 'Saída' && x.recorrencia === 'Recorrente').reduce((a,b) => a + Number(b.valor), 0));
  const percGastosFixos = entradasAtual > 0 ? (gastosFixos / entradasAtual) * 100 : 0;

  // Projeção: we need to fetch "Previsto" lancamentos
  const { data: lancPrevistos } = await supabase.from("lancamentos").select("*").eq("user_id", activeUser.id).eq("status", "Previsto");
  const lancPrevAtual = (lancPrevistos || []).filter(x => getMesAnoKey(x.data) === currentMesKey);
  const entPrevAtual = lancPrevAtual.filter(x => x.tipo === 'Entrada').reduce((a,b) => a + Number(b.valor), 0);
  const saiPrevAtual = Math.abs(lancPrevAtual.filter(x => x.tipo === 'Saída').reduce((a,b) => a + Number(b.valor), 0));
  const projecaoFinal = sobraAtual + entPrevAtual - saiPrevAtual;

  // === REGRAS DO TERMÔMETRO ===
  let score = 0;
  if (percComprometida < 50) score += 25;
  else if (percComprometida <= 70) score += 15;
  
  if (sobraAtual > sobraPrev) score += 20;
  if (rendaExtraCount > 0) score += 15;
  if (gastosUnicosMesCount <= 2) score += 15;

  const atrasados = d.filter(dl => dl.status === 'Atrasado');
  if (atrasados.length === 0) score += 25;

  let classifText = "", classifColor = "", barraProgresso = "";
  if (score >= 80) { classifText = "🏆 EXCELENTE"; classifColor = "text-green-600"; barraProgresso = "bg-green-500"; }
  else if (score >= 60) { classifText = "✅ BOM"; classifColor = "text-blue-600"; barraProgresso = "bg-blue-500"; }
  else if (score >= 40) { classifText = "⚠️ REGULAR"; classifColor = "text-yellow-500"; barraProgresso = "bg-yellow-400"; }
  else { classifText = "🚨 CRÍTICO"; classifColor = "text-red-600"; barraProgresso = "bg-red-500"; }


  // === REGRAS DOS CONSELHOS ===
  const conselhos = [];
  
  // 1. Reserva
  const mediaSaidasTrilhas = saidasAtual; // simplification, assuming last month
  const vezesReserva = mediaSaidasTrilhas > 0 ? (acumuladoGeral / mediaSaidasTrilhas) : 0;
  if (vezesReserva < 3) {
    conselhos.push({ title: "Reserva de Emergência", desc: "Seu capital cobre menos de 3 meses do seu custo. Considere cortar gastos não essenciais.", color: "border-red-500", icon: <ShieldAlert className="w-5 text-red-500"/> });
  } else if (vezesReserva <= 6) {
    conselhos.push({ title: "Reserva em Construção", desc: "Você já consegue se manter alguns meses. Continue economizando.", color: "border-yellow-500", icon: <ShieldAlert className="w-5 text-yellow-500"/> });
  } else {
    conselhos.push({ title: "Reserva Saudável", desc: "Você já tem uma boa reserva. Sugerimos buscar investimentos estruturados com o capital extra.", color: "border-green-500", icon: <ShieldAlert className="w-5 text-green-500"/> });
  }

  // 2. Gastos Fixos
  if (percGastosFixos > 70) {
    conselhos.push({ title: "Gastos Fixos", desc: "Seus custos com contratos recorrentes está acima de 70% da renda. Momento de revisar faturas.", color: "border-red-500", icon: <ArrowDownWideNarrow className="w-5 text-red-500"/> });
  } else if (percGastosFixos >= 50) {
    conselhos.push({ title: "Gastos Fixos", desc: "Cuidado, seus custos limitam bastante sua margem. Tente ajustar um grande gasto por mês.", color: "border-yellow-500", icon: <ArrowDownWideNarrow className="w-5 text-yellow-500"/> });
  } else {
    conselhos.push({ title: "Gastos Fixos", desc: "Parabéns! Seus custos engessados estão controlados, ótimo para o futuro.", color: "border-green-500", icon: <ArrowDownWideNarrow className="w-5 text-green-500"/> });
  }

  // 3. Tendencia
  if (sobraAtual > (sobraPrev * 1.05)) { // Melhora
      conselhos.push({ title: "Tendência", desc: "Seu mês superou o controle do mês passado. Mantenha o fluxo de economia.", color: "border-green-500", icon: <TrendingUp className="w-5 text-green-500"/> });
  } else if (sobraAtual >= (sobraPrev * 0.95)) { // Igual
      conselhos.push({ title: "Tendência", desc: "Estabilidade de gastos em relação ao mês anterior. O que acha de cortar pelo menos 5%?", color: "border-blue-500", icon: <TrendingUp className="w-5 text-blue-500"/> });
  } else {
      conselhos.push({ title: "Tendência", desc: "O saldo final está decrescente frente ao último histórico. Revise as novidades na fatura.", color: "border-red-500", icon: <TrendingUp className="w-5 text-red-500"/> });
  }

  // 4. Dívidas
  const dividasAndamento = d.filter(x => x.status === "Em andamento");
  if (dividasAndamento.length > 0) {
      conselhos.push({ title: "Créditos Pessoais (Dívidas)", desc: `Existem ${dividasAndamento.length} dívida(s) ativas com você. Evite contar com esses valores na sua renda até receber efetivamente na conta.`, color: "border-yellow-500", icon: <AlertTriangle className="w-5 text-yellow-500"/> });
  } else {
      conselhos.push({ title: "Créditos Pessoais", desc: "Nenhum atraso contabilizado com parceiros ou amigos. Receita limpa.", color: "border-green-500", icon: <AlertTriangle className="w-5 text-green-500"/> });
  }

  // 5. Gastos unicos
  if (gastosUnicosMesCount > 2) {
      conselhos.push({ title: "Gastos de Impulso", desc: `Com ${gastosUnicosMesCount} saídas pontuais neste mês, é vital reavaliar se foram compras de planejamento ou por impulso.`, color: "border-red-500", icon: <ShoppingCart className="w-5 text-red-500"/> });
  } else {
      conselhos.push({ title: "Planejamento Mês a Mês", desc: "Excelente controle frente a gastos supérfluos isolados. Você tem um controle maduro do cartão.", color: "border-green-500", icon: <ShoppingCart className="w-5 text-green-500"/> });
  }

  // 6. Food
  if (percAlimentacao > 20) {
      conselhos.push({ title: "Consumo de Alimentação", desc: "Seus custos com comida e ifood excederam absurdamente 20% do faturamento. Cozinhe em casa.", color: "border-red-500", icon: <PiggyBank className="w-5 text-red-500"/> });
  } else {
      conselhos.push({ title: "Consumo de Alimentação", desc: "Custos logísticos com alimentação dentro das balizas de saúde econômica (abaixo de 20%).", color: "border-green-500", icon: <PiggyBank className="w-5 text-green-500"/> });
  }


  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] overflow-y-auto w-full">
      <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] p-6 w-full shrink-0 border-b border-[#3B82F6]/30 shadow-lg relative z-20">
        <h1 className="text-white font-extrabold text-2xl flex items-center gap-3 tracking-wide uppercase">
          🤖 Consultor de Telemetria Financeira
        </h1>
        <p className="text-blue-100/60 text-sm mt-1 font-medium tracking-wide">Análise estrita baseada em regras cognitivas em tempo real</p>
      </div>

      <div className="p-8 flex flex-col xl:flex-row gap-8 mx-auto w-full max-w-7xl">
        
        <div className="flex-1 flex flex-col gap-6">
          {/* Cards Diagnostico */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Card 1 */}
            <div className={`glass-card p-6 border-l-[6px] ${sobraAtual >= 0 ? 'border-l-emerald-500' : 'border-l-rose-500'} flex flex-col hover:shadow-premium-hover transition-all duration-300`}>
               <h3 className="text-xs text-slate-500 font-bold tracking-widest uppercase mb-2">📊 Situação do Mês</h3>
               <span className={`text-3xl font-black font-mono tracking-tight ${sobraAtual >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                 {formatCurrency(sobraAtual)}
               </span>
            </div>

            {/* Card 2 */}
            <div className={`glass-card p-6 border-l-[6px] 
                ${percComprometida < 50 ? 'border-l-emerald-500' : percComprometida <= 70 ? 'border-l-amber-500' : 'border-l-rose-500'} hover:shadow-premium-hover transition-all duration-300`}>
               <h3 className="text-xs text-slate-500 font-bold tracking-widest uppercase mb-2">📌 Renda Comprometida</h3>
               <span className="text-3xl font-black font-mono tracking-tight text-slate-800">{percComprometida.toFixed(1)}%</span>
               <p className="text-xs text-slate-500 mt-2 font-semibold bg-slate-100 py-1 px-2 rounded w-fit">
                 {percComprometida < 50 && "🟢 Saudável"}
                 {percComprometida >= 50 && percComprometida <= 70 && "🟡 Atenção"}
                 {percComprometida > 70 && percComprometida < 90 && "🔴 Alerta"}
                 {percComprometida >= 90 && "🚨 Crítico"}
               </p>
            </div>

            {/* Card 3 */}
            <div className={`glass-card p-6 border-l-[6px] border-l-blue-500 flex flex-col justify-between hover:shadow-premium-hover transition-all duration-300`}>
               <h3 className="text-xs text-slate-500 font-bold tracking-widest uppercase mb-2">💸 Maior Saída</h3>
               {maiorGasto ? (
                 <>
                  <span className="text-xl font-bold font-sans text-slate-800 truncate mb-1">{maiorGasto.descricao}</span>
                  <span className="text-red-500 font-mono font-black tracking-tight text-lg">{formatCurrency(Math.abs(Number(maiorGasto.valor)))}</span>
                 </>
               ) : <span className="text-slate-400 italic text-sm">Sem registros</span>}
            </div>

            {/* Card 4 */}
            <div className="glass-card p-6 border-l-[6px] border-l-purple-500 hover:shadow-premium-hover transition-all duration-300">
               <h3 className="text-xs text-slate-500 font-bold tracking-widest uppercase mb-2">💡 Renda Adicional</h3>
               <span className="text-3xl font-black font-mono tracking-tight text-purple-600">{formatCurrency(rendaExtraCount)}</span>
               <p className="text-xs text-slate-500 mt-2 font-medium">{rendaExtraCount > 0 ? "Aproveite para investir" : "Apenas recorrente"}</p>
            </div>

            {/* Card 5 */}
            <div className="glass-card p-6 border-l-[6px] border-l-indigo-500 hover:shadow-premium-hover transition-all duration-300">
               <h3 className="text-xs text-slate-500 font-bold tracking-widest uppercase mb-2">📈 Evolução Histórica</h3>
               <span className="text-lg font-black font-sans text-slate-800 leading-tight block mt-1">
                 {(sobraAtual - sobraPrev) > 0 ? `Melhora de ${formatCurrency(sobraAtual - sobraPrev)}` : `Queda de ${formatCurrency(Math.abs(sobraAtual - sobraPrev))}`}
               </span>
               <span className="text-xs text-slate-400 mt-1 block">vs mês anterior</span>
            </div>

            {/* Card 6 */}
            <div className="glass-card p-6 border-l-[6px] border-l-teal-500 hover:shadow-premium-hover transition-all duration-300">
               <h3 className="text-xs text-slate-500 font-bold tracking-widest uppercase mb-2">🔮 Fechamento Previsto</h3>
               <span className="text-2xl font-black font-mono tracking-tight text-slate-800 px-1 truncate block mb-1">{formatCurrency(projecaoFinal)}</span>
               <p className="text-xs text-slate-500 font-medium">{projecaoFinal > 0 ? "O mês terminará no azul" : "Atenção máxima."}</p>
            </div>
            
          </div>

          {/* Conselhos */}
          <div className="mt-4">
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-5 py-3 rounded-t-xl border-b border-indigo-500/30">
              <h2 className="text-white font-extrabold text-xs uppercase tracking-widest">💡 Avaliação de Riscos</h2>
            </div>
            <div className="flex flex-col gap-4 mt-5">
              {conselhos.map((c, i) => (
                <div key={i} className={`glass-card p-5 border-l-[6px] ${c.color} flex items-start gap-4 hover:-translate-y-1 transition-transform duration-300`}>
                  <div className="p-3 bg-slate-50 rounded-xl shadow-inner mt-1">{c.icon}</div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm mb-1 uppercase tracking-wide">{c.title}</h4>
                    <p className="text-slate-600 text-sm leading-relaxed">{c.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column - Termometro */}
        <div className="w-full xl:w-96 flex flex-col gap-6 shrink-0">
          <div className="glass-card p-8 flex flex-col items-center justify-center text-center sticky top-6 border border-slate-200">
            <Award className={`w-28 h-28 ${classifColor} mb-2 opacity-[0.08] absolute top-8 right-8`} />
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Termômetro</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-8">Score Financeiro (0-100)</p>
            
            <div className={`text-7xl font-black font-mono mb-4 tracking-tighter ${classifColor} drop-shadow-md`}>
              {score}
            </div>
            
            <div className={`text-2xl font-black mb-10 ${classifColor} tracking-widest uppercase`}>
              {classifText}
            </div>

            <div className="w-full bg-slate-100 rounded-full h-5 relative overflow-hidden shadow-inner border border-slate-200">
              <div className={`h-full rounded-full transition-all duration-1000 ease-out ${barraProgresso} shadow-md`} style={{ width: `${score}%` }}></div>
            </div>
            <div className="w-full flex justify-between text-[11px] uppercase font-bold text-slate-400 mt-3 tracking-wider">
              <span>Crítico</span>
              <span>Excelente</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
