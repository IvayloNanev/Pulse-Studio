begin;

create extension if not exists pgtap with schema extensions;
select plan(20);

-- Isolated fixtures. The transaction is rolled back after the suite.
insert into public.members (member_id, first_name, last_name, email, phone, preferred_channel, do_not_contact)
values ('TEST-MEM-001', 'Integration', 'Member', 'integration.member@pulse.example', '+1-212-555-9991', 'email', false);

insert into public.member_accounts (account_id, member_id, auth_subject, email_verified, account_status, created_at)
values ('TEST-ACC-001', 'TEST-MEM-001', '11111111-1111-4111-8111-111111111111', true, 'active', now());

insert into public.memberships (
  membership_id, member_id, plan_id, status, start_date,
  billing_cycle_start_date, end_date, agreed_monthly_price
) values (
  'TEST-MSP-001', 'TEST-MEM-001', 'PLAN-012', 'active', current_date - 100,
  date_trunc('month', now())::date, null, 249.00
);

insert into public.membership_status_history (
  membership_status_history_id, membership_id, status, effective_at, ended_at
) values
  ('TEST-MSH-001', 'TEST-MSP-001', 'active', now() - interval '100 days', now() + interval '5 days'),
  ('TEST-MSH-002', 'TEST-MSP-001', 'paused', now() + interval '5 days', now() + interval '35 days'),
  ('TEST-MSH-003', 'TEST-MSP-001', 'active', now() + interval '35 days', null);

insert into public.staff_accounts (
  staff_id, auth_subject, first_name, last_name, email, role, account_status, created_at
) values (
  'TEST-STF-001', '22222222-2222-4222-8222-222222222222',
  'Integration', 'Owner', 'integration.owner@pulse.example', 'owner_admin', 'active', now()
);

insert into public.class_sessions (
  class_session_id, class_type, starts_at, ends_at, capacity, is_cancelled, instructor_staff_id
) values
  ('TEST-CLS-BOOK', 'yoga', now() + interval '2 days', now() + interval '2 days 1 hour', 2, false, 'TEST-STF-001'),
  ('TEST-CLS-DROP', 'cycling', now() + interval '3 days', now() + interval '3 days 1 hour', 2, false, 'TEST-STF-001'),
  ('TEST-CLS-EARLY', 'hiit', now() + interval '13 hours', now() + interval '14 hours', 2, false, 'TEST-STF-001'),
  ('TEST-CLS-ATTEND', 'yoga', now() - interval '5 minutes', now() + interval '55 minutes', 10, false, 'TEST-STF-001'),
  ('TEST-CLS-NOSHOW', 'cycling', now() - interval '21 minutes', now() + interval '39 minutes', 10, false, 'TEST-STF-001'),
  ('TEST-CLS-STUDIO', 'hiit', now() + interval '4 days', now() + interval '4 days 1 hour', 10, false, 'TEST-STF-001');

insert into public.reservations (
  reservation_id, member_id, class_session_id, membership_id, status, reserved_at, uses_drop_in
) values
  ('TEST-RES-ATTEND', 'TEST-MEM-001', 'TEST-CLS-ATTEND', 'TEST-MSP-001', 'confirmed', now() - interval '1 day', false),
  ('TEST-RES-NOSHOW', 'TEST-MEM-001', 'TEST-CLS-NOSHOW', 'TEST-MSP-001', 'confirmed', now() - interval '1 day', false),
  ('TEST-RES-STUDIO', 'TEST-MEM-001', 'TEST-CLS-STUDIO', null, 'confirmed', now() - interval '1 day', true);

insert into public.drop_in_payments (
  payment_id, reservation_id, member_id, amount, status, created_at
) values ('TEST-PAY-STUDIO', 'TEST-RES-STUDIO', 'TEST-MEM-001', 35.00, 'authorized', now() - interval '1 day');

select is(
  public.membership_status_at('TEST-MSP-001', now()),
  'active'::public.membership_status,
  'membership is active before a scheduled pause'
);
select is(
  public.membership_status_at('TEST-MSP-001', now() + interval '10 days'),
  'paused'::public.membership_status,
  'membership is paused inside the effective interval'
);
select is(
  public.membership_status_at('TEST-MSP-001', now() + interval '40 days'),
  'active'::public.membership_status,
  'membership resumes after the pause interval'
);

select ok(
  has_function_privilege('authenticated', 'public.book_class_session(text,boolean)', 'EXECUTE'),
  'authenticated members can execute the booking command'
);
select ok(
  not has_table_privilege('authenticated', 'public.reservations', 'INSERT'),
  'authenticated clients cannot bypass booking with direct reservation inserts'
);

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

create temporary table test_booking as
select * from public.book_class_session('TEST-CLS-BOOK', false);
select is((select reservation_status from test_booking), 'confirmed', 'membership-credit booking is confirmed');
select is(
  (select member_id from public.reservations where reservation_id = (select reservation_id from test_booking)),
  'TEST-MEM-001',
  'booking persists for the authenticated member'
);
select throws_ok(
  $$select * from public.book_class_session('TEST-CLS-BOOK', false)$$,
  'P0001',
  'member already has an open reservation for this class session',
  'duplicate open booking is rejected'
);

create temporary table test_drop_in as
select * from public.book_class_session('TEST-CLS-DROP', true);
select is((select reservation_status from test_drop_in), 'confirmed', 'selected drop-in booking is confirmed');
select is(
  (select amount from public.drop_in_payments where reservation_id = (select reservation_id from test_drop_in)),
  35.00::numeric,
  'confirmed drop-in authorizes exactly $35'
);

create temporary table test_early_drop_in as
select * from public.book_class_session('TEST-CLS-EARLY', true);
create temporary table test_early_cancel as
select * from public.cancel_member_reservation((select reservation_id from test_early_drop_in));
select is((select reservation_status from test_early_cancel), 'cancelled', 'member can cancel an open reservation');
select is(
  (select status::text from public.drop_in_payments where reservation_id = (select reservation_id from test_early_drop_in)),
  'refunded',
  'drop-in cancelled more than 12 hours early is refunded'
);

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);

create temporary table test_attended as
select * from public.record_attendance('TEST-RES-ATTEND', 'attended');
select is((select attendance_status from test_attended), 'attended', 'staff records attended inside the check-in window');
select throws_ok(
  $$select * from public.record_attendance('TEST-RES-ATTEND', 'attended')$$,
  'P0001',
  'attendance has already been recorded for this reservation',
  'duplicate attendance is rejected'
);

create temporary table test_no_show as
select * from public.record_attendance('TEST-RES-NOSHOW', 'no_show');
select is((select attendance_status from test_no_show), 'no_show', 'staff records no-show after the check-in window closes');

create temporary table test_studio_cancel as
select * from public.cancel_class_session('TEST-CLS-STUDIO', 'Instructor unavailable');
select is((select cancelled_reservations from test_studio_cancel), 1, 'studio cancellation closes affected reservations');
select is((select refunded_drop_ins from test_studio_cancel), 1, 'studio cancellation refunds affected drop-ins');
select is(
  (select status::text from public.reservations where reservation_id = 'TEST-RES-STUDIO'),
  'studio_cancelled',
  'affected reservation records the truthful studio-cancelled outcome'
);
select is(
  (select status::text from public.drop_in_payments where payment_id = 'TEST-PAY-STUDIO'),
  'refunded',
  'studio-cancelled drop-in payment is refunded'
);
select is(
  (select count(*)::integer from public.class_session_actions where class_session_id = 'TEST-CLS-STUDIO'),
  1,
  'studio cancellation writes one owner audit action'
);

select * from finish();
rollback;
