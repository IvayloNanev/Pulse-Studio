begin;

create extension if not exists pgtap with schema extensions;
select plan(33);

insert into public.staff_accounts (staff_id, auth_subject, first_name, last_name, email, role, account_status, created_at) values
  ('TEST-PB-OWNER', '30000000-0000-4000-8000-000000000001', 'Product', 'Owner', 'pb.owner@pulse.example', 'owner_admin', 'active', now()),
  ('TEST-PB-ASSIGNED', '30000000-0000-4000-8000-000000000002', 'Assigned', 'Instructor', 'pb.assigned@pulse.example', 'instructor', 'active', now()),
  ('TEST-PB-OTHER', '30000000-0000-4000-8000-000000000003', 'Other', 'Instructor', 'pb.other@pulse.example', 'instructor', 'active', now());

insert into public.members (member_id, first_name, last_name, email, phone, preferred_channel, do_not_contact)
values
  ('TEST-PB-MEMBER', 'Product', 'Member', 'pb.member@pulse.example', '+1-212-555-9988', 'email', false),
  ('TEST-PB-ASSIGNED-ONLY-MEMBER', 'Assigned', 'Only', 'pb.assigned.only@pulse.example', '+1-212-555-9989', 'email', false);
insert into public.member_accounts (account_id, member_id, auth_subject, email_verified, account_status, created_at)
values ('TEST-PB-ACCOUNT', 'TEST-PB-MEMBER', '30000000-0000-4000-8000-000000000004', true, 'active', now());
insert into public.memberships (membership_id, member_id, plan_id, status, start_date, billing_cycle_start_date, agreed_monthly_price)
values
  ('TEST-PB-MSHIP', 'TEST-PB-MEMBER', 'PLAN-012', 'active', current_date - 30, date_trunc('month', now())::date, 249.00),
  ('TEST-PB-ASSIGNED-ONLY-MSHIP', 'TEST-PB-ASSIGNED-ONLY-MEMBER', 'PLAN-012', 'active', current_date - 30, date_trunc('month', now())::date, 249.00);
insert into public.membership_status_history (membership_status_history_id, membership_id, status, effective_at, ended_at)
values
  ('TEST-PB-MSHIP-ACTIVE', 'TEST-PB-MSHIP', 'active', (current_date - 30)::timestamptz, null),
  ('TEST-PB-ASSIGNED-ONLY-ACTIVE', 'TEST-PB-ASSIGNED-ONLY-MSHIP', 'active', (current_date - 30)::timestamptz, null);

insert into public.class_sessions (class_session_id, class_type, starts_at, ends_at, capacity, is_cancelled, instructor_staff_id) values
  ('TEST-PB-LOW', 'yoga', now() + interval '2 days', now() + interval '2 days 1 hour', 2, false, 'TEST-PB-ASSIGNED'),
  ('TEST-PB-ATTEND', 'cycling', now() - interval '5 minutes', now() + interval '55 minutes', 2, false, 'TEST-PB-ASSIGNED'),
  ('TEST-PB-OTHER-SESSION', 'hiit', now() - interval '5 minutes', now() + interval '55 minutes', 2, false, 'TEST-PB-OTHER');

insert into public.reservations (reservation_id, member_id, class_session_id, membership_id, status, reserved_at, uses_drop_in) values
  ('TEST-PB-RES-ATTEND', 'TEST-PB-MEMBER', 'TEST-PB-ATTEND', 'TEST-PB-MSHIP', 'confirmed', now() - interval '1 day', false),
  ('TEST-PB-RES-ASSIGNED-ONLY', 'TEST-PB-ASSIGNED-ONLY-MEMBER', 'TEST-PB-ATTEND', 'TEST-PB-ASSIGNED-ONLY-MSHIP', 'confirmed', now() - interval '1 day', false),
  ('TEST-PB-RES-OTHER', 'TEST-PB-MEMBER', 'TEST-PB-OTHER-SESSION', 'TEST-PB-MSHIP', 'confirmed', now() - interval '1 day', false);

insert into public.attendance_records (attendance_record_id, reservation_id, attendance_status, recorded_at)
values ('TEST-PB-ATT-OTHER', 'TEST-PB-RES-OTHER', 'attended', now());

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
select ok(public.can_access_product_b_session('TEST-PB-LOW'), 'owner accesses every Product B session');
select is((select count(*)::integer from public.staff_product_b_sessions where class_session_id like 'TEST-PB-%'), 3, 'owner sees all Product B test sessions');

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000002', true);
select ok(public.can_access_product_b_session('TEST-PB-LOW'), 'assigned instructor accesses assigned session');
select ok(not public.can_access_product_b_session('TEST-PB-OTHER-SESSION'), 'assigned instructor cannot access unrelated session');
select is((select count(*)::integer from public.staff_product_b_sessions where class_session_id like 'TEST-PB-%'), 2, 'assigned instructor sees only assigned sessions');
select is((select count(*)::integer from public.staff_session_roster where class_session_id = 'TEST-PB-OTHER-SESSION'), 0, 'unrelated roster returns no rows');

create temporary table test_pb_attendance as select * from public.record_attendance('TEST-PB-RES-ATTEND', 'attended');
select is((select attendance_status from test_pb_attendance), 'attended', 'assigned instructor records attendance');
select throws_ok(
  $$select * from public.record_attendance('TEST-PB-RES-OTHER', 'attended')$$,
  'P0001', 'Product B session access required', 'assigned instructor cannot record another instructor attendance'
);
select throws_ok(
  $$select * from public.correct_attendance('TEST-PB-ATT-OTHER', 'no_show', 'Incorrect outcome')$$,
  'P0001', 'Product B session access required', 'assigned instructor cannot correct another instructor attendance'
);

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000003', true);
select ok(not public.can_access_product_b_session('TEST-PB-LOW'), 'unrelated instructor is denied assigned session');
set local role authenticated;
select is((select count(*)::integer from public.reservations where reservation_id = 'TEST-PB-RES-ASSIGNED-ONLY'), 0, 'unrelated instructor cannot directly read another session reservation');
select is((select count(*)::integer from public.members where member_id = 'TEST-PB-ASSIGNED-ONLY-MEMBER'), 0, 'unrelated instructor cannot directly read another roster member PII');
select is((select count(*)::integer from public.class_sessions as session join public.reservations as reservation on reservation.class_session_id = session.class_session_id join public.members as member on member.member_id = reservation.member_id where session.class_session_id = 'TEST-PB-ATTEND'), 0, 'unrelated instructor cannot reconstruct another instructor roster through canonical tables');
reset role;
select throws_ok(
  $$select * from public.create_product_b_underbooking_decision('TEST-PB-LOW', 'monitor', null)$$,
  'P0001', 'owner/admin access required', 'instructor cannot create operational decision'
);

select set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
create temporary table test_pb_decision as
select * from public.create_product_b_underbooking_decision('TEST-PB-LOW', 'promote_class', 'Promote in the afternoon newsletter');
select is((select action from test_pb_decision), 'promote_class', 'allowed operational action persists');
select is((select note from test_pb_decision), 'Promote in the afternoon newsletter', 'optional decision note persists');
select is((select created_by_staff_id from test_pb_decision), 'TEST-PB-OWNER', 'database derives authenticated decision actor');
select is((select state from test_pb_decision), 'open', 'decision starts open');
select ok((select created_at is not null from test_pb_decision), 'database timestamp persists');
select throws_ok(
  $$select * from public.create_product_b_underbooking_decision('TEST-PB-LOW', 'invalid_action', null)$$,
  'P0001', 'invalid Product B operational action', 'invalid action is rejected'
);
select throws_ok(
  $$select * from public.create_product_b_underbooking_decision('TEST-PB-LOW', 'monitor', null)$$,
  '23505', null, 'a second open decision is rejected'
);
select ok(not (select is_cancelled from public.class_sessions where class_session_id = 'TEST-PB-LOW'), 'promote decision does not cancel session');

insert into public.reservations (reservation_id, member_id, class_session_id, membership_id, status, reserved_at, uses_drop_in)
values ('TEST-PB-RES-RISE', 'TEST-PB-MEMBER', 'TEST-PB-LOW', 'TEST-PB-MSHIP', 'confirmed', now(), false);
select is((select confirmed_reservations from public.staff_product_b_sessions where class_session_id = 'TEST-PB-LOW'), 1, 'live confirmed count rises to exact 50 percent');
select is((select count(*)::integer from public.product_b_underbooking_decisions where class_session_id = 'TEST-PB-LOW'), 1, 'historical decision remains after warning eligibility changes');
select throws_ok(
  $$select * from public.create_product_b_underbooking_decision('TEST-PB-LOW', 'monitor', null)$$,
  'P0001', 'session is not currently underbooked', 'new decision is rejected once live utilization reaches 50 percent'
);

create temporary table test_pb_resolved as
select * from public.resolve_product_b_underbooking_decision((select decision_id from test_pb_decision));
select is((select state from test_pb_resolved), 'resolved', 'owner resolves decision');
select is((select resolved_by_staff_id from test_pb_resolved), 'TEST-PB-OWNER', 'resolution actor persists');
select ok((select resolved_at is not null from test_pb_resolved), 'resolution timestamp persists');

update public.reservations
set status = 'cancelled', cancelled_at = now(), is_late_cancellation = false
where reservation_id = 'TEST-PB-RES-RISE';
select is((select confirmed_reservations from public.staff_product_b_sessions where class_session_id = 'TEST-PB-LOW'), 0, 'live utilization can become underbooked again after resolution');
create temporary table test_pb_second_decision as
select * from public.create_product_b_underbooking_decision('TEST-PB-LOW', 'monitor', 'Demand fell below half again');
select is((select state from public.product_b_underbooking_decisions where decision_id = (select decision_id from test_pb_decision)), 'resolved', 'first resolved decision remains historical');
select is((select state from test_pb_second_decision), 'open', 'a later underbooking event creates a new open decision');
select is((select count(*)::integer from public.product_b_underbooking_decisions where class_session_id = 'TEST-PB-LOW'), 2, 'both decision records remain preserved');
select is((select count(*)::integer from public.product_b_underbooking_decisions where class_session_id = 'TEST-PB-LOW' and state = 'open'), 1, 'only one current decision is open');

select * from finish();
rollback;
