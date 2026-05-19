-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║  KOUREO — Migration multi-vendeur (organisations, produits, crédits)    ║
-- ║  Phase 1 : fondation du modèle "owner = teacher | organization"          ║
-- ║                                                                           ║
-- ║  À exécuter UNE FOIS dans le Supabase SQL Editor, APRÈS schema.sql.     ║
-- ║  Idempotent : re-lançable sans risque.                                   ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

-- ═════════════════════════════════════════════════════════════════════════
-- 1. ORGANIZATIONS (studios, écoles, clubs, associations)
-- ═════════════════════════════════════════════════════════════════════════
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in (
    'studio_yoga', 'sport_club', 'dance_school', 'music_school',
    'wellness_center', 'association', 'other'
  )),
  description text default '',
  address text,
  latitude double precision,
  longitude double precision,
  logo_url text,
  email text,
  phone text,
  website text,
  legal_name text,
  siret text,
  vat_number text,
  stripe_account_id text,
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists idx_orgs_created_by on public.organizations(created_by);

-- ═════════════════════════════════════════════════════════════════════════
-- 2. ORGANIZATION MEMBERS (rôles au sein d'une structure)
-- ═════════════════════════════════════════════════════════════════════════
-- Un user peut appartenir à plusieurs organizations avec des rôles différents.
-- Un prof rattaché à une structure aura teacher_id ≠ NULL et role='teacher'.

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  teacher_id uuid references public.teacher_profiles(id) on delete set null,
  role text not null check (role in ('admin', 'teacher', 'staff')),
  invited_at timestamptz not null default now(),
  joined_at timestamptz,
  unique (organization_id, user_id)
);

create index if not exists idx_org_members_org on public.organization_members(organization_id);
create index if not exists idx_org_members_user on public.organization_members(user_id);
create index if not exists idx_org_members_teacher on public.organization_members(teacher_id);

-- ═════════════════════════════════════════════════════════════════════════
-- 3. PRODUCTS (offres commerciales unifiées)
-- ═════════════════════════════════════════════════════════════════════════
-- Même table pour les produits vendus par un prof ou une structure.
-- kind : 'single_class' (unité), 'credit_pack' (carnet), 'monthly_subscription' (abo)

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('teacher', 'organization')),
  owner_id uuid not null,
  name text not null,
  description text default '',
  kind text not null check (kind in ('single_class', 'credit_pack', 'monthly_subscription')),
  price numeric(10,2) not null,
  credits_granted int,       -- null pour single_class
  billing_interval text check (billing_interval in ('monthly') or billing_interval is null),
  validity_days int,         -- durée de validité des crédits (30 sub, 90 pack, etc.)
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_owner on public.products(owner_type, owner_id);
create index if not exists idx_products_active on public.products(active);

-- Quels cours acceptent ce produit. Si aucun → le produit couvre TOUS les
-- cours de l'owner (abo "all-access" typique d'un studio).
create table if not exists public.product_eligibility (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  class_id uuid references public.classes(id) on delete cascade
);

create index if not exists idx_product_elig_product on public.product_eligibility(product_id);
create index if not exists idx_product_elig_class on public.product_eligibility(class_id);

-- ═════════════════════════════════════════════════════════════════════════
-- 4. STUDENT PURCHASES
-- ═════════════════════════════════════════════════════════════════════════
create table if not exists public.student_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  owner_type text not null check (owner_type in ('teacher', 'organization')),
  owner_id uuid not null,
  amount_paid numeric(10,2) not null,
  stripe_payment_id text,
  purchased_at timestamptz not null default now(),
  expires_at timestamptz,
  auto_renew boolean not null default false
);

create index if not exists idx_purchases_user on public.student_purchases(user_id);
create index if not exists idx_purchases_owner on public.student_purchases(owner_type, owner_id);

-- ═════════════════════════════════════════════════════════════════════════
-- 5. CREDIT WALLETS & TRANSACTIONS
-- ═════════════════════════════════════════════════════════════════════════
-- Un wallet par (élève × owner). L'élève voit ses différents wallets dans
-- son profil ("Mes abonnements chez Labo Yoga · 4 crédits · Sophie Martin · 3 crédits").

create table if not exists public.credit_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  owner_type text not null check (owner_type in ('teacher', 'organization')),
  owner_id uuid not null,
  balance int not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now(),
  unique (user_id, owner_type, owner_id)
);

create index if not exists idx_wallets_user on public.credit_wallets(user_id);
create index if not exists idx_wallets_owner on public.credit_wallets(owner_type, owner_id);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.credit_wallets(id) on delete cascade,
  delta int not null,
  reason text not null check (reason in ('purchase', 'booking', 'refund', 'expiry', 'admin_adjust')),
  reference_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_credit_tx_wallet on public.credit_transactions(wallet_id);

-- Atomic wallet update helper. Use this from the client to avoid race
-- conditions when several bookings hit the same wallet in parallel.
-- Returns the updated wallet row.
create or replace function public.wallet_apply_delta(
  p_user_id uuid,
  p_owner_type text,
  p_owner_id uuid,
  p_delta int,
  p_reason text,
  p_reference_id uuid
) returns public.credit_wallets as $$
declare
  wallet public.credit_wallets;
begin
  insert into public.credit_wallets (user_id, owner_type, owner_id, balance)
  values (p_user_id, p_owner_type, p_owner_id, greatest(p_delta, 0))
  on conflict (user_id, owner_type, owner_id) do update
    set balance = public.credit_wallets.balance + p_delta,
        updated_at = now()
  returning * into wallet;

  insert into public.credit_transactions (wallet_id, delta, reason, reference_id)
  values (wallet.id, p_delta, p_reason, p_reference_id);

  return wallet;
end;
$$ language plpgsql security definer;

-- ═════════════════════════════════════════════════════════════════════════
-- 6. ALTERs sur les tables existantes
-- ═════════════════════════════════════════════════════════════════════════

-- Les cours ont un owner (par défaut le teacher qui les a créés)
alter table public.classes
  add column if not exists owner_type text check (owner_type in ('teacher', 'organization')),
  add column if not exists owner_id uuid;

update public.classes
set owner_type = 'teacher', owner_id = teacher_id
where owner_type is null;

-- Une session peut avoir son propre teacher assigné (indispensable pour les
-- structures où Clara anime lundi et Marc le mardi sur le même cours).
alter table public.class_sessions
  add column if not exists teacher_id uuid references public.teacher_profiles(id);

update public.class_sessions s
set teacher_id = c.teacher_id
from public.classes c
where s.class_id = c.id and s.teacher_id is null;

-- Bookings : savoir si payé cash ou via crédits, lien vers la transaction
alter table public.bookings
  add column if not exists owner_type text check (owner_type in ('teacher', 'organization')),
  add column if not exists owner_id uuid,
  add column if not exists paid_with text check (paid_with in ('cash', 'credits')) default 'cash',
  add column if not exists credit_transaction_id uuid references public.credit_transactions(id);

update public.bookings b
set owner_type = c.owner_type, owner_id = c.owner_id
from public.classes c
where b.class_id = c.id and b.owner_type is null;

-- ═════════════════════════════════════════════════════════════════════════
-- 7. RLS policies
-- ═════════════════════════════════════════════════════════════════════════

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.products enable row level security;
alter table public.product_eligibility enable row level security;
alter table public.student_purchases enable row level security;
alter table public.credit_wallets enable row level security;
alter table public.credit_transactions enable row level security;

-- Organizations: public read (discovery), admin write
drop policy if exists "organizations_public_read" on public.organizations;
create policy "organizations_public_read" on public.organizations for select using (true);
drop policy if exists "organizations_admin_write" on public.organizations;
create policy "organizations_admin_write" on public.organizations for all using (
  id in (
    select organization_id from public.organization_members
    where user_id = auth.uid() and role = 'admin'
  )
  or created_by = auth.uid()
);

-- Members: members of an org can read, admins manage invitations, invitees
-- can accept their own pending invitation by setting joined_at.
drop policy if exists "org_members_read" on public.organization_members;
create policy "org_members_read" on public.organization_members for select using (
  user_id = auth.uid()
  or organization_id in (
    select organization_id from public.organization_members where user_id = auth.uid()
  )
);

-- Only admins of the target org can INSERT, UPDATE role, or DELETE members.
-- This is what prevents any teacher from self-joining a structure.
drop policy if exists "org_members_admin_write" on public.organization_members;
create policy "org_members_admin_write" on public.organization_members for all using (
  organization_id in (
    select organization_id from public.organization_members
    where user_id = auth.uid() and role = 'admin'
  )
);

-- An invitee can accept their own invitation (UPDATE own row to set
-- joined_at). They cannot change the role, organization_id, or anyone else's
-- row. Enforced both by USING (target = me) and WITH CHECK (still me).
drop policy if exists "org_members_accept_own" on public.organization_members;
create policy "org_members_accept_own" on public.organization_members
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Helper function to check if current user can manage an owner (teacher or
-- organization). Defined BEFORE any policy that references it.
create or replace function public.owner_can_manage(p_owner_type text, p_owner_id uuid)
returns boolean as $$
begin
  if p_owner_type = 'teacher' then
    return exists (
      select 1 from public.teacher_profiles
      where id = p_owner_id and user_id = auth.uid()
    );
  elsif p_owner_type = 'organization' then
    return exists (
      select 1 from public.organization_members
      where organization_id = p_owner_id and user_id = auth.uid() and role in ('admin', 'staff')
    );
  end if;
  return false;
end;
$$ language plpgsql stable security definer;

-- Products: public read for active ones + owners can read their own inactive
drop policy if exists "products_public_read" on public.products;
create policy "products_public_read" on public.products for select using (
  active = true or public.owner_can_manage(owner_type, owner_id)
);

drop policy if exists "products_owner_write" on public.products;
create policy "products_owner_write" on public.products for all using (
  public.owner_can_manage(owner_type, owner_id)
);

drop policy if exists "product_elig_read" on public.product_eligibility;
create policy "product_elig_read" on public.product_eligibility for select using (true);
drop policy if exists "product_elig_owner_write" on public.product_eligibility;
create policy "product_elig_owner_write" on public.product_eligibility for all using (
  product_id in (
    select id from public.products where public.owner_can_manage(owner_type, owner_id)
  )
);

-- Purchases: student sees own, owner sees theirs
drop policy if exists "purchases_read" on public.student_purchases;
create policy "purchases_read" on public.student_purchases for select using (
  user_id = auth.uid() or public.owner_can_manage(owner_type, owner_id)
);
drop policy if exists "purchases_user_write" on public.student_purchases;
create policy "purchases_user_write" on public.student_purchases for insert with check (
  user_id = auth.uid()
);

-- Wallets: owner of the wallet (the student) reads & the vendor reads
drop policy if exists "wallets_read" on public.credit_wallets;
create policy "wallets_read" on public.credit_wallets for select using (
  user_id = auth.uid() or public.owner_can_manage(owner_type, owner_id)
);

drop policy if exists "credit_tx_read" on public.credit_transactions;
create policy "credit_tx_read" on public.credit_transactions for select using (
  wallet_id in (
    select id from public.credit_wallets
    where user_id = auth.uid() or public.owner_can_manage(owner_type, owner_id)
  )
);

-- ═════════════════════════════════════════════════════════════════════════
-- Done. Verify :
--   select count(*) from public.organizations;        -- 0 au départ
--   select count(*) from public.products;             -- 0 au départ
--   select count(*) from public.credit_wallets;       -- 0 au départ
--   select owner_type, count(*) from public.classes group by owner_type;
--     → toutes les classes devraient avoir owner_type='teacher'
--   select count(*) from public.class_sessions where teacher_id is null;
--     → 0 (chaque session a un teacher assigné après backfill)
-- ═════════════════════════════════════════════════════════════════════════
