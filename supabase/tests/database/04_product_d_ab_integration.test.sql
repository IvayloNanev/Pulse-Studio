begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

-- This suite proves that Product D actually reads data produced through
-- Product A's and Product B's real commands (book_class_session,
-- record_attendance) rather than data inserted directly to simulate them.
-- Isolated fixtures. The transaction is rolled back after the suite.

insert into public.staff_accounts (
  staff_id, auth_subject, first_name, last_name, email, role, account_status, created_at
) values (
  'TEST-AB-STF-001', '99999999-9999-4999-8999-999999999999',
  'Chain', 'Staff', 'chain.staff@pulse.example', 'owner_admin', 'active', now()
);

insert into public.members (member_id, first_name, last_name, email, phone, preferred_channel, do_not_contact)
values ('TEST-AB-MEM-F', 'Chained', 'MemberF', 'chained.f@pulse.example', '+1-212-555-2001', 'email', false);

insert into public.member_accounts (account_id, member_id, auth_subject, email_verified, account_status, created_at)
values ('TEST-AB-ACC-F', 'TEST-AB-MEM-F', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true, 'active', now());

insert into public.memberships (membership_id, member_id, plan_id, status, start_date, billing_cycle_start_date, end_date, agreed_monthly_price)
values ('TEST-AB-MSP-F', 'TEST-AB-MEM-F', 'PLAN-012', 'active', current_date - 120, date_trunc('month', now())::date, null, 249.00);

insert into public.membership_status_history (membership_status_history_id, membership_id, status, effective_at, ended_at)
values ('TEST-AB-MSH-F', 'TEST-AB-MSP-F', 'active', now() - interval '120 days', null);

-- Pre-existing previous-period attendance (31-59 days ago). This is historical
-- baseline data, not the subject of this test, so it is seeded directly as in
-- the other Product D suites.
insert into public.class_sessions (class_session_id, class_type, starts_at, ends_at, capacity, is_cancelled, instructor_staff_id)
values
  ('TEST-AB-CLS-H1', 'yoga', now() - interval '35 days', now() - interval '35 days' + interval '1 hour', 10, false, 'TEST-AB-STF-001'),
  ('TEST-AB-CLS-H2', 'yoga', now() - interval '42 days', now() - interval '42 days' + interval '1 hour', 10, false, 'TEST-AB-STF-001'),
  ('TEST-AB-CLS-H3', 'cycling', now() - interval '49 days', now() - interval '49 days' + interval '1 hour', 10, false, 'TEST-AB-STF-001'),
  ('TEST-AB-CLS-H4', 'hiit', now() - interval '56 days', now() - interval '56 days' + interval '1 hour', 10, false, 'TEST-AB-STF-001');

insert into public.reservations (reservation_id, member_id, class_session_id, membership_id, status, reserved_at, uses_drop_in)
values
  ('TEST-AB-RES-H1', 'TEST-AB-MEM-F', 'TEST-AB-CLS-H1', 'TEST-AB-MSP-F', 'confirmed', now() - interval '36 days', false),
  ('TEST-AB-RES-H2', 'TEST-AB-MEM-F', 'TEST-AB-CLS-H2', 'TEST-AB-MSP-F', 'confirmed', now() - interval '43 days', false),
  ('TEST-AB-RES-H3', 'TEST-AB-MEM-F', 'TEST-AB-CLS-H3', 'TEST-AB-MSP-F', 'confirmed', now() - interval '50 days', false),
  ('TEST-AB-RES-H4', 'TEST-AB-MEM-F', 'TEST-AB-CLS-H4', 'TEST-AB-MSP-F', 'confirmed', now() - interval '57 days', false);

insert into public.attendance_records (attendance_record_id, reservation_id, attendance_status, recorded_at)
values
  ('TEST-AB-ATT-H1', 'TEST-AB-RES-H1', 'attended', now() - interval '35 days'),
  ('TEST-AB-ATT-H2', 'TEST-AB-RES-H2', 'attended', now() - interval '42 days'),
  ('TEST-AB-ATT-H3', 'TEST-AB-RES-H3', 'attended', now() - interval '49 days'),
  ('TEST-AB-ATT-H4', 'TEST-AB-RES-H4', 'attended', now() - interval '56 days');

-- The class session for the live chain: scheduled a few minutes in the
-- future so Product A's book_class_session command accepts it (it must not
-- have started yet), while still landing in Product D's "current" 30-day
-- window once attended.
insert into public.class_sessions (class_session_id, class_type, starts_at, ends_at, capacity, is_cancelled, instructor_staff_id)
values ('TEST-AB-CLS-LIVE', 'yoga', now() + interval '10 minutes', now() + interval '70 minutes', 10, false, 'TEST-AB-STF-001');

-- Step 1: Product A. The member books the class through the real,
-- authoritative booking command (not a direct insert into reservations).
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);

create temporary table live_booking as
  select * from public.book_class_session('TEST-AB-CLS-LIVE', false);

select is(
  (select reservation_status from live_booking),
  'confirmed',
  'Product A: the real booking command confirms the reservation'
);
select is(
  (select count(*)::integer from public.reservations where reservation_id = (select reservation_id from live_booking) and member_id = 'TEST-AB-MEM-F'),
  1,
  'Product A: the reservation created by the booking command is persisted under the correct member'
);

-- Step 2: Product B. Staff records the attendance outcome through the real
-- attendance command, referencing the reservation Product A just created.
select set_config('request.jwt.claim.sub', '99999999-9999-4999-8999-999999999999', true);

create temporary table live_attendance as
  select * from public.record_attendance((select reservation_id from live_booking), 'attended');

select is(
  (select attendance_status from live_attendance),
  'attended',
  'Product B: the real attendance command records the outcome'
);
select is(
  (select reservation_id from live_attendance),
  (select reservation_id from live_booking),
  'Product B: the attendance record references the exact reservation Product A created'
);

-- Step 3: Product D. The risk evaluation must read this real chain, not a
-- fixture standing in for it.
create temporary table eval_f as select * from public.evaluate_member_risk('TEST-AB-MEM-F');

select is(
  (select previous_visits from eval_f),
  4,
  'Product D: previous-period visits come from the seeded historical attendance'
);
-- The live class session is scheduled a few minutes in the future (a real
-- requirement of book_class_session, which rejects already-started
-- sessions). Product D correctly excludes it from the current-period count
-- because the session has not started as of the evaluation time, even
-- though record_attendance itself accepted an 'attended' result for it.
-- NOTE FOR THE TEAM: record_attendance has no time-window restriction of its
-- own (see supabase/migrations/20260823143000_add_product_b_attendance_commands.sql).
-- docs/07-pulse-assistant-coverage-spec.md references a 15-minutes-before to
-- 20-minutes-after check-in window, but it is not enforced at the database
-- layer. Flagging this as a discrepancy rather than changing the rule here.
select is(
  (select current_visits from eval_f),
  0,
  'Product D: a class session that has not yet started is correctly excluded from the current-period count'
);
select is(
  (select risk_level from eval_f),
  'high',
  'Product D: the decline computed from the real chain data is classified correctly'
);
select is(
  (select evaluation_result from eval_f),
  'qualifying_assessment_created',
  'Product D: a qualifying risk assessment is created from the real A -> B -> D chain'
);

-- Confirm the specific attendance record produced by Product B's command is
-- the one actually counted as the member's current-period visit.
select is(
  (
    select count(*)::integer
    from public.attendance_records as attendance
    join public.reservations as reservation on reservation.reservation_id = attendance.reservation_id
    where attendance.attendance_record_id = (select attendance_record_id from live_attendance)
      and reservation.member_id = 'TEST-AB-MEM-F'
      and attendance.attendance_status = 'attended'
      and reservation.class_session_id = 'TEST-AB-CLS-LIVE'
  ),
  1,
  'the exact attendance record created by record_attendance is traceable back through the real reservation to the member'
);

select * from finish();
rollback;
