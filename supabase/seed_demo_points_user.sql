-- ============================================================================
-- KOUREO — Demo user WITH points history (pour démo)
-- ============================================================================
-- Credentials après exécution :
--   email    : marie.demo@koureo.test
--   password : Demo123456!
-- ============================================================================

-- 1. Create the auth user
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111119999',
  'authenticated', 'authenticated',
  'marie.demo@koureo.test',
  crypt('Demo123456!', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Marie Démo","role":"user"}',
  now(), now(), '', '', '', ''
) on conflict (id) do nothing;

-- 2. Award a rich history via the award_points function (idempotent)
-- Each call = one history row + balance increment.

-- Inscription
select public.award_points(
  '11111111-1111-1111-1111-111111119999', 'student', 'student_signup',
  'Bienvenue sur Koureo', 10, null, 'validated'
);

-- Première réservation
select public.award_points(
  '11111111-1111-1111-1111-111111119999', 'student', 'student_first_booking',
  'Première réservation', 10,
  '99999999-9999-9999-9999-999999990001', 'validated'
);

-- Cours effectué #1
select public.award_points(
  '11111111-1111-1111-1111-111111119999', 'student', 'student_completed_class',
  'Cours effectué', 15,
  '99999999-9999-9999-9999-999999990001', 'validated'
);

-- Nouvelle catégorie découverte
select public.award_points(
  '11111111-1111-1111-1111-111111119999', 'student', 'student_new_category_bonus',
  'Nouvelle catégorie : Danse', 30,
  null, 'validated'
);

-- Cours effectué #2
select public.award_points(
  '11111111-1111-1111-1111-111111119999', 'student', 'student_completed_class',
  'Cours effectué', 15,
  '99999999-9999-9999-9999-999999990002', 'validated'
);

-- Cours effectué #3 (comptera aussi comme bonus 3 dans le mois)
select public.award_points(
  '11111111-1111-1111-1111-111111119999', 'student', 'student_completed_class',
  'Cours effectué', 15,
  '99999999-9999-9999-9999-999999990003', 'validated'
);

-- Bonus 3 cours ce mois
select public.award_points(
  '11111111-1111-1111-1111-111111119999', 'student', 'student_3_bookings_month_bonus',
  'Bonus 3 cours ce mois', 20, null, 'validated'
);

-- Ami parrainé qui réserve
select public.award_points(
  '11111111-1111-1111-1111-111111119999', 'student', 'student_referral_first_booking',
  'Ami parrainé qui réserve', 50,
  '99999999-9999-9999-9999-999999990099', 'validated'
);

-- Cours effectué #4 (l'ami parrainé)
select public.award_points(
  '11111111-1111-1111-1111-111111119999', 'student', 'student_completed_class',
  'Cours effectué', 15,
  '99999999-9999-9999-9999-999999990004', 'validated'
);

-- Total attendu : 10 + 10 + 15 + 30 + 15 + 15 + 20 + 50 + 15 = 180 points

-- Vérif
select total_points from public.user_points
  where user_id = '11111111-1111-1111-1111-111111119999';
