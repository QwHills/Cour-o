-- ============================================================================
-- KOUREO — Seed data for development / demo
-- ============================================================================
-- Run this AFTER schema.sql, in the Supabase SQL Editor.
-- Idempotent: uses ON CONFLICT DO NOTHING so you can re-run safely.
--
-- What it creates:
--   • 4 demo auth users (Alex, Marie, Sophie, James) with deterministic UUIDs
--   • 4 public.users rows (auto-created by the trigger on auth user insert)
--   • 4 teacher_profiles (new_teacher, under_review, certified, professional)
--   • 6 classes (2 free, 4 paid)
--   • 18 class_sessions (3 per class, spread over the next 3 days)
--
-- Demo passwords are all: Demo123456!
-- You can sign in in the app with e.g. sophie@koureo.demo / Demo123456!
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Demo auth.users
-- ---------------------------------------------------------------------------
-- Insert directly into auth.users (dev-only pattern). The on_auth_user_created
-- trigger will auto-populate public.users with name + role from raw_user_meta_data.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111001',
    'authenticated', 'authenticated',
    'alex@koureo.demo',
    crypt('Demo123456!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Alex Moreau","role":"pro"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111002',
    'authenticated', 'authenticated',
    'marie@koureo.demo',
    crypt('Demo123456!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Marie Lefèvre","role":"pro"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111003',
    'authenticated', 'authenticated',
    'sophie@koureo.demo',
    crypt('Demo123456!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Sophie Martin","role":"pro"}',
    now(), now(), '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111004',
    'authenticated', 'authenticated',
    'james@koureo.demo',
    crypt('Demo123456!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"James Wilson","role":"pro"}',
    now(), now(), '', '', '', ''
  )
on conflict (id) do nothing;

-- Safety: if the trigger didn't fire (e.g. re-seed), ensure public.users rows exist
insert into public.users (id, email, name, role)
select id, email, coalesce(raw_user_meta_data->>'name', email), coalesce(raw_user_meta_data->>'role', 'user')
from auth.users
where id in (
  '11111111-1111-1111-1111-111111111001',
  '11111111-1111-1111-1111-111111111002',
  '11111111-1111-1111-1111-111111111003',
  '11111111-1111-1111-1111-111111111004'
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Teacher profiles
-- ---------------------------------------------------------------------------
insert into public.teacher_profiles (
  id, user_id, kind, status, display_name, bio, photo_url, categories,
  address, latitude, longitude,
  rating, review_count, free_classes_completed,
  avg_validation_score, validation_response_count,
  certified_at, stripe_account_id,
  vat_regime, vat_number, legal_name, siret,
  photo_place, photo_self, photo_activity
) values
  (
    '22222222-2222-2222-2222-222222222001',
    '11111111-1111-1111-1111-111111111001',
    'particulier', 'new_teacher',
    'Alex Moreau',
    'Passionné de salsa depuis 5 ans, je souhaite partager ma passion. Débutant sur la plateforme — cours d''initiation gratuits pour me lancer !',
    'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&q=80',
    array['Danse']::text[],
    '12 Rue Saint-Michel, Rennes', 48.1108, -1.6795,
    0, 0, 1, 0, 0,
    null, null, null, null, null, null, null, null, null
  ),
  (
    '22222222-2222-2222-2222-222222222002',
    '11111111-1111-1111-1111-111111111002',
    'particulier', 'under_review',
    'Marie Lefèvre',
    'Céramiste amateure. J''ai déjà donné mes 3 premiers cours gratuits, et j''attends d''être certifiée pour proposer des ateliers payants.',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80',
    array['Créatif']::text[],
    '5 Rue de Dinan, Rennes', 48.114, -1.683,
    4.2, 3, 3, 4.2, 3,
    null, null, null, null, null, null, null, null, null
  ),
  (
    '22222222-2222-2222-2222-222222222003',
    '11111111-1111-1111-1111-111111111003',
    'particulier', 'certified_teacher',
    'Sophie Martin',
    'Prof de yoga certifiée 500h. J''enseigne Vinyasa et Yin depuis 6 ans dans le centre de Rennes.',
    'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&q=80',
    array['Sport']::text[],
    '8 Place de la République, Rennes', 48.11, -1.6785,
    4.9, 89, 3, 4.9, 89,
    '2024-06-15T00:00:00Z', null,
    'non_assujetti', null, 'Sophie Martin', '987 654 321 00015',
    'https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&q=80',
    'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800&q=80',
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80'
  ),
  (
    '22222222-2222-2222-2222-222222222004',
    '11111111-1111-1111-1111-111111111004',
    'professional', 'professional',
    'James Wilson',
    'Native English speaker from London. Professeur d''anglais diplômé, CELTA certified, 10+ ans d''expérience.',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
    array['Langues']::text[],
    '22 Rue Saint-Georges, Rennes', 48.1125, -1.6815,
    4.7, 56, 0, 4.7, 56,
    null, 'acct_mock_james',
    'tva_20', 'FR32123456789', 'Wilson English SARL', '123 456 789 00012',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80',
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80'
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Classes
-- ---------------------------------------------------------------------------
insert into public.classes (
  id, teacher_id, title, category, format, level,
  duration_minutes, price, is_free, max_participants,
  description, image_url, cancellation_hours_before
) values
  (
    '33333333-3333-3333-3333-333333333001',
    '22222222-2222-2222-2222-222222222001',
    'Salsa Découverte', 'Danse', 'group', 'beginner',
    60, 0, true, 8,
    'Première initiation à la salsa cubaine ! Pas besoin de partenaire, rotation pendant le cours. Je débute comme prof sur la plateforme — cette session est gratuite.',
    'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&q=80',
    48
  ),
  (
    '33333333-3333-3333-3333-333333333002',
    '22222222-2222-2222-2222-222222222003',
    'Yoga du Matin', 'Sport', 'group', 'all',
    60, 15, false, 12,
    'Vinyasa flow doux pour bien commencer la journée. Respirations, postures dynamiques, méditation finale. Tapis fournis.',
    'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80',
    48
  ),
  (
    '33333333-3333-3333-3333-333333333003',
    '22222222-2222-2222-2222-222222222004',
    'English Conversation', 'Langues', 'group', 'intermediate',
    60, 10, false, 6,
    'Practice your English in a cozy café setting. Free discussion, role-plays, pronunciation games.',
    'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80',
    48
  ),
  (
    '33333333-3333-3333-3333-333333333004',
    '22222222-2222-2222-2222-222222222002',
    'Poterie Initiation', 'Créatif', 'group', 'all',
    120, 0, true, 5,
    'Atelier découverte de la poterie : modelage, premiers tours. Argile et outils fournis. J''attends ma certification pour proposer des ateliers payants.',
    'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80',
    48
  ),
  (
    '33333333-3333-3333-3333-333333333005',
    '22222222-2222-2222-2222-222222222004',
    'DJ Débutant', 'Créatif', 'group', 'beginner',
    120, 20, false, 8,
    'Initiation au DJing : mixage, transitions, effets. Platines Pioneer pro fournies. Ambiance conviviale garantie.',
    'https://images.unsplash.com/photo-1571266028243-d220c6a8b0e5?w=800&q=80',
    48
  ),
  (
    '33333333-3333-3333-3333-333333333006',
    '22222222-2222-2222-2222-222222222003',
    'Yin Yoga Restoratif', 'Sport', 'group', 'all',
    75, 18, false, 10,
    'Séance Yin : postures tenues longtemps pour relâcher les tensions profondes. Idéal en fin de journée.',
    'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80',
    48
  )
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Class sessions (3 per class, today/tomorrow/in 3 days)
-- ---------------------------------------------------------------------------
-- Helper: compute session start/end based on day offset + hour
-- We generate 18 rows manually with deterministic UUIDs for idempotency.

insert into public.class_sessions (
  id, class_id, starts_at, ends_at, booked_count, max_participants, status
) values
  -- Salsa Découverte (60min, hour 19)
  ('44444444-4444-4444-4444-440000000011', '33333333-3333-3333-3333-333333333001', date_trunc('day', now()) + interval '19 hours',                      date_trunc('day', now()) + interval '19 hours' + interval '60 minutes',  2, 8, 'open'),
  ('44444444-4444-4444-4444-440000000012', '33333333-3333-3333-3333-333333333001', date_trunc('day', now()) + interval '1 day 19 hours',                date_trunc('day', now()) + interval '1 day 19 hours' + interval '60 minutes',  4, 8, 'open'),
  ('44444444-4444-4444-4444-440000000013', '33333333-3333-3333-3333-333333333001', date_trunc('day', now()) + interval '3 day 19 hours',                date_trunc('day', now()) + interval '3 day 19 hours' + interval '60 minutes',  0, 8, 'open'),

  -- Yoga du Matin (60min, hour 8)
  ('44444444-4444-4444-4444-440000000021', '33333333-3333-3333-3333-333333333002', date_trunc('day', now()) + interval '8 hours',                       date_trunc('day', now()) + interval '8 hours' + interval '60 minutes',   3, 12, 'open'),
  ('44444444-4444-4444-4444-440000000022', '33333333-3333-3333-3333-333333333002', date_trunc('day', now()) + interval '1 day 8 hours',                 date_trunc('day', now()) + interval '1 day 8 hours' + interval '60 minutes',   7, 12, 'open'),
  ('44444444-4444-4444-4444-440000000023', '33333333-3333-3333-3333-333333333002', date_trunc('day', now()) + interval '3 day 8 hours',                 date_trunc('day', now()) + interval '3 day 8 hours' + interval '60 minutes',   1, 12, 'open'),

  -- English Conversation (60min, hour 18)
  ('44444444-4444-4444-4444-440000000031', '33333333-3333-3333-3333-333333333003', date_trunc('day', now()) + interval '18 hours',                      date_trunc('day', now()) + interval '18 hours' + interval '60 minutes',  1, 6, 'open'),
  ('44444444-4444-4444-4444-440000000032', '33333333-3333-3333-3333-333333333003', date_trunc('day', now()) + interval '1 day 18 hours',                date_trunc('day', now()) + interval '1 day 18 hours' + interval '60 minutes',  3, 6, 'open'),
  ('44444444-4444-4444-4444-440000000033', '33333333-3333-3333-3333-333333333003', date_trunc('day', now()) + interval '3 day 18 hours',                date_trunc('day', now()) + interval '3 day 18 hours' + interval '60 minutes',  0, 6, 'open'),

  -- Poterie (120min, hour 14)
  ('44444444-4444-4444-4444-440000000041', '33333333-3333-3333-3333-333333333004', date_trunc('day', now()) + interval '14 hours',                      date_trunc('day', now()) + interval '14 hours' + interval '120 minutes', 1, 5, 'open'),
  ('44444444-4444-4444-4444-440000000042', '33333333-3333-3333-3333-333333333004', date_trunc('day', now()) + interval '1 day 14 hours',                date_trunc('day', now()) + interval '1 day 14 hours' + interval '120 minutes', 3, 5, 'open'),
  ('44444444-4444-4444-4444-440000000043', '33333333-3333-3333-3333-333333333004', date_trunc('day', now()) + interval '3 day 14 hours',                date_trunc('day', now()) + interval '3 day 14 hours' + interval '120 minutes', 0, 5, 'open'),

  -- DJ (120min, hour 20)
  ('44444444-4444-4444-4444-440000000051', '33333333-3333-3333-3333-333333333005', date_trunc('day', now()) + interval '20 hours',                      date_trunc('day', now()) + interval '20 hours' + interval '120 minutes', 2, 8, 'open'),
  ('44444444-4444-4444-4444-440000000052', '33333333-3333-3333-3333-333333333005', date_trunc('day', now()) + interval '1 day 20 hours',                date_trunc('day', now()) + interval '1 day 20 hours' + interval '120 minutes', 4, 8, 'open'),
  ('44444444-4444-4444-4444-440000000053', '33333333-3333-3333-3333-333333333005', date_trunc('day', now()) + interval '3 day 20 hours',                date_trunc('day', now()) + interval '3 day 20 hours' + interval '120 minutes', 0, 8, 'open'),

  -- Yin Yoga (75min, hour 17)
  ('44444444-4444-4444-4444-440000000061', '33333333-3333-3333-3333-333333333006', date_trunc('day', now()) + interval '17 hours',                      date_trunc('day', now()) + interval '17 hours' + interval '75 minutes',  3, 10, 'open'),
  ('44444444-4444-4444-4444-440000000062', '33333333-3333-3333-3333-333333333006', date_trunc('day', now()) + interval '1 day 17 hours',                date_trunc('day', now()) + interval '1 day 17 hours' + interval '75 minutes',  6, 10, 'open'),
  ('44444444-4444-4444-4444-440000000063', '33333333-3333-3333-3333-333333333006', date_trunc('day', now()) + interval '3 day 17 hours',                date_trunc('day', now()) + interval '3 day 17 hours' + interval '75 minutes',  1, 10, 'open')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Demo review participants (30 fake auth users)
-- ---------------------------------------------------------------------------
-- These participants exist so that historical bookings & questionnaires below
-- reference real user_ids. We never log in as them. The on_auth_user_created
-- trigger on auth.users auto-creates public.users rows.

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
)
select
  '00000000-0000-0000-0000-000000000000',
  ('55555555-5555-5555-5555-' || lpad(n::text, 12, '0'))::uuid,
  'authenticated', 'authenticated',
  'demo_participant_' || n || '@koureo.demo',
  crypt('Demo123456!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  ('{"name":"Participant ' || n || '","role":"user"}')::jsonb,
  now(), now(), '', '', '', ''
from generate_series(1, 30) n
on conflict (id) do nothing;

-- Safety: ensure public.users rows exist (trigger might have been dropped/re-run)
insert into public.users (id, email, name, role)
select id, email,
       coalesce(raw_user_meta_data->>'name', email),
       coalesce(raw_user_meta_data->>'role', 'user')
from auth.users
where id::text like '55555555-5555-5555-5555-%'
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 6. Past demo sessions (one per teacher with historical reviews)
-- ---------------------------------------------------------------------------
-- High max_participants to bypass the capacity_not_exceeded check.
-- We use status = 'past' so they don't show up in browsing.

insert into public.class_sessions (
  id, class_id, starts_at, ends_at, booked_count, max_participants, status
) values
  -- Marie's past session (Poterie Initiation)
  ('66666666-6666-6666-6666-666666000002',
   '33333333-3333-3333-3333-333333333004',
   now() - interval '30 days',
   now() - interval '30 days' + interval '120 minutes',
   0, 1000, 'past'),
  -- Sophie's past session (Yoga du Matin)
  ('66666666-6666-6666-6666-666666000003',
   '33333333-3333-3333-3333-333333333002',
   now() - interval '60 days',
   now() - interval '60 days' + interval '60 minutes',
   0, 1000, 'past'),
  -- James's past session (English Conversation)
  ('66666666-6666-6666-6666-666666000004',
   '33333333-3333-3333-3333-333333333003',
   now() - interval '45 days',
   now() - interval '45 days' + interval '60 minutes',
   0, 1000, 'past')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 7. Past demo bookings (status = 'completed', 1 per historical review)
-- ---------------------------------------------------------------------------
-- We insert bookings with status = 'completed' so the capacity trigger
-- (which fires only on status = 'confirmed') doesn't increment booked_count.
-- tnum is a single-digit teacher index used as a UUID segment:
--   2 = Marie,  3 = Sophie,  4 = James

with teacher_config as (
  select teacher_id::uuid, class_id::uuid, session_id::uuid,
         review_count, tnum
  from (values
    ('22222222-2222-2222-2222-222222222002',
     '33333333-3333-3333-3333-333333333004',
     '66666666-6666-6666-6666-666666000002', 3,  2),
    ('22222222-2222-2222-2222-222222222003',
     '33333333-3333-3333-3333-333333333002',
     '66666666-6666-6666-6666-666666000003', 89, 3),
    ('22222222-2222-2222-2222-222222222004',
     '33333333-3333-3333-3333-333333333003',
     '66666666-6666-6666-6666-666666000004', 56, 4)
  ) as t(teacher_id, class_id, session_id, review_count, tnum)
)
insert into public.bookings (
  id, user_id, session_id, class_id, teacher_id,
  status, price_total, commission_amount, teacher_amount, is_free,
  questionnaire_required, questionnaire_completed,
  session_starts_at, cancel_deadline, created_at
)
select
  ('77777777-7777-7777-7777-' || tc.tnum || lpad(n::text, 11, '0'))::uuid,
  ('55555555-5555-5555-5555-' || lpad((((n - 1) % 30) + 1)::text, 12, '0'))::uuid,
  tc.session_id,
  tc.class_id,
  tc.teacher_id,
  'completed',
  0, 0, 0, true,
  false, true,
  now() - (tc.review_count - n + 1) * interval '4 days',
  now() - (tc.review_count - n + 3) * interval '4 days',
  now() - (tc.review_count - n + 2) * interval '4 days'
from teacher_config tc, generate_series(1, tc.review_count) n
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 8. Historical validation_questionnaires
-- ---------------------------------------------------------------------------
-- Ratings distribution per teacher (matches mockQuestionnaires.ts):
--   Marie  (under_review):     3 rows → 2×4★ + 1×5★   → avg 4.33
--   Sophie (certified):       89 rows → 9×4★ + 80×5★  → avg 4.90
--   James  (professional):    56 rows → 16×4★ + 40×5★ → avg 4.71
-- q2_as_described is false for 4-star reviews (matches mocks for variety).

-- comments[k] is attached to the k-th most recent review (k=1 = newest).
-- When k exceeds the array length, SQL returns NULL, leaving the review
-- comment-less (realistic: most participants don't leave a comment).

with teacher_config as (
  select teacher_id::uuid, class_id::uuid, session_id::uuid,
         review_count, four_star_count, tnum, comments
  from (values
    (
      '22222222-2222-2222-2222-222222222002',
      '33333333-3333-3333-3333-333333333004',
      '66666666-6666-6666-6666-666666000002', 3, 2, 2,
      array[
        'Cours un peu court mais Marie est très pédagogue.',
        NULL,
        'Très sympathique, beau matériel. Je reviendrai !'
      ]::text[]
    ),
    (
      '22222222-2222-2222-2222-222222222003',
      '33333333-3333-3333-3333-333333333002',
      '66666666-6666-6666-6666-666666000003', 89, 9, 3,
      array[
        'Sophie est une prof exceptionnelle. Séance de Vinyasa fluide, ambiance très apaisante. Je recommande les yeux fermés !',
        'Premier cours de yoga de ma vie et je ressors conquise. Sophie adapte les postures aux débutants, vraiment bienveillante.',
        'Cours de Yin très profond, beaucoup de relâchement. Lieu magnifique, petits effectifs, parfait pour se reconnecter.',
        'Je suis cliente depuis 6 mois et chaque séance est différente. Sophie connaît son métier, niveau exigeant mais accessible.',
        'Super ambiance, salle lumineuse et Sophie guide la respiration avec beaucoup de justesse. Pratique complète.',
        'Vinyasa dynamique mais sans jamais pousser dans ses retranchements. J''ai bien transpiré et me sens régénérée !',
        'Une vraie pédagogue. Elle corrige les postures avec douceur, explique l''intention de chaque asana. Top.',
        'Cours du mardi soir génial pour décompresser après le boulot. Sophie est aussi très à l''écoute avant la séance.',
        'Très bon rapport qualité/prix pour la région rennaise. Sophie prend le temps d''accueillir chacun individuellement.',
        'J''apprécie particulièrement la méditation guidée de fin de séance. On repart vraiment zen.',
        'Sophie maîtrise son sujet, on sent les 500h de formation derrière. Cours structuré, progression claire.',
        'Endroit calme en plein centre-ville, c''est un vrai petit cocon. Sophie accueille toujours avec un grand sourire.',
        'Yin yoga du dimanche matin = mon rituel. Sophie crée une vraie bulle hors du temps.',
        'J''ai essayé plein de profs à Rennes, Sophie est de loin la plus pédagogue. Je recommande à mes collègues.',
        'Petit groupe de 8 max, du coup Sophie passe voir tout le monde. Gros plus vs les grands studios anonymes.',
        'Cours exigeant niveau intermédiaire, pile ce que je cherchais. Bonne variété de flows d''une semaine à l''autre.',
        'Un seul bémol : les créneaux partent vite ! Pensez à réserver tôt. Cours au top sinon.',
        'Sophie propose vraiment des alternatives pour chaque posture selon ton niveau. J''ai beaucoup progressé en 3 mois.',
        'Vraiment professionnelle, ponctuelle, le matériel est impeccable. Je reprendrai à la rentrée.',
        'Séance restorative du vendredi soir, pur moment de lâcher-prise. Merci Sophie !'
      ]::text[]
    ),
    (
      '22222222-2222-2222-2222-222222222004',
      '33333333-3333-3333-3333-333333333003',
      '66666666-6666-6666-6666-666666000004', 56, 16, 4,
      array[
        'James est patient et pédagogue, parfait pour reprendre confiance à l''oral. Beaucoup de jeux de rôles, on ne s''ennuie jamais.',
        'Native speaker, ça s''entend ! Accent britannique authentique, vocabulaire riche. Je progresse vite en conversation.',
        'Cours en petit groupe (6 max), on a tous largement le temps de parler. James corrige sans interrompre, top.',
        'Great teacher. Lessons are well structured, mix of grammar drills and free talk. Highly recommended.',
        'J''avais besoin de préparer un entretien pro en anglais, James m''a coaché sur 4 séances. Job obtenu !',
        'Ambiance café très agréable, on oublie qu''on apprend. Idéal pour pratiquer sans la pression du cadre scolaire.',
        'Les role-plays sur des situations pro (meetings, calls, presentations) sont hyper utiles au quotidien.',
        'James adapte le niveau individuellement même en groupe. Mon mari est avancé, moi intermédiaire, on est tous les deux challengés.',
        'Super prof, vrais échanges culturels sur UK, humour british inclus. Pas juste de la grammaire sèche.',
        '10 ans de cours particuliers derrière moi — James est dans le top 3. CELTA + expérience = combo gagnant.',
        'Format conversation game-changer. En 2 mois je me suis débloquée à l''oral, je tiens des discussions en anglais maintenant.',
        'Recommande les yeux fermés pour niveau intermédiaire qui veulent passer un cap. Pour débutants complets c''est peut-être trop direct.',
        'James sait créer une bonne ambiance, tout le monde ose parler même les plus timides. Bravo.',
        'Très bons supports pédagogiques, il envoie un récap après chaque cours avec les expressions vues.',
        'Flexible et réactif pour caler des créneaux, même en dernière minute. Vrai pro.',
        'James challenge sans brusquer. Sortie de ma zone de confort à chaque cours = gros progrès.'
      ]::text[]
    )
  ) as t(teacher_id, class_id, session_id, review_count, four_star_count, tnum, comments)
)
insert into public.validation_questionnaires (
  id, booking_id, class_id, session_id, teacher_id, user_id,
  q1_on_time, q2_as_described, q3_serious, q4_recommend, q5_rating,
  comment, created_at
)
select
  ('88888888-8888-8888-8888-' || tc.tnum || lpad(n::text, 11, '0'))::uuid,
  ('77777777-7777-7777-7777-' || tc.tnum || lpad(n::text, 11, '0'))::uuid,
  tc.class_id,
  tc.session_id,
  tc.teacher_id,
  ('55555555-5555-5555-5555-' || lpad((((n - 1) % 30) + 1)::text, 12, '0'))::uuid,
  true,
  n > tc.four_star_count,
  true,
  true,
  case when n <= tc.four_star_count then 4 else 5 end,
  tc.comments[tc.review_count - n + 1],  -- newest-first: highest n = most recent = first comment
  now() - (tc.review_count - n + 1) * interval '4 days'
from teacher_config tc, generate_series(1, tc.review_count) n
on conflict (id) do nothing;

-- ============================================================================
-- Done. Verify with:
--   select count(*) from public.teacher_profiles;              -- expected: 4
--   select count(*) from public.classes;                       -- expected: 6
--   select count(*) from public.class_sessions;                -- expected: 21 (18 + 3 past)
--   select count(*) from public.users where id::text like '55555555%';   -- 30
--   select count(*) from public.bookings;                      -- 148 (3+89+56)
--   select count(*) from public.validation_questionnaires;     -- 148
--   select teacher_id, count(*), round(avg(q5_rating)::numeric, 2)
--     from public.validation_questionnaires group by teacher_id;
--   -- expected:
--   --   Marie  → 3  rows, 4.33
--   --   Sophie → 89 rows, 4.90
--   --   James  → 56 rows, 4.71
-- ============================================================================
