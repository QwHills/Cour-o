-- ============================================================================
-- KOUREO — Seed complémentaire : noms réalistes + bookings supplémentaires
-- ============================================================================
-- À exécuter APRÈS seed.sql et seed_rennes.sql.
-- 100% idempotent (ON CONFLICT DO NOTHING + UPDATE) — safe à relancer.
--
-- Cible 3 problèmes :
--   1. Les 30 demo_participants s'appelaient "Participant 1..30" → renommés
--      en vrais prénoms+noms français pour que les profs voient qui sont
--      leurs élèves.
--   2. La session historique de Sophie avait max_participants = 1000 (pour
--      bypasser la contrainte capacity_not_exceeded) → ça polluait le calcul
--      du fill_rate. On l'aligne sur le nombre réel de bookings (89).
--   3. Trop peu de bookings côté élève → fill rate ridicule. On ajoute
--      ~50 réservations réparties sur les sessions à venir.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Renommer les 30 demo_participants avec de vrais noms
-- ----------------------------------------------------------------------------
with names(n, full_name) as (values
  (1,  'Camille Durand'),
  (2,  'Antoine Lefebvre'),
  (3,  'Sophie Bernard'),
  (4,  'Pierre Petit'),
  (5,  'Léa Dupuis'),
  (6,  'Maxime Girard'),
  (7,  'Charlotte Renard'),
  (8,  'Romain Leroy'),
  (9,  'Manon Bonnet'),
  (10, 'Thomas Faure'),
  (11, 'Inès Garcia'),
  (12, 'Nicolas Roux'),
  (13, 'Élise Vincent'),
  (14, 'Florian Boyer'),
  (15, 'Pauline Mercier'),
  (16, 'Vincent Lambert'),
  (17, 'Anaïs Henry'),
  (18, 'Mathieu Roussel'),
  (19, 'Clémence Aubert'),
  (20, 'Adrien Caron'),
  (21, 'Justine Lefèvre'),
  (22, 'Bastien Marchand'),
  (23, 'Margaux Robin'),
  (24, 'Quentin Picard'),
  (25, 'Solène Carpentier'),
  (26, 'Théo Brunet'),
  (27, 'Élodie Schmitt'),
  (28, 'Loïc Berger'),
  (29, 'Cécile Joly'),
  (30, 'Damien Olivier')
)
update public.users u
   set name = n.full_name,
       updated_at = now()
  from names n
 where u.id = ('55555555-5555-5555-5555-' || lpad(n.n::text, 12, '0'))::uuid;

-- ----------------------------------------------------------------------------
-- 2. Recalibrer la session historique Sophie (max 1000 → 89)
-- ----------------------------------------------------------------------------
-- On baisse le max au nombre exact de bookings pour ne plus polluer le
-- calcul du fill rate. Idem pour Marie Lefèvre et James (par cohérence).
update public.class_sessions
   set max_participants = 89, booked_count = 89
 where id = '66666666-6666-6666-6666-666666000003'::uuid;
update public.class_sessions
   set max_participants = 3, booked_count = 3
 where id = '66666666-6666-6666-6666-666666000002'::uuid;
update public.class_sessions
   set max_participants = 56, booked_count = 56
 where id = '66666666-6666-6666-6666-666666000004'::uuid;

-- ----------------------------------------------------------------------------
-- 3. Ajouter ~50 bookings supplémentaires sur les sessions à venir
-- ----------------------------------------------------------------------------
-- IDs format: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbXXXXXXX' où X = compteur unique
-- Session UUIDs: '44444444-4444-4444-4444-' || lpad(class*1000 + week*10 + slot, 12, '0')
--
-- Le trigger bookings_after_insert_fn met à jour booked_count + status
-- automatiquement, donc on ne touche pas aux class_sessions ici.

with bk(seq, user_n, class_idx, week, slot) as (values
  -- ─── Sophie - Yoga Vinyasa (class 10) ───
  -- W0 S1 Lun 18:30 (déjà 1 Marie) → +4
  (1,  3, 10, 0, 1),   -- Sophie Bernard
  (2,  5, 10, 0, 1),   -- Léa Dupuis
  (3,  11, 10, 0, 1),  -- Inès Garcia
  (4,  19, 10, 0, 1),  -- Clémence Aubert
  -- W0 S2 Mer 12:30 (déjà 1 Marie) → +3
  (5,  7, 10, 0, 2),   -- Charlotte Renard
  (6,  15, 10, 0, 2),  -- Pauline Mercier
  (7,  23, 10, 0, 2),  -- Margaux Robin
  -- W1 S1 Lun 18:30 → +5
  (8,  2, 10, 1, 1),
  (9,  6, 10, 1, 1),
  (10, 10, 10, 1, 1),
  (11, 14, 10, 1, 1),
  (12, 18, 10, 1, 1),
  -- W1 S2 Mer 12:30 → +4
  (13, 3, 10, 1, 2),
  (14, 9, 10, 1, 2),
  (15, 13, 10, 1, 2),
  (16, 21, 10, 1, 2),
  -- (W1 S3 Sam 10:00 déjà full, on saute)
  -- W2 S1 Lun 18:30 → +5
  (17, 1, 10, 2, 1),
  (18, 5, 10, 2, 1),
  (19, 11, 10, 2, 1),
  (20, 17, 10, 2, 1),
  (21, 25, 10, 2, 1),
  -- W2 S2 Mer 12:30 → +3
  (22, 4, 10, 2, 2),
  (23, 12, 10, 2, 2),
  (24, 22, 10, 2, 2),
  -- W2 S3 Sam 10:00 → +4
  (25, 8, 10, 2, 3),
  (26, 16, 10, 2, 3),
  (27, 24, 10, 2, 3),
  (28, 29, 10, 2, 3),
  -- W3 S1 Lun 18:30 → +3
  (29, 7, 10, 3, 1),
  (30, 15, 10, 3, 1),
  (31, 26, 10, 3, 1),
  -- W3 S2 Mer 12:30 → +2
  (32, 6, 10, 3, 2),
  (33, 20, 10, 3, 2),
  -- W3 S3 Sam 10:00 → +2
  (34, 28, 10, 3, 3),
  (35, 30, 10, 3, 3),

  -- ─── Salsa Cubaine Miguel (class 12) — W0 S1 Mar 19:00 (déjà 1 Lina) → +4
  (36, 2, 12, 0, 1),
  (37, 8, 12, 0, 1),
  (38, 14, 12, 0, 1),
  (39, 20, 12, 0, 1),
  -- ─── Salsa W1 S1 → +3
  (40, 5, 12, 1, 1),
  (41, 11, 12, 1, 1),
  (42, 17, 12, 1, 1),

  -- ─── Anglais James (class 20) — W0 S1 Mar 18:30 (déjà 1 Julien) → +3
  (43, 9, 20, 0, 1),
  (44, 21, 20, 0, 1),
  (45, 27, 20, 0, 1),
  -- W1 S1 Mar 18:30 → +2
  (46, 3, 20, 1, 1),
  (47, 19, 20, 1, 1),

  -- ─── Pilates Emma (class 18) — W1 S1 Mar 12:15 → +3
  (48, 4, 18, 1, 1),
  (49, 10, 18, 1, 1),
  (50, 22, 18, 1, 1),

  -- ─── DJ Hill's (class 15) — W0 S1 Mer 18:00 → +1 (capacity 2)
  (51, 13, 15, 0, 1),

  -- ─── Yoga Doux Clara (class 11) — W0 S1 Mar 10:00 → +3
  (52, 18, 11, 0, 1),
  (53, 25, 11, 0, 1),
  (54, 30, 11, 0, 1),

  -- ─── Cross Training Maxime (class 17) — W1 S3 Sam 11:00 (déjà 1 Lucas abo) → +3
  (55, 6, 17, 1, 3),
  (56, 16, 17, 1, 3),
  (57, 23, 17, 1, 3)
)
insert into public.bookings (
  id, user_id, session_id, class_id, teacher_id,
  status, price_total, commission_amount, teacher_amount, is_free,
  questionnaire_required, questionnaire_completed,
  session_starts_at, cancel_deadline, created_at
)
select
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbb' || lpad(bk.seq::text, 7, '0'))::uuid,
  ('55555555-5555-5555-5555-' || lpad(bk.user_n::text, 12, '0'))::uuid,
  s.id,
  c.id,
  c.teacher_id,
  'confirmed',
  c.price,
  round(c.price * 0.12, 2),
  round(c.price * 0.88, 2),
  c.is_free,
  false,
  false,
  s.starts_at,
  s.starts_at - (c.cancellation_hours_before * interval '1 hour'),
  now() - (random() * interval '5 days')
from bk
join public.class_sessions s on s.id = ('44444444-4444-4444-4444-' || lpad((bk.class_idx * 1000 + bk.week * 10 + bk.slot)::text, 12, '0'))::uuid
join public.classes c on c.id = ('33333333-3333-3333-3333-3333333330' || lpad(bk.class_idx::text, 2, '0'))::uuid
on conflict (id) do nothing;

-- ============================================================================
-- Done. Recap :
--   • 30 participants renommés avec de vrais noms
--   • 3 sessions historiques recalibrées (max = booked_count réel)
--   • 57 nouveaux bookings sur les sessions à venir (Sophie surtout)
-- ============================================================================
-- Verify with:
-- select count(*) from public.bookings where id::text like 'bbbbbbbb-%';  -- ~57
-- select round(avg(rate)::numeric, 1) as avg_fill_pct
--   from (select s.id, (s.booked_count::float / s.max_participants) * 100 as rate
--           from public.class_sessions s
--           join public.classes c on c.id = s.class_id
--          where c.teacher_id = '22222222-2222-2222-2222-222222222003') x;
