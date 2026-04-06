export type Lancamento = {
  id: string;
  user_id: string;
  data: string;
  descricao: string;
  categoria: string;
  tipo: "Entrada" | "Saída";
  recorrencia: "Recorrente" | "Única" | "Parcelado";
  parcela: string | null;
  valor: number;
  status: "Confirmado" | "Previsto" | "Cancelado";
  observacoes: string | null;
  created_at: string;
};

export type Divida = {
  id: string;
  user_id: string;
  devedor: string;
  valor_total: number;
  num_parcelas: number | null;
  valor_parcela: number | null;
  total_recebido: number;
  previsao_final: string | null;
  status: "Em andamento" | "Quitado" | "Atrasado";
  created_at: string;
};

export type Configuracao = {
  id: string;
  user_id: string;
  saldo_inicial: number;
  created_at: string;
};

export const CATEGORIAS = [
  "Recebimento",
  "Moradia",
  "Alimentação",
  "Serviços",
  "Transporte",
  "Saúde",
  "Educação",
  "Lazer",
  "Dívida",
  "Investimento",
  "Outros",
];

export const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril",
  "Maio", "Junho", "Julho", "Agosto",
  "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function getMesAno(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${MESES_PT[d.getMonth()]}/${d.getFullYear()}`;
}

export function getMesAnoKey(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
