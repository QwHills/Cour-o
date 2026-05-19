-- ============================================================================
-- KOUREO — Fix RLS pour autoriser un prof à notifier ses élèves
-- ============================================================================
-- La policy existante "notifications_own" interdit à Sophie d'insérer une
-- notification pour Marie (user_id = auth.uid() obligatoire).
-- On ajoute une policy INSERT supplémentaire : un prof peut créer une notif
-- pour un user qui a déjà réservé un de ses cours.
--
-- Dépend de la fonction `public.my_student_user_ids()` créée par
-- phase3b_users_readable_by_teacher.sql.
--
-- À exécuter dans le SQL Editor. Idempotent.
-- ============================================================================

drop policy if exists "notifications_teacher_send_to_student" on public.notifications;
create policy "notifications_teacher_send_to_student" on public.notifications
  for insert
  with check (
    user_id in (select public.my_student_user_ids())
  );

-- Sanity : la policy doit lister "INSERT" comme commande
-- select policyname, cmd from pg_policies where tablename = 'notifications';
