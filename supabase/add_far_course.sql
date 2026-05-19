-- Ajoute un prof + cours éloigné (Villejean, ~1.9km de la position user)
-- Copie-colle ce script dans Supabase → SQL Editor → Run

-- 1. Auth user (Thomas Dubois)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111005',
  'authenticated', 'authenticated',
  'thomas@koureo.demo',
  crypt('Demo123456!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Thomas Dubois","role":"pro"}',
  now(), now(), '', '', '', ''
) on conflict (id) do nothing;

-- 2. Teacher profile (~1.9km nord-ouest du user)
insert into public.teacher_profiles (
  id, user_id, kind, status, display_name, bio, photo_url, categories,
  address, latitude, longitude,
  rating, review_count, free_classes_completed,
  avg_validation_score, validation_response_count,
  certified_at, stripe_account_id
) values (
  '22222222-2222-2222-2222-222222222005',
  '11111111-1111-1111-1111-111111111005',
  'particulier', 'certified_teacher',
  'Thomas Dubois',
  'Coach de boxe anglaise, 8 ans d''expérience. Je donne mes cours dans mon club à Villejean — un peu excentré mais la salle vaut le détour !',
  'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80',
  array['Sport']::text[],
  '15 Avenue Gaston Berger, Villejean, Rennes', 48.125, -1.695,
  4.8, 42, 3, 4.8, 42,
  '2024-08-10T00:00:00Z', null
) on conflict (id) do nothing;

-- 3. Class
insert into public.classes (
  id, teacher_id, title, category, format, level,
  duration_minutes, price, is_free, max_participants,
  description, image_url, cancellation_hours_before
) values (
  '33333333-3333-3333-3333-333333333007',
  '22222222-2222-2222-2222-222222222005',
  'Boxe Anglaise Initiation', 'Sport', 'group', 'beginner',
  60, 12, false, 10,
  'Cours découverte : garde, déplacements, premiers coups de poing. Gants et bandes fournis. Salle équipée, ring pro.',
  'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=80',
  48
) on conflict (id) do nothing;

-- 4. Sessions (3 créneaux)
insert into public.class_sessions (
  id, class_id, starts_at, ends_at, booked_count, max_participants, status
) values
  ('44444444-4444-4444-4444-440000000071', '33333333-3333-3333-3333-333333333007',
    date_trunc('day', now()) + interval '18 hours',
    date_trunc('day', now()) + interval '18 hours' + interval '60 minutes', 2, 10, 'open'),
  ('44444444-4444-4444-4444-440000000072', '33333333-3333-3333-3333-333333333007',
    date_trunc('day', now()) + interval '1 day 18 hours',
    date_trunc('day', now()) + interval '1 day 18 hours' + interval '60 minutes', 5, 10, 'open'),
  ('44444444-4444-4444-4444-440000000073', '33333333-3333-3333-3333-333333333007',
    date_trunc('day', now()) + interval '3 day 18 hours',
    date_trunc('day', now()) + interval '3 day 18 hours' + interval '60 minutes', 1, 10, 'open')
on conflict (id) do nothing;
