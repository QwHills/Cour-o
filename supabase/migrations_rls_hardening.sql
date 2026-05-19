-- ============================================================================
-- KOUREO — RLS hardening : couvre les 5 tables encore en lecture/écriture
-- publique authentifiée. À exécuter dans le SQL Editor Supabase. Idempotent.
-- ============================================================================
-- Tables traitées :
--   1. availabilities       → read public, write owner
--   2. closed_periods       → read public, write owner
--   3. commissions          → read public, NO write (admin SQL Editor only)
--   4. platform_settings    → read public, NO write (admin SQL Editor only)
--   5. calendar_connections → owner only (read + write) — CONTIENT DES OAUTH
--                             TOKENS, jamais exposés à un tiers
--
-- Note : "owner" = le prof identifié par auth.uid(), résolu via la jointure
-- teacher_profiles.user_id = auth.uid().
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. availabilities
-- ----------------------------------------------------------------------------
alter table public.availabilities enable row level security;

drop policy if exists "availabilities_public_read" on public.availabilities;
create policy "availabilities_public_read" on public.availabilities
  for select using (true);

drop policy if exists "availabilities_owner_write" on public.availabilities;
create policy "availabilities_owner_write" on public.availabilities
  for all
  using (
    teacher_id in (select id from public.teacher_profiles where user_id = auth.uid())
  )
  with check (
    teacher_id in (select id from public.teacher_profiles where user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 2. closed_periods
-- ----------------------------------------------------------------------------
alter table public.closed_periods enable row level security;

drop policy if exists "closed_periods_public_read" on public.closed_periods;
create policy "closed_periods_public_read" on public.closed_periods
  for select using (true);

drop policy if exists "closed_periods_owner_write" on public.closed_periods;
create policy "closed_periods_owner_write" on public.closed_periods
  for all
  using (
    teacher_id in (select id from public.teacher_profiles where user_id = auth.uid())
  )
  with check (
    teacher_id in (select id from public.teacher_profiles where user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 3. commissions  (lecture publique, aucune écriture côté app)
-- ----------------------------------------------------------------------------
alter table public.commissions enable row level security;

drop policy if exists "commissions_public_read" on public.commissions;
create policy "commissions_public_read" on public.commissions
  for select using (true);

-- Aucune policy INSERT/UPDATE/DELETE → les mutations passent uniquement par
-- le service_role (SQL Editor / migrations / Edge Functions). C'est voulu :
-- modifier la commission est un acte commercial sensible.
-- Si tu veux explicitement bloquer même pour le service_role (utile pour
-- éviter les modifs accidentelles), tu peux ajouter :
--   revoke insert, update, delete on public.commissions from authenticated;

-- ----------------------------------------------------------------------------
-- 4. platform_settings  (lecture publique, aucune écriture côté app)
-- ----------------------------------------------------------------------------
alter table public.platform_settings enable row level security;

drop policy if exists "platform_settings_public_read" on public.platform_settings;
create policy "platform_settings_public_read" on public.platform_settings
  for select using (true);

-- Mêmes principes que `commissions` : mutations admin-only.

-- ----------------------------------------------------------------------------
-- 5. calendar_connections  ⚠️ TOKENS OAUTH — owner only sur tout
-- ----------------------------------------------------------------------------
alter table public.calendar_connections enable row level security;

drop policy if exists "calendar_connections_owner_read" on public.calendar_connections;
create policy "calendar_connections_owner_read" on public.calendar_connections
  for select
  using (
    teacher_id in (select id from public.teacher_profiles where user_id = auth.uid())
  );

drop policy if exists "calendar_connections_owner_write" on public.calendar_connections;
create policy "calendar_connections_owner_write" on public.calendar_connections
  for all
  using (
    teacher_id in (select id from public.teacher_profiles where user_id = auth.uid())
  )
  with check (
    teacher_id in (select id from public.teacher_profiles where user_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- VÉRIFICATION (à exécuter après pour audit) :
-- ----------------------------------------------------------------------------
-- select tablename, rowsecurity
--   from pg_tables
--  where schemaname = 'public'
--    and tablename in ('availabilities','closed_periods','commissions',
--                      'platform_settings','calendar_connections');
-- → toutes doivent avoir rowsecurity = true
--
-- select tablename, policyname, cmd, qual::text
--   from pg_policies
--  where tablename in ('availabilities','closed_periods','commissions',
--                      'platform_settings','calendar_connections')
--  order by tablename, policyname;
-- → 8 policies attendues
-- ============================================================================
