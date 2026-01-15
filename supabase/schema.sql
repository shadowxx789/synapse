-- Supabase schema for Synapse (同频)
-- Run in Supabase SQL Editor

create extension if not exists "pgcrypto";

-- ============================================================================
-- Profiles (app user metadata)
-- ============================================================================
create table if not exists public.profiles (
    id uuid references auth.users(id) on delete cascade primary key,
    email text not null,
    name text not null,
    role text check (role in ('executor', 'supporter')),
    partner_id uuid references public.profiles(id),
    pairing_code text,
    pairing_code_expires_at timestamptz,
    couple_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles read own" on public.profiles
    for select using (auth.uid() = id);

create policy "Profiles update own" on public.profiles
    for update using (auth.uid() = id);

create policy "Profiles insert own" on public.profiles
    for insert with check (auth.uid() = id);

-- ============================================================================
-- Couples
-- ============================================================================
create table if not exists public.couples (
    id text primary key,
    executor_id uuid references public.profiles(id) not null,
    supporter_id uuid references public.profiles(id) not null,
    encryption_key_hash text not null default '',
    status text not null default 'active' check (status in ('active', 'disconnected')),
    created_at timestamptz not null default now()
);

alter table public.couples enable row level security;

create policy "Couples members read" on public.couples
    for select using (auth.uid() = executor_id or auth.uid() = supporter_id);

create policy "Couples members update" on public.couples
    for update using (auth.uid() = executor_id or auth.uid() = supporter_id);

create policy "Couples members insert" on public.couples
    for insert with check (auth.uid() = executor_id or auth.uid() = supporter_id);

-- ============================================================================
-- Tasks (parent-child for subtasks)
-- ============================================================================
create table if not exists public.tasks (
    id uuid primary key default gen_random_uuid(),
    parent_task_id uuid references public.tasks(id) on delete cascade,
    title text not null,
    description text,
    creator_id uuid references public.profiles(id) not null,
    executor_id uuid references public.profiles(id) not null,
    visual_timer_minutes integer not null default 5,
    status text not null default 'pending' check (status in ('pending', 'doing', 'done')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    completed_at timestamptz
);

create index if not exists idx_tasks_executor on public.tasks(executor_id);
create index if not exists idx_tasks_parent on public.tasks(parent_task_id);

alter table public.tasks enable row level security;

create policy "Tasks read for creator or executor" on public.tasks
    for select using (auth.uid() = creator_id or auth.uid() = executor_id);

create policy "Tasks insert for authenticated" on public.tasks
    for insert with check (auth.uid() = creator_id or auth.uid() = executor_id);

create policy "Tasks update for creator or executor" on public.tasks
    for update using (auth.uid() = creator_id or auth.uid() = executor_id);

create policy "Tasks delete for creator or executor" on public.tasks
    for delete using (auth.uid() = creator_id or auth.uid() = executor_id);

-- ============================================================================
-- Messages (encrypted)
-- ============================================================================
create table if not exists public.messages (
    id uuid primary key default gen_random_uuid(),
    couple_id text references public.couples(id) not null,
    sender_id uuid references public.profiles(id) not null,
    type text not null check (type in (
        'text', 'task_request', 'task_update', 'energy_boost',
        'energy_request', 'mood_share', 'system'
    )),
    encrypted_content text not null,
    iv text not null,
    metadata jsonb,
    created_at timestamptz not null default now(),
    read_at timestamptz,
    read_by uuid references public.profiles(id)
);

create index if not exists idx_messages_couple on public.messages(couple_id);

alter table public.messages enable row level security;

create policy "Messages read for couple" on public.messages
    for select using (
        exists (
            select 1 from public.couples
            where id = couple_id
              and (executor_id = auth.uid() or supporter_id = auth.uid())
        )
    );

create policy "Messages insert for couple" on public.messages
    for insert with check (
        exists (
            select 1 from public.couples
            where id = couple_id
              and (executor_id = auth.uid() or supporter_id = auth.uid())
        )
    );

create policy "Messages update for couple" on public.messages
    for update using (
        exists (
            select 1 from public.couples
            where id = couple_id
              and (executor_id = auth.uid() or supporter_id = auth.uid())
        )
    );

create policy "Messages delete for couple" on public.messages
    for delete using (
        exists (
            select 1 from public.couples
            where id = couple_id
              and (executor_id = auth.uid() or supporter_id = auth.uid())
        )
    );

-- ============================================================================
-- Energy actions
-- ============================================================================
create table if not exists public.energy_actions (
    id uuid primary key default gen_random_uuid(),
    couple_id text references public.couples(id) not null,
    user_id uuid references public.profiles(id) not null,
    action_type text not null,
    points integer not null,
    description text,
    timestamp timestamptz not null default now()
);

create index if not exists idx_energy_couple on public.energy_actions(couple_id);

alter table public.energy_actions enable row level security;

create policy "Energy actions read for couple" on public.energy_actions
    for select using (
        exists (
            select 1 from public.couples
            where id = couple_id
              and (executor_id = auth.uid() or supporter_id = auth.uid())
        )
    );

create policy "Energy actions insert for couple" on public.energy_actions
    for insert with check (
        exists (
            select 1 from public.couples
            where id = couple_id
              and (executor_id = auth.uid() or supporter_id = auth.uid())
        )
    );

-- ============================================================================
-- Rewards
-- ============================================================================
create table if not exists public.rewards (
    id uuid primary key default gen_random_uuid(),
    couple_id text references public.couples(id) not null,
    title text not null,
    description text,
    points_cost integer not null,
    icon text not null default '🎁',
    created_by uuid references public.profiles(id) not null,
    is_redeemed boolean not null default false,
    redeemed_at timestamptz,
    created_at timestamptz not null default now()
);

alter table public.rewards enable row level security;

create policy "Rewards read for couple" on public.rewards
    for select using (
        exists (
            select 1 from public.couples
            where id = couple_id
              and (executor_id = auth.uid() or supporter_id = auth.uid())
        )
    );

create policy "Rewards insert for couple" on public.rewards
    for insert with check (
        exists (
            select 1 from public.couples
            where id = couple_id
              and (executor_id = auth.uid() or supporter_id = auth.uid())
        )
    );

create policy "Rewards update for couple" on public.rewards
    for update using (
        exists (
            select 1 from public.couples
            where id = couple_id
              and (executor_id = auth.uid() or supporter_id = auth.uid())
        )
    );

-- ============================================================================
-- Realtime publication (enable in Supabase dashboard or via SQL)
-- ============================================================================
-- alter publication supabase_realtime add table public.profiles;
-- alter publication supabase_realtime add table public.couples;
-- alter publication supabase_realtime add table public.tasks;
-- alter publication supabase_realtime add table public.messages;
-- alter publication supabase_realtime add table public.energy_actions;
-- alter publication supabase_realtime add table public.rewards;
