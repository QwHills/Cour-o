-- ============================================================================
-- KOUREO — Seed Rennes (test data complet : profs, élèves, cours, réservations)
-- ============================================================================
-- À exécuter APRÈS schema.sql, organizations_migration.sql, et seed.sql.
-- 100% idempotent (ON CONFLICT DO NOTHING) — safe à relancer.
--
-- Ajoute :
--   • 18 NOUVEAUX professeurs (clara, miguel, lea, thomas, hills, camille,
--     maxime, emma, nadia, ana, juliette, louise, marco, manon, antoine,
--     sarah, alice, chloe)
--   • 6 élèves (marie.dupont, hugo, lina, lucas, emmapetit, julien)
--   • 20 cours répartis sur 11 catégories (Yoga, Danse, Musique, Sport,
--     Bien-être, Langues, Créatif, Cuisine, Développement personnel, Enfants)
--   • Sessions sur 4 semaines à venir
--   • Produits (packs + abonnements) tels que définis par cours
--   • Crédits wallets + abonnements actifs pour les bookings demandés
--   • 10 réservations spécifiques + edge cases (cours complet, cours annulé,
--     cours avec 1 place restante)
--
-- ⚠️ CONFLIT EMAIL :
--   marie@koureo.demo est déjà pris par Marie LEFÈVRE (prof poterie existante).
--   La nouvelle "Marie DUPONT" (étudiante) utilise donc marie.dupont@koureo.demo.
--   Mot de passe : Demo123456!
--
-- Tous les mots de passe : Demo123456!
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. AUTH USERS (18 NEW TEACHERS)
-- ----------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111010', 'authenticated', 'authenticated', 'clara@koureo.demo',     crypt('Demo123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Clara Le Goff","role":"pro"}',     now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111011', 'authenticated', 'authenticated', 'miguel@koureo.demo',    crypt('Demo123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Miguel Alvarez","role":"pro"}',    now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111012', 'authenticated', 'authenticated', 'lea@koureo.demo',       crypt('Demo123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Léa Fontaine","role":"pro"}',      now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111013', 'authenticated', 'authenticated', 'thomas@koureo.demo',    crypt('Demo123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Thomas Briand","role":"pro"}',     now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111014', 'authenticated', 'authenticated', 'hills@koureo.demo',     crypt('Demo123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Hill''s","role":"pro"}',           now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111015', 'authenticated', 'authenticated', 'camille@koureo.demo',   crypt('Demo123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Camille Renaud","role":"pro"}',    now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111016', 'authenticated', 'authenticated', 'maxime@koureo.demo',    crypt('Demo123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Maxime Rolland","role":"pro"}',    now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111017', 'authenticated', 'authenticated', 'emma@koureo.demo',      crypt('Demo123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Emma Leclerc","role":"pro"}',      now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111018', 'authenticated', 'authenticated', 'nadia@koureo.demo',     crypt('Demo123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Nadia Kerbrat","role":"pro"}',     now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111019', 'authenticated', 'authenticated', 'ana@koureo.demo',       crypt('Demo123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Ana Ruiz","role":"pro"}',          now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111020', 'authenticated', 'authenticated', 'juliette@koureo.demo',  crypt('Demo123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Juliette Morvan","role":"pro"}',   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111021', 'authenticated', 'authenticated', 'louise@koureo.demo',    crypt('Demo123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Louise Garnier","role":"pro"}',    now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111022', 'authenticated', 'authenticated', 'marco@koureo.demo',     crypt('Demo123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Marco Bellini","role":"pro"}',     now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111023', 'authenticated', 'authenticated', 'manon@koureo.demo',     crypt('Demo123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Manon Duval","role":"pro"}',       now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111024', 'authenticated', 'authenticated', 'antoine@koureo.demo',   crypt('Demo123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Antoine Mercier","role":"pro"}',   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111025', 'authenticated', 'authenticated', 'sarah@koureo.demo',     crypt('Demo123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Sarah Lemoine","role":"pro"}',     now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111026', 'authenticated', 'authenticated', 'alice@koureo.demo',     crypt('Demo123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Alice Bernard","role":"pro"}',     now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111027', 'authenticated', 'authenticated', 'chloe@koureo.demo',     crypt('Demo123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Chloé Masson","role":"pro"}',      now(), now(), '', '', '', '')
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 2. AUTH USERS (6 STUDENTS)
-- ----------------------------------------------------------------------------
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
) values
  ('00000000-0000-0000-0000-000000000000', '99999999-9999-9999-9999-999999999001', 'authenticated', 'authenticated', 'marie.dupont@koureo.demo', crypt('Demo123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Marie Dupont","role":"user"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '99999999-9999-9999-9999-999999999002', 'authenticated', 'authenticated', 'hugo@koureo.demo',         crypt('Demo123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Hugo Bernard","role":"user"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '99999999-9999-9999-9999-999999999003', 'authenticated', 'authenticated', 'lina@koureo.demo',         crypt('Demo123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Lina Moreau","role":"user"}',  now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '99999999-9999-9999-9999-999999999004', 'authenticated', 'authenticated', 'lucas@koureo.demo',        crypt('Demo123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Lucas Martin","role":"user"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '99999999-9999-9999-9999-999999999005', 'authenticated', 'authenticated', 'emmapetit@koureo.demo',    crypt('Demo123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Emma Petit","role":"user"}',   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '99999999-9999-9999-9999-999999999006', 'authenticated', 'authenticated', 'julien@koureo.demo',       crypt('Demo123456!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Julien Robert","role":"user"}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 3. PUBLIC USERS — safety re-sync (in case the trigger was missed)
-- ----------------------------------------------------------------------------
insert into public.users (id, email, name, role)
select id, email,
       coalesce(raw_user_meta_data->>'name', email),
       coalesce(raw_user_meta_data->>'role', 'user')
from auth.users
where id in (
  '11111111-1111-1111-1111-111111111010','11111111-1111-1111-1111-111111111011',
  '11111111-1111-1111-1111-111111111012','11111111-1111-1111-1111-111111111013',
  '11111111-1111-1111-1111-111111111014','11111111-1111-1111-1111-111111111015',
  '11111111-1111-1111-1111-111111111016','11111111-1111-1111-1111-111111111017',
  '11111111-1111-1111-1111-111111111018','11111111-1111-1111-1111-111111111019',
  '11111111-1111-1111-1111-111111111020','11111111-1111-1111-1111-111111111021',
  '11111111-1111-1111-1111-111111111022','11111111-1111-1111-1111-111111111023',
  '11111111-1111-1111-1111-111111111024','11111111-1111-1111-1111-111111111025',
  '11111111-1111-1111-1111-111111111026','11111111-1111-1111-1111-111111111027',
  '99999999-9999-9999-9999-999999999001','99999999-9999-9999-9999-999999999002',
  '99999999-9999-9999-9999-999999999003','99999999-9999-9999-9999-999999999004',
  '99999999-9999-9999-9999-999999999005','99999999-9999-9999-9999-999999999006'
)
on conflict (id) do nothing;

-- Set city = Rennes for all students for personalisation
update public.users set city = 'Rennes'
 where id in (
   '99999999-9999-9999-9999-999999999001','99999999-9999-9999-9999-999999999002',
   '99999999-9999-9999-9999-999999999003','99999999-9999-9999-9999-999999999004',
   '99999999-9999-9999-9999-999999999005','99999999-9999-9999-9999-999999999006'
 );

-- ----------------------------------------------------------------------------
-- 4. TEACHER PROFILES (18 NEW)
-- ----------------------------------------------------------------------------
-- All certified except Hill's, Marco, Antoine = 'professional' (SIRET present)
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
    '22222222-2222-2222-2222-222222222010', '11111111-1111-1111-1111-111111111010',
    'particulier', 'certified_teacher',
    'Clara Le Goff',
    'Prof de yoga doux et de mobilité depuis 6 ans. Approche bienveillante adaptée à tous les corps, particulièrement aux débutants et aux personnes en reprise d''activité.',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
    array['Yoga']::text[],
    '8 quai Émile Zola, Rennes', 48.1086, -1.6797,
    4.8, 24, 3, 4.85, 24,
    now() - interval '60 days', null, null, null, null, null, null, null, null
  ),
  (
    '22222222-2222-2222-2222-222222222011', '11111111-1111-1111-1111-111111111011',
    'particulier', 'certified_teacher',
    'Miguel Alvarez',
    'Originaire de La Havane, j''enseigne la salsa cubaine depuis 10 ans. Mes cours mettent l''accent sur le rythme, le placement et la connexion entre partenaires.',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    array['Danse']::text[],
    '24 rue Saint-Hélier, Rennes', 48.1043, -1.6699,
    4.9, 47, 3, 4.92, 47,
    now() - interval '180 days', null, null, null, null, null, null, null, null
  ),
  (
    '22222222-2222-2222-2222-222222222012', '11111111-1111-1111-1111-111111111012',
    'particulier', 'certified_teacher',
    'Léa Fontaine',
    'Bachata sensual et travail de connexion. Je transmets ce que j''aime : la musicalité, la fluidité et le respect entre partenaires.',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80',
    array['Danse']::text[],
    '5 rue de la Visitation, Rennes', 48.1120, -1.6720,
    4.7, 18, 3, 4.78, 18,
    now() - interval '45 days', null, null, null, null, null, null, null, null
  ),
  (
    '22222222-2222-2222-2222-222222222013', '11111111-1111-1111-1111-111111111013',
    'particulier', 'certified_teacher',
    'Thomas Briand',
    'Guitariste et prof depuis 12 ans. J''adapte chaque cours à ton style musical : pop, folk, blues, accompagnement chant. Pédagogie progressive sans solfège lourd.',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&q=80',
    array['Musique']::text[],
    'Quartier Sainte-Thérèse, Rennes', 48.0939, -1.6663,
    4.9, 31, 3, 4.94, 31,
    now() - interval '210 days', null, null, null, null, null, null, null, null
  ),
  (
    '22222222-2222-2222-2222-222222222014', '11111111-1111-1111-1111-111111111014',
    'professional', 'professional',
    'Hill''s',
    'DJ producer depuis 2015, je transmets les bases du mix : calage tempo, transitions, construction de set. Studio équipé Pioneer + Rekordbox.',
    'https://images.unsplash.com/photo-1571266028243-d220c6a5b85b?w=400&q=80',
    array['Musique']::text[],
    'Rennes centre', 48.1119, -1.6800,
    5.0, 12, 3, 5.0, 12,
    now() - interval '365 days', null, 'tva_20', null, 'Hill''s Studio', '90123456700015', null, null, null
  ),
  (
    '22222222-2222-2222-2222-222222222015', '11111111-1111-1111-1111-111111111015',
    'particulier', 'certified_teacher',
    'Camille Renaud',
    'Pianiste et pédagogue formée au Conservatoire. J''accompagne les adultes débutants vers leurs premiers morceaux modernes (pop, ballades, BO de films) sans solfège pénible.',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
    array['Musique']::text[],
    '18 boulevard de la Liberté, Rennes', 48.1116, -1.6755,
    4.8, 22, 3, 4.83, 22,
    now() - interval '90 days', null, null, null, null, null, null, null, null
  ),
  (
    '22222222-2222-2222-2222-222222222016', '11111111-1111-1111-1111-111111111016',
    'particulier', 'certified_teacher',
    'Maxime Rolland',
    'Coach sportif diplômé. Cross training en plein air, peu importe la météo. Renforcement, cardio, mobilité : un format dynamique et accessible à tous les niveaux.',
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80',
    array['Sport']::text[],
    'Parc du Thabor, Rennes', 48.1148, -1.6700,
    4.9, 38, 3, 4.91, 38,
    now() - interval '120 days', null, null, null, null, null, null, null, null
  ),
  (
    '22222222-2222-2222-2222-222222222017', '11111111-1111-1111-1111-111111111017',
    'particulier', 'certified_teacher',
    'Emma Leclerc',
    'Pilates postural et bien-être. J''aide mes élèves à renforcer leurs muscles profonds, prévenir les douleurs et retrouver une posture juste au quotidien.',
    'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=400&q=80',
    array['Sport','Bien-être']::text[],
    '3 rue Duhamel, Rennes', 48.1067, -1.6724,
    4.8, 29, 3, 4.86, 29,
    now() - interval '75 days', null, null, null, null, null, null, null, null
  ),
  (
    '22222222-2222-2222-2222-222222222018', '11111111-1111-1111-1111-111111111018',
    'particulier', 'certified_teacher',
    'Nadia Kerbrat',
    'Sophrologue et professeur de méditation. J''anime des séances guidées de respiration consciente, méditation et relaxation profonde — accessibles aux complets débutants.',
    'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=400&q=80',
    array['Bien-être']::text[],
    '9 rue Vasselot, Rennes', 48.1106, -1.6772,
    4.9, 19, 3, 4.93, 19,
    now() - interval '50 days', null, null, null, null, null, null, null, null
  ),
  (
    '22222222-2222-2222-2222-222222222019', '11111111-1111-1111-1111-111111111019',
    'particulier', 'certified_teacher',
    'Ana Ruiz',
    'Native de Madrid, je donne des cours d''espagnol à distance depuis 5 ans. Mes cours débutants sont 100% pratiques : vocabulaire utile, conversations simples, culture hispanophone.',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80',
    array['Langues']::text[],
    'Cours en ligne (visio)', 48.1119, -1.6800,
    4.9, 26, 3, 4.88, 26,
    now() - interval '100 days', null, null, null, null, null, null, null, null
  ),
  (
    '22222222-2222-2222-2222-222222222020', '11111111-1111-1111-1111-111111111020',
    'particulier', 'certified_teacher',
    'Juliette Morvan',
    'Céramiste depuis 8 ans, j''accueille mes élèves dans mon atelier pour des séances de modelage. Tu repars avec ta création après cuisson (~10 jours).',
    'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80',
    array['Créatif']::text[],
    '14 rue d''Antrain, Rennes', 48.1146, -1.6789,
    4.8, 15, 3, 4.80, 15,
    now() - interval '70 days', null, null, null, null, null, null, null, null
  ),
  (
    '22222222-2222-2222-2222-222222222021', '11111111-1111-1111-1111-111111111021',
    'particulier', 'certified_teacher',
    'Louise Garnier',
    'Aquarelliste et illustratrice, je transmets les bases de l''aquarelle : couleurs, transparence, paysages simples. Petit groupe (max 6) pour un suivi personnalisé.',
    'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=400&q=80',
    array['Créatif']::text[],
    '6 rue Hoche, Rennes', 48.1113, -1.6741,
    4.7, 11, 3, 4.72, 11,
    now() - interval '40 days', null, null, null, null, null, null, null, null
  ),
  (
    '22222222-2222-2222-2222-222222222022', '11111111-1111-1111-1111-111111111022',
    'professional', 'professional',
    'Marco Bellini',
    'Chef italien à Rennes depuis 12 ans. Mes ateliers : pâtes fraîches maison, sauces traditionnelles et desserts italiens. Ambiance conviviale, dégustation incluse.',
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80',
    array['Cuisine']::text[],
    'Cuisine partagée Les Halles, Rennes', 48.1108, -1.6788,
    4.9, 41, 3, 4.95, 41,
    now() - interval '300 days', null, 'tva_20', null, 'Marco Bellini Cucina', '85234567800023', null, null, null
  ),
  (
    '22222222-2222-2222-2222-222222222023', '11111111-1111-1111-1111-111111111023',
    'particulier', 'certified_teacher',
    'Manon Duval',
    'Pâtissière formée à l''école Ferrandi. J''enseigne les techniques classiques : pâte à choux, tartes, crèmes, dressages élégants. Niveau intermédiaire.',
    'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80',
    array['Cuisine']::text[],
    '2 rue de Nemours, Rennes', 48.1115, -1.6802,
    4.8, 17, 3, 4.81, 17,
    now() - interval '85 days', null, null, null, null, null, null, null, null
  ),
  (
    '22222222-2222-2222-2222-222222222024', '11111111-1111-1111-1111-111111111024',
    'professional', 'professional',
    'Antoine Mercier',
    'Coach et formateur en prise de parole. 15 ans d''expérience auprès de cadres, étudiants et entrepreneurs. Méthode structurée, exercices pratiques, retours bienveillants.',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
    array['Développement personnel']::text[],
    'Coworking Roazhon, Rennes', 48.1100, -1.6800,
    4.9, 33, 3, 4.92, 33,
    now() - interval '400 days', null, 'tva_20', null, 'Antoine Mercier Coaching', '78345678900031', null, null, null
  ),
  (
    '22222222-2222-2222-2222-222222222025', '11111111-1111-1111-1111-111111111025',
    'particulier', 'certified_teacher',
    'Sarah Lemoine',
    'Comédienne et coach, j''anime des ateliers de théâtre et improvisation pour gagner en confiance. Pas besoin d''avoir joué — l''important c''est l''envie de s''amuser.',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
    array['Développement personnel']::text[],
    '11 rue Papu, Rennes', 48.1156, -1.6886,
    4.8, 21, 3, 4.84, 21,
    now() - interval '95 days', null, null, null, null, null, null, null, null
  ),
  (
    '22222222-2222-2222-2222-222222222026', '11111111-1111-1111-1111-111111111026',
    'particulier', 'certified_teacher',
    'Alice Bernard',
    'Animatrice musicale spécialisée enfance. J''éveille les 4-7 ans au rythme, aux sons et au chant à travers des jeux musicaux et instruments adaptés.',
    'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=400&q=80',
    array['Enfants','Musique']::text[],
    'Maison de quartier La Touche, Rennes', 48.1099, -1.6892,
    4.9, 28, 3, 4.89, 28,
    now() - interval '110 days', null, null, null, null, null, null, null, null
  ),
  (
    '22222222-2222-2222-2222-222222222027', '11111111-1111-1111-1111-111111111027',
    'particulier', 'certified_teacher',
    'Chloé Masson',
    'Prof de yoga formée à l''enseignement enfants. Mes séances parent-enfant sont ludiques, tendres et créent un beau moment de connexion.',
    'https://images.unsplash.com/photo-1599447332411-fcef5e9e34cb?w=400&q=80',
    array['Enfants','Yoga']::text[],
    'Studio Respire, 8 quai Émile Zola, Rennes', 48.1086, -1.6797,
    4.9, 16, 3, 4.93, 16,
    now() - interval '55 days', null, null, null, null, null, null, null, null
  )
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 5. CLASSES (20 cours, IDs 33333333-...-3333330XX)
-- ----------------------------------------------------------------------------
insert into public.classes (
  id, teacher_id, title, category, format, level, duration_minutes,
  price, is_free, max_participants, description, image_url, cancellation_hours_before, active
) values
  -- 1. Yoga Vinyasa — Sophie (existante)
  ('33333333-3333-3333-3333-333333333010', '22222222-2222-2222-2222-222222222003',
   'Yoga Vinyasa — Labo Yoga Rennes', 'Yoga', 'group', 'all', 60,
   18.00, false, 10,
   'Un cours dynamique pour renforcer le corps, améliorer la respiration et gagner en souplesse. Tous niveaux accueillis dans une ambiance bienveillante.',
   'https://images.unsplash.com/photo-1599447332411-fcef5e9e34cb?w=800&q=80', 48, true),

  -- 2. Yoga Doux & Mobilité — Clara
  ('33333333-3333-3333-3333-333333333011', '22222222-2222-2222-2222-222222222010',
   'Yoga Doux & Mobilité', 'Yoga', 'group', 'beginner', 60,
   16.00, false, 8,
   'Une pratique douce pour relâcher les tensions, améliorer la mobilité et se reconnecter au corps. Idéal pour les débutants ou en reprise d''activité.',
   'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&q=80', 48, true),

  -- 3. Salsa Cubaine Débutant — Miguel
  ('33333333-3333-3333-3333-333333333012', '22222222-2222-2222-2222-222222222011',
   'Salsa Cubaine Débutant', 'Danse', 'group', 'beginner', 75,
   14.00, false, 16,
   'Apprendre les bases de la salsa cubaine dans une ambiance conviviale : pas de base, tour, dégagés et premiers enchainements. Pas besoin de partenaire.',
   'https://images.unsplash.com/photo-1547153760-18fc86324498?w=800&q=80', 48, true),

  -- 4. Bachata Sensual Intermédiaire — Léa
  ('33333333-3333-3333-3333-333333333013', '22222222-2222-2222-2222-222222222012',
   'Bachata Sensual Intermédiaire', 'Danse', 'group', 'intermediate', 75,
   15.00, false, 14,
   'Travail de connexion, guidage, musicalité et figures fluides. Niveau intermédiaire requis (connaissance des pas de base).',
   'https://images.unsplash.com/photo-1504609813442-a8924e83f76e?w=800&q=80', 48, true),

  -- 5. Cours de guitare acoustique — Thomas
  ('33333333-3333-3333-3333-333333333014', '22222222-2222-2222-2222-222222222013',
   'Cours de guitare acoustique', 'Musique', 'individual', 'all', 45,
   32.00, false, 1,
   'Apprentissage des accords, rythmiques, morceaux connus et accompagnement chant. Cours individuel adapté à ton style et ton rythme.',
   'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?w=800&q=80', 48, true),

  -- 6. Initiation DJ — Hill's
  ('33333333-3333-3333-3333-333333333015', '22222222-2222-2222-2222-222222222014',
   'Initiation DJ', 'Musique', 'individual', 'beginner', 60,
   45.00, false, 2,
   'Découvrir les bases du mix, le calage tempo, les transitions et la construction d''un set. Studio équipé Pioneer + Rekordbox. Format solo ou duo.',
   'https://images.unsplash.com/photo-1571266028243-d220c6a5b85b?w=800&q=80', 48, true),

  -- 7. Piano débutant adulte — Camille
  ('33333333-3333-3333-3333-333333333016', '22222222-2222-2222-2222-222222222015',
   'Piano débutant adulte', 'Musique', 'individual', 'beginner', 45,
   38.00, false, 1,
   'Apprendre le piano progressivement, sans solfège lourd, avec des morceaux modernes. Programme adapté à tes goûts musicaux.',
   'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=800&q=80', 48, true),

  -- 8. Cross Training Outdoor — Maxime
  ('33333333-3333-3333-3333-333333333017', '22222222-2222-2222-2222-222222222016',
   'Cross Training Outdoor', 'Sport', 'group', 'all', 60,
   12.00, false, 15,
   'Renforcement musculaire, cardio et travail en groupe en extérieur. Intensité adaptée à ton niveau, ambiance motivante.',
   'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80', 48, true),

  -- 9. Pilates Postural — Emma L.
  ('33333333-3333-3333-3333-333333333018', '22222222-2222-2222-2222-222222222017',
   'Pilates Postural', 'Sport', 'group', 'all', 60,
   17.00, false, 10,
   'Renforcer les muscles profonds, améliorer la posture et prévenir les douleurs. Cours doux mais exigeant, accessible à tous.',
   'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=800&q=80', 48, true),

  -- 10. Méditation & Respiration — Nadia
  ('33333333-3333-3333-3333-333333333019', '22222222-2222-2222-2222-222222222018',
   'Méditation & Respiration', 'Bien-être', 'group', 'all', 45,
   10.00, false, 12,
   'Séance guidée de respiration, méditation et relaxation profonde. Aucun prérequis. Idéal pour décompresser après le travail ou commencer la journée en douceur.',
   'https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&q=80', 48, true),

  -- 11. Anglais conversation — James (existant)
  ('33333333-3333-3333-3333-333333333020', '22222222-2222-2222-2222-222222222004',
   'Anglais conversation', 'Langues', 'group', 'intermediate', 60,
   15.00, false, 6,
   'Pratiquer l''anglais à l''oral autour de sujets du quotidien, dans une ambiance détendue. Petit groupe (max 6), prof natif.',
   'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80', 48, true),

  -- 12. Espagnol débutant en ligne — Ana
  ('33333333-3333-3333-3333-333333333021', '22222222-2222-2222-2222-222222222019',
   'Espagnol débutant (en ligne)', 'Langues', 'group', 'beginner', 60,
   13.00, false, 8,
   'Apprendre les bases de l''espagnol : vocabulaire, phrases utiles et conversation simple. Cours en visio, pas besoin de te déplacer.',
   'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=800&q=80', 48, true),

  -- 13. Atelier poterie — Juliette
  ('33333333-3333-3333-3333-333333333022', '22222222-2222-2222-2222-222222222020',
   'Atelier poterie', 'Créatif', 'group', 'beginner', 120,
   35.00, false, 6,
   'Découvrir le modelage, créer une pièce simple et repartir avec sa création après cuisson (~10 jours). Tablier fourni, petit groupe.',
   'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800&q=80', 48, true),

  -- 14. Initiation aquarelle — Louise
  ('33333333-3333-3333-3333-333333333023', '22222222-2222-2222-2222-222222222021',
   'Initiation aquarelle', 'Créatif', 'group', 'beginner', 90,
   25.00, false, 6,
   'Apprendre les bases de l''aquarelle : couleurs, transparence, paysages simples et textures. Matériel fourni pour le premier cours.',
   'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&q=80', 48, true),

  -- 15. Cuisine italienne maison — Marco
  ('33333333-3333-3333-3333-333333333024', '22222222-2222-2222-2222-222222222022',
   'Cuisine italienne maison', 'Cuisine', 'group', 'all', 150,
   49.00, false, 10,
   'Préparer des pâtes fraîches, une sauce maison et un dessert italien dans une ambiance conviviale. Dégustation incluse, tabliers fournis.',
   'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80', 48, true),

  -- 16. Pâtisserie française — Manon
  ('33333333-3333-3333-3333-333333333025', '22222222-2222-2222-2222-222222222023',
   'Pâtisserie française', 'Cuisine', 'group', 'intermediate', 120,
   42.00, false, 8,
   'Techniques de base pour réussir choux, tartes, crèmes et dressages élégants. Tu repars avec tes créations.',
   'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80', 48, true),

  -- 17. Prise de parole en public — Antoine
  ('33333333-3333-3333-3333-333333333026', '22222222-2222-2222-2222-222222222024',
   'Prise de parole en public', 'Développement personnel', 'group', 'all', 90,
   30.00, false, 6,
   'Gagner en aisance, structurer son discours et mieux gérer le stress devant un groupe. Petit comité, mises en situation, retours bienveillants.',
   'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80', 48, true),

  -- 18. Confiance en soi par le théâtre — Sarah
  ('33333333-3333-3333-3333-333333333027', '22222222-2222-2222-2222-222222222025',
   'Confiance en soi par le théâtre', 'Développement personnel', 'group', 'all', 90,
   22.00, false, 10,
   'Exercices de théâtre, improvisation et expression corporelle pour gagner en confiance. Aucune expérience requise.',
   'https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&q=80', 48, true),

  -- 19. Éveil musical enfants — Alice
  ('33333333-3333-3333-3333-333333333028', '22222222-2222-2222-2222-222222222026',
   'Éveil musical enfants (4-7 ans)', 'Enfants', 'group', 'all', 45,
   12.00, false, 10,
   'Découverte du rythme, des sons, des instruments et du chant pour les enfants de 4 à 7 ans. Atelier ludique et progressif.',
   'https://images.unsplash.com/photo-1503944583220-79d8926ad5e2?w=800&q=80', 48, true),

  -- 20. Yoga parent-enfant — Chloé
  ('33333333-3333-3333-3333-333333333029', '22222222-2222-2222-2222-222222222027',
   'Yoga parent-enfant (3-8 ans)', 'Enfants', 'group', 'all', 45,
   20.00, false, 12,
   'Un moment ludique et doux pour bouger, respirer et partager une activité parent-enfant. Tarif duo (1 parent + 1 enfant).',
   'https://images.unsplash.com/photo-1599447332411-fcef5e9e34cb?w=800&q=80', 48, true)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 6. CLASS SESSIONS — 4 prochaines semaines pour chaque cours
-- ----------------------------------------------------------------------------
-- Helper: monday_base = lundi de cette semaine si on est lundi, sinon prochain lundi
-- Use date_trunc('week', x) returns Monday in PostgreSQL.
-- We use next Monday to ensure a fresh look-ahead.
--
-- Schema for each session UUID: '44444444-4444-4444-4444-XXYYZZ000000'
--   XX = class index (10..29), YY = week (00..03), ZZ = slot index (01..03)
-- ----------------------------------------------------------------------------

with base as (
  select date_trunc('week', now() + interval '7 days') as monday  -- next Monday at 00:00
),
-- (class_idx, weekday_offset_from_monday 0..6, time_offset, slot_idx, max_participants)
-- weekday: 0=Lundi, 1=Mardi, 2=Mercredi, 3=Jeudi, 4=Vendredi, 5=Samedi, 6=Dimanche
slots(class_idx, weekday, time_h, time_m, slot_idx, max_p, duration_min) as (values
  -- 1. Yoga Vinyasa Sophie : Lun 18:30, Mer 12:30, Sam 10:00
  (10, 0, 18, 30, 1, 10, 60),
  (10, 2, 12, 30, 2, 10, 60),
  (10, 5, 10,  0, 3, 10, 60),
  -- 2. Yoga Doux Clara : Mar 10:00, Jeu 18:00
  (11, 1, 10,  0, 1,  8, 60),
  (11, 3, 18,  0, 2,  8, 60),
  -- 3. Salsa Cubaine Miguel : Mar 19:00, Ven 20:00
  (12, 1, 19,  0, 1, 16, 75),
  (12, 4, 20,  0, 2, 16, 75),
  -- 4. Bachata Léa : Mer 20:30, Dim 17:00
  (13, 2, 20, 30, 1, 14, 75),
  (13, 6, 17,  0, 2, 14, 75),
  -- 5. Guitare Thomas : Lun 17:00, Mar 18:00, Jeu 19:00
  (14, 0, 17,  0, 1,  1, 45),
  (14, 1, 18,  0, 2,  1, 45),
  (14, 3, 19,  0, 3,  1, 45),
  -- 6. DJ Hill's : Mer 18:00, Sam 14:00, Sam 16:00
  (15, 2, 18,  0, 1,  2, 60),
  (15, 5, 14,  0, 2,  2, 60),
  (15, 5, 16,  0, 3,  2, 60),
  -- 7. Piano Camille : Lun 12:00, Mer 17:30, Ven 18:30
  (16, 0, 12,  0, 1,  1, 45),
  (16, 2, 17, 30, 2,  1, 45),
  (16, 4, 18, 30, 3,  1, 45),
  -- 8. Cross Training Maxime : Lun 7:30, Mer 7:30, Sam 11:00
  (17, 0,  7, 30, 1, 15, 60),
  (17, 2,  7, 30, 2, 15, 60),
  (17, 5, 11,  0, 3, 15, 60),
  -- 9. Pilates Emma : Mar 12:15, Jeu 19:00, Dim 10:30
  (18, 1, 12, 15, 1, 10, 60),
  (18, 3, 19,  0, 2, 10, 60),
  (18, 6, 10, 30, 3, 10, 60),
  -- 10. Méditation Nadia : Lun 20:00, Jeu 8:00
  (19, 0, 20,  0, 1, 12, 45),
  (19, 3,  8,  0, 2, 12, 45),
  -- 11. Anglais James : Mar 18:30, Sam 11:00
  (20, 1, 18, 30, 1,  6, 60),
  (20, 5, 11,  0, 2,  6, 60),
  -- 12. Espagnol Ana : Mer 19:00, Dim 18:00
  (21, 2, 19,  0, 1,  8, 60),
  (21, 6, 18,  0, 2,  8, 60),
  -- 13. Atelier poterie Juliette : Mer 18:30, Sam 15:00
  (22, 2, 18, 30, 1,  6, 120),
  (22, 5, 15,  0, 2,  6, 120),
  -- 14. Aquarelle Louise : Mar 18:00, Dim 14:00
  (23, 1, 18,  0, 1,  6, 90),
  (23, 6, 14,  0, 2,  6, 90),
  -- 15. Cuisine italienne Marco : Ven 19:00, Sam 11:00
  (24, 4, 19,  0, 1, 10, 150),
  (24, 5, 11,  0, 2, 10, 150),
  -- 16. Pâtisserie Manon : Sam 9:30, Dim 15:00
  (25, 5,  9, 30, 1,  8, 120),
  (25, 6, 15,  0, 2,  8, 120),
  -- 17. Prise de parole Antoine : Jeu 18:30, Sam 10:00
  (26, 3, 18, 30, 1,  6, 90),
  (26, 5, 10,  0, 2,  6, 90),
  -- 18. Théâtre Sarah : Mer 19:30, Dim 16:00
  (27, 2, 19, 30, 1, 10, 90),
  (27, 6, 16,  0, 2, 10, 90),
  -- 19. Éveil musical Alice : Mer 10:00, Sam 10:00
  (28, 2, 10,  0, 1, 10, 45),
  (28, 5, 10,  0, 2, 10, 45),
  -- 20. Yoga parent-enfant Chloé : Sam 11:15, Dim 10:00
  (29, 5, 11, 15, 1, 12, 45),
  (29, 6, 10,  0, 2, 12, 45)
)
insert into public.class_sessions (
  id, class_id, starts_at, ends_at, booked_count, max_participants, status
)
select
  ('44444444-4444-4444-4444-' || lpad((s.class_idx * 1000 + w * 10 + s.slot_idx)::text, 12, '0'))::uuid,
  ('33333333-3333-3333-3333-3333333330' || lpad(s.class_idx::text, 2, '0'))::uuid,
  base.monday + (w * interval '7 days') + (s.weekday * interval '1 day')
              + (s.time_h * interval '1 hour') + (s.time_m * interval '1 minute'),
  base.monday + (w * interval '7 days') + (s.weekday * interval '1 day')
              + (s.time_h * interval '1 hour') + (s.time_m * interval '1 minute')
              + (s.duration_min * interval '1 minute'),
  0,
  s.max_p,
  'open'
from base, slots s, generate_series(0, 3) w
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 7. PRODUCTS (packs + abonnements par cours)
-- ----------------------------------------------------------------------------
-- IDs : aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaCCKK where CC = class index (10..29), KK = kind (01=pack, 02=sub)
insert into public.products (
  id, owner_type, owner_id, name, description, kind,
  price, credits_granted, billing_interval, validity_days, active
) values
  -- Yoga Vinyasa Sophie — pack 10 / abo 59€/mois
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa1001', 'teacher', '22222222-2222-2222-2222-222222222003', 'Pack 10 cours Yoga Vinyasa', '10 cours valables 90 jours', 'credit_pack', 150.00, 10, null, 90, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa1002', 'teacher', '22222222-2222-2222-2222-222222222003', 'Abo Yoga Vinyasa — 1 cours/sem', 'Abonnement mensuel : 4 cours/mois', 'monthly_subscription', 59.00, 4, 'monthly', 30, true),
  -- Yoga Doux Clara — pack 5 / abo 49€/mois
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa1101', 'teacher', '22222222-2222-2222-2222-222222222010', 'Pack 5 cours Yoga Doux', '5 cours valables 90 jours', 'credit_pack', 70.00, 5, null, 90, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa1102', 'teacher', '22222222-2222-2222-2222-222222222010', 'Abo Yoga Doux mensuel', '4 cours/mois', 'monthly_subscription', 49.00, 4, 'monthly', 30, true),
  -- Salsa Miguel — pack 10 / abo 45€/mois
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa1201', 'teacher', '22222222-2222-2222-2222-222222222011', 'Pack 10 cours Salsa', '10 cours valables 90 jours', 'credit_pack', 120.00, 10, null, 90, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa1202', 'teacher', '22222222-2222-2222-2222-222222222011', 'Abo Salsa mensuel', '4 cours/mois', 'monthly_subscription', 45.00, 4, 'monthly', 30, true),
  -- Bachata Léa — pack 10 (pas d'abo)
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa1301', 'teacher', '22222222-2222-2222-2222-222222222012', 'Pack 10 cours Bachata', '10 cours valables 90 jours', 'credit_pack', 130.00, 10, null, 90, true),
  -- Guitare Thomas — pack 5 (pas d'abo)
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa1401', 'teacher', '22222222-2222-2222-2222-222222222013', 'Pack 5 cours Guitare', '5 cours valables 90 jours', 'credit_pack', 145.00, 5, null, 90, true),
  -- DJ Hill's — pack 3
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa1501', 'teacher', '22222222-2222-2222-2222-222222222014', 'Pack 3 cours DJ', '3 cours valables 60 jours', 'credit_pack', 120.00, 3, null, 60, true),
  -- Piano Camille — pack 10
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa1601', 'teacher', '22222222-2222-2222-2222-222222222015', 'Pack 10 cours Piano', '10 cours valables 120 jours', 'credit_pack', 340.00, 10, null, 120, true),
  -- Cross Training Maxime — pack 10 / abo 39€/mois
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa1701', 'teacher', '22222222-2222-2222-2222-222222222016', 'Pack 10 cours Cross Training', '10 cours valables 90 jours', 'credit_pack', 100.00, 10, null, 90, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa1702', 'teacher', '22222222-2222-2222-2222-222222222016', 'Abo Cross Training mensuel', '4 cours/mois', 'monthly_subscription', 39.00, 4, 'monthly', 30, true),
  -- Pilates Emma — pack 10 / abo 55€/mois
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa1801', 'teacher', '22222222-2222-2222-2222-222222222017', 'Pack 10 cours Pilates', '10 cours valables 90 jours', 'credit_pack', 145.00, 10, null, 90, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa1802', 'teacher', '22222222-2222-2222-2222-222222222017', 'Abo Pilates mensuel', '4 cours/mois', 'monthly_subscription', 55.00, 4, 'monthly', 30, true),
  -- Méditation Nadia — pack 5
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa1901', 'teacher', '22222222-2222-2222-2222-222222222018', 'Pack 5 cours Méditation', '5 cours valables 90 jours', 'credit_pack', 45.00, 5, null, 90, true),
  -- Anglais James — pack 8 / abo 49€
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa2001', 'teacher', '22222222-2222-2222-2222-222222222004', 'Pack 8 cours Anglais', '8 cours valables 90 jours', 'credit_pack', 100.00, 8, null, 90, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa2002', 'teacher', '22222222-2222-2222-2222-222222222004', 'Abo Anglais mensuel', '4 cours/mois', 'monthly_subscription', 49.00, 4, 'monthly', 30, true),
  -- Espagnol Ana — pack 10
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa2101', 'teacher', '22222222-2222-2222-2222-222222222019', 'Pack 10 cours Espagnol', '10 cours valables 90 jours', 'credit_pack', 110.00, 10, null, 90, true),
  -- Poterie Juliette — pack 4
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa2201', 'teacher', '22222222-2222-2222-2222-222222222020', 'Pack 4 ateliers Poterie', '4 ateliers valables 120 jours', 'credit_pack', 120.00, 4, null, 120, true),
  -- Aquarelle Louise — pack 5
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa2301', 'teacher', '22222222-2222-2222-2222-222222222021', 'Pack 5 ateliers Aquarelle', '5 ateliers valables 120 jours', 'credit_pack', 110.00, 5, null, 120, true),
  -- Pâtisserie Manon — pack 3
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa2501', 'teacher', '22222222-2222-2222-2222-222222222023', 'Pack 3 ateliers Pâtisserie', '3 ateliers valables 90 jours', 'credit_pack', 115.00, 3, null, 90, true),
  -- Prise de parole Antoine — pack 4
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa2601', 'teacher', '22222222-2222-2222-2222-222222222024', 'Pack 4 séances Prise de parole', '4 séances valables 90 jours', 'credit_pack', 100.00, 4, null, 90, true),
  -- Théâtre Sarah — pack 6
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa2701', 'teacher', '22222222-2222-2222-2222-222222222025', 'Pack 6 séances Théâtre', '6 séances valables 120 jours', 'credit_pack', 115.00, 6, null, 120, true),
  -- Éveil musical Alice — pack 10
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa2801', 'teacher', '22222222-2222-2222-2222-222222222026', 'Pack 10 séances Éveil musical', '10 séances valables 120 jours', 'credit_pack', 95.00, 10, null, 120, true),
  -- Yoga parent-enfant Chloé — pack 5
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa2901', 'teacher', '22222222-2222-2222-2222-222222222027', 'Pack 5 séances Yoga parent-enfant', '5 séances valables 90 jours', 'credit_pack', 85.00, 5, null, 90, true)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 8. STUDENT PURCHASES + CREDIT WALLETS pour les bookings demandés
-- ----------------------------------------------------------------------------
-- Marie Dupont a un pack Yoga Vinyasa Sophie (10 crédits, va en consommer 1)
-- Marie Dupont a un abo Pilates Emma actif (4 crédits/mois)
-- Lina a un pack Salsa Miguel (10 crédits, va en consommer 1)
-- Lucas a un abo Cross Training Maxime actif

insert into public.student_purchases (
  id, user_id, product_id, owner_type, owner_id, amount_paid,
  stripe_payment_id, purchased_at, expires_at, auto_renew
) values
  ('cccccccc-cccc-cccc-cccc-cccccccc0001', '99999999-9999-9999-9999-999999999001',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa1001', 'teacher', '22222222-2222-2222-2222-222222222003',
   150.00, 'pi_demo_marie_pack_yoga', now() - interval '10 days', now() + interval '80 days', false),
  ('cccccccc-cccc-cccc-cccc-cccccccc0002', '99999999-9999-9999-9999-999999999001',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa1802', 'teacher', '22222222-2222-2222-2222-222222222017',
   55.00,  'pi_demo_marie_sub_pilates', now() - interval '8 days', now() + interval '22 days', true),
  ('cccccccc-cccc-cccc-cccc-cccccccc0003', '99999999-9999-9999-9999-999999999003',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa1201', 'teacher', '22222222-2222-2222-2222-222222222011',
   120.00, 'pi_demo_lina_pack_salsa', now() - interval '12 days', now() + interval '78 days', false),
  ('cccccccc-cccc-cccc-cccc-cccccccc0004', '99999999-9999-9999-9999-999999999004',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaa1702', 'teacher', '22222222-2222-2222-2222-222222222016',
   39.00,  'pi_demo_lucas_sub_xtraining', now() - interval '5 days', now() + interval '25 days', true)
on conflict (id) do nothing;

-- Wallets : balance APRÈS la conso d'un crédit pour les bookings ci-dessous.
-- Marie : 10 crédits Yoga Sophie - 1 = 9
-- Marie : abo Pilates Emma 4 crédits - 1 = 3
-- Lina  : 10 crédits Salsa - 1 = 9
-- Lucas : abo X-Training 4 crédits - 1 = 3
insert into public.credit_wallets (id, user_id, owner_type, owner_id, balance) values
  (gen_random_uuid(), '99999999-9999-9999-9999-999999999001', 'teacher', '22222222-2222-2222-2222-222222222003', 9),
  (gen_random_uuid(), '99999999-9999-9999-9999-999999999001', 'teacher', '22222222-2222-2222-2222-222222222017', 3),
  (gen_random_uuid(), '99999999-9999-9999-9999-999999999003', 'teacher', '22222222-2222-2222-2222-222222222011', 9),
  (gen_random_uuid(), '99999999-9999-9999-9999-999999999004', 'teacher', '22222222-2222-2222-2222-222222222016', 3)
on conflict (user_id, owner_type, owner_id) do nothing;

-- ----------------------------------------------------------------------------
-- 9. BOOKINGS (10 spécifiques)
-- ----------------------------------------------------------------------------
-- Sessions cibles (calculées dynamiquement) :
-- IDs format: 4444...-CCWWSS000000  (CC=class, WW=00 first week, SS=slot)
--   * Marie    → Yoga Vinyasa Sophie LUN 18:30 (class 10, slot 1, week 0)  → ...010001000000
--   * Marie    → Yoga Vinyasa Sophie MER 12:30 (class 10, slot 2, week 0)  → ...010002000000  (crédit pack)
--   * Hugo     → DJ Hill's SAM 14:00 (class 15, slot 2, week 0)            → ...015002000000
--   * Lina     → Salsa Cubaine MAR 19:00 (class 12, slot 1, week 0)        → ...012001000000  (crédit pack)
--   * Lucas    → Cross Training SAM 11:00 (class 17, slot 3, week 0)       → ...017003000000  (abo)
--   * Emma P.  → Atelier poterie SAM 15:00 (class 22, slot 2, week 0)      → ...022002000000
--   * Julien   → Anglais MAR 18:30 (class 20, slot 1, week 0)              → ...020001000000
--   * Marie    → Pilates JEU 19:00 (class 18, slot 2, week 0)              → ...018002000000  (abo)
--   * Hugo     → Cuisine italienne VEN 19:00 (class 24, slot 1, week 0)    → ...024001000000
--   * Lina     → Yoga parent-enfant DIM 10:00 (class 29, slot 2, week 0)   → ...029002000000

-- Helper CTE: each booking targets a precise (class_idx, week, slot)
with bk(id, user_id, class_idx, week, slot, paid_with) as (values
  ('77777777-7777-7777-7777-777777770001'::uuid, '99999999-9999-9999-9999-999999999001'::uuid, 10, 0, 1, 'cash'),
  ('77777777-7777-7777-7777-777777770002'::uuid, '99999999-9999-9999-9999-999999999001'::uuid, 10, 0, 2, 'credits'),
  ('77777777-7777-7777-7777-777777770003'::uuid, '99999999-9999-9999-9999-999999999002'::uuid, 15, 0, 2, 'cash'),
  ('77777777-7777-7777-7777-777777770004'::uuid, '99999999-9999-9999-9999-999999999003'::uuid, 12, 0, 1, 'credits'),
  ('77777777-7777-7777-7777-777777770005'::uuid, '99999999-9999-9999-9999-999999999004'::uuid, 17, 0, 3, 'credits'),
  ('77777777-7777-7777-7777-777777770006'::uuid, '99999999-9999-9999-9999-999999999005'::uuid, 22, 0, 2, 'cash'),
  ('77777777-7777-7777-7777-777777770007'::uuid, '99999999-9999-9999-9999-999999999006'::uuid, 20, 0, 1, 'cash'),
  ('77777777-7777-7777-7777-777777770008'::uuid, '99999999-9999-9999-9999-999999999001'::uuid, 18, 0, 2, 'credits'),
  ('77777777-7777-7777-7777-777777770009'::uuid, '99999999-9999-9999-9999-999999999002'::uuid, 24, 0, 1, 'cash'),
  ('77777777-7777-7777-7777-777777770010'::uuid, '99999999-9999-9999-9999-999999999003'::uuid, 29, 0, 2, 'cash')
)
insert into public.bookings (
  id, user_id, session_id, class_id, teacher_id,
  status, price_total, commission_amount, teacher_amount, is_free,
  questionnaire_required, questionnaire_completed,
  session_starts_at, cancel_deadline, created_at
)
select
  bk.id,
  bk.user_id,
  s.id,
  c.id,
  c.teacher_id,
  'confirmed',
  case bk.paid_with when 'credits' then 0 else c.price end,
  case bk.paid_with when 'credits' then 0 else round(c.price * 0.12, 2) end,
  case bk.paid_with when 'credits' then 0 else round(c.price * 0.88, 2) end,
  c.is_free,
  false,
  false,
  s.starts_at,
  s.starts_at - (c.cancellation_hours_before * interval '1 hour'),
  now() - interval '2 days'
from bk
join public.class_sessions s on s.id = ('44444444-4444-4444-4444-' || lpad((bk.class_idx * 1000 + bk.week * 10 + bk.slot)::text, 12, '0'))::uuid
join public.classes c on c.id = ('33333333-3333-3333-3333-3333333330' || lpad(bk.class_idx::text, 2, '0'))::uuid
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 10. EDGE CASES
-- ----------------------------------------------------------------------------

-- 10.a — Cours COMPLET (0 places restantes) :
-- Yoga Vinyasa Sophie session SAM 10h00 week 1 → max 10, on met 10 bookings.
-- On utilise les 6 étudiants + 4 demo_participants existants (du seed.sql).
with target as (
  select id from public.class_sessions
   where id = '44444444-4444-4444-4444-000000010013'::uuid  -- class 10, week 1, slot 3 (Sat 10:00 next week)
),
class_info as (
  select id, teacher_id, price, cancellation_hours_before, is_free
    from public.classes where id = '33333333-3333-3333-3333-333333333010'::uuid
)
insert into public.bookings (
  id, user_id, session_id, class_id, teacher_id,
  status, price_total, commission_amount, teacher_amount, is_free,
  questionnaire_required, questionnaire_completed,
  session_starts_at, cancel_deadline, created_at
)
select
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeef0' || lpad(n::text, 2, '0'))::uuid,
  ('55555555-5555-5555-5555-' || lpad(n::text, 12, '0'))::uuid,
  t.id,
  ci.id,
  ci.teacher_id,
  'confirmed',
  ci.price, round(ci.price * 0.12, 2), round(ci.price * 0.88, 2),
  ci.is_free, false, false,
  (select starts_at from public.class_sessions where id = t.id),
  (select starts_at - (ci.cancellation_hours_before * interval '1 hour') from public.class_sessions where id = t.id),
  now() - interval '1 day'
from target t, class_info ci, generate_series(1, 10) n
on conflict (id) do nothing;

-- Force the session to 'full' (the after_insert trigger will already have done it
-- but we be explicit so it's robust against trigger absence):
update public.class_sessions
   set booked_count = 10, status = 'full'
 where id = '44444444-4444-4444-4444-000000010013'::uuid;

-- 10.b — Cours avec 1 PLACE RESTANTE :
-- Pilates Emma session DIM 10:30 week 1 → max 10, on met 9 bookings.
with target as (
  select id from public.class_sessions
   where id = '44444444-4444-4444-4444-000000018013'::uuid  -- class 18, week 1, slot 3 (Sun 10:30)
),
class_info as (
  select id, teacher_id, price, cancellation_hours_before, is_free
    from public.classes where id = '33333333-3333-3333-3333-333333333018'::uuid
)
insert into public.bookings (
  id, user_id, session_id, class_id, teacher_id,
  status, price_total, commission_amount, teacher_amount, is_free,
  questionnaire_required, questionnaire_completed,
  session_starts_at, cancel_deadline, created_at
)
select
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeee1d' || lpad(n::text, 2, '0'))::uuid,
  ('55555555-5555-5555-5555-' || lpad(n::text, 12, '0'))::uuid,
  t.id, ci.id, ci.teacher_id,
  'confirmed', ci.price, round(ci.price * 0.12, 2), round(ci.price * 0.88, 2),
  ci.is_free, false, false,
  (select starts_at from public.class_sessions where id = t.id),
  (select starts_at - (ci.cancellation_hours_before * interval '1 hour') from public.class_sessions where id = t.id),
  now() - interval '1 day'
from target t, class_info ci, generate_series(11, 19) n
on conflict (id) do nothing;

update public.class_sessions
   set booked_count = 9
 where id = '44444444-4444-4444-4444-000000018013'::uuid;

-- 10.c — Cours ANNULÉ par le professeur :
-- Bachata Léa session MER 20:30 week 1 (class 13, slot 1)
update public.class_sessions
   set status = 'cancelled'
 where id = '44444444-4444-4444-4444-000000013011'::uuid;

-- ----------------------------------------------------------------------------
-- 11. RECAP CHECKS (exécutables manuellement après ce seed)
-- ----------------------------------------------------------------------------
-- select count(*) from public.teacher_profiles;     -- expected: 4 (existing) + 18 = 22
-- select count(*) from public.classes;              -- expected: 6 (existing) + 20 = 26
-- select count(*) from public.class_sessions
--   where id::text like '44444444-4444-4444-4444-%';
--   -- expected: 4 weeks × ~46 slots = ~184 sessions
-- select count(*) from public.products;             -- expected: ~25 (packs + abos)
-- select count(*) from public.bookings
--   where id::text like '77777777-7777-7777-7777-7777777700%';   -- 10 demandées
-- select count(*) from public.bookings
--   where id::text like 'eeeeeeee-%';                            -- 19 (10 full + 9 leftspot1)
-- select * from public.class_sessions where status = 'full';     -- 1
-- select * from public.class_sessions where status = 'cancelled';-- 1
