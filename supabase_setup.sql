-- Habilitar a extensão UUID (geralmente habilitado por padrão)
create extension if not exists "uuid-ossp";

-- ==========================================
-- 1. Tabela de Lançamentos
-- ==========================================
create table if not exists public.lancamentos (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users not null,
    data date not null,
    descricao text not null,
    categoria text not null,
    tipo text not null check (tipo in ('Entrada', 'Saída')),
    recorrencia text not null,
    parcela text,
    valor numeric not null,
    status text not null,
    observacoes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Segurança (RLS) para Lançamentos
alter table public.lancamentos enable row level security;
create policy "Usuários podem ver seus próprios lançamentos" on public.lancamentos for select using (auth.uid() = user_id);
create policy "Usuários podem inserir seus próprios lançamentos" on public.lancamentos for insert with check (auth.uid() = user_id);
create policy "Usuários podem atualizar seus próprios lançamentos" on public.lancamentos for update using (auth.uid() = user_id);
create policy "Usuários podem excluir seus próprios lançamentos" on public.lancamentos for delete using (auth.uid() = user_id);


-- ==========================================
-- 2. Tabela de Dívidas (Receber de terceiros)
-- ==========================================
create table if not exists public.dividas (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users not null,
    devedor text not null,
    valor_total numeric not null default 0,
    num_parcelas integer not null default 1,
    valor_parcela numeric not null default 0,
    total_recebido numeric not null default 0,
    previsao_final text not null,
    status text not null check (status in ('Em andamento', 'Quitado', 'Atrasado')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Segurança (RLS) para Dívidas
alter table public.dividas enable row level security;
create policy "Usuários podem ver suas próprias dívidas" on public.dividas for select using (auth.uid() = user_id);
create policy "Usuários podem inserir suas próprias dívidas" on public.dividas for insert with check (auth.uid() = user_id);
create policy "Usuários podem atualizar suas próprias dívidas" on public.dividas for update using (auth.uid() = user_id);
create policy "Usuários podem excluir suas próprias dívidas" on public.dividas for delete using (auth.uid() = user_id);


-- ==========================================
-- 3. Tabela de Configurações (Saldo Inicial)
-- ==========================================
create table if not exists public.configuracoes (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users not null,
    saldo_inicial numeric not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(user_id)
);

-- Segurança (RLS) para Configurações
alter table public.configuracoes enable row level security;
create policy "Usuários podem ver suas configurações" on public.configuracoes for select using (auth.uid() = user_id);
create policy "Usuários podem inserir suas configurações" on public.configuracoes for insert with check (auth.uid() = user_id);
create policy "Usuários podem atualizar suas configurações" on public.configuracoes for update using (auth.uid() = user_id);
