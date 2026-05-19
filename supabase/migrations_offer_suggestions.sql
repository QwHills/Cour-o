-- ============================================================================
-- KOUREO — Offer suggestions (prof → élève) + cooldown 14 jours
-- ============================================================================
-- Permet à un prof de suggérer un de ses produits (pack/abonnement) à un
-- élève régulier. Anti-spam : un même couple (prof, produit, élève) ne peut
-- être resollicité avant 14 jours.
--
-- Le frontend :
--   1. Vérifie le cooldown via `can_suggest_offer(...)`
--   2. Si OK : envoie notification + message chat + log dans offer_suggestions
--
-- À exécuter dans le SQL Editor Supabase. Idempotent.
-- ============================================================================

create table if not exists public.offer_suggestions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teacher_profiles(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  message_id uuid references public.messages(id) on delete set null,
  notification_id uuid references public.notifications(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_offer_sugg_teacher on public.offer_suggestions(teacher_id, created_at desc);
create index if not exists idx_offer_sugg_user on public.offer_suggestions(user_id, created_at desc);
create index if not exists idx_offer_sugg_triple on public.offer_suggestions(teacher_id, user_id, product_id, created_at desc);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.offer_suggestions enable row level security;

-- Le prof peut lire/écrire SES suggestions
drop policy if exists "offer_sugg_teacher_rw" on public.offer_suggestions;
create policy "offer_sugg_teacher_rw" on public.offer_suggestions
  for all using (
    teacher_id in (select id from public.teacher_profiles where user_id = auth.uid())
  ) with check (
    teacher_id in (select id from public.teacher_profiles where user_id = auth.uid())
  );

-- L'élève peut lire les suggestions qui le concernent (pour les afficher
-- dans son app si on veut).
drop policy if exists "offer_sugg_student_read" on public.offer_suggestions;
create policy "offer_sugg_student_read" on public.offer_suggestions
  for select using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Helper function : a-t-on déjà suggéré cette offre à cet élève < 14 jours ?
-- ----------------------------------------------------------------------------
create or replace function public.can_suggest_offer(
  p_teacher_id uuid,
  p_user_id uuid,
  p_product_id uuid
) returns boolean
language sql stable security definer
set search_path = public
as $$
  select not exists (
    select 1 from public.offer_suggestions
     where teacher_id = p_teacher_id
       and user_id    = p_user_id
       and product_id = p_product_id
       and created_at > now() - interval '14 days'
  );
$$;

-- ----------------------------------------------------------------------------
-- Sanity check (à exécuter ponctuellement, pas dans un script auto) :
--   select can_suggest_offer(
--     '22222222-2222-2222-2222-222222222003',
--     '99999999-9999-9999-9999-999999999001',
--     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa1001'
--   );
-- ----------------------------------------------------------------------------
