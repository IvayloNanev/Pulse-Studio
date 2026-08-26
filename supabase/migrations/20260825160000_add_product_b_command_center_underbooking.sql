-- Product B Stage 1: permission-scoped command center, live underbooking, and decisions.
-- This migration is additive and does not alter Product A reservation behavior.

begin;

create or replace function public.can_access_product_b_session(p_class_session_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.class_sessions as session
    join public.staff_accounts as staff
      on staff.staff_id = public.current_staff_id()
    where session.class_session_id = p_class_session_id
      and staff.account_status = 'active'
      and (staff.role = 'owner_admin' or session.instructor_staff_id = staff.staff_id)
  )
$$;

revoke all on function public.can_access_product_b_session(text) from public;
grant execute on function public.can_access_product_b_session(text) to authenticated;

create or replace view public.staff_product_b_sessions
with (security_barrier = true, security_invoker = true)
as
select
  session.class_session_id,
  session.class_type,
  case session.class_type
    when 'yoga' then 'Yoga'
    when 'cycling' then 'Cycling'
    when 'hiit' then 'HIIT'
  end as class_type_label,
  session.starts_at,
  session.ends_at,
  session.capacity,
  session.is_cancelled,
  session.instructor_staff_id,
  concat_ws(' ', instructor.first_name, instructor.last_name) as instructor_name,
  count(reservation.reservation_id) filter (where reservation.status = 'confirmed')::integer as confirmed_reservations,
  count(reservation.reservation_id) filter (where reservation.status = 'waitlisted')::integer as waitlisted_reservations,
  greatest(session.capacity - count(reservation.reservation_id) filter (where reservation.status = 'confirmed')::integer, 0) as available_spots
from public.class_sessions as session
join public.staff_accounts as instructor on instructor.staff_id = session.instructor_staff_id
left join public.reservations as reservation on reservation.class_session_id = session.class_session_id
where public.can_access_product_b_session(session.class_session_id)
group by session.class_session_id, instructor.first_name, instructor.last_name;

comment on view public.staff_product_b_sessions is
  'Product B protected session facts: owner/admin sees all sessions; instructors see only assigned sessions.';
revoke all on public.staff_product_b_sessions from public, anon;
grant select on public.staff_product_b_sessions to authenticated;

create table public.product_b_underbooking_decisions (
  decision_id text primary key,
  class_session_id text not null references public.class_sessions(class_session_id) on update cascade on delete restrict,
  action text not null check (action in ('monitor', 'promote_class', 'adjust_operations', 'review_for_cancellation')),
  note text check (note is null or char_length(note) between 1 and 1000),
  state text not null default 'open' check (state in ('open', 'resolved')),
  created_by_staff_id text not null references public.staff_accounts(staff_id) on update cascade on delete restrict,
  created_at timestamptz not null,
  resolved_by_staff_id text references public.staff_accounts(staff_id) on update cascade on delete restrict,
  resolved_at timestamptz,
  constraint product_b_decision_resolution_consistent check (
    (state = 'open' and resolved_by_staff_id is null and resolved_at is null)
    or (state = 'resolved' and resolved_by_staff_id is not null and resolved_at is not null)
  )
);

create unique index product_b_one_open_decision_per_session
on public.product_b_underbooking_decisions(class_session_id)
where state = 'open';
create index product_b_decision_history
on public.product_b_underbooking_decisions(class_session_id, created_at desc);

alter table public.product_b_underbooking_decisions enable row level security;
create policy product_b_decisions_authorized_read on public.product_b_underbooking_decisions
for select to authenticated
using (public.can_access_product_b_session(class_session_id));
revoke all on public.product_b_underbooking_decisions from public, anon;
revoke insert, update, delete on public.product_b_underbooking_decisions from authenticated;
grant select on public.product_b_underbooking_decisions to authenticated;

create or replace function public.create_product_b_underbooking_decision(
  p_class_session_id text,
  p_action text,
  p_note text default null
)
returns public.product_b_underbooking_decisions
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_staff_id text := public.current_staff_id();
  v_session public.class_sessions%rowtype;
  v_confirmed integer;
  v_decision public.product_b_underbooking_decisions%rowtype;
begin
  if not public.is_owner_admin() then raise exception 'owner/admin access required'; end if;
  if p_action not in ('monitor', 'promote_class', 'adjust_operations', 'review_for_cancellation') then raise exception 'invalid Product B operational action'; end if;
  if p_note is not null and (nullif(btrim(p_note), '') is null or char_length(btrim(p_note)) > 1000) then raise exception 'decision note must contain 1 to 1000 characters'; end if;

  select * into v_session from public.class_sessions where class_session_id = p_class_session_id for update;
  if not found then raise exception 'class session not found'; end if;
  select count(*)::integer into v_confirmed from public.reservations where class_session_id = p_class_session_id and status = 'confirmed';
  if v_session.is_cancelled or v_confirmed::numeric / v_session.capacity >= 0.5 then raise exception 'session is not currently underbooked'; end if;

  insert into public.product_b_underbooking_decisions (
    decision_id, class_session_id, action, note, state, created_by_staff_id, created_at
  ) values (
    'PBD-' || upper(replace(gen_random_uuid()::text, '-', '')),
    p_class_session_id, p_action, nullif(btrim(p_note), ''), 'open', v_staff_id, now()
  ) returning * into v_decision;
  return v_decision;
end;
$$;

create or replace function public.resolve_product_b_underbooking_decision(p_decision_id text)
returns public.product_b_underbooking_decisions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_staff_id text := public.current_staff_id();
  v_decision public.product_b_underbooking_decisions%rowtype;
begin
  if not public.is_owner_admin() then raise exception 'owner/admin access required'; end if;
  update public.product_b_underbooking_decisions
  set state = 'resolved', resolved_by_staff_id = v_staff_id, resolved_at = now()
  where decision_id = p_decision_id and state = 'open'
  returning * into v_decision;
  if not found then raise exception 'open Product B decision not found'; end if;
  return v_decision;
end;
$$;

revoke all on function public.create_product_b_underbooking_decision(text, text, text) from public;
revoke all on function public.resolve_product_b_underbooking_decision(text) from public;
grant execute on function public.create_product_b_underbooking_decision(text, text, text) to authenticated;
grant execute on function public.resolve_product_b_underbooking_decision(text) to authenticated;

create or replace view public.staff_session_roster
with (security_barrier = true, security_invoker = true)
as
select
  session.class_session_id,
  session.class_type,
  case session.class_type when 'yoga' then 'Yoga' when 'cycling' then 'Cycling' when 'hiit' then 'HIIT' end as class_type_label,
  session.starts_at, session.ends_at, session.capacity,
  reservation.reservation_id, reservation.status as reservation_status, reservation.reserved_at,
  member.member_id, concat_ws(' ', member.first_name, member.last_name) as member_name,
  attendance.attendance_record_id, attendance.attendance_status, attendance.recorded_at,
  session.starts_at - interval '15 minutes' as check_in_opens_at,
  session.starts_at + interval '20 minutes' as check_in_closes_at,
  (reservation.status = 'confirmed' and attendance.attendance_record_id is null and now() between session.starts_at - interval '15 minutes' and session.starts_at + interval '20 minutes') as can_record_attended,
  (reservation.status = 'confirmed' and attendance.attendance_record_id is null and now() >= session.starts_at + interval '20 minutes') as can_record_no_show,
  (attendance.attendance_record_id is not null) as can_correct_attendance
from public.class_sessions as session
join public.reservations as reservation on reservation.class_session_id = session.class_session_id
join public.members as member on member.member_id = reservation.member_id
left join public.attendance_records as attendance on attendance.reservation_id = reservation.reservation_id
where not session.is_cancelled
  and reservation.status in ('confirmed', 'waitlisted')
  and public.can_access_product_b_session(session.class_session_id);

revoke all on public.staff_session_roster from public, anon;
grant select on public.staff_session_roster to authenticated;

drop policy if exists attendance_records_staff_read on public.attendance_records;
create policy attendance_records_product_b_read on public.attendance_records
for select to authenticated using (
  exists (
    select 1 from public.reservations as reservation
    where reservation.reservation_id = attendance_records.reservation_id
      and public.can_access_product_b_session(reservation.class_session_id)
  )
);

drop policy if exists attendance_corrections_staff_read on public.attendance_corrections;
create policy attendance_corrections_product_b_read on public.attendance_corrections
for select to authenticated using (
  exists (
    select 1
    from public.attendance_records as attendance
    join public.reservations as reservation on reservation.reservation_id = attendance.reservation_id
    where attendance.attendance_record_id = attendance_corrections.attendance_record_id
      and public.can_access_product_b_session(reservation.class_session_id)
  )
);

create or replace function public.record_attendance(p_reservation_id text, p_attendance_status public.attendance_status)
returns table (attendance_record_id text, reservation_id text, attendance_status text, recorded_at timestamptz)
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_attendance_record_id text;
  v_session_id text;
begin
  select reservation.class_session_id into v_session_id from public.reservations as reservation where reservation.reservation_id = p_reservation_id;
  if v_session_id is null then raise exception 'reservation not found'; end if;
  if not public.can_access_product_b_session(v_session_id) then raise exception 'Product B session access required'; end if;
  if exists (select 1 from public.attendance_records as attendance where attendance.reservation_id = p_reservation_id) then raise exception 'attendance has already been recorded for this reservation'; end if;
  v_attendance_record_id := 'ATT-' || upper(replace(gen_random_uuid()::text, '-', ''));
  insert into public.attendance_records (attendance_record_id, reservation_id, attendance_status, recorded_at)
  values (v_attendance_record_id, p_reservation_id, p_attendance_status, v_now);
  return query select v_attendance_record_id, p_reservation_id, p_attendance_status::text, v_now;
end;
$$;

create or replace function public.correct_attendance(p_attendance_record_id text, p_new_status public.attendance_status, p_reason text)
returns table (correction_id text, attendance_record_id text, previous_status text, new_status text, corrected_by_staff_id text, corrected_at timestamptz)
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_staff_id text := public.current_staff_id();
  v_attendance public.attendance_records%rowtype;
  v_session_id text;
  v_correction_id text;
begin
  if nullif(btrim(p_reason), '') is null then raise exception 'attendance correction reason is required'; end if;
  select attendance.* into v_attendance
  from public.attendance_records as attendance
  join public.reservations as reservation on reservation.reservation_id = attendance.reservation_id
  where attendance.attendance_record_id = p_attendance_record_id for update of attendance;
  if not found then raise exception 'attendance record not found'; end if;
  select reservation.class_session_id into v_session_id
  from public.reservations as reservation
  where reservation.reservation_id = v_attendance.reservation_id;
  if not public.can_access_product_b_session(v_session_id) then raise exception 'Product B session access required'; end if;
  if v_attendance.attendance_status = p_new_status then raise exception 'attendance correction must change the outcome'; end if;
  v_correction_id := 'CORR-' || upper(replace(gen_random_uuid()::text, '-', ''));
  insert into public.attendance_corrections (correction_id, attendance_record_id, previous_status, new_status, reason, corrected_by_staff_id, corrected_at)
  values (v_correction_id, p_attendance_record_id, v_attendance.attendance_status, p_new_status, btrim(p_reason), v_staff_id, v_now);
  perform set_config('pulse.attendance_correction_id', v_correction_id, true);
  update public.attendance_records set attendance_status = p_new_status where public.attendance_records.attendance_record_id = p_attendance_record_id;
  return query select v_correction_id, p_attendance_record_id, v_attendance.attendance_status::text, p_new_status::text, v_staff_id, v_now;
end;
$$;

comment on table public.product_b_underbooking_decisions is
  'Historical Product B operational intent. Live warning eligibility and utilization remain derived from current session facts.';

commit;
