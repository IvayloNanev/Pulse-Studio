-- Product B Stage 2: truthful attendance attribution, bulk recording, and derived workflow facts.

begin;

alter table public.attendance_records
  add column recorded_by_staff_id text
  references public.staff_accounts(staff_id) on update cascade on delete restrict;

create index attendance_records_recorded_by_staff_idx
  on public.attendance_records(recorded_by_staff_id)
  where recorded_by_staff_id is not null;

create or replace function public.record_attendance(
  p_reservation_id text,
  p_attendance_status public.attendance_status
)
returns table (attendance_record_id text, reservation_id text, attendance_status text, recorded_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_staff_id text := public.current_staff_id();
  v_attendance_record_id text;
  v_session_id text;
begin
  if v_staff_id is null then raise exception 'active staff account required'; end if;
  select reservation.class_session_id into v_session_id
  from public.reservations as reservation
  where reservation.reservation_id = p_reservation_id;
  if v_session_id is null then raise exception 'reservation not found'; end if;
  if not public.can_access_product_b_session(v_session_id) then raise exception 'Product B session access required'; end if;
  if exists (select 1 from public.attendance_records as attendance where attendance.reservation_id = p_reservation_id) then
    raise exception 'attendance has already been recorded for this reservation';
  end if;

  v_attendance_record_id := 'ATT-' || upper(replace(gen_random_uuid()::text, '-', ''));
  insert into public.attendance_records (
    attendance_record_id, reservation_id, attendance_status, recorded_at, recorded_by_staff_id
  ) values (
    v_attendance_record_id, p_reservation_id, p_attendance_status, v_now, v_staff_id
  );
  return query select v_attendance_record_id, p_reservation_id, p_attendance_status::text, v_now;
end;
$$;

create or replace function public.record_session_attendance_bulk(
  p_class_session_id text,
  p_reservation_ids text[],
  p_attendance_status public.attendance_status
)
returns table (class_session_id text, attendance_status text, recorded_count integer)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_staff_id text := public.current_staff_id();
  v_session public.class_sessions%rowtype;
  v_requested integer;
  v_valid integer;
begin
  if v_staff_id is null then raise exception 'active staff account required'; end if;
  if p_reservation_ids is null or cardinality(p_reservation_ids) = 0 then raise exception 'at least one reservation is required'; end if;
  if cardinality(p_reservation_ids) <> (select count(distinct item) from unnest(p_reservation_ids) as item) then
    raise exception 'duplicate reservation target';
  end if;

  select * into v_session
  from public.class_sessions
  where public.class_sessions.class_session_id = p_class_session_id
  for update;
  if not found then raise exception 'class session not found'; end if;
  if not public.can_access_product_b_session(p_class_session_id) then raise exception 'Product B session access required'; end if;
  if v_session.is_cancelled then raise exception 'cancelled session attendance is unavailable'; end if;

  v_requested := cardinality(p_reservation_ids);
  select count(*)::integer into v_valid
  from public.reservations as reservation
  where reservation.reservation_id = any(p_reservation_ids)
    and reservation.class_session_id = p_class_session_id
    and reservation.status = 'confirmed';
  if v_valid <> v_requested then raise exception 'one or more reservations are not eligible for this session'; end if;
  if exists (
    select 1 from public.attendance_records as attendance
    where attendance.reservation_id = any(p_reservation_ids)
  ) then raise exception 'attendance has already been recorded for one or more reservations'; end if;

  insert into public.attendance_records (
    attendance_record_id, reservation_id, attendance_status, recorded_at, recorded_by_staff_id
  )
  select
    'ATT-' || upper(replace(gen_random_uuid()::text, '-', '')),
    reservation_id,
    p_attendance_status,
    v_now,
    v_staff_id
  from unnest(p_reservation_ids) as reservation_id;

  return query select p_class_session_id, p_attendance_status::text, v_requested;
end;
$$;

revoke all on function public.record_session_attendance_bulk(text, text[], public.attendance_status) from public, anon;
grant execute on function public.record_session_attendance_bulk(text, text[], public.attendance_status) to authenticated;

create or replace view public.staff_product_b_sessions
with (security_barrier = true, security_invoker = true)
as
select
  session.class_session_id,
  session.class_type,
  case session.class_type when 'yoga' then 'Yoga' when 'cycling' then 'Cycling' when 'hiit' then 'HIIT' end as class_type_label,
  session.starts_at,
  session.ends_at,
  session.capacity,
  session.is_cancelled,
  session.instructor_staff_id,
  concat_ws(' ', instructor.first_name, instructor.last_name) as instructor_name,
  count(reservation.reservation_id) filter (where reservation.status = 'confirmed')::integer as confirmed_reservations,
  count(reservation.reservation_id) filter (where reservation.status = 'waitlisted')::integer as waitlisted_reservations,
  greatest(session.capacity - count(reservation.reservation_id) filter (where reservation.status = 'confirmed')::integer, 0) as available_spots,
  count(attendance.attendance_record_id) filter (where reservation.status = 'confirmed' and attendance.attendance_status = 'attended')::integer as attended_count,
  count(attendance.attendance_record_id) filter (where reservation.status = 'confirmed' and attendance.attendance_status = 'no_show')::integer as no_show_count,
  count(attendance.attendance_record_id) filter (where reservation.status = 'confirmed')::integer as marked_count
from public.class_sessions as session
join public.staff_accounts as instructor on instructor.staff_id = session.instructor_staff_id
left join public.reservations as reservation on reservation.class_session_id = session.class_session_id
left join public.attendance_records as attendance on attendance.reservation_id = reservation.reservation_id
where public.can_access_product_b_session(session.class_session_id)
group by session.class_session_id, instructor.first_name, instructor.last_name;

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
  (attendance.attendance_record_id is not null) as can_correct_attendance,
  coalesce(nullif(concat_ws(' ', recorder.first_name, recorder.last_name), ''), 'Recorder unavailable') as recorded_by_staff_name,
  coalesce(correction_history.items, '[]'::jsonb) as correction_history
from public.class_sessions as session
join public.reservations as reservation on reservation.class_session_id = session.class_session_id
join public.members as member on member.member_id = reservation.member_id
left join public.attendance_records as attendance on attendance.reservation_id = reservation.reservation_id
left join public.staff_accounts as recorder on recorder.staff_id = attendance.recorded_by_staff_id
left join lateral (
  select jsonb_agg(jsonb_build_object(
    'correction_id', correction.correction_id,
    'previous_status', correction.previous_status,
    'new_status', correction.new_status,
    'reason', correction.reason,
    'corrected_at', correction.corrected_at,
    'corrected_by_staff_name', concat_ws(' ', correcting_staff.first_name, correcting_staff.last_name)
  ) order by correction.corrected_at) as items
  from public.attendance_corrections as correction
  join public.staff_accounts as correcting_staff on correcting_staff.staff_id = correction.corrected_by_staff_id
  where correction.attendance_record_id = attendance.attendance_record_id
) as correction_history on true
where not session.is_cancelled
  and reservation.status in ('confirmed', 'waitlisted')
  and public.can_access_product_b_session(session.class_session_id);

comment on column public.attendance_records.recorded_by_staff_id is
  'Authenticated Staff actor for new attendance. Historical NULL values remain intentionally unknown.';
comment on function public.record_session_attendance_bulk(text, text[], public.attendance_status) is
  'Atomically records one outcome for an authorized set of unmarked confirmed reservations in one Product B session.';

commit;
