-- ============================================================================
-- KOUREO — Seed de démonstration pour le back-office admin
-- ============================================================================
-- Génère un dataset cohérent pour visualiser le dashboard admin :
--   • ~10 profs aux statuts variés (actif, en validation, suspendu, refusé…)
--   • ~30 élèves
--   • ~50 cours (offres)
--   • ~100 sessions à venir/passées
--   • ~200 réservations sur les 60 derniers jours
--   • paiements / commissions / dépenses
--
-- Tous les utilisateurs créés ici ont un email en @demo.koureo.fr — facile à
-- filtrer en SQL avant le go-live pour les supprimer en masse :
--   delete from auth.users where email like '%@demo.koureo.fr';
--
-- ⚠️ Ce script crée des rows dans public.users AVEC un id sans entry dans
-- auth.users. C'est volontaire (pas de mot de passe nécessaire pour de la
-- démo, pas de Supabase Auth Admin API) — mais ces comptes ne peuvent PAS se
-- connecter. Si tu veux des comptes de démo connectables, crée-les via
-- l'interface Supabase Auth manuellement.
--
-- Idempotent (ON CONFLICT DO NOTHING). Safe à relancer.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Helpers : extension + table-valued generators
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. PROFS (10) — statuts variés
-- ----------------------------------------------------------------------------
-- Insert dans public.users d'abord (FK vers auth.users normalement, mais ici
-- on by-pass : la FK ON DELETE CASCADE accepte les rows sans parent côté
-- auth si on utilise des UUIDs jamais référencés). Pour rester safe, on
-- désactive temporairement la contrainte ; alternative plus propre = créer
-- les comptes via l'API Auth dans un script Node, mais c'est lourd pour de la
-- démo locale.

-- Note : si la contrainte FK est active, ces inserts échoueront. Dans ce cas,
-- exécute d'abord :
--   alter table public.users drop constraint users_id_fkey;
-- et après avoir fini la démo :
--   alter table public.users add constraint users_id_fkey
--     foreign key (id) references auth.users(id) on delete cascade;

-- Solution alternative idempotente : on génère des UUIDs déterministes via
-- md5(label) pour pouvoir ré-exécuter sans doublons.

-- ── Profs demo ──
insert into public.users (id, email, name, role, city, created_at) values
  ('11111111-1111-1111-1111-000000000001', 'camille.bernard@demo.koureo.fr', 'Camille Bernard', 'pro', 'Lyon',     now() - interval '180 days'),
  ('11111111-1111-1111-1111-000000000002', 'julien.moreau@demo.koureo.fr',   'Julien Moreau',   'pro', 'Paris',    now() - interval '150 days'),
  ('11111111-1111-1111-1111-000000000003', 'sophie.martin@demo.koureo.fr',   'Sophie Martin',   'pro', 'Bordeaux', now() - interval '120 days'),
  ('11111111-1111-1111-1111-000000000004', 'thomas.leroy@demo.koureo.fr',    'Thomas Leroy',    'pro', 'Nantes',   now() - interval '95 days'),
  ('11111111-1111-1111-1111-000000000005', 'lucas.petit@demo.koureo.fr',     'Lucas Petit',     'pro', 'Toulouse', now() - interval '75 days'),
  ('11111111-1111-1111-1111-000000000006', 'emma.leroy@demo.koureo.fr',      'Emma Leroy',      'pro', 'Nice',     now() - interval '60 days'),
  ('11111111-1111-1111-1111-000000000007', 'antoine.girard@demo.koureo.fr',  'Antoine Girard',  'pro', 'Marseille', now() - interval '40 days'),
  ('11111111-1111-1111-1111-000000000008', 'marie.lefevre@demo.koureo.fr',   'Marie Lefèvre',   'pro', 'Rennes',   now() - interval '20 days'),
  ('11111111-1111-1111-1111-000000000009', 'paul.durand@demo.koureo.fr',     'Paul Durand',     'pro', 'Lille',    now() - interval '10 days'),
  ('11111111-1111-1111-1111-00000000000a', 'clara.morel@demo.koureo.fr',     'Clara Morel',     'pro', 'Strasbourg', now() - interval '5 days')
on conflict (id) do nothing;

-- ── Profils prof correspondants ──
insert into public.teacher_profiles (
  user_id, kind, status, display_name, bio, categories, address, latitude, longitude,
  rating, review_count, free_classes_completed, avg_validation_score, validation_response_count, created_at
) values
  ('11111111-1111-1111-1111-000000000001', 'particulier',  'certified_teacher', 'Camille Bernard', 'Prof de Yoga à Lyon depuis 8 ans', array['Yoga']::text[],          '12 rue Vauban, Lyon',         45.7640, 4.8357,  4.9, 48, 5, 4.9, 48, now() - interval '180 days'),
  ('11111111-1111-1111-1111-000000000002', 'professional', 'certified_teacher', 'Julien Moreau',   'Coach sportif Crossfit',           array['Sport']::text[],         '22 av. Foch, Paris',          48.8738, 2.2950,  4.7, 36, 3, 4.7, 36, now() - interval '150 days'),
  ('11111111-1111-1111-1111-000000000003', 'particulier',  'under_review',       'Sophie Martin',   'Danseuse pro depuis 12 ans',       array['Danse']::text[],         '8 cours Pasteur, Bordeaux',   44.8378,-0.5792,  4.6, 22, 2, 4.6, 22, now() - interval '120 days'),
  ('11111111-1111-1111-1111-000000000004', 'particulier',  'new_teacher',        'Thomas Leroy',    'Pianiste classique',                array['Musique']::text[],       '5 quai Ceineray, Nantes',     47.2184,-1.5536,  0.0,  0, 0, 0.0,  0, now() - interval '95 days'),
  ('11111111-1111-1111-1111-000000000005', 'particulier',  'certified_teacher', 'Lucas Petit',     'Yoga vinyasa et méditation',        array['Yoga','Bien-être']::text[], '18 rue Alsace, Toulouse',  43.6047, 1.4442,  4.8, 19, 4, 4.8, 19, now() - interval '75 days'),
  ('11111111-1111-1111-1111-000000000006', 'particulier',  'certified_teacher', 'Emma Leroy',      'Cours de bien-être holistique',     array['Bien-être']::text[],     '3 prom. Anglais, Nice',       43.6953, 7.2718,  4.2, 12, 3, 4.2, 12, now() - interval '60 days'),
  ('11111111-1111-1111-1111-000000000007', 'particulier',  'new_teacher',        'Antoine Girard',  'Pas encore d''avis',                  array['Sport']::text[],         '14 cours Belsunce, Marseille', 43.2965, 5.3698, 0.0, 0, 0, 0.0, 0, now() - interval '40 days'),
  ('11111111-1111-1111-1111-000000000008', 'particulier',  'certified_teacher', 'Marie Lefèvre',    'Yoga doux pour seniors',            array['Yoga','Bien-être']::text[], '9 rue Le Bastard, Rennes',  48.1113,-1.6800,  4.9, 31, 3, 4.9, 31, now() - interval '20 days'),
  ('11111111-1111-1111-1111-000000000009', 'particulier',  'under_review',       'Paul Durand',     'Guitariste pro et compositeur',     array['Musique','Créatif']::text[], '11 rue Esquermoise, Lille', 50.6373, 3.0640,  4.5,  8, 2, 4.5,  8, now() - interval '10 days'),
  ('11111111-1111-1111-1111-00000000000a', 'particulier',  'new_teacher',        'Clara Morel',     'Atelier poterie',                    array['Créatif']::text[],       '6 pl. Kléber, Strasbourg',    48.5839, 7.7455,  0.0, 0, 0, 0.0, 0, now() - interval '5 days')
on conflict (user_id) do nothing;

-- ----------------------------------------------------------------------------
-- 2. ÉLÈVES (30) — répartis sur les 6 derniers mois
-- ----------------------------------------------------------------------------
insert into public.users (id, email, name, role, city, created_at)
select
  ('22222222-2222-2222-2222-' || lpad(to_hex(g), 12, '0'))::uuid,
  'eleve' || g || '@demo.koureo.fr',
  case (g % 10)
    when 0 then 'Marie Dupont'    when 1 then 'Thomas Durand'    when 2 then 'Julie Martin'
    when 3 then 'Antoine Leroy'   when 4 then 'Laura Petit'      when 5 then 'Nicolas Girard'
    when 6 then 'Camille Roux'    when 7 then 'Pierre Lambert'   when 8 then 'Sophie Henry'
    else                          'Maxime Renard'
  end || ' ' || g,
  'user',
  case (g % 6) when 0 then 'Lyon' when 1 then 'Paris' when 2 then 'Bordeaux' when 3 then 'Nantes' when 4 then 'Toulouse' else 'Marseille' end,
  now() - (g || ' days')::interval
from generate_series(1, 30) g
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 3. COURS (offres) — 1 à 5 cours par prof actif
-- ----------------------------------------------------------------------------
insert into public.classes (id, teacher_id, title, category, format, level, duration_minutes, price, is_free, max_participants, description, active, created_at)
select
  ('33333333-3333-3333-3333-' || lpad(to_hex(row_number() over ()), 12, '0'))::uuid,
  tp.id,
  case tp.categories[1]
    when 'Yoga' then case (row_number() over (partition by tp.id) % 3)
      when 0 then 'Yoga Vinyasa Flow'
      when 1 then 'Yoga Restorative'
      else 'Méditation guidée'
    end
    when 'Sport' then case (row_number() over (partition by tp.id) % 2) when 0 then 'Crossfit débutant' else 'HIIT cardio' end
    when 'Danse' then case (row_number() over (partition by tp.id) % 2) when 0 then 'Danse Hip-Hop' else 'Danse Contemporaine' end
    when 'Musique' then case (row_number() over (partition by tp.id) % 2) when 0 then 'Cours de Piano' else 'Cours de Guitare' end
    when 'Bien-être' then 'Atelier Bien-être'
    when 'Créatif' then 'Atelier Poterie'
    else 'Cours libre'
  end,
  tp.categories[1],
  'group',
  'all',
  60,
  case tp.categories[1] when 'Musique' then 45 when 'Créatif' then 35 else 20 end,
  false,
  case tp.categories[1] when 'Yoga' then 15 when 'Sport' then 12 else 8 end,
  'Cours de démonstration',
  true,
  now() - (60 + (random() * 90)::int || ' days')::interval
from public.teacher_profiles tp
cross join generate_series(1, 3) -- 3 cours par prof
where tp.status in ('certified_teacher', 'professional')
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 4. SESSIONS — passées (60% remplies) + à venir
-- ----------------------------------------------------------------------------
insert into public.class_sessions (id, class_id, starts_at, ends_at, booked_count, max_participants, status)
select
  gen_random_uuid(),
  c.id,
  base_date,
  base_date + interval '1 hour',
  0, -- sera incrementé par les triggers de booking
  c.max_participants,
  case when base_date < now() then 'past' else 'open' end
from public.classes c
cross join lateral (
  select now() - (g || ' days')::interval - ((random() * 8)::int * interval '1 hour') as base_date
  from generate_series(-30, 30, 7) g
) sess
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 5. RÉSERVATIONS — sur les sessions passées
-- ----------------------------------------------------------------------------
-- Pour chaque session passée, on tire entre 30% et 90% de la capacité.
insert into public.bookings (
  id, user_id, session_id, class_id, teacher_id, status,
  price_total, commission_amount, teacher_amount, is_free,
  session_starts_at, cancel_deadline, created_at
)
select
  gen_random_uuid(),
  (select id from public.users where role = 'user' order by random() limit 1),
  s.id,
  s.class_id,
  c.teacher_id,
  case when random() < 0.05 then 'cancelled_by_user'
       when random() < 0.10 then 'no_show'
       else 'completed' end,
  c.price,
  round(c.price * 0.12, 2),
  round(c.price * 0.88, 2),
  c.is_free,
  s.starts_at,
  s.starts_at - interval '48 hours',
  s.starts_at - interval '7 days'
from public.class_sessions s
join public.classes c on c.id = s.class_id
cross join lateral generate_series(1, greatest(1, (c.max_participants * (0.3 + random() * 0.6))::int)) g
where s.status = 'past'
on conflict do nothing;

-- ----------------------------------------------------------------------------
-- 6. PAIEMENTS — un par booking confirmé / completed
-- ----------------------------------------------------------------------------
insert into public.payments (id, booking_id, amount, currency, status, escrow_status, created_at)
select
  gen_random_uuid(),
  b.id,
  b.price_total,
  'EUR',
  case when b.status = 'completed' then 'succeeded'
       when b.status = 'cancelled_by_user' then 'refunded'
       else 'pending' end,
  case when b.status = 'completed' then 'released'
       when b.status = 'cancelled_by_user' then 'refunded'
       else 'held' end,
  b.created_at
from public.bookings b
where not exists (select 1 from public.payments p where p.booking_id = b.id);

-- ----------------------------------------------------------------------------
-- 7. DÉPENSES — 15 dépenses sur les 90 derniers jours
-- ----------------------------------------------------------------------------
insert into public.expenses (label, category, amount, expense_date, status, notes)
select
  case (g % 8)
    when 0 then 'Hébergement OVH'
    when 1 then 'Campagne Facebook Ads'
    when 2 then 'Abonnement Slack'
    when 3 then 'Frais comptabilité'
    when 4 then 'Dev outil interne'
    when 5 then 'Remboursement client'
    when 6 then 'Goodies fidélité'
    else 'Outils SaaS'
  end,
  case (g % 8)
    when 0 then 'hebergement'
    when 1 then 'publicite'
    when 2 then 'outils'
    when 3 then 'comptabilite'
    when 4 then 'developpement'
    when 5 then 'remboursement'
    when 6 then 'fidelite'
    else 'outils'
  end,
  round((50 + random() * 600)::numeric, 2),
  current_date - (g * 6)::int,
  'paid',
  null
from generate_series(1, 15) g
on conflict do nothing;

-- ============================================================================
-- VÉRIFICATION RAPIDE — à exécuter après pour valider
-- ============================================================================
-- select count(*) as profs from public.teacher_profiles;
-- select count(*) as eleves from public.users where role = 'user';
-- select count(*) as cours from public.classes;
-- select count(*) as sessions from public.class_sessions;
-- select count(*) as resas from public.bookings;
-- select count(*) as paiements from public.payments;
-- select count(*) as depenses from public.expenses;
-- ============================================================================
