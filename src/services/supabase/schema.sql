-- ╔═══════════════════════════════════════════════════════╗
-- ║  KOUREO — Schema Supabase (Postgres)                 ║
-- ║  Execute this in the Supabase SQL Editor             ║
-- ║  Version: 1.0 · April 2026                           ║
-- ╚═══════════════════════════════════════════════════════╝

-- Prérequis
create extension if not exists "pgcrypto";

-- ═══════════════════════════════════════════════════════
-- 1. USERS (hérite de auth.users)
-- ═══════════════════════════════════════════════════════
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  name text not null,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'pro')),
  city text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-sync user from auth.users on signup
create or replace function public.handle_new_auth_user()
returns trigger as $$
begin
  insert into public.users (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'user')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ═══════════════════════════════════════════════════════
-- 2. TEACHER PROFILES
-- ═══════════════════════════════════════════════════════
create table if not exists public.teacher_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade unique,
  kind text not null default 'particulier' check (kind in ('particulier', 'professional')),
  status text not null default 'new_teacher' check (
    status in ('new_teacher', 'under_review', 'certified_teacher', 'professional')
  ),
  display_name text not null,
  bio text default '',
  photo_url text,
  categories text[] not null default '{}',
  address text,
  latitude double precision,
  longitude double precision,
  rating numeric(2,1) default 0,
  review_count integer default 0,
  free_classes_completed integer default 0,
  avg_validation_score numeric(3,2) default 0,
  validation_response_count integer default 0,
  certified_at timestamptz,
  stripe_account_id text,
  -- Billing
  vat_regime text check (vat_regime in ('non_assujetti', 'tva_20', 'exonere_formation')),
  vat_number text,
  legal_name text,
  siret text,
  -- Photos (3 obligatoires pour créer une offre)
  photo_place text,
  photo_self text,
  photo_activity text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_teacher_user on public.teacher_profiles(user_id);
create index if not exists idx_teacher_categories on public.teacher_profiles using gin(categories);

-- ═══════════════════════════════════════════════════════
-- 3. CLASSES (offres de cours)
-- ═══════════════════════════════════════════════════════
create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teacher_profiles(id) on delete cascade,
  title text not null,
  category text not null,
  format text not null check (format in ('individual', 'group')),
  level text not null check (level in ('beginner', 'intermediate', 'advanced', 'all')),
  duration_minutes integer not null check (duration_minutes > 0),
  price numeric(10,2) not null default 0 check (price >= 0),
  is_free boolean not null default false,
  max_participants integer not null check (max_participants >= 1),
  description text default '',
  image_url text,
  cancellation_hours_before integer not null default 48,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_classes_teacher on public.classes(teacher_id);
create index if not exists idx_classes_category on public.classes(category);

-- ═══════════════════════════════════════════════════════
-- 4. AVAILABILITIES (horaires pro récurrents)
-- ═══════════════════════════════════════════════════════
create table if not exists public.availabilities (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teacher_profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null
);

create table if not exists public.closed_periods (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teacher_profiles(id) on delete cascade,
  label text,
  start_date date not null,
  end_date date not null
);

-- ═══════════════════════════════════════════════════════
-- 5. CLASS SESSIONS (créneaux réservables)
-- ═══════════════════════════════════════════════════════
create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  booked_count integer not null default 0,
  max_participants integer not null,
  status text not null default 'open' check (status in ('open', 'full', 'cancelled', 'past')),
  constraint capacity_not_exceeded check (booked_count <= max_participants)
);

create index if not exists idx_sessions_class on public.class_sessions(class_id);
create index if not exists idx_sessions_starts on public.class_sessions(starts_at);

-- ═══════════════════════════════════════════════════════
-- 6. CALENDAR CONNECTIONS
-- ═══════════════════════════════════════════════════════
create table if not exists public.calendar_connections (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teacher_profiles(id) on delete cascade,
  provider text not null check (provider in ('google', 'apple')),
  access_token text,
  refresh_token text,
  connected_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════
-- 7. BOOKINGS
-- ═══════════════════════════════════════════════════════
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.teacher_profiles(id) on delete cascade,
  status text not null default 'confirmed' check (
    status in ('confirmed', 'cancelled_by_user', 'cancelled_by_pro', 'completed', 'refunded', 'no_show')
  ),
  price_total numeric(10,2) not null,
  commission_amount numeric(10,2) not null default 0,
  teacher_amount numeric(10,2) not null default 0,
  is_free boolean not null default false,
  questionnaire_required boolean not null default false,
  questionnaire_completed boolean not null default false,
  session_starts_at timestamptz not null,
  cancel_deadline timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_bookings_user on public.bookings(user_id);
create index if not exists idx_bookings_session on public.bookings(session_id);
create index if not exists idx_bookings_teacher on public.bookings(teacher_id);

-- Triggers capacity
create or replace function public.bookings_after_insert_fn() returns trigger as $$
begin
  if new.status = 'confirmed' then
    update public.class_sessions
       set booked_count = booked_count + 1,
           status = case
             when booked_count + 1 >= max_participants then 'full'
             else status
           end
     where id = new.session_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists bookings_after_insert on public.bookings;
create trigger bookings_after_insert
  after insert on public.bookings
  for each row execute function public.bookings_after_insert_fn();

create or replace function public.bookings_after_update_fn() returns trigger as $$
begin
  if old.status = 'confirmed' and new.status in ('cancelled_by_user', 'cancelled_by_pro', 'refunded') then
    update public.class_sessions
       set booked_count = greatest(booked_count - 1, 0),
           status = 'open'
     where id = new.session_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists bookings_after_update on public.bookings;
create trigger bookings_after_update
  after update on public.bookings
  for each row execute function public.bookings_after_update_fn();

-- ═══════════════════════════════════════════════════════
-- 8. PAYMENTS & PAYOUTS (Stripe Connect escrow)
-- ═══════════════════════════════════════════════════════
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  amount numeric(10,2) not null,
  currency text not null default 'EUR',
  stripe_payment_intent_id text,
  status text not null check (status in ('pending', 'succeeded', 'refunded', 'failed', 'not_required')),
  escrow_status text not null default 'held' check (escrow_status in ('held', 'release_pending', 'released', 'disputed', 'refunded')),
  course_ended_at timestamptz,
  release_window_ends_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teacher_profiles(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  gross_amount numeric(10,2) not null,
  commission_amount numeric(10,2) not null,
  net_amount numeric(10,2) not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  scheduled_at timestamptz not null,
  completed_at timestamptz,
  stripe_transfer_id text
);

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  teacher_id uuid not null references public.teacher_profiles(id) on delete cascade,
  reason text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'under_review', 'resolved_refund', 'resolved_release')),
  resolution text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- ═══════════════════════════════════════════════════════
-- 9. QUESTIONNAIRES (validation new_teacher)
-- ═══════════════════════════════════════════════════════
create table if not exists public.validation_questionnaires (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  session_id uuid not null references public.class_sessions(id) on delete cascade,
  teacher_id uuid not null references public.teacher_profiles(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  q1_on_time boolean not null,
  q2_as_described boolean not null,
  q3_serious boolean not null,
  q4_recommend boolean not null,
  q5_rating smallint not null check (q5_rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════
-- 10. INVOICES (auto-générées)
-- ═══════════════════════════════════════════════════════
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text unique not null,
  booking_id uuid not null references public.bookings(id) on delete cascade unique,
  teacher_id uuid not null references public.teacher_profiles(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  price_ht numeric(10,2) not null,
  vat_rate numeric(4,2) not null,
  vat_amount numeric(10,2) not null,
  price_ttc numeric(10,2) not null,
  commission_ht numeric(10,2) not null,
  teacher_net_amount numeric(10,2) not null,
  vat_regime text not null,
  vat_mention text not null,
  teacher_name text not null,
  teacher_address text,
  teacher_siret text,
  teacher_vat_number text,
  participant_name text not null,
  participant_email text not null,
  course_title text not null,
  course_date text not null,
  course_duration text not null,
  issued_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════
-- 11. FAVORITES
-- ═══════════════════════════════════════════════════════
create table if not exists public.favorites (
  user_id uuid not null references public.users(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, class_id)
);

-- ═══════════════════════════════════════════════════════
-- 12. NOTIFICATIONS
-- ═══════════════════════════════════════════════════════
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  action_screen text,
  action_params jsonb,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);

-- ═══════════════════════════════════════════════════════
-- 13. MESSAGES (messagerie modérée)
-- ═══════════════════════════════════════════════════════
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  teacher_id uuid not null references public.teacher_profiles(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  last_message_at timestamptz not null default now(),
  unread_user boolean not null default false,
  unread_teacher boolean not null default false,
  unique (user_id, teacher_id, class_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_role text not null check (sender_role in ('user', 'teacher', 'system')),
  body text not null,
  moderated boolean not null default true,
  created_at timestamptz not null default now()
);

-- ═══════════════════════════════════════════════════════
-- 14. COMMISSIONS & PLATFORM SETTINGS
-- ═══════════════════════════════════════════════════════
create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('fixed', 'percent', 'both')),
  fixed_amount numeric(10,2),
  percent numeric(5,2),
  active boolean not null default true,
  valid_from timestamptz not null default now(),
  valid_to timestamptz
);

-- Insert default 12%
insert into public.commissions (type, percent, active)
  values ('percent', 12, true)
  on conflict do nothing;

create table if not exists public.platform_settings (
  id integer primary key default 1,
  min_free_classes integer not null default 3,
  min_avg_rating numeric(3,2) not null default 4,
  min_response_count integer not null default 3,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

insert into public.platform_settings (id) values (1) on conflict do nothing;

-- ═══════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════
alter table public.users enable row level security;
alter table public.teacher_profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_sessions enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.payouts enable row level security;
alter table public.disputes enable row level security;
alter table public.validation_questionnaires enable row level security;
alter table public.invoices enable row level security;
alter table public.favorites enable row level security;
alter table public.notifications enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Users: own record read/update
drop policy if exists "users_self_read" on public.users;
create policy "users_self_read" on public.users for select using (auth.uid() = id);
drop policy if exists "users_self_update" on public.users;
create policy "users_self_update" on public.users for update using (auth.uid() = id);

-- Teacher profiles: public read, owner write
drop policy if exists "teachers_public_read" on public.teacher_profiles;
create policy "teachers_public_read" on public.teacher_profiles for select using (true);
drop policy if exists "teachers_owner_write" on public.teacher_profiles;
create policy "teachers_owner_write" on public.teacher_profiles for all using (auth.uid() = user_id);

-- Classes: public read (active), owner write
drop policy if exists "classes_public_read" on public.classes;
create policy "classes_public_read" on public.classes for select using (active = true);
drop policy if exists "classes_owner_write" on public.classes;
create policy "classes_owner_write" on public.classes for all using (
  teacher_id in (select id from public.teacher_profiles where user_id = auth.uid())
);

-- Sessions: public read, via class owner write
drop policy if exists "sessions_public_read" on public.class_sessions;
create policy "sessions_public_read" on public.class_sessions for select using (true);
drop policy if exists "sessions_owner_write" on public.class_sessions;
create policy "sessions_owner_write" on public.class_sessions for all using (
  class_id in (
    select c.id from public.classes c
    join public.teacher_profiles t on c.teacher_id = t.id
    where t.user_id = auth.uid()
  )
);

-- Bookings: user sees own, teacher sees theirs
drop policy if exists "bookings_user_read" on public.bookings;
create policy "bookings_user_read" on public.bookings for select using (
  auth.uid() = user_id
  or teacher_id in (select id from public.teacher_profiles where user_id = auth.uid())
);
drop policy if exists "bookings_user_insert" on public.bookings;
create policy "bookings_user_insert" on public.bookings for insert with check (auth.uid() = user_id);
drop policy if exists "bookings_self_update" on public.bookings;
create policy "bookings_self_update" on public.bookings for update using (
  auth.uid() = user_id
  or teacher_id in (select id from public.teacher_profiles where user_id = auth.uid())
);

-- Favorites: own only
drop policy if exists "favorites_own" on public.favorites;
create policy "favorites_own" on public.favorites for all using (auth.uid() = user_id);

-- Notifications: own only
drop policy if exists "notifications_own" on public.notifications;
create policy "notifications_own" on public.notifications for all using (auth.uid() = user_id);

-- Questionnaires: user writes their own, everyone reads (public marketplace reviews)
drop policy if exists "questionnaires_user_write" on public.validation_questionnaires;
create policy "questionnaires_user_write" on public.validation_questionnaires for insert with check (auth.uid() = user_id);
-- Reviews are public by design: prospective students must be able to read them
-- on any teacher's profile. We deliberately expose user_id; if PII becomes a
-- concern, create a view that masks it instead of tightening this policy.
drop policy if exists "questionnaires_read" on public.validation_questionnaires;
create policy "questionnaires_read" on public.validation_questionnaires for select using (true);

-- Invoices: own (user or teacher)
drop policy if exists "invoices_read" on public.invoices;
create policy "invoices_read" on public.invoices for select using (
  auth.uid() = user_id
  or teacher_id in (select id from public.teacher_profiles where user_id = auth.uid())
);

-- Conversations & messages: participants only
drop policy if exists "conv_participants" on public.conversations;
create policy "conv_participants" on public.conversations for all using (
  auth.uid() = user_id
  or teacher_id in (select id from public.teacher_profiles where user_id = auth.uid())
);
drop policy if exists "messages_participants" on public.messages;
create policy "messages_participants" on public.messages for all using (
  conversation_id in (
    select id from public.conversations
    where user_id = auth.uid()
      or teacher_id in (select id from public.teacher_profiles where user_id = auth.uid())
  )
);

-- Payments / payouts / disputes : read-only pour les propriétaires
drop policy if exists "payments_read" on public.payments;
create policy "payments_read" on public.payments for select using (
  booking_id in (
    select id from public.bookings
    where user_id = auth.uid()
      or teacher_id in (select id from public.teacher_profiles where user_id = auth.uid())
  )
);

drop policy if exists "payouts_read" on public.payouts;
create policy "payouts_read" on public.payouts for select using (
  teacher_id in (select id from public.teacher_profiles where user_id = auth.uid())
);

drop policy if exists "disputes_read" on public.disputes;
create policy "disputes_read" on public.disputes for select using (
  auth.uid() = user_id
  or teacher_id in (select id from public.teacher_profiles where user_id = auth.uid())
);

-- ═══════════════════════════════════════════════════════
-- Done! 🎉
-- ═══════════════════════════════════════════════════════
