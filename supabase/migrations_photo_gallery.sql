-- Adds an optional gallery of extra activity / realization photos on top of
-- the 3 mandatory ones (place / self / activity). Shown to students as a
-- swipable carousel on the class detail hero.
--
-- Apply once in the Supabase SQL editor.

alter table public.teacher_profiles
  add column if not exists photo_gallery jsonb not null default '[]'::jsonb;

-- Seed Manon Duval's pastry portfolio so the feature has a visible example
-- on iPhone testing — replace these URLs anytime with real uploads.
update public.teacher_profiles
set photo_gallery = '[
  "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=900&q=80",
  "https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=900&q=80",
  "https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=900&q=80",
  "https://images.unsplash.com/photo-1612203985729-70726954388c?w=900&q=80",
  "https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=900&q=80"
]'::jsonb
where id = '22222222-2222-2222-2222-222222222023';
