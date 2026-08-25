-- Provide one deterministic, genuinely full future session so the complete
-- member waitlist journey can be exercised without changing real member data.

begin;

insert into public.members (
  member_id,
  first_name,
  last_name,
  email,
  phone,
  preferred_channel,
  do_not_contact
)
select
  'MEM-QA-WAITLIST-' || lpad(fixture.number::text, 2, '0'),
  'Waitlist',
  'Fixture ' || fixture.number,
  'waitlist.fixture.' || fixture.number || '@pulse.example',
  null,
  'email'::public.outreach_channel,
  true
from generate_series(1, 8) as fixture(number)
on conflict (member_id) do nothing;

insert into public.simulated_payment_methods (
  payment_method_id,
  member_id,
  cardholder_name,
  card_brand,
  last_four,
  expiration_month,
  expiration_year,
  billing_zip,
  is_default,
  status,
  created_at,
  updated_at
)
select
  'SPM-QA-WAITLIST-' || lpad(fixture.number::text, 2, '0'),
  'MEM-QA-WAITLIST-' || lpad(fixture.number::text, 2, '0'),
  'Waitlist Fixture ' || fixture.number,
  'visa',
  lpad(fixture.number::text, 4, '0'),
  12,
  2030,
  '10001',
  true,
  'active',
  '2026-08-24 12:00:00-04'::timestamptz,
  '2026-08-24 12:00:00-04'::timestamptz
from generate_series(1, 8) as fixture(number)
where exists (
  select 1
  from public.members
  where member_id = 'MEM-QA-WAITLIST-' || lpad(fixture.number::text, 2, '0')
)
on conflict (payment_method_id) do nothing;

insert into public.class_sessions (
  class_session_id,
  class_type,
  starts_at,
  ends_at,
  capacity,
  is_cancelled,
  instructor_staff_id
)
select
  'SESSION-DEMO-FULL-0829-1400',
  'hiit'::public.class_type,
  '2026-08-29 14:00:00-04'::timestamptz,
  '2026-08-29 14:45:00-04'::timestamptz,
  8,
  false,
  'STF-0003'
where exists (
  select 1
  from public.staff_accounts
  where staff_id = 'STF-0003'
)
on conflict (class_session_id) do nothing;

insert into public.reservations (
  reservation_id,
  member_id,
  class_session_id,
  membership_id,
  status,
  reserved_at,
  cancelled_at,
  is_late_cancellation
)
select
  'RSV-QA-WAITLIST-' || lpad(fixture.number::text, 2, '0'),
  'MEM-QA-WAITLIST-' || lpad(fixture.number::text, 2, '0'),
  'SESSION-DEMO-FULL-0829-1400',
  null,
  'confirmed'::public.reservation_status,
  '2026-08-24 12:00:00-04'::timestamptz + (fixture.number * interval '1 minute'),
  null,
  null
from generate_series(1, 8) as fixture(number)
where exists (
  select 1
  from public.class_sessions
  where class_session_id = 'SESSION-DEMO-FULL-0829-1400'
)
on conflict (reservation_id) do nothing;

insert into public.drop_in_payments (
  payment_id,
  reservation_id,
  member_id,
  amount,
  status,
  created_at,
  refunded_at
)
select
  'PAY-QA-WAITLIST-' || lpad(fixture.number::text, 2, '0'),
  'RSV-QA-WAITLIST-' || lpad(fixture.number::text, 2, '0'),
  'MEM-QA-WAITLIST-' || lpad(fixture.number::text, 2, '0'),
  35.00,
  'authorized'::public.payment_status,
  '2026-08-24 12:00:00-04'::timestamptz + (fixture.number * interval '1 minute'),
  null
from generate_series(1, 8) as fixture(number)
where exists (
  select 1
  from public.reservations
  where reservation_id = 'RSV-QA-WAITLIST-' || lpad(fixture.number::text, 2, '0')
)
on conflict (payment_id) do nothing;

commit;
