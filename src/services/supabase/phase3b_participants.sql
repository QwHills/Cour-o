-- ╔═════════════════════════════════════════════════════════════════════════╗
-- ║  KOUREO — Manual participants (séance d'essai, walk-ins, etc.)          ║
-- ║  À exécuter UNE FOIS dans le SQL Editor. Idempotent.                    ║
-- ╚═════════════════════════════════════════════════════════════════════════╝

create table if not exists public.manual_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  teacher_id uuid not null references public.teacher_profiles(id) on delete cascade,
  full_name text not null,
  note text,
  added_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index if not exists idx_manual_participants_session
  on public.manual_participants(session_id);
create index if not exists idx_manual_participants_teacher
  on public.manual_participants(teacher_id);

alter table public.manual_participants enable row level security;

-- The teacher who owns the class (or one of their org admins) can CRUD
-- their manual participants. Students never see them.
drop policy if exists "manual_participants_owner_crud" on public.manual_participants;
create policy "manual_participants_owner_crud"
  on public.manual_participants
  for all
  using (
    teacher_id in (
      select id from public.teacher_profiles where user_id = auth.uid()
    )
  );
