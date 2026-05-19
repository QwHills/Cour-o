-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║  KOUREO — Permettre aux profs de lire le nom/email de leurs élèves      ║
-- ║  À exécuter UNE FOIS dans le SQL Editor. Idempotent.                    ║
-- ║                                                                           ║
-- ║  Sans ça, la liste des participants d'une session affiche "Utilisateur"  ║
-- ║  au lieu du vrai prénom, parce que la policy RLS sur public.users       ║
-- ║  bloquait toute lecture en dehors des pairs d'org.                      ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

-- Helper SECURITY DEFINER pour récupérer les user_id qui ont booké un cours
-- de l'un de mes teacher_profiles (j'en ai 1 si je suis prof indépendant,
-- 0 sinon). Bypass RLS sur bookings/teacher_profiles pour éviter récursion.
create or replace function public.my_student_user_ids()
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select distinct b.user_id
  from public.bookings b
  where b.teacher_id in (
    select id from public.teacher_profiles where user_id = auth.uid()
  );
$$;

-- Policy : un prof peut lire les profils users qui ont réservé chez lui.
-- Cumulatif avec les autres policies SELECT existantes (self-read, org peers).
drop policy if exists "users_readable_by_their_teacher" on public.users;
create policy "users_readable_by_their_teacher" on public.users for select using (
  id in (select public.my_student_user_ids())
);
