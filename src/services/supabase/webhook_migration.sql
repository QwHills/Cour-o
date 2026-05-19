-- ============================================================================
-- Migration for Stripe webhook support (idempotent)
-- ============================================================================
-- Safe to re-run. Makes the payments table friendly to webhook-driven inserts
-- where the booking row may not exist yet.
-- ============================================================================

-- 1. booking_id can now be null
alter table public.payments
  alter column booking_id drop not null;

-- 2. Unique constraint on stripe_payment_intent_id (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'payments_stripe_pi_unique'
  ) then
    alter table public.payments
      add constraint payments_stripe_pi_unique unique (stripe_payment_intent_id);
  end if;
end $$;

-- 3. Loose reference column (idempotent)
alter table public.payments
  add column if not exists booking_reference text;

-- 4. RLS policy (drop + recreate is safe)
drop policy if exists "payments_read" on public.payments;
create policy "payments_read" on public.payments for select using (
  booking_id is not null and exists (
    select 1 from public.bookings b
    where b.id = public.payments.booking_id
      and (b.user_id = auth.uid() or b.teacher_id in (
        select tp.id from public.teacher_profiles tp where tp.user_id = auth.uid()
      ))
  )
);
