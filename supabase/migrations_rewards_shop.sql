-- ============================================================================
-- KOUREO — Rewards shop (boutique cadeaux)
-- ============================================================================
-- Extends the schema from migrations_points.sql with:
--   • catalog metadata (slug, type, accessibleTo, badge, stock, updated_at)
--   • redemption metadata (role, snapshot, notes, shipping_info)
--   • status enum migration: requested/validated/shipped → pending/approved/fulfilled
--   • atomic redeem_reward() RPC
--   • RLS policies
--   • seed catalog (12 rewards)
-- Idempotent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Catalog schema extensions
-- ---------------------------------------------------------------------------
alter table public.rewards_catalog
  add column if not exists slug text,
  add column if not exists short_description text,
  add column if not exists euro_value numeric(10, 2),
  add column if not exists type text,
  add column if not exists accessible_to text
    check (accessible_to in ('student', 'teacher', 'both')),
  add column if not exists badge text,
  add column if not exists sort_order int not null default 100,
  add column if not exists updated_at timestamptz not null default now();

-- Unique slug once populated (partial index handles pre-existing NULL rows)
create unique index if not exists unique_rewards_slug
  on public.rewards_catalog(slug) where slug is not null;

-- Default values for existing-but-new-columns
update public.rewards_catalog
  set accessible_to = coalesce(accessible_to, 'both')
  where accessible_to is null;

-- ---------------------------------------------------------------------------
-- 2. Redemption schema extensions
-- ---------------------------------------------------------------------------
alter table public.rewards_redemptions
  add column if not exists role text check (role in ('student', 'teacher')),
  add column if not exists reward_title_snapshot text,
  add column if not exists notes text,
  add column if not exists shipping_info jsonb;

-- Rename legacy statuses and extend the check constraint
alter table public.rewards_redemptions drop constraint if exists rewards_redemptions_status_check;

update public.rewards_redemptions set status = 'pending'  where status = 'requested';
update public.rewards_redemptions set status = 'approved' where status = 'validated';
update public.rewards_redemptions set status = 'fulfilled' where status = 'shipped';

alter table public.rewards_redemptions
  add constraint rewards_redemptions_status_check
  check (status in ('pending', 'approved', 'rejected', 'fulfilled', 'cancelled'));

-- ---------------------------------------------------------------------------
-- 3. Atomic redeem_reward() RPC
-- ---------------------------------------------------------------------------
-- - Locks the user's balance row (FOR UPDATE)
-- - Validates the reward is active + matches the user's role
-- - Checks stock (if enforced)
-- - Deducts points
-- - Creates the redemption row + a matching negative points_transactions entry
-- - Returns the redemption id
-- Throws on any invalid state so the client surfaces a real error.
create or replace function public.redeem_reward(
  p_user_id uuid,
  p_reward_id uuid
) returns uuid language plpgsql security definer as $$
declare
  v_role          text;
  v_balance       int;
  v_reward        public.rewards_catalog;
  v_redemption_id uuid;
begin
  -- Lock user's balance row (or create zero row to lock on)
  insert into public.user_points (user_id, role, total_points)
    values (p_user_id, 'student', 0)
    on conflict (user_id) do nothing;

  select role, total_points into v_role, v_balance
  from public.user_points
  where user_id = p_user_id
  for update;

  -- Read reward
  select * into v_reward
  from public.rewards_catalog
  where id = p_reward_id;

  if not found then
    raise exception 'Reward introuvable' using errcode = 'NO_REWARD';
  end if;

  if not v_reward.active then
    raise exception 'Récompense non disponible' using errcode = 'INACTIVE';
  end if;

  -- Role visibility
  if v_reward.accessible_to is not null
     and v_reward.accessible_to <> 'both'
     and v_reward.accessible_to <> v_role then
    raise exception 'Récompense non accessible pour votre rôle'
      using errcode = 'ROLE_MISMATCH';
  end if;

  -- Stock (null = unlimited)
  if v_reward.stock is not null and v_reward.stock <= 0 then
    raise exception 'Récompense en rupture de stock'
      using errcode = 'OUT_OF_STOCK';
  end if;

  -- Balance
  if v_balance < v_reward.cost_points then
    raise exception 'Solde insuffisant' using errcode = 'LOW_BALANCE';
  end if;

  -- Deduct points
  update public.user_points
    set total_points = total_points - v_reward.cost_points,
        updated_at   = now()
    where user_id = p_user_id;

  -- Mirror as a negative points_transactions entry for a full audit trail
  insert into public.points_transactions
    (user_id, role, type, source_id, label, points, status, validated_at)
  values
    (p_user_id, v_role, 'reward_redeemed', p_reward_id,
     'Échange : ' || v_reward.title, -v_reward.cost_points, 'validated', now());

  -- Decrement stock if enforced
  if v_reward.stock is not null then
    update public.rewards_catalog
      set stock = stock - 1, updated_at = now()
      where id = p_reward_id;
  end if;

  -- Create the redemption row
  insert into public.rewards_redemptions
    (user_id, role, reward_id, reward_title_snapshot, cost_points, status)
  values
    (p_user_id, v_role, p_reward_id, v_reward.title, v_reward.cost_points, 'pending')
  returning id into v_redemption_id;

  return v_redemption_id;
end;
$$;

grant execute on function public.redeem_reward(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. RLS policies (catalog is already readable by all; rewrite redemption)
-- ---------------------------------------------------------------------------
drop policy if exists "redemptions_insert_own" on public.rewards_redemptions;
-- inserts happen ONLY via the redeem_reward RPC (security definer), so we
-- don't expose a direct insert policy anymore.

-- ---------------------------------------------------------------------------
-- 5. Seed catalog (idempotent via slug)
-- ---------------------------------------------------------------------------
insert into public.rewards_catalog
  (slug, title, short_description, description, image_url, cost_points, euro_value, type, accessible_to, badge, sort_order)
values
  -- ─── STUDENT (also accessible to teachers via 'both') ──────────────────
  ('voucher-5',
   'Bon cadeau 5 €',
   'Crédit utilisable sur Koureo',
   'Bon cadeau de 5 € à utiliser sur ta prochaine réservation de cours.',
   null, 500, 5, 'voucher', 'both', null, 10),

  ('voucher-10',
   'Bon cadeau 10 €',
   'Crédit utilisable sur Koureo',
   'Bon cadeau de 10 € à utiliser sur tes prochaines réservations.',
   null, 1000, 10, 'voucher', 'both', null, 20),

  ('voucher-15',
   'Bon cadeau 15 €',
   'Crédit utilisable sur Koureo',
   'Bon cadeau de 15 € à utiliser sur tes prochaines réservations.',
   null, 1500, 15, 'voucher', 'both', 'Populaire', 30),

  ('free-class-25',
   '1 cours offert jusqu''à 25 €',
   'Gratuit sur Koureo',
   'Un cours de ton choix (limite 25 €) complètement offert. Utilisable une fois.',
   null, 2500, 25, 'free_class', 'student', null, 40),

  ('free-class-30',
   '1 cours offert jusqu''à 30 €',
   'Gratuit sur Koureo',
   'Un cours de ton choix (limite 30 €) complètement offert. Utilisable une fois.',
   null, 3000, 30, 'free_class', 'student', null, 50),

  ('free-class-35',
   '1 cours offert jusqu''à 35 €',
   'Gratuit sur Koureo',
   'Un cours de ton choix (limite 35 €) complètement offert. Utilisable une fois.',
   null, 3500, 35, 'free_class', 'student', null, 60),

  -- ─── TEACHER EXCLUSIVE ─────────────────────────────────────────────────
  ('teacher-voucher-30',
   'Crédit Koureo 30 €',
   'Crédit utilisable sur la plateforme',
   'Crédit de 30 € à utiliser sur Koureo (abonnement, mise en avant, etc.).',
   null, 3000, 30, 'credit', 'teacher', null, 70),

  ('teacher-premium-boost',
   'Pack visibilité 7 jours',
   'Mise en avant sur la carte',
   'Ton profil apparaît en "featured" sur la carte et en tête des résultats pendant 7 jours.',
   null, 5000, 50, 'premium', 'teacher', 'Exclusif prof', 80),

  ('teacher-merch-pack',
   'Pack matériel pro Koureo',
   'Équipement offert à ton domicile',
   'Pack matériel/accessoires premium envoyé chez toi (valeur ~100 €). Produits sélectionnés par notre équipe.',
   null, 10000, 100, 'premium', 'teacher', 'Exclusif prof', 90),

  ('teacher-iphone-17',
   'iPhone 17',
   'Le dernier iPhone, sur mesure',
   'Un iPhone 17 neuf, livré chez toi sous 15 jours après validation. Demande traitée manuellement par notre équipe.',
   null, 96900, 969, 'device', 'teacher', 'Prestige', 100),

  ('teacher-trip-2000',
   'Voyage 2 000 € pour 2 personnes',
   'Escapade sur mesure',
   'Un voyage d''une valeur de 2 000 € pour 2 personnes, réservé via notre partenaire voyage. Date et destination au choix (sous conditions).',
   null, 200000, 2000, 'trip', 'teacher', 'Prestige', 110)
on conflict (slug) do update set
  title = excluded.title,
  short_description = excluded.short_description,
  description = excluded.description,
  cost_points = excluded.cost_points,
  euro_value = excluded.euro_value,
  type = excluded.type,
  accessible_to = excluded.accessible_to,
  badge = excluded.badge,
  sort_order = excluded.sort_order,
  updated_at = now();
