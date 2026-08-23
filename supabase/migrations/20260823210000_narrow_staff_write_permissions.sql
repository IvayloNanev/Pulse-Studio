-- Replace broad staff table mutation with least-privilege read policies.
-- Operational writes must use explicit SECURITY DEFINER commands that validate
-- the actor, business rules, locking, timestamps, and audit side effects.

begin;

drop policy if exists class_sessions_staff_manage on public.class_sessions;

drop policy if exists reservations_staff_manage on public.reservations;
create policy reservations_staff_read on public.reservations
for select to authenticated
using (public.is_active_staff());

drop policy if exists drop_in_payments_owner_manage on public.drop_in_payments;

drop policy if exists notifications_staff_manage on public.notifications;
create policy notifications_staff_read on public.notifications
for select to authenticated
using (public.is_active_staff());

drop policy if exists waitlist_promotions_staff_manage on public.waitlist_promotions;
create policy waitlist_promotions_staff_read on public.waitlist_promotions
for select to authenticated
using (public.is_active_staff());

comment on table public.reservations is
  'Reservation facts are readable by active staff but mutated only through authoritative booking, cancellation, promotion, or future owner override commands.';

comment on table public.class_sessions is
  'Class sessions are readable by staff. Schedule mutations require explicit owner/admin commands; direct staff table mutation is denied by RLS.';

comment on table public.drop_in_payments is
  'Simulated payment facts are readable under RLS and mutated only as a side effect of authoritative booking, cancellation, promotion, or studio-cancellation commands.';

comment on table public.notifications is
  'Simulated notifications are append-only side effects of authoritative workflow commands; staff has read access only.';

comment on table public.waitlist_promotions is
  'Promotion audit facts are created only by authoritative waitlist workflows; staff has read access only.';

commit;
