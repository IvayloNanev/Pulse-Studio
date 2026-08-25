begin;

create extension if not exists pgtap with schema extensions;
select plan(11);

-- Isolated fixtures. The transaction is rolled back after the suite.

insert into public.staff_accounts (
  staff_id, auth_subject, first_name, last_name, email, role, account_status, created_at
) values (
  'TEST-LC-STF-001', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'Lifecycle', 'Staff', 'lifecycle.staff@pulse.example', 'owner_admin', 'active', now()
);
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);

-- ==========================================================================
-- PART 1 — 14-day outreach retry cooldown (create_outreach_retry,
-- resolve_no_response). This is the EXISTING cooldown mechanism in the
-- codebase: it governs retry attempts on an already-sent outreach for the
-- same case, not whether a brand-new risk assessment can be created.
-- ==========================================================================

insert into public.members (member_id, first_name, last_name, email, phone, preferred_channel, do_not_contact)
values ('TEST-LC-MEM-G', 'Cooldown', 'MemberG', 'cooldown.g@pulse.example', '+1-212-555-3001', 'email', false);

insert into public.member_accounts (account_id, member_id, auth_subject, email_verified, account_status, created_at)
values ('TEST-LC-ACC-G', 'TEST-LC-MEM-G', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', true, 'active', now());

insert into public.memberships (membership_id, member_id, plan_id, status, start_date, billing_cycle_start_date, end_date, agreed_monthly_price)
values ('TEST-LC-MSP-G', 'TEST-LC-MEM-G', 'PLAN-012', 'active', current_date - 120, date_trunc('month', now())::date, null, 249.00);

insert into public.membership_status_history (membership_status_history_id, membership_id, status, effective_at, ended_at)
values ('TEST-LC-MSH-G', 'TEST-LC-MSP-G', 'active', now() - interval '120 days', null);

insert into public.class_sessions (class_session_id, class_type, starts_at, ends_at, capacity, is_cancelled, instructor_staff_id)
values
  ('TEST-LC-CLS-G1', 'yoga', now() - interval '35 days', now() - interval '35 days' + interval '1 hour', 10, false, 'TEST-LC-STF-001'),
  ('TEST-LC-CLS-G2', 'yoga', now() - interval '42 days', now() - interval '42 days' + interval '1 hour', 10, false, 'TEST-LC-STF-001'),
  ('TEST-LC-CLS-G3', 'cycling', now() - interval '49 days', now() - interval '49 days' + interval '1 hour', 10, false, 'TEST-LC-STF-001'),
  ('TEST-LC-CLS-G4', 'hiit', now() - interval '56 days', now() - interval '56 days' + interval '1 hour', 10, false, 'TEST-LC-STF-001');

insert into public.reservations (reservation_id, member_id, class_session_id, membership_id, status, reserved_at, uses_drop_in)
values
  ('TEST-LC-RES-G1', 'TEST-LC-MEM-G', 'TEST-LC-CLS-G1', 'TEST-LC-MSP-G', 'confirmed', now() - interval '36 days', false),
  ('TEST-LC-RES-G2', 'TEST-LC-MEM-G', 'TEST-LC-CLS-G2', 'TEST-LC-MSP-G', 'confirmed', now() - interval '43 days', false),
  ('TEST-LC-RES-G3', 'TEST-LC-MEM-G', 'TEST-LC-CLS-G3', 'TEST-LC-MSP-G', 'confirmed', now() - interval '50 days', false),
  ('TEST-LC-RES-G4', 'TEST-LC-MEM-G', 'TEST-LC-CLS-G4', 'TEST-LC-MSP-G', 'confirmed', now() - interval '57 days', false);

insert into public.attendance_records (attendance_record_id, reservation_id, attendance_status, recorded_at)
values
  ('TEST-LC-ATT-G1', 'TEST-LC-RES-G1', 'attended', now() - interval '35 days'),
  ('TEST-LC-ATT-G2', 'TEST-LC-RES-G2', 'attended', now() - interval '42 days'),
  ('TEST-LC-ATT-G3', 'TEST-LC-RES-G3', 'attended', now() - interval '49 days'),
  ('TEST-LC-ATT-G4', 'TEST-LC-RES-G4', 'attended', now() - interval '56 days');

create temporary table eval_g as select * from public.evaluate_member_risk('TEST-LC-MEM-G');

-- Move attempt 1 through approve + send so it has a real sent_at.
select public.approve_outreach((select outreach_id from public.outreach_records where risk_assessment_id = (select risk_assessment_id from eval_g) and attempt_number = 1));
select public.send_outreach((select outreach_id from public.outreach_records where risk_assessment_id = (select risk_assessment_id from eval_g) and attempt_number = 1));

-- Test A: within the 14-day cooldown, a retry must be rejected.
select throws_ok(
  format($$select public.create_outreach_retry(%L, 'Following up again soon.')$$, (select risk_assessment_id from eval_g)),
  'P0001',
  'outreach retry is not eligible',
  'a retry attempt is rejected while the 14-day cooldown from the last send is still active'
);

-- Backdate the sent attempt so it looks like it went out 15 days ago,
-- simulating that real time has passed since the send.
update public.outreach_records
set sent_at = now() - interval '15 days'
where risk_assessment_id = (select risk_assessment_id from eval_g) and attempt_number = 1;

-- Test B: after the cooldown, a retry becomes eligible.
create temporary table retry_2 as
  select * from public.create_outreach_retry((select risk_assessment_id from eval_g), 'Checking in again, we would love to see you back.');
select is((select attempt_number from retry_2), 2, 'a retry after the 14-day cooldown creates the next attempt in sequence');
select is((select status from retry_2)::text, 'draft', 'a new retry starts as a draft, following the same review workflow as the first attempt');

-- Approve, send, and backdate attempt 2 as well, to progress toward the
-- three-attempt no-response resolution path.
select public.approve_outreach((select outreach_id from retry_2));
select public.send_outreach((select outreach_id from retry_2));
update public.outreach_records set sent_at = now() - interval '15 days' where outreach_id = (select outreach_id from retry_2);

create temporary table retry_3 as
  select * from public.create_outreach_retry((select risk_assessment_id from eval_g), 'One last check-in before we close this out.');
select is((select attempt_number from retry_3), 3, 'a second eligible retry reaches the maximum of three attempts');

select public.approve_outreach((select outreach_id from retry_3));
select public.send_outreach((select outreach_id from retry_3));
update public.outreach_records set sent_at = now() - interval '15 days' where outreach_id = (select outreach_id from retry_3);

-- Test C: a fourth retry is rejected even past the cooldown, because three
-- attempts is the approved maximum.
select throws_ok(
  format($$select public.create_outreach_retry(%L, 'This should not be allowed.')$$, (select risk_assessment_id from eval_g)),
  'P0001',
  'outreach retry is not eligible',
  'a fourth retry attempt is rejected even after the cooldown, since three attempts is the maximum'
);

-- Test D: after the cooldown, staff can resolve the case for no response.
select * from public.resolve_no_response((select risk_assessment_id from eval_g));
select is(
  (select review_status from public.risk_assessments where risk_assessment_id = (select risk_assessment_id from eval_g)),
  'resolved',
  'a case with three sent, unanswered attempts past the cooldown can be resolved as no-response'
);
select is(
  (select resolution_reason from public.risk_assessments where risk_assessment_id = (select risk_assessment_id from eval_g)),
  'no_response',
  'the no-response resolution records the correct reason'
);

-- ==========================================================================
-- PART 2 — Paused and cancelled members.
--
-- Approved Product D behavior: paused and cancelled members may retain a
-- factual historical risk assessment, while outreach is created only for an
-- active, contactable membership. See docs/04-business-rules-v1.md section 14.
-- ==========================================================================

-- Paused member.
insert into public.members (member_id, first_name, last_name, email, phone, preferred_channel, do_not_contact)
values ('TEST-LC-MEM-PAUSED', 'Paused', 'MemberH', 'paused.h@pulse.example', '+1-212-555-3002', 'email', false);

insert into public.member_accounts (account_id, member_id, auth_subject, email_verified, account_status, created_at)
values ('TEST-LC-ACC-PAUSED', 'TEST-LC-MEM-PAUSED', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', true, 'active', now());

insert into public.memberships (membership_id, member_id, plan_id, status, start_date, billing_cycle_start_date, end_date, agreed_monthly_price)
values ('TEST-LC-MSP-PAUSED', 'TEST-LC-MEM-PAUSED', 'PLAN-012', 'paused', current_date - 120, date_trunc('month', now())::date, null, 249.00);

-- Active for the historical attendance window, then paused right up to now.
insert into public.membership_status_history (membership_status_history_id, membership_id, status, effective_at, ended_at)
values
  ('TEST-LC-MSH-PAUSED-1', 'TEST-LC-MSP-PAUSED', 'active', now() - interval '120 days', now() - interval '20 days'),
  ('TEST-LC-MSH-PAUSED-2', 'TEST-LC-MSP-PAUSED', 'paused', now() - interval '20 days', null);

insert into public.class_sessions (class_session_id, class_type, starts_at, ends_at, capacity, is_cancelled, instructor_staff_id)
values
  ('TEST-LC-CLS-P1', 'yoga', now() - interval '35 days', now() - interval '35 days' + interval '1 hour', 10, false, 'TEST-LC-STF-001'),
  ('TEST-LC-CLS-P2', 'yoga', now() - interval '42 days', now() - interval '42 days' + interval '1 hour', 10, false, 'TEST-LC-STF-001'),
  ('TEST-LC-CLS-P3', 'cycling', now() - interval '49 days', now() - interval '49 days' + interval '1 hour', 10, false, 'TEST-LC-STF-001'),
  ('TEST-LC-CLS-P4', 'hiit', now() - interval '56 days', now() - interval '56 days' + interval '1 hour', 10, false, 'TEST-LC-STF-001');

insert into public.reservations (reservation_id, member_id, class_session_id, membership_id, status, reserved_at, uses_drop_in)
values
  ('TEST-LC-RES-P1', 'TEST-LC-MEM-PAUSED', 'TEST-LC-CLS-P1', 'TEST-LC-MSP-PAUSED', 'confirmed', now() - interval '36 days', false),
  ('TEST-LC-RES-P2', 'TEST-LC-MEM-PAUSED', 'TEST-LC-CLS-P2', 'TEST-LC-MSP-PAUSED', 'confirmed', now() - interval '43 days', false),
  ('TEST-LC-RES-P3', 'TEST-LC-MEM-PAUSED', 'TEST-LC-CLS-P3', 'TEST-LC-MSP-PAUSED', 'confirmed', now() - interval '50 days', false),
  ('TEST-LC-RES-P4', 'TEST-LC-MEM-PAUSED', 'TEST-LC-CLS-P4', 'TEST-LC-MSP-PAUSED', 'confirmed', now() - interval '57 days', false);

insert into public.attendance_records (attendance_record_id, reservation_id, attendance_status, recorded_at)
values
  ('TEST-LC-ATT-P1', 'TEST-LC-RES-P1', 'attended', now() - interval '35 days'),
  ('TEST-LC-ATT-P2', 'TEST-LC-RES-P2', 'attended', now() - interval '42 days'),
  ('TEST-LC-ATT-P3', 'TEST-LC-RES-P3', 'attended', now() - interval '49 days'),
  ('TEST-LC-ATT-P4', 'TEST-LC-RES-P4', 'attended', now() - interval '56 days');

create temporary table eval_paused as select * from public.evaluate_member_risk('TEST-LC-MEM-PAUSED');
select is(
  (select evaluation_result from eval_paused),
  'qualifying_assessment_created',
  'a currently-paused member retains a factual qualifying risk assessment'
);
select is(
  (select count(*)::integer from public.outreach_records where risk_assessment_id = (select risk_assessment_id from eval_paused)),
  0,
  'a currently-paused membership correctly suppresses the initial outreach draft'
);

-- Cancelled member.
insert into public.members (member_id, first_name, last_name, email, phone, preferred_channel, do_not_contact)
values ('TEST-LC-MEM-CANCELLED', 'Cancelled', 'MemberI', 'cancelled.i@pulse.example', '+1-212-555-3003', 'email', false);

insert into public.member_accounts (account_id, member_id, auth_subject, email_verified, account_status, created_at)
values ('TEST-LC-ACC-CANCELLED', 'TEST-LC-MEM-CANCELLED', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', true, 'active', now());

insert into public.memberships (membership_id, member_id, plan_id, status, start_date, billing_cycle_start_date, end_date, agreed_monthly_price)
values ('TEST-LC-MSP-CANCELLED', 'TEST-LC-MEM-CANCELLED', 'PLAN-012', 'cancelled', current_date - 120, date_trunc('month', now())::date, current_date - 5, 249.00);

insert into public.membership_status_history (membership_status_history_id, membership_id, status, effective_at, ended_at)
values
  ('TEST-LC-MSH-CANC-1', 'TEST-LC-MSP-CANCELLED', 'active', now() - interval '120 days', now() - interval '5 days'),
  ('TEST-LC-MSH-CANC-2', 'TEST-LC-MSP-CANCELLED', 'cancelled', now() - interval '5 days', null);

insert into public.class_sessions (class_session_id, class_type, starts_at, ends_at, capacity, is_cancelled, instructor_staff_id)
values
  ('TEST-LC-CLS-C1', 'yoga', now() - interval '35 days', now() - interval '35 days' + interval '1 hour', 10, false, 'TEST-LC-STF-001'),
  ('TEST-LC-CLS-C2', 'yoga', now() - interval '42 days', now() - interval '42 days' + interval '1 hour', 10, false, 'TEST-LC-STF-001'),
  ('TEST-LC-CLS-C3', 'cycling', now() - interval '49 days', now() - interval '49 days' + interval '1 hour', 10, false, 'TEST-LC-STF-001'),
  ('TEST-LC-CLS-C4', 'hiit', now() - interval '56 days', now() - interval '56 days' + interval '1 hour', 10, false, 'TEST-LC-STF-001');

insert into public.reservations (reservation_id, member_id, class_session_id, membership_id, status, reserved_at, uses_drop_in)
values
  ('TEST-LC-RES-C1', 'TEST-LC-MEM-CANCELLED', 'TEST-LC-CLS-C1', 'TEST-LC-MSP-CANCELLED', 'confirmed', now() - interval '36 days', false),
  ('TEST-LC-RES-C2', 'TEST-LC-MEM-CANCELLED', 'TEST-LC-CLS-C2', 'TEST-LC-MSP-CANCELLED', 'confirmed', now() - interval '43 days', false),
  ('TEST-LC-RES-C3', 'TEST-LC-MEM-CANCELLED', 'TEST-LC-CLS-C3', 'TEST-LC-MSP-CANCELLED', 'confirmed', now() - interval '50 days', false),
  ('TEST-LC-RES-C4', 'TEST-LC-MEM-CANCELLED', 'TEST-LC-CLS-C4', 'TEST-LC-MSP-CANCELLED', 'confirmed', now() - interval '57 days', false);

insert into public.attendance_records (attendance_record_id, reservation_id, attendance_status, recorded_at)
values
  ('TEST-LC-ATT-C1', 'TEST-LC-RES-C1', 'attended', now() - interval '35 days'),
  ('TEST-LC-ATT-C2', 'TEST-LC-RES-C2', 'attended', now() - interval '42 days'),
  ('TEST-LC-ATT-C3', 'TEST-LC-RES-C3', 'attended', now() - interval '49 days'),
  ('TEST-LC-ATT-C4', 'TEST-LC-RES-C4', 'attended', now() - interval '56 days');

create temporary table eval_cancelled as select * from public.evaluate_member_risk('TEST-LC-MEM-CANCELLED');
select is(
  (select evaluation_result from eval_cancelled),
  'qualifying_assessment_created',
  'a cancelled member retains a factual qualifying risk assessment'
);
select is(
  (select count(*)::integer from public.outreach_records where risk_assessment_id = (select risk_assessment_id from eval_cancelled)),
  0,
  'a cancelled membership correctly suppresses the initial outreach draft'
);

select * from finish();
rollback;
