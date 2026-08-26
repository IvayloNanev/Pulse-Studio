begin;

create extension if not exists pgtap with schema extensions;
select plan(31);

insert into public.staff_accounts (staff_id, auth_subject, first_name, last_name, email, role, account_status, created_at) values
  ('TEST-PD-OWNER', '50000000-0000-4000-8000-000000000001', 'Retention', 'Owner', 'pd.owner@pulse.example', 'owner_admin', 'active', now()),
  ('TEST-PD-EVIDENCE-INSTRUCTOR', '50000000-0000-4000-8000-000000000002', 'Evidence', 'Instructor', 'pd.evidence@pulse.example', 'instructor', 'active', now()),
  ('TEST-PD-REVIEWER', '50000000-0000-4000-8000-000000000003', 'Global', 'Reviewer', 'pd.reviewer@pulse.example', 'instructor', 'active', now()),
  ('TEST-PD-INACTIVE', '50000000-0000-4000-8000-000000000004', 'Inactive', 'Staff', 'pd.inactive@pulse.example', 'instructor', 'disabled', now());

insert into public.members (member_id, first_name, last_name, email, phone, preferred_channel, do_not_contact)
values ('TEST-PD-MEMBER', 'Retention', 'Member', 'pd.member@pulse.example', '+1-212-555-0199', 'email', false);
insert into public.member_accounts (account_id, member_id, auth_subject, email_verified, account_status, created_at)
values ('TEST-PD-ACCOUNT', 'TEST-PD-MEMBER', '50000000-0000-4000-8000-000000000005', true, 'active', now());
insert into public.memberships (membership_id, member_id, plan_id, status, start_date, billing_cycle_start_date, agreed_monthly_price)
values ('TEST-PD-MSHIP', 'TEST-PD-MEMBER', 'PLAN-012', 'active', current_date - 120, date_trunc('month', now())::date, 249.00);
insert into public.membership_status_history (membership_status_history_id, membership_id, status, effective_at, ended_at)
values ('TEST-PD-MSHIP-ACTIVE', 'TEST-PD-MSHIP', 'active', now() - interval '120 days', null);

insert into public.class_sessions (class_session_id, class_type, starts_at, ends_at, capacity, is_cancelled, instructor_staff_id) values
  ('TEST-PD-EVIDENCE-PREVIOUS', 'yoga', now() - interval '45 days', now() - interval '44 days 23 hours', 10, false, 'TEST-PD-EVIDENCE-INSTRUCTOR'),
  ('TEST-PD-EVIDENCE-CURRENT', 'cycling', now() - interval '10 days', now() - interval '9 days 23 hours', 10, false, 'TEST-PD-EVIDENCE-INSTRUCTOR');
insert into public.reservations (reservation_id, member_id, class_session_id, membership_id, status, reserved_at, uses_drop_in) values
  ('TEST-PD-RES-PREVIOUS', 'TEST-PD-MEMBER', 'TEST-PD-EVIDENCE-PREVIOUS', 'TEST-PD-MSHIP', 'confirmed', now() - interval '60 days', false),
  ('TEST-PD-RES-CURRENT', 'TEST-PD-MEMBER', 'TEST-PD-EVIDENCE-CURRENT', 'TEST-PD-MSHIP', 'confirmed', now() - interval '20 days', false);
insert into public.attendance_records (attendance_record_id, reservation_id, attendance_status, recorded_at) values
  ('TEST-PD-ATT-PREVIOUS', 'TEST-PD-RES-PREVIOUS', 'attended', now() - interval '45 days'),
  ('TEST-PD-ATT-CURRENT', 'TEST-PD-RES-CURRENT', 'attended', now() - interval '10 days');

insert into public.risk_assessments (
  risk_assessment_id, member_id, evaluated_at, previous_period_start, previous_period_end,
  current_period_start, current_period_end, previous_visits, current_visits,
  decline_percentage, risk_level, review_status
) values (
  'TEST-PD-RISK', 'TEST-PD-MEMBER', now(), now() - interval '60 days', now() - interval '30 days',
  now() - interval '30 days', now(), 8, 2, 75.0, 'high', 'pending'
);
insert into public.risk_case_notes (note_id, member_id, risk_assessment_id, body, created_by_staff_id, created_at)
values ('TEST-PD-NOTE', 'TEST-PD-MEMBER', 'TEST-PD-RISK', 'Member preferred evening classes.', 'TEST-PD-OWNER', now() - interval '1 day');
insert into public.outreach_records (
  outreach_id, risk_assessment_id, member_id, attempt_number, channel, original_message,
  final_message, status, created_by_staff_id, created_at
) values (
  'TEST-PD-OUTREACH', 'TEST-PD-RISK', 'TEST-PD-MEMBER', 1, 'email', 'We would love to help you return.',
  'We would love to help you return.', 'draft', 'TEST-PD-OWNER', now() - interval '1 day'
);
insert into public.outreach_actions (action_id, outreach_id, action, staff_id, occurred_at)
values ('TEST-PD-ACTION', 'TEST-PD-OUTREACH', 'created', 'TEST-PD-OWNER', now() - interval '1 day');

select is((select count(*)::integer from information_schema.routine_privileges where routine_schema = 'public' and routine_name = 'product_d_risk_queue' and grantee = 'PUBLIC'), 0, 'PUBLIC has no Product D queue execution grant');
select is((select count(*)::integer from information_schema.routine_privileges where routine_schema = 'public' and routine_name = 'product_d_member_detail' and grantee = 'PUBLIC'), 0, 'PUBLIC has no Product D detail execution grant');
select ok(not has_function_privilege('anon', 'public.product_d_risk_queue()', 'execute'), 'anonymous role has no queue execution privilege');
select ok(not has_function_privilege('anon', 'public.product_d_member_detail(text)', 'execute'), 'anonymous role has no detail execution privilege');

select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is((select count(*)::integer from public.members where member_id = 'TEST-PD-MEMBER'), 1, 'owner retains global canonical member access');
select is((select count(*)::integer from public.reservations where member_id = 'TEST-PD-MEMBER'), 2, 'owner retains global canonical reservation access');
select is((select count(*)::integer from public.product_d_risk_queue() where risk_assessment_id = 'TEST-PD-RISK'), 1, 'owner receives the fixture in the global Product D queue');
select is((select count(*)::integer from public.product_d_member_detail('TEST-PD-RISK')), 1, 'owner receives Product D member detail');
reset role;

select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select is((select count(*)::integer from public.members where member_id = 'TEST-PD-MEMBER'), 1, 'assigned instructor directly reads the member needed for an assigned Product B roster');
select is((select count(*)::integer from public.reservations where member_id = 'TEST-PD-MEMBER'), 2, 'assigned instructor directly reads reservations for assigned Product B sessions');
select is((select count(*)::integer from public.attendance_records where reservation_id in ('TEST-PD-RES-PREVIOUS', 'TEST-PD-RES-CURRENT')), 2, 'assigned instructor directly reads attendance for assigned Product B sessions');
reset role;

select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select is((select count(*)::integer from public.members where member_id = 'TEST-PD-MEMBER'), 0, 'unrelated instructor cannot directly read Product D member PII');
select is((select count(*)::integer from public.reservations where member_id = 'TEST-PD-MEMBER'), 0, 'unrelated instructor cannot directly read Product D reservations');
select is((select count(*)::integer from public.memberships where member_id = 'TEST-PD-MEMBER'), 0, 'instructor has no broad direct membership read');
select is((select count(*)::integer from public.membership_status_history where membership_id = 'TEST-PD-MSHIP'), 0, 'instructor has no broad direct membership-history read');
select is((select count(*)::integer from public.risk_assessments where risk_assessment_id = 'TEST-PD-RISK'), 0, 'instructor has no direct risk-table read');
select is((select count(*)::integer from public.product_d_risk_queue() where risk_assessment_id = 'TEST-PD-RISK'), 1, 'active instructor receives the fixture in the global Product D queue through the RPC');
select is((select count(*)::integer from public.product_d_member_detail('TEST-PD-RISK')), 1, 'active instructor receives global Product D detail through the RPC');
select is((select jsonb_array_length(attendance_evidence) from public.product_d_member_detail('TEST-PD-RISK')), 2, 'cross-instructor attendance evidence remains complete');
select is((select jsonb_array_length(active_notes) from public.product_d_member_detail('TEST-PD-RISK')), 1, 'Product D note context remains complete');
select is((select jsonb_array_length(outreach_attempts) from public.product_d_member_detail('TEST-PD-RISK')), 1, 'Product D outreach context remains complete');
select is((select email from public.product_d_member_detail('TEST-PD-RISK')), 'pd.member@pulse.example', 'approved full email visibility is preserved');
select is((select phone from public.product_d_member_detail('TEST-PD-RISK')), '+1-212-555-0199', 'approved full phone visibility is preserved');
select ok(not (select to_jsonb(queue) ? 'member_id' from public.product_d_risk_queue() as queue limit 1), 'queue RPC omits unused canonical member ID');
select ok(not (select attendance_evidence -> 0 ? 'reservation_id' from public.product_d_member_detail('TEST-PD-RISK')), 'detail evidence omits unused reservation ID');
select is((select review_status::text from public.start_risk_review('TEST-PD-RISK')), 'in_progress', 'active instructor Product D mutation command remains functional');
select is((select created_by_staff_id from public.create_risk_note('TEST-PD-RISK', 'Instructor-authored retention context.')), 'TEST-PD-REVIEWER', 'Product D command derives and audits the instructor actor');
reset role;

select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000004', true);
set local role authenticated;
select throws_ok($$select * from public.product_d_risk_queue()$$, 'P0001', 'active staff account required', 'inactive staff cannot execute Product D queue reads');
reset role;

select set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000005', true);
set local role authenticated;
select throws_ok($$select * from public.product_d_member_detail('TEST-PD-RISK')$$, 'P0001', 'active staff account required', 'authenticated member cannot execute Product D detail reads');
reset role;

set local role anon;
select throws_ok($$select * from public.product_d_risk_queue()$$, '42501', null, 'anonymous caller cannot execute Product D queue reads');
select throws_ok($$select * from public.product_d_member_detail('TEST-PD-RISK')$$, '42501', null, 'anonymous caller cannot execute Product D detail reads');
reset role;

select * from finish();
rollback;
