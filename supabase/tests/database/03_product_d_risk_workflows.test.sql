begin;

create extension if not exists pgtap with schema extensions;
select plan(27);

-- Isolated fixtures. The transaction is rolled back after the suite.

insert into public.staff_accounts (
  staff_id, auth_subject, first_name, last_name, email, role, account_status, created_at
) values (
  'TEST-D-STF-001', '33333333-3333-4333-8333-333333333333',
  'Retention', 'Staff', 'retention.staff@pulse.example', 'owner_admin', 'active', now()
);

-- Member A: sufficient decline history -> should qualify for a high-risk case.
insert into public.members (member_id, first_name, last_name, email, phone, preferred_channel, do_not_contact)
values ('TEST-D-MEM-A', 'Declining', 'MemberA', 'declining.a@pulse.example', '+1-212-555-1001', 'email', false);

insert into public.member_accounts (account_id, member_id, auth_subject, email_verified, account_status, created_at)
values ('TEST-D-ACC-A', 'TEST-D-MEM-A', '44444444-4444-4444-8444-444444444444', true, 'active', now());

insert into public.memberships (
  membership_id, member_id, plan_id, status, start_date,
  billing_cycle_start_date, end_date, agreed_monthly_price
) values (
  'TEST-D-MSP-A', 'TEST-D-MEM-A', 'PLAN-012', 'active', current_date - 120,
  date_trunc('month', now())::date, null, 249.00
);

insert into public.membership_status_history (
  membership_status_history_id, membership_id, status, effective_at, ended_at
) values ('TEST-D-MSH-A', 'TEST-D-MSP-A', 'active', now() - interval '120 days', null);

-- Four attended sessions 31-59 days ago (previous window), none in the last 30 days.
insert into public.class_sessions (class_session_id, class_type, starts_at, ends_at, capacity, is_cancelled, instructor_staff_id)
values
  ('TEST-D-CLS-A1', 'yoga', now() - interval '35 days', now() - interval '35 days' + interval '1 hour', 10, false, 'TEST-D-STF-001'),
  ('TEST-D-CLS-A2', 'yoga', now() - interval '42 days', now() - interval '42 days' + interval '1 hour', 10, false, 'TEST-D-STF-001'),
  ('TEST-D-CLS-A3', 'cycling', now() - interval '49 days', now() - interval '49 days' + interval '1 hour', 10, false, 'TEST-D-STF-001'),
  ('TEST-D-CLS-A4', 'hiit', now() - interval '56 days', now() - interval '56 days' + interval '1 hour', 10, false, 'TEST-D-STF-001');

insert into public.reservations (reservation_id, member_id, class_session_id, membership_id, status, reserved_at, uses_drop_in)
values
  ('TEST-D-RES-A1', 'TEST-D-MEM-A', 'TEST-D-CLS-A1', 'TEST-D-MSP-A', 'confirmed', now() - interval '36 days', false),
  ('TEST-D-RES-A2', 'TEST-D-MEM-A', 'TEST-D-CLS-A2', 'TEST-D-MSP-A', 'confirmed', now() - interval '43 days', false),
  ('TEST-D-RES-A3', 'TEST-D-MEM-A', 'TEST-D-CLS-A3', 'TEST-D-MSP-A', 'confirmed', now() - interval '50 days', false),
  ('TEST-D-RES-A4', 'TEST-D-MEM-A', 'TEST-D-CLS-A4', 'TEST-D-MSP-A', 'confirmed', now() - interval '57 days', false);

insert into public.attendance_records (attendance_record_id, reservation_id, attendance_status, recorded_at)
values
  ('TEST-D-ATT-A1', 'TEST-D-RES-A1', 'attended', now() - interval '35 days'),
  ('TEST-D-ATT-A2', 'TEST-D-RES-A2', 'attended', now() - interval '42 days'),
  ('TEST-D-ATT-A3', 'TEST-D-RES-A3', 'attended', now() - interval '49 days'),
  ('TEST-D-ATT-A4', 'TEST-D-RES-A4', 'attended', now() - interval '56 days');

-- Member B: only two previous visits -> should not qualify (insufficient history).
insert into public.members (member_id, first_name, last_name, email, phone, preferred_channel, do_not_contact)
values ('TEST-D-MEM-B', 'Sparse', 'MemberB', 'sparse.b@pulse.example', '+1-212-555-1002', 'email', false);

insert into public.member_accounts (account_id, member_id, auth_subject, email_verified, account_status, created_at)
values ('TEST-D-ACC-B', 'TEST-D-MEM-B', '55555555-5555-4555-8555-555555555555', true, 'active', now());

insert into public.memberships (membership_id, member_id, plan_id, status, start_date, billing_cycle_start_date, end_date, agreed_monthly_price)
values ('TEST-D-MSP-B', 'TEST-D-MEM-B', 'PLAN-012', 'active', current_date - 120, date_trunc('month', now())::date, null, 249.00);

insert into public.membership_status_history (membership_status_history_id, membership_id, status, effective_at, ended_at)
values ('TEST-D-MSH-B', 'TEST-D-MSP-B', 'active', now() - interval '120 days', null);

insert into public.class_sessions (class_session_id, class_type, starts_at, ends_at, capacity, is_cancelled, instructor_staff_id)
values ('TEST-D-CLS-B1', 'yoga', now() - interval '40 days', now() - interval '40 days' + interval '1 hour', 10, false, 'TEST-D-STF-001');

insert into public.reservations (reservation_id, member_id, class_session_id, membership_id, status, reserved_at, uses_drop_in)
values ('TEST-D-RES-B1', 'TEST-D-MEM-B', 'TEST-D-CLS-B1', 'TEST-D-MSP-B', 'confirmed', now() - interval '41 days', false);

insert into public.attendance_records (attendance_record_id, reservation_id, attendance_status, recorded_at)
values ('TEST-D-ATT-B1', 'TEST-D-RES-B1', 'attended', now() - interval '40 days');

-- Member C: same qualifying history as Member A, but has requested no contact.
insert into public.members (member_id, first_name, last_name, email, phone, preferred_channel, do_not_contact)
values ('TEST-D-MEM-C', 'Silent', 'MemberC', 'silent.c@pulse.example', '+1-212-555-1003', 'email', true);

insert into public.member_accounts (account_id, member_id, auth_subject, email_verified, account_status, created_at)
values ('TEST-D-ACC-C', 'TEST-D-MEM-C', '66666666-6666-4666-8666-666666666666', true, 'active', now());

insert into public.memberships (membership_id, member_id, plan_id, status, start_date, billing_cycle_start_date, end_date, agreed_monthly_price)
values ('TEST-D-MSP-C', 'TEST-D-MEM-C', 'PLAN-012', 'active', current_date - 120, date_trunc('month', now())::date, null, 249.00);

insert into public.membership_status_history (membership_status_history_id, membership_id, status, effective_at, ended_at)
values ('TEST-D-MSH-C', 'TEST-D-MSP-C', 'active', now() - interval '120 days', null);

insert into public.class_sessions (class_session_id, class_type, starts_at, ends_at, capacity, is_cancelled, instructor_staff_id)
values
  ('TEST-D-CLS-C1', 'yoga', now() - interval '35 days', now() - interval '35 days' + interval '1 hour', 10, false, 'TEST-D-STF-001'),
  ('TEST-D-CLS-C2', 'yoga', now() - interval '42 days', now() - interval '42 days' + interval '1 hour', 10, false, 'TEST-D-STF-001'),
  ('TEST-D-CLS-C3', 'cycling', now() - interval '49 days', now() - interval '49 days' + interval '1 hour', 10, false, 'TEST-D-STF-001'),
  ('TEST-D-CLS-C4', 'hiit', now() - interval '56 days', now() - interval '56 days' + interval '1 hour', 10, false, 'TEST-D-STF-001');

insert into public.reservations (reservation_id, member_id, class_session_id, membership_id, status, reserved_at, uses_drop_in)
values
  ('TEST-D-RES-C1', 'TEST-D-MEM-C', 'TEST-D-CLS-C1', 'TEST-D-MSP-C', 'confirmed', now() - interval '36 days', false),
  ('TEST-D-RES-C2', 'TEST-D-MEM-C', 'TEST-D-CLS-C2', 'TEST-D-MSP-C', 'confirmed', now() - interval '43 days', false),
  ('TEST-D-RES-C3', 'TEST-D-MEM-C', 'TEST-D-CLS-C3', 'TEST-D-MSP-C', 'confirmed', now() - interval '50 days', false),
  ('TEST-D-RES-C4', 'TEST-D-MEM-C', 'TEST-D-CLS-C4', 'TEST-D-MSP-C', 'confirmed', now() - interval '57 days', false);

insert into public.attendance_records (attendance_record_id, reservation_id, attendance_status, recorded_at)
values
  ('TEST-D-ATT-C1', 'TEST-D-RES-C1', 'attended', now() - interval '35 days'),
  ('TEST-D-ATT-C2', 'TEST-D-RES-C2', 'attended', now() - interval '42 days'),
  ('TEST-D-ATT-C3', 'TEST-D-RES-C3', 'attended', now() - interval '49 days'),
  ('TEST-D-ATT-C4', 'TEST-D-RES-C4', 'attended', now() - interval '56 days');

-- Member D: a 50% decline -> should qualify as medium risk (not high).
insert into public.members (member_id, first_name, last_name, email, phone, preferred_channel, do_not_contact)
values ('TEST-D-MEM-D', 'Medium', 'MemberD', 'medium.d@pulse.example', '+1-212-555-1004', 'email', false);

insert into public.member_accounts (account_id, member_id, auth_subject, email_verified, account_status, created_at)
values ('TEST-D-ACC-D', 'TEST-D-MEM-D', '77777777-7777-4777-8777-777777777777', true, 'active', now());

insert into public.memberships (membership_id, member_id, plan_id, status, start_date, billing_cycle_start_date, end_date, agreed_monthly_price)
values ('TEST-D-MSP-D', 'TEST-D-MEM-D', 'PLAN-012', 'active', current_date - 120, date_trunc('month', now())::date, null, 249.00);

insert into public.membership_status_history (membership_status_history_id, membership_id, status, effective_at, ended_at)
values ('TEST-D-MSH-D', 'TEST-D-MSP-D', 'active', now() - interval '120 days', null);

-- Four attended sessions 31-59 days ago, and two attended in the last 30 days (50% decline).
insert into public.class_sessions (class_session_id, class_type, starts_at, ends_at, capacity, is_cancelled, instructor_staff_id)
values
  ('TEST-D-CLS-D1', 'yoga', now() - interval '35 days', now() - interval '35 days' + interval '1 hour', 10, false, 'TEST-D-STF-001'),
  ('TEST-D-CLS-D2', 'yoga', now() - interval '42 days', now() - interval '42 days' + interval '1 hour', 10, false, 'TEST-D-STF-001'),
  ('TEST-D-CLS-D3', 'cycling', now() - interval '49 days', now() - interval '49 days' + interval '1 hour', 10, false, 'TEST-D-STF-001'),
  ('TEST-D-CLS-D4', 'hiit', now() - interval '56 days', now() - interval '56 days' + interval '1 hour', 10, false, 'TEST-D-STF-001'),
  ('TEST-D-CLS-D5', 'yoga', now() - interval '10 days', now() - interval '10 days' + interval '1 hour', 10, false, 'TEST-D-STF-001'),
  ('TEST-D-CLS-D6', 'cycling', now() - interval '5 days', now() - interval '5 days' + interval '1 hour', 10, false, 'TEST-D-STF-001');

insert into public.reservations (reservation_id, member_id, class_session_id, membership_id, status, reserved_at, uses_drop_in)
values
  ('TEST-D-RES-D1', 'TEST-D-MEM-D', 'TEST-D-CLS-D1', 'TEST-D-MSP-D', 'confirmed', now() - interval '36 days', false),
  ('TEST-D-RES-D2', 'TEST-D-MEM-D', 'TEST-D-CLS-D2', 'TEST-D-MSP-D', 'confirmed', now() - interval '43 days', false),
  ('TEST-D-RES-D3', 'TEST-D-MEM-D', 'TEST-D-CLS-D3', 'TEST-D-MSP-D', 'confirmed', now() - interval '50 days', false),
  ('TEST-D-RES-D4', 'TEST-D-MEM-D', 'TEST-D-CLS-D4', 'TEST-D-MSP-D', 'confirmed', now() - interval '57 days', false),
  ('TEST-D-RES-D5', 'TEST-D-MEM-D', 'TEST-D-CLS-D5', 'TEST-D-MSP-D', 'confirmed', now() - interval '11 days', false),
  ('TEST-D-RES-D6', 'TEST-D-MEM-D', 'TEST-D-CLS-D6', 'TEST-D-MSP-D', 'confirmed', now() - interval '6 days', false);

insert into public.attendance_records (attendance_record_id, reservation_id, attendance_status, recorded_at)
values
  ('TEST-D-ATT-D1', 'TEST-D-RES-D1', 'attended', now() - interval '35 days'),
  ('TEST-D-ATT-D2', 'TEST-D-RES-D2', 'attended', now() - interval '42 days'),
  ('TEST-D-ATT-D3', 'TEST-D-RES-D3', 'attended', now() - interval '49 days'),
  ('TEST-D-ATT-D4', 'TEST-D-RES-D4', 'attended', now() - interval '56 days'),
  ('TEST-D-ATT-D5', 'TEST-D-RES-D5', 'attended', now() - interval '10 days'),
  ('TEST-D-ATT-D6', 'TEST-D-RES-D6', 'attended', now() - interval '5 days');

-- Member E: a case that was already resolved in the past, then a genuine new decline
-- after a recovery visit. The backend must allow this legitimate re-decline rather
-- than treating "one member = one lifetime assessment".
insert into public.members (member_id, first_name, last_name, email, phone, preferred_channel, do_not_contact)
values ('TEST-D-MEM-E', 'Redeclining', 'MemberE', 'redeclining.e@pulse.example', '+1-212-555-1005', 'email', false);

insert into public.member_accounts (account_id, member_id, auth_subject, email_verified, account_status, created_at)
values ('TEST-D-ACC-E', 'TEST-D-MEM-E', '88888888-8888-4888-8888-888888888888', true, 'active', now());

insert into public.memberships (membership_id, member_id, plan_id, status, start_date, billing_cycle_start_date, end_date, agreed_monthly_price)
values ('TEST-D-MSP-E', 'TEST-D-MEM-E', 'PLAN-012', 'active', current_date - 200, date_trunc('month', now())::date, null, 249.00);

insert into public.membership_status_history (membership_status_history_id, membership_id, status, effective_at, ended_at)
values ('TEST-D-MSH-E', 'TEST-D-MSP-E', 'active', now() - interval '200 days', null);

-- A previously dismissed case, closed 20 days ago, well before the member's
-- recovery visit and the new decline being evaluated below.
insert into public.risk_assessments (
  risk_assessment_id, member_id, evaluated_at,
  previous_period_start, previous_period_end, current_period_start, current_period_end,
  previous_visits, current_visits, decline_percentage, risk_level, review_status,
  resolved_at, resolution_reason
) values (
  'TEST-D-RISK-E-OLD', 'TEST-D-MEM-E', now() - interval '25 days',
  now() - interval '85 days', now() - interval '55 days', now() - interval '55 days', now() - interval '25 days',
  4, 0, 100.0, 'high', 'dismissed',
  now() - interval '20 days', 'Member confirmed a temporary relocation; case closed pending their return.'
);

-- Four attended sessions 31-59 days ago (the new previous window).
insert into public.class_sessions (class_session_id, class_type, starts_at, ends_at, capacity, is_cancelled, instructor_staff_id)
values
  ('TEST-D-CLS-E1', 'yoga', now() - interval '35 days', now() - interval '35 days' + interval '1 hour', 10, false, 'TEST-D-STF-001'),
  ('TEST-D-CLS-E2', 'yoga', now() - interval '42 days', now() - interval '42 days' + interval '1 hour', 10, false, 'TEST-D-STF-001'),
  ('TEST-D-CLS-E3', 'cycling', now() - interval '49 days', now() - interval '49 days' + interval '1 hour', 10, false, 'TEST-D-STF-001'),
  ('TEST-D-CLS-E4', 'hiit', now() - interval '56 days', now() - interval '56 days' + interval '1 hour', 10, false, 'TEST-D-STF-001'),
  ('TEST-D-CLS-E5', 'yoga', now() - interval '10 days', now() - interval '10 days' + interval '1 hour', 10, false, 'TEST-D-STF-001');

insert into public.reservations (reservation_id, member_id, class_session_id, membership_id, status, reserved_at, uses_drop_in)
values
  ('TEST-D-RES-E1', 'TEST-D-MEM-E', 'TEST-D-CLS-E1', 'TEST-D-MSP-E', 'confirmed', now() - interval '36 days', false),
  ('TEST-D-RES-E2', 'TEST-D-MEM-E', 'TEST-D-CLS-E2', 'TEST-D-MSP-E', 'confirmed', now() - interval '43 days', false),
  ('TEST-D-RES-E3', 'TEST-D-MEM-E', 'TEST-D-CLS-E3', 'TEST-D-MSP-E', 'confirmed', now() - interval '50 days', false),
  ('TEST-D-RES-E4', 'TEST-D-MEM-E', 'TEST-D-CLS-E4', 'TEST-D-MSP-E', 'confirmed', now() - interval '57 days', false),
  ('TEST-D-RES-E5', 'TEST-D-MEM-E', 'TEST-D-CLS-E5', 'TEST-D-MSP-E', 'confirmed', now() - interval '11 days', false);

insert into public.attendance_records (attendance_record_id, reservation_id, attendance_status, recorded_at)
values
  ('TEST-D-ATT-E1', 'TEST-D-RES-E1', 'attended', now() - interval '35 days'),
  ('TEST-D-ATT-E2', 'TEST-D-RES-E2', 'attended', now() - interval '42 days'),
  ('TEST-D-ATT-E3', 'TEST-D-RES-E3', 'attended', now() - interval '49 days'),
  ('TEST-D-ATT-E4', 'TEST-D-RES-E4', 'attended', now() - interval '56 days'),
  -- The recovery visit: attended after the old case was resolved (-20 days).
  ('TEST-D-ATT-E5', 'TEST-D-RES-E5', 'attended', now() - interval '10 days');

select ok(
  has_function_privilege('authenticated', 'public.evaluate_member_risk(text,timestamptz)', 'EXECUTE'),
  'authenticated members and staff can execute evaluate_member_risk (RLS/authorization inside the function decides who may act)'
);

-- Run the evaluation as staff.
select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);

create temporary table eval_a as select * from public.evaluate_member_risk('TEST-D-MEM-A', now() - interval '1 hour');
select is((select evaluation_result from eval_a), 'qualifying_assessment_created', 'member A with a full decline qualifies for a new risk case');
select is((select assessment_created from eval_a), true, 'member A evaluation reports assessment_created = true');
select is((select previous_visits from eval_a), 4, 'member A previous-period visit count is computed deterministically from attendance_records');
select is((select current_visits from eval_a), 0, 'member A current-period visit count is computed deterministically from attendance_records');
select is((select risk_level from eval_a), 'high', 'a 100% decline is classified as high risk (>= 75% threshold)');
select is(
  (select count(*)::integer from public.outreach_records where risk_assessment_id = (select risk_assessment_id from eval_a)),
  1,
  'a qualifying case with an active membership creates exactly one initial outreach draft'
);

create temporary table eval_a_again as select * from public.evaluate_member_risk('TEST-D-MEM-A');
select is(
  (select evaluation_result from eval_a_again),
  'open_episode_exists',
  'evaluating the same member again while the case is still open does not create a duplicate'
);
select is(
  (select count(*)::integer from public.risk_assessments where member_id = 'TEST-D-MEM-A'),
  1,
  'exactly one risk assessment row exists for member A after the duplicate attempt'
);

create temporary table eval_b as select * from public.evaluate_member_risk('TEST-D-MEM-B');
select is(
  (select evaluation_result from eval_b),
  'insufficient_previous_visits',
  'member B with only two previous visits does not qualify (four required)'
);
select is(
  (select count(*)::integer from public.risk_assessments where member_id = 'TEST-D-MEM-B'),
  0,
  'no risk assessment is created for member B'
);

create temporary table eval_c as select * from public.evaluate_member_risk('TEST-D-MEM-C');
select is((select evaluation_result from eval_c), 'qualifying_assessment_created', 'member C (do_not_contact) still qualifies for a risk case');
select is(
  (select count(*)::integer from public.outreach_records where risk_assessment_id = (select risk_assessment_id from eval_c)),
  0,
  'do_not_contact = true suppresses the initial outreach draft entirely'
);

create temporary table eval_d as select * from public.evaluate_member_risk('TEST-D-MEM-D');
select is((select evaluation_result from eval_d), 'qualifying_assessment_created', 'member D with a 50% decline qualifies for a new risk case');
select is((select decline_percentage from eval_d), 50.0, 'member D decline percentage matches the exact previous/current visit ratio');
select is((select risk_level from eval_d), 'medium', 'a 50% decline is classified as medium risk, not high');

create temporary table eval_e as select * from public.evaluate_member_risk('TEST-D-MEM-E');
select is(
  (select evaluation_result from eval_e),
  'qualifying_assessment_created',
  'a member with a prior dismissed case can receive a new legitimate assessment after a recovery visit'
);
select is(
  (select count(*)::integer from public.risk_assessments where member_id = 'TEST-D-MEM-E'),
  2,
  'the old dismissed case and the new case coexist rather than being treated as one lifetime assessment'
);
select isnt(
  (select risk_assessment_id from eval_e),
  'TEST-D-RISK-E-OLD',
  'the new assessment is a distinct record from the previously resolved one'
);

-- Notes require a non-empty body.
select throws_ok(
  format($$select public.create_risk_note(%L, '')$$, (select risk_assessment_id from eval_a)),
  'P0001',
  'note body is required',
  'an empty risk note body is rejected'
);

create temporary table note_a as select * from public.create_risk_note((select risk_assessment_id from eval_a), 'Called member, left voicemail.');
select is((select body from note_a), 'Called member, left voicemail.', 'a staff note is recorded with its exact text');

-- Dismissal requires a reason and only applies to open cases.
select throws_ok(
  format($$select public.dismiss_risk_case(%L, '')$$, (select risk_assessment_id from eval_b)),
  'P0001',
  'dismissal reason is required',
  'dismissing a case without a reason is rejected'
);

-- Start review, then approve and send the outreach for member A, and confirm sending twice is rejected.
select * from public.start_risk_review((select risk_assessment_id from eval_a));
select is(
  (select review_status from public.risk_assessments where risk_assessment_id = (select risk_assessment_id from eval_a)),
  'in_progress',
  'starting review moves a pending case to in_progress'
);

select public.edit_outreach_draft(
  (select outreach_id from public.outreach_records where risk_assessment_id = (select risk_assessment_id from eval_a)),
  'Hi! We miss seeing you at the studio. Want help finding a class that fits your schedule?',
  'email'
);
select public.approve_outreach((select outreach_id from public.outreach_records where risk_assessment_id = (select risk_assessment_id from eval_a)));
select public.send_outreach((select outreach_id from public.outreach_records where risk_assessment_id = (select risk_assessment_id from eval_a)));
select throws_ok(
  format($$select public.send_outreach(%L)$$, (select outreach_id from public.outreach_records where risk_assessment_id = (select risk_assessment_id from eval_a))),
  'P0001',
  'ready outreach not found',
  'sending the same outreach a second time is rejected'
);

select public.complete_outreach(
  (select outreach_id from public.outreach_records where risk_assessment_id = (select risk_assessment_id from eval_a)),
  'interested'
);
select is(
  (select review_status from public.risk_assessments where risk_assessment_id = (select risk_assessment_id from eval_a)),
  'resolved',
  'completing outreach with a member response resolves the risk case'
);

-- Members still cannot read Product D staff-only tables after all of the above.
-- Row-level security only applies to non-superuser roles. Run the raw counts as
-- 'authenticated' (subject to RLS), then compare them back as the pgTAP owner
-- role, since 'authenticated' does not have execute rights on pgTAP itself.
select set_config('request.jwt.claim.sub', '44444444-4444-4444-8444-444444444444', true);
set role authenticated;
create temporary table rls_check_risk as
  select count(*)::integer as n from public.risk_assessments where member_id = 'TEST-D-MEM-A';
create temporary table rls_check_outreach as
  select count(*)::integer as n from public.outreach_records where member_id = 'TEST-D-MEM-A';
reset role;
select is((select n from rls_check_risk), 0, 'row-level security still hides risk assessments from the member the case is about');
select is((select n from rls_check_outreach), 0, 'row-level security still hides outreach records from the member the case is about');

select * from finish();
rollback;
