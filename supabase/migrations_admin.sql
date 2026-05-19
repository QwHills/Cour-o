-- ============================================================================
-- KOUREO — Admin back-office setup
-- À exécuter dans le SQL Editor Supabase. Idempotent.
-- ============================================================================
-- Met en place :
--   1. Flag `is_admin` sur public.users (default false)
--   2. Helper SECURITY DEFINER `public.is_platform_admin(uuid)` réutilisable
--      partout dans les policies
--   3. Tables `expenses` et `admin_notes`
--   4. Policies RLS admin sur toutes les tables sensibles (lecture + écriture
--      globales pour les admins, sans casser les policies existantes)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Flag is_admin sur public.users
-- ----------------------------------------------------------------------------
alter table public.users
  add column if not exists is_admin boolean not null default false;

-- Le rôle 'admin' ne sera JAMAIS choisi via signup. Ce flag est volontairement
-- séparé du champ `role` (qui reste 'user' ou 'pro') pour que :
--   • un admin puisse aussi être prof ou élève (utile en dev/test)
--   • le trigger handle_new_auth_user ne puisse pas le set à true
--     (raw_user_meta_data n'est pas lu pour cette colonne)

-- ----------------------------------------------------------------------------
-- 2. Helper is_platform_admin(uuid) — réutilisable dans toutes les policies
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER pour pouvoir lire public.users même quand l'appelant n'a
-- pas la permission directe (RLS bypass volontaire et limité à cette lecture).
create or replace function public.is_platform_admin(uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.users where id = uid), false);
$$;

revoke all on function public.is_platform_admin(uuid) from public;
grant execute on function public.is_platform_admin(uuid) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Table expenses (dépenses Kouréo)
-- ----------------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  category text not null check (category in (
    'hebergement', 'publicite', 'developpement', 'graphisme',
    'juridique', 'comptabilite', 'outils', 'remboursement',
    'fidelite', 'autre'
  )),
  amount numeric(10,2) not null check (amount >= 0),
  expense_date date not null,
  receipt_url text,
  status text not null default 'paid' check (status in ('paid', 'pending', 'disputed')),
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_expenses_date on public.expenses(expense_date desc);
create index if not exists idx_expenses_category on public.expenses(category);

alter table public.expenses enable row level security;

drop policy if exists "expenses_admin_all" on public.expenses;
create policy "expenses_admin_all" on public.expenses
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ----------------------------------------------------------------------------
-- 4. Table admin_notes (notes internes admin sur profs / élèves / litiges)
-- ----------------------------------------------------------------------------
create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('teacher', 'user', 'booking', 'dispute', 'expense')),
  target_id uuid not null,
  body text not null,
  author_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_notes_target on public.admin_notes(target_type, target_id);

alter table public.admin_notes enable row level security;

drop policy if exists "admin_notes_admin_all" on public.admin_notes;
create policy "admin_notes_admin_all" on public.admin_notes
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ----------------------------------------------------------------------------
-- 5. Policies admin sur les tables existantes
--    Stratégie : on ne touche PAS les policies existantes (owner-based) — on
--    ajoute une policy supplémentaire "admin_all" sur chaque table sensible.
--    Postgres combine les policies en OR : si un user matche AU MOINS UNE,
--    il a l'accès. Donc admin = accès global, sans casser le reste.
-- ----------------------------------------------------------------------------

-- USERS : admin peut lire/modifier tous les profils
drop policy if exists "users_admin_all" on public.users;
create policy "users_admin_all" on public.users
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- TEACHER_PROFILES : admin peut valider/suspendre/modifier les profs
drop policy if exists "teachers_admin_all" on public.teacher_profiles;
create policy "teachers_admin_all" on public.teacher_profiles
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- CLASSES : admin peut tout voir (même active=false) et tout modifier
drop policy if exists "classes_admin_all" on public.classes;
create policy "classes_admin_all" on public.classes
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- CLASS_SESSIONS : admin peut tout voir et modifier
drop policy if exists "sessions_admin_all" on public.class_sessions;
create policy "sessions_admin_all" on public.class_sessions
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- BOOKINGS : admin lit/modifie toutes les réservations
drop policy if exists "bookings_admin_all" on public.bookings;
create policy "bookings_admin_all" on public.bookings
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- PAYMENTS / PAYOUTS / DISPUTES : admin tout accès (litiges, remboursements)
drop policy if exists "payments_admin_all" on public.payments;
create policy "payments_admin_all" on public.payments
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "payouts_admin_all" on public.payouts;
create policy "payouts_admin_all" on public.payouts
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "disputes_admin_all" on public.disputes;
create policy "disputes_admin_all" on public.disputes
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- INVOICES : admin lit toutes les factures
drop policy if exists "invoices_admin_all" on public.invoices;
create policy "invoices_admin_all" on public.invoices
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- COMMISSIONS / PLATFORM_SETTINGS : admin peut désormais écrire depuis l'app
-- (les RLS existantes ne donnaient que la lecture publique)
drop policy if exists "commissions_admin_write" on public.commissions;
create policy "commissions_admin_write" on public.commissions
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "platform_settings_admin_write" on public.platform_settings;
create policy "platform_settings_admin_write" on public.platform_settings
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- VALIDATION QUESTIONNAIRES (avis) : admin peut modérer / supprimer
drop policy if exists "questionnaires_admin_all" on public.validation_questionnaires;
create policy "questionnaires_admin_all" on public.validation_questionnaires
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- FAVORITES / NOTIFICATIONS / CONVERSATIONS / MESSAGES : admin lit tout
drop policy if exists "favorites_admin_all" on public.favorites;
create policy "favorites_admin_all" on public.favorites
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "notifications_admin_all" on public.notifications;
create policy "notifications_admin_all" on public.notifications
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "conv_admin_all" on public.conversations;
create policy "conv_admin_all" on public.conversations
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "messages_admin_all" on public.messages;
create policy "messages_admin_all" on public.messages
  for all
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

-- ----------------------------------------------------------------------------
-- 6. Promotion du compte propriétaire en admin
--    Décommenter et ajuster une fois le compte créé chez Supabase Auth.
-- ----------------------------------------------------------------------------
-- update public.users
--    set is_admin = true
--  where email = 'quentin@koureo.fr';

-- ----------------------------------------------------------------------------
-- VÉRIFICATION
-- ----------------------------------------------------------------------------
-- select email, is_admin from public.users where is_admin = true;
-- select public.is_platform_admin('<uuid-de-ton-compte>');
-- select tablename, policyname from pg_policies
--  where policyname like '%admin%' order by tablename;
-- ============================================================================
