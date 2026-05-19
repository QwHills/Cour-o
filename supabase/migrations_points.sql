-- ============================================================================
-- KOUREO — Points / loyalty system (Phase 1)
-- ============================================================================
-- Copie-colle dans Supabase → SQL Editor → Run.
-- Idempotent : tout est `create if not exists` / `add column if not exists`.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Referral tracking on users + teacher_profiles
-- ---------------------------------------------------------------------------
alter table public.teacher_profiles
  add column if not exists referral_code text;

-- Backfill a unique code for existing teachers (slug of display_name + short id)
update public.teacher_profiles
set referral_code = lower(
  regexp_replace(display_name, '[^a-zA-Z0-9]', '', 'g')
) || '-' || substring(id::text, 1, 4)
where referral_code is null;

alter table public.teacher_profiles
  add constraint teacher_profiles_referral_code_unique unique (referral_code);

alter table public.users
  add column if not exists invited_by_teacher_id uuid references public.teacher_profiles(id) on delete set null;
alter table public.users
  add column if not exists invited_by_user_id uuid references public.users(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 2. Points balance — one row per user
-- ---------------------------------------------------------------------------
create table if not exists public.user_points (
  user_id uuid primary key references public.users(id) on delete cascade,
  role text not null check (role in ('teacher', 'student')),
  total_points int not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_points_total on public.user_points(total_points desc);

-- ---------------------------------------------------------------------------
-- 3. Points transactions — immutable log, idempotent
-- ---------------------------------------------------------------------------
create table if not exists public.points_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('teacher', 'student')),
  type text not null,
  source_id uuid,                 -- e.g. bookingId, classId, referralId
  label text not null,            -- user-facing text ("Inscription", "Réservation payée"…)
  points int not null,
  status text not null default 'validated' check (status in ('pending', 'validated', 'cancelled')),
  created_at timestamptz not null default now(),
  validated_at timestamptz
);

-- Idempotency: the same user/type/source triplet can only award points once.
-- (source_id can be null for events without a natural source, in which case
--  the type alone is the natural key — handled via a partial index below.)
create unique index if not exists unique_points_event_with_source
  on public.points_transactions(user_id, type, source_id)
  where source_id is not null;

create unique index if not exists unique_points_event_no_source
  on public.points_transactions(user_id, type)
  where source_id is null;

create index if not exists idx_points_tx_user_date
  on public.points_transactions(user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 4. Rewards shop (schema only — UI / logic comes later)
-- ---------------------------------------------------------------------------
create table if not exists public.rewards_catalog (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  image_url text,
  cost_points int not null check (cost_points > 0),
  active boolean not null default true,
  stock int,                      -- null = unlimited
  created_at timestamptz not null default now()
);

create table if not exists public.rewards_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  reward_id uuid not null references public.rewards_catalog(id),
  cost_points int not null,
  status text not null default 'requested'
    check (status in ('requested', 'validated', 'shipped', 'cancelled')),
  requested_at timestamptz not null default now(),
  validated_at timestamptz,
  shipped_at timestamptz,
  cancelled_at timestamptz
);

create index if not exists idx_redemptions_user on public.rewards_redemptions(user_id);

-- ---------------------------------------------------------------------------
-- 5. Atomic "award points" function — idempotent
-- ---------------------------------------------------------------------------
-- Called from the app via supabase.rpc('award_points', { ... }).
-- Returns the transaction row (or null if this event was already awarded).
create or replace function public.award_points(
  p_user_id uuid,
  p_role text,
  p_type text,
  p_label text,
  p_points int,
  p_source_id uuid default null,
  p_status text default 'validated'
) returns table (
  id uuid,
  user_id uuid,
  type text,
  points int,
  status text,
  created_at timestamptz
) language plpgsql security definer as $$
declare
  v_existing_id uuid;
  v_new_tx public.points_transactions;
begin
  -- Check idempotency: has this exact event already been awarded?
  select t.id into v_existing_id
  from public.points_transactions t
  where t.user_id = p_user_id
    and t.type = p_type
    and (t.source_id is not distinct from p_source_id);

  if v_existing_id is not null then
    -- Already awarded — return nothing (caller treats as no-op)
    return;
  end if;

  -- Insert the transaction
  insert into public.points_transactions
    (user_id, role, type, source_id, label, points, status, validated_at)
  values
    (p_user_id, p_role, p_type, p_source_id, p_label, p_points, p_status,
     case when p_status = 'validated' then now() else null end)
  returning * into v_new_tx;

  -- Upsert the balance
  insert into public.user_points (user_id, role, total_points, updated_at)
  values (p_user_id, p_role, case when p_status = 'validated' then p_points else 0 end, now())
  on conflict (user_id) do update
    set total_points = public.user_points.total_points
      + case when p_status = 'validated' then excluded.total_points else 0 end,
        updated_at = now();

  return query
    select v_new_tx.id, v_new_tx.user_id, v_new_tx.type,
           v_new_tx.points, v_new_tx.status, v_new_tx.created_at;
end;
$$;

grant execute on function public.award_points to authenticated;

-- ---------------------------------------------------------------------------
-- 6. RLS policies
-- ---------------------------------------------------------------------------
alter table public.user_points enable row level security;
alter table public.points_transactions enable row level security;
alter table public.rewards_catalog enable row level security;
alter table public.rewards_redemptions enable row level security;

-- Balance: user can read their own
drop policy if exists "user_points_read_own" on public.user_points;
create policy "user_points_read_own" on public.user_points
  for select using (auth.uid() = user_id);

-- History: user can read their own
drop policy if exists "points_tx_read_own" on public.points_transactions;
create policy "points_tx_read_own" on public.points_transactions
  for select using (auth.uid() = user_id);

-- Catalog: readable by everyone authenticated
drop policy if exists "rewards_catalog_read" on public.rewards_catalog;
create policy "rewards_catalog_read" on public.rewards_catalog
  for select using (true);

-- Redemptions: user can read their own, create their own
drop policy if exists "redemptions_read_own" on public.rewards_redemptions;
create policy "redemptions_read_own" on public.rewards_redemptions
  for select using (auth.uid() = user_id);

drop policy if exists "redemptions_insert_own" on public.rewards_redemptions;
create policy "redemptions_insert_own" on public.rewards_redemptions
  for insert with check (auth.uid() = user_id);

-- Points are written ONLY via award_points() RPC (security definer)
-- → no INSERT/UPDATE policy needed on user_points or points_transactions.
