begin;

create extension if not exists pgtap with schema extensions;
select plan(31);

insert into public.staff_accounts (staff_id, auth_subject, first_name, last_name, email, role, account_status, created_at) values
  ('TEST-PB2-OWNER', '32000000-0000-4000-8000-000000000001', 'Stage Two', 'Owner', 'pb2.owner@pulse.example', 'owner_admin', 'active', now()),
  ('TEST-PB2-ASSIGNED', '32000000-0000-4000-8000-000000000002', 'Stage Two', 'Assigned', 'pb2.assigned@pulse.example', 'instructor', 'active', now()),
  ('TEST-PB2-OTHER', '32000000-0000-4000-8000-000000000003', 'Stage Two', 'Other', 'pb2.other@pulse.example', 'instructor', 'active', now());

insert into public.members (member_id, first_name, last_name, email, phone, preferred_channel, do_not_contact)
select 'TEST-PB2-MEM-' || n, 'Member', n::text, 'pb2.member.' || n || '@pulse.example', '+1-212-555-' || lpad(n::text, 4, '0'), 'email', false
from generate_series(1, 8) as n;
insert into public.memberships (membership_id, member_id, plan_id, status, start_date, billing_cycle_start_date, agreed_monthly_price)
select 'TEST-PB2-MSHIP-' || n, 'TEST-PB2-MEM-' || n, 'PLAN-012', 'active', current_date - 30, date_trunc('month', now())::date, 249.00
from generate_series(1, 8) as n;
insert into public.membership_status_history (membership_status_history_id, membership_id, status, effective_at, ended_at)
select 'TEST-PB2-HIST-' || n, 'TEST-PB2-MSHIP-' || n, 'active', now() - interval '30 days', null
from generate_series(1, 8) as n;

insert into public.class_sessions (class_session_id, class_type, starts_at, ends_at, capacity, is_cancelled, instructor_staff_id) values
  ('TEST-PB2-ATTEND', 'yoga', now() - interval '5 minutes', now() + interval '55 minutes', 8, false, 'TEST-PB2-ASSIGNED'),
  ('TEST-PB2-NOSHOW', 'cycling', now() - interval '21 minutes', now() + interval '39 minutes', 8, false, 'TEST-PB2-ASSIGNED'),
  ('TEST-PB2-OTHER-SESSION', 'hiit', now() - interval '5 minutes', now() + interval '55 minutes', 8, false, 'TEST-PB2-OTHER'),
  ('TEST-PB2-CANCELLED', 'yoga', now() - interval '5 minutes', now() + interval '55 minutes', 8, false, 'TEST-PB2-ASSIGNED'),
  ('TEST-PB2-ZERO', 'cycling', now() + interval '1 day', now() + interval '1 day 1 hour', 8, false, 'TEST-PB2-ASSIGNED');

insert into public.reservations (reservation_id, member_id, class_session_id, membership_id, status, reserved_at, uses_drop_in) values
  ('TEST-PB2-RES-A1', 'TEST-PB2-MEM-1', 'TEST-PB2-ATTEND', 'TEST-PB2-MSHIP-1', 'confirmed', now() - interval '1 day', false),
  ('TEST-PB2-RES-A2', 'TEST-PB2-MEM-2', 'TEST-PB2-ATTEND', 'TEST-PB2-MSHIP-2', 'confirmed', now() - interval '1 day', false),
  ('TEST-PB2-RES-WAIT', 'TEST-PB2-MEM-3', 'TEST-PB2-ATTEND', 'TEST-PB2-MSHIP-3', 'waitlisted', now() - interval '1 day', false),
  ('TEST-PB2-RES-N1', 'TEST-PB2-MEM-4', 'TEST-PB2-NOSHOW', 'TEST-PB2-MSHIP-4', 'confirmed', now() - interval '1 day', false),
  ('TEST-PB2-RES-N2', 'TEST-PB2-MEM-5', 'TEST-PB2-NOSHOW', 'TEST-PB2-MSHIP-5', 'confirmed', now() - interval '1 day', false),
  ('TEST-PB2-RES-OTHER', 'TEST-PB2-MEM-6', 'TEST-PB2-OTHER-SESSION', 'TEST-PB2-MSHIP-6', 'confirmed', now() - interval '1 day', false),
  ('TEST-PB2-RES-CANCELLED', 'TEST-PB2-MEM-7', 'TEST-PB2-CANCELLED', 'TEST-PB2-MSHIP-7', 'confirmed', now() - interval '1 day', false);

update public.class_sessions set is_cancelled = true where class_session_id = 'TEST-PB2-CANCELLED';

insert into public.attendance_records (attendance_record_id, reservation_id, attendance_status, recorded_at, recorded_by_staff_id)
values ('TEST-PB2-HISTORICAL', 'TEST-PB2-RES-OTHER', 'attended', now(), null);
select ok((select recorded_by_staff_id is null from public.attendance_records where attendance_record_id = 'TEST-PB2-HISTORICAL'), 'historical NULL recorder remains valid');

select set_config('request.jwt.claim.sub', '32000000-0000-4000-8000-000000000002', true);
select is((select confirmed_reservations from public.staff_product_b_sessions where class_session_id = 'TEST-PB2-ATTEND'), 2, 'derived denominator counts confirmed reservations');
select is((select marked_count from public.staff_product_b_sessions where class_session_id = 'TEST-PB2-ATTEND'), 0, 'not started has zero marked');
select is((select confirmed_reservations from public.staff_product_b_sessions where class_session_id = 'TEST-PB2-ZERO'), 0, 'zero roster remains zero rather than complete');
select is((select count(*)::integer from public.staff_session_roster where reservation_id = 'TEST-PB2-RES-WAIT' and attendance_record_id is null), 1, 'waitlist is visible but excluded from attendance');
select throws_ok($$select * from public.record_attendance('TEST-PB2-RES-WAIT', 'attended')$$, 'P0001', 'attendance requires a confirmed reservation on a non-cancelled session', 'waitlisted reservation rejected');
select throws_ok($$select * from public.record_attendance('TEST-PB2-RES-CANCELLED', 'attended')$$, 'P0001', 'attendance requires a confirmed reservation on a non-cancelled session', 'cancelled-session attendance rejected');
select throws_ok($$select * from public.record_attendance('TEST-PB2-RES-A1', 'no_show')$$, 'P0001', 'no-show cannot be recorded before the check-in window closes', 'no-show timing boundary preserved');

create temporary table pb2_first as select * from public.record_attendance('TEST-PB2-RES-A1', 'attended');
select is((select recorded_by_staff_id from public.attendance_records where reservation_id = 'TEST-PB2-RES-A1'), 'TEST-PB2-ASSIGNED', 'new attendance stores authenticated recorder');
select is((select marked_count from public.staff_product_b_sessions where class_session_id = 'TEST-PB2-ATTEND'), 1, 'mixed roster derives in-progress state');
select throws_ok($$select * from public.record_attendance('TEST-PB2-RES-A1', 'attended')$$, 'P0001', 'attendance has already been recorded for this reservation', 'duplicate attendance rejected');

create temporary table pb2_bulk_attended as select * from public.record_session_attendance_bulk('TEST-PB2-ATTEND', array['TEST-PB2-RES-A2'], 'attended');
select is((select recorded_count from pb2_bulk_attended), 1, 'bulk attended succeeds');
select is((select recorded_by_staff_id from public.attendance_records where reservation_id = 'TEST-PB2-RES-A2'), 'TEST-PB2-ASSIGNED', 'bulk stores authenticated recorder');
select is((select marked_count from public.staff_product_b_sessions where class_session_id = 'TEST-PB2-ATTEND'), 2, 'fully marked roster derives complete state');
select is((select marked_count from public.staff_product_b_sessions where class_session_id = 'TEST-PB2-ATTEND'), (select confirmed_reservations from public.staff_product_b_sessions where class_session_id = 'TEST-PB2-ATTEND'), 'waitlist excluded from completion denominator');
select throws_ok($$select * from public.record_session_attendance_bulk('TEST-PB2-ATTEND', array['TEST-PB2-RES-A1'], 'no_show')$$, 'P0001', 'attendance has already been recorded for one or more reservations', 'bulk cannot overwrite attendance');

select throws_ok($$select * from public.record_session_attendance_bulk('TEST-PB2-NOSHOW', array['TEST-PB2-RES-N1','TEST-PB2-RES-OTHER'], 'no_show')$$, 'P0001', 'one or more reservations are not eligible for this session', 'cross-session bulk target rejected');
select is((select count(*)::integer from public.attendance_records where reservation_id = 'TEST-PB2-RES-N1'), 0, 'invalid bulk target rolls back atomically');
create temporary table pb2_bulk_no_show as select * from public.record_session_attendance_bulk('TEST-PB2-NOSHOW', array['TEST-PB2-RES-N1','TEST-PB2-RES-N2'], 'no_show');
select is((select recorded_count from pb2_bulk_no_show), 2, 'bulk no-show succeeds after timing boundary');
select is((select count(*)::integer from public.attendance_records where reservation_id in ('TEST-PB2-RES-N1','TEST-PB2-RES-N2') and recorded_by_staff_id = 'TEST-PB2-ASSIGNED'), 2, 'bulk no-show derives authenticated actor');

create temporary table pb2_correction as select * from public.correct_attendance((select attendance_record_id from pb2_first), 'no_show', 'Verified member did not enter class');
select is((select previous_status from pb2_correction), 'attended', 'correction preserves previous outcome');
select is((select corrected_by_staff_id from pb2_correction), 'TEST-PB2-ASSIGNED', 'correction stores correcting actor');
select is((select recorded_by_staff_id from public.attendance_records where reservation_id = 'TEST-PB2-RES-A1'), 'TEST-PB2-ASSIGNED', 'correction preserves original recorder');
select is((select correction_history->0->>'reason' from public.staff_session_roster where reservation_id = 'TEST-PB2-RES-A1'), 'Verified member did not enter class', 'protected roster exposes correction history');

select set_config('request.jwt.claim.sub', '32000000-0000-4000-8000-000000000003', true);
select throws_ok($$select * from public.record_session_attendance_bulk('TEST-PB2-NOSHOW', array['TEST-PB2-RES-N1'], 'no_show')$$, 'P0001', 'Product B session access required', 'unrelated instructor bulk denied');
select throws_ok($$select * from public.correct_attendance((select attendance_record_id from public.attendance_records where reservation_id = 'TEST-PB2-RES-A1'), 'attended', 'Unauthorized')$$, 'P0001', 'Product B session access required', 'unrelated correction denied');

select set_config('request.jwt.claim.sub', '32000000-0000-4000-8000-000000000001', true);
select ok(public.can_access_product_b_session('TEST-PB2-OTHER-SESSION'), 'owner has global Product B access');
select is((select recorded_by_staff_name from public.staff_session_roster where reservation_id = 'TEST-PB2-RES-OTHER'), 'Recorder unavailable', 'historical unknown recorder is displayed honestly');
select ok(not has_table_privilege('authenticated', 'public.attendance_records', 'INSERT'), 'direct canonical attendance insert remains denied');
select ok(not has_function_privilege('anon', 'public.record_session_attendance_bulk(text,text[],public.attendance_status)', 'EXECUTE'), 'anonymous bulk execution denied');
select ok(has_function_privilege('authenticated', 'public.record_session_attendance_bulk(text,text[],public.attendance_status)', 'EXECUTE'), 'authenticated role can invoke protected bulk command');

select * from finish();
rollback;
