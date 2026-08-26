begin;

create extension if not exists pgtap with schema extensions;
select plan(24);

insert into public.staff_accounts (staff_id, auth_subject, first_name, last_name, email, role, account_status, created_at) values
  ('TEST-PB3-OWNER', '33000000-0000-4000-8000-000000000001', 'Stage Three', 'Owner', 'pb3.owner@pulse.example', 'owner_admin', 'active', now()),
  ('TEST-PB3-ASSIGNED', '33000000-0000-4000-8000-000000000002', 'Stage Three', 'Assigned', 'pb3.assigned@pulse.example', 'instructor', 'active', now()),
  ('TEST-PB3-OTHER', '33000000-0000-4000-8000-000000000003', 'Stage Three', 'Other', 'pb3.other@pulse.example', 'instructor', 'active', now());

insert into public.members (member_id, first_name, last_name, email, phone, preferred_channel, do_not_contact) values
  ('TEST-PB3-MEM-1', 'Cancel', 'Confirmed', 'pb3.1@pulse.example', '+1-212-555-3301', 'email', false),
  ('TEST-PB3-MEM-2', 'Cancel', 'Waitlisted', 'pb3.2@pulse.example', '+1-212-555-3302', 'sms', false),
  ('TEST-PB3-MEM-3', 'Attendance', 'Protected', 'pb3.3@pulse.example', '+1-212-555-3303', 'email', false);
insert into public.memberships (membership_id, member_id, plan_id, status, start_date, billing_cycle_start_date, agreed_monthly_price) values
  ('TEST-PB3-MSHIP-1', 'TEST-PB3-MEM-1', 'PLAN-012', 'active', current_date - 30, date_trunc('month', now())::date, 249),
  ('TEST-PB3-MSHIP-2', 'TEST-PB3-MEM-2', 'PLAN-012', 'active', current_date - 30, date_trunc('month', now())::date, 249),
  ('TEST-PB3-MSHIP-3', 'TEST-PB3-MEM-3', 'PLAN-012', 'active', current_date - 30, date_trunc('month', now())::date, 249);
insert into public.membership_status_history (membership_status_history_id, membership_id, status, effective_at, ended_at) values
  ('TEST-PB3-HIST-1', 'TEST-PB3-MSHIP-1', 'active', now() - interval '30 days', null),
  ('TEST-PB3-HIST-2', 'TEST-PB3-MSHIP-2', 'active', now() - interval '30 days', null),
  ('TEST-PB3-HIST-3', 'TEST-PB3-MSHIP-3', 'active', now() - interval '30 days', null);
insert into public.simulated_payment_methods (
  payment_method_id, member_id, cardholder_name, card_brand, last_four,
  expiration_month, expiration_year, billing_zip, is_default, status
) values ('TEST-PB3-SPM', 'TEST-PB3-MEM-1', 'Cancel Confirmed', 'visa', '3301', 12, 2030, '10001', true, 'active');

insert into public.class_sessions (class_session_id, class_type, starts_at, ends_at, capacity, is_cancelled, instructor_staff_id) values
  ('TEST-PB3-CANCEL', 'yoga', now() + interval '1 day', now() + interval '1 day 1 hour', 8, false, 'TEST-PB3-ASSIGNED'),
  ('TEST-PB3-ATTENDANCE', 'cycling', now() + interval '10 minutes', now() + interval '70 minutes', 8, false, 'TEST-PB3-ASSIGNED'),
  ('TEST-PB3-STARTED', 'hiit', now() - interval '1 minute', now() + interval '59 minutes', 8, false, 'TEST-PB3-ASSIGNED'),
  ('TEST-PB3-ALREADY', 'yoga', now() + interval '2 days', now() + interval '2 days 1 hour', 8, true, 'TEST-PB3-ASSIGNED'),
  ('TEST-PB3-ZERO', 'cycling', now() + interval '3 days', now() + interval '3 days 1 hour', 8, false, 'TEST-PB3-ASSIGNED');

insert into public.reservations (reservation_id, member_id, class_session_id, membership_id, status, reserved_at, uses_drop_in) values
  ('TEST-PB3-RES-CONF', 'TEST-PB3-MEM-1', 'TEST-PB3-CANCEL', 'TEST-PB3-MSHIP-1', 'confirmed', now() - interval '1 day', true),
  ('TEST-PB3-RES-WAIT', 'TEST-PB3-MEM-2', 'TEST-PB3-CANCEL', 'TEST-PB3-MSHIP-2', 'waitlisted', now() - interval '1 day', false),
  ('TEST-PB3-RES-ATTEND', 'TEST-PB3-MEM-3', 'TEST-PB3-ATTENDANCE', 'TEST-PB3-MSHIP-3', 'confirmed', now() - interval '1 day', false);
insert into public.drop_in_payments (payment_id, reservation_id, member_id, amount, status, created_at)
values ('TEST-PB3-PAY', 'TEST-PB3-RES-CONF', 'TEST-PB3-MEM-1', 35, 'authorized', now() - interval '1 day');

select set_config('request.jwt.claim.sub', '33000000-0000-4000-8000-000000000002', true);
select throws_ok($$select * from public.cancel_class_session('TEST-PB3-CANCEL', 'Instructor attempt')$$, 'P0001', 'owner/admin authorization required', 'assigned instructor cannot cancel');
select ok(public.can_access_product_b_session('TEST-PB3-CANCEL'), 'assigned instructor retains protected session visibility');

select set_config('request.jwt.claim.sub', '33000000-0000-4000-8000-000000000003', true);
select throws_ok($$select * from public.cancel_class_session('TEST-PB3-CANCEL', 'Unrelated attempt')$$, 'P0001', 'owner/admin authorization required', 'unrelated instructor cannot cancel');
select ok(not public.can_access_product_b_session('TEST-PB3-CANCEL'), 'unrelated instructor cannot access protected session');

select set_config('request.jwt.claim.sub', '33000000-0000-4000-8000-000000000001', true);
select throws_ok($$select * from public.cancel_class_session('TEST-PB3-ALREADY', 'Repeat')$$, 'P0001', 'class session is already cancelled', 'already-cancelled session is rejected');
select throws_ok($$select * from public.cancel_class_session('TEST-PB3-STARTED', 'Too late')$$, 'P0001', 'a started or completed class session cannot be cancelled', 'started session is rejected');
select throws_ok($$select * from public.cancel_class_session('TEST-PB3-CANCEL', '   ')$$, 'P0001', 'studio cancellation reason is required', 'reason is required');

create temporary table pb3_attendance as select * from public.record_attendance('TEST-PB3-RES-ATTEND', 'attended');
select throws_ok($$select * from public.cancel_class_session('TEST-PB3-ATTENDANCE', 'Contradict attendance')$$, 'P0001', 'session cancellation conflicts with recorded attendance', 'recorded attendance blocks cancellation');
select ok(not (select is_cancelled from public.class_sessions where class_session_id = 'TEST-PB3-ATTENDANCE'), 'attendance-conflict rollback preserves active session');
select is((select attendance_status::text from public.attendance_records where reservation_id = 'TEST-PB3-RES-ATTEND'), 'attended', 'attendance remains unchanged after blocked cancellation');

create temporary table pb3_cancel as select * from public.cancel_class_session('TEST-PB3-CANCEL', 'Building maintenance');
select is((select cancelled_reservations from pb3_cancel), 2, 'owner cancels confirmed and waitlisted reservations atomically');
select ok((select is_cancelled from public.class_sessions where class_session_id = 'TEST-PB3-CANCEL'), 'session is marked cancelled');
select is((select status::text from public.reservations where reservation_id = 'TEST-PB3-RES-CONF'), 'studio_cancelled', 'confirmed reservation preserves studio cancellation outcome');
select is((select status::text from public.reservations where reservation_id = 'TEST-PB3-RES-WAIT'), 'studio_cancelled', 'waitlist reservation preserves studio cancellation outcome');
select is((select status::text from public.drop_in_payments where payment_id = 'TEST-PB3-PAY'), 'refunded', 'existing simulated drop-in refund contract is preserved');
select is((select notifications_created from pb3_cancel), 2, 'affected members receive simulated notifications');
select is((select performed_by_staff_id from public.class_session_actions where class_session_id = 'TEST-PB3-CANCEL'), 'TEST-PB3-OWNER', 'audit actor is derived internally');
select is((select reason from public.class_session_actions where class_session_id = 'TEST-PB3-CANCEL'), 'Building maintenance', 'audit reason is preserved');
select throws_ok($$select * from public.cancel_class_session('TEST-PB3-CANCEL', 'Repeat')$$, 'P0001', 'class session is already cancelled', 'repeated cancellation is rejected');

create temporary table pb3_zero as select * from public.cancel_class_session('TEST-PB3-ZERO', 'Preventive maintenance');
select is((select cancelled_reservations from pb3_zero), 0, 'zero-roster session cancels without fabricated reservation effects');
select is((select notifications_created from pb3_zero), 0, 'zero-roster cancellation fabricates no notifications');
select ok(not has_table_privilege('authenticated', 'public.class_sessions', 'UPDATE'), 'direct canonical session mutation remains denied');
select ok(not has_function_privilege('anon', 'public.cancel_class_session(text,text)', 'EXECUTE'), 'anonymous cancellation execution remains denied');
select ok(has_function_privilege('authenticated', 'public.cancel_class_session(text,text)', 'EXECUTE'), 'authenticated callers reach the protected command');

select * from finish();
rollback;
