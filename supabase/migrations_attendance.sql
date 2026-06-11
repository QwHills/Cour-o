-- ============================================================================
-- Walk-ins + Attendance tracking
-- ============================================================================
-- Two related tables shipping together because the mobile Présences screen
-- depends on both:
--   1. `manual_participants` — students added by hand for a session (trial,
--      walk-in, guest). Never affect billing, never have a `user_id`.
--   2. `attendance_marks` — teacher ticks who actually showed up. Each row
--      references EITHER a real booking OR a manual participant.
--
-- Run once in the Supabase SQL editor.

-- ----------------------------------------------------------------------------
-- 1. Manual participants (walk-ins)
-- ----------------------------------------------------------------------------
create table if not exists public.manual_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  teacher_id uuid not null references public.teacher_profiles(id) on delete cascade,
  full_name text not null,
  note text,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_manual_participants_session
  on public.manual_participants (session_id);
create index if not exists idx_manual_participants_teacher
  on public.manual_participants (teacher_id);

alter table public.manual_participants enable row level security;

drop policy if exists "manual_participants_select_own" on public.manual_participants;
create policy "manual_participants_select_own"
  on public.manual_participants for select
  using (
    teacher_id in (
      select id from public.teacher_profiles where user_id = auth.uid()
    )
  );

drop policy if exists "manual_participants_write_own" on public.manual_participants;
create policy "manual_participants_write_own"
  on public.manual_participants for all
  using (
    teacher_id in (
      select id from public.teacher_profiles where user_id = auth.uid()
    )
  )
  with check (
    teacher_id in (
      select id from public.teacher_profiles where user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 2. Attendance marks
-- ----------------------------------------------------------------------------
-- Exactly one of `booking_id` or `manual_id` is non-null per row. The teacher
-- can flip the `present` boolean any number of times; only the latest state
-- is kept (no audit history for now).
create table if not exists public.attendance_marks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  teacher_id uuid not null references public.teacher_profiles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete cascade,
  manual_id uuid references public.manual_participants(id) on delete cascade,
  present boolean not null default false,
  marked_at timestamptz not null default now(),
  constraint attendance_marks_one_attendee_chk
    check (
      (booking_id is not null and manual_id is null)
      or (booking_id is null and manual_id is not null)
    ),
  constraint attendance_marks_unique_booking unique (session_id, booking_id),
  constraint attendance_marks_unique_manual  unique (session_id, manual_id)
);

create index if not exists idx_attendance_marks_session
  on public.attendance_marks (session_id);
create index if not exists idx_attendance_marks_teacher
  on public.attendance_marks (teacher_id);

alter table public.attendance_marks enable row level security;

drop policy if exists "attendance_marks_select_own" on public.attendance_marks;
create policy "attendance_marks_select_own"
  on public.attendance_marks for select
  using (
    teacher_id in (
      select id from public.teacher_profiles where user_id = auth.uid()
    )
  );

drop policy if exists "attendance_marks_upsert_own" on public.attendance_marks;
create policy "attendance_marks_upsert_own"
  on public.attendance_marks for all
  using (
    teacher_id in (
      select id from public.teacher_profiles where user_id = auth.uid()
    )
  )
  with check (
    teacher_id in (
      select id from public.teacher_profiles where user_id = auth.uid()
    )
  );
