import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ResumoMensalClient from "@/components/ResumoMensalClient";
import { getMesAnoKey, getMesAno } from "@/lib/types";

export default async function ResumoMensalPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const activeUser = user;
  if (!activeUser) redirect("/");

  // Fetch Configuracoes (Saldo Inicial)
  const { data: configRows } = await supabase
    .from("configuracoes")
    .select("*")
    .eq("user_id", activeUser.id)
    .single();

  const saldoInicial = configRows?.saldo_inicial || 0;

  // Fetch Lancamentos Confirmados only for the Summary
  const { data: lancamentos } = await supabase
    .from("lancamentos")
    .select("data, tipo, valor, status")
    .eq("user_id", activeUser.id)
    .eq("status", "Pago")
    .order("data", { ascending: true });

  // Group by "YYYY-MM"
  const grouped: Record<string, { entradas: number; saidas: number }> = {};
  
  if (lancamentos) {
    lancamentos.forEach((l) => {
      const mesKey = getMesAnoKey(l.data);
      if (!grouped[mesKey]) {
        grouped[mesKey] = { entradas: 0, saidas: 0 };
      }
      if (l.tipo === "Entrada") {
        grouped[mesKey].entradas += Number(l.valor);
      } else {
        // Saídas are negative in DB, we'll store positive here for the table logic 
        // OR wait, we can store negative and take Math.abs or whatever is easier for ResumoMensalClient. 
        // The ResumoMensalClient logic expects `saidas` to be positive and subtracts/adds visually. Let's make it Math.abs 
        grouped[mesKey].saidas += Math.abs(Number(l.valor));
      }
    });
  }

  // Calculate Acumulado chronologically
  const mesesOrdenados = Object.keys(grouped).sort();
  const dataList: any[] = [];
  
  let currentAcumulado = Number(saldoInicial);

  mesesOrdenados.forEach((mesKey) => {
    const { entradas, saidas } = grouped[mesKey];
    const sobra = entradas - saidas;
    currentAcumulado += sobra;

    const comprometimento = entradas > 0 ? (saidas / entradas) * 100 : 0;

    dataList.push({
      mes: getMesAno(mesKey + "-01"),
      entradas,
      saidas,
      sobra,
      acumulado: currentAcumulado,
      comprometimento,
    });
  });

  return (
    <ResumoMensalClient 
      data={dataList} 
      config={configRows || null}
      user_id={activeUser.id} 
    />
  );
}
