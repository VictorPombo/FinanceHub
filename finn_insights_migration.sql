-- Migration para a tabela finn_insights (Consultor IA Inteligente)

CREATE TABLE IF NOT EXISTS public.finn_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo_alerta TEXT NOT NULL, -- 'folga', 'critico', 'acelerado', 'concentracao', 'evolucao'
    mes_referencia TEXT NOT NULL, -- formato 'YYYY-MM'
    valor_sugerido NUMERIC,
    acao_tomada BOOLEAN DEFAULT FALSE,
    titulo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    gerado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE public.finn_insights ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Usuários podem ver seus próprios insights"
    ON public.finn_insights FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios insights"
    ON public.finn_insights FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios insights"
    ON public.finn_insights FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios insights"
    ON public.finn_insights FOR DELETE
    USING (auth.uid() = user_id);
