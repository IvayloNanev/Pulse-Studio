-- Owner/admin command for safely editing an unbooked future class session.

begin;

alter table public.class_session_actions
  drop constraint if exists class_session_actions_action_type_check;
alter table public.class_session_actions
  add constraint class_session_actions_action_type_check
  check (action_type in ('studio_cancelled', 'session_created', 'session_updated'));

create or replace function public.update_class_session(
  p_class_session_id text,
  p_starts_at_local timestamp,
  p_duration_minutes integer,
  p_capacity integer,
  p_instructor_staff_id text
)
returns table (class_session_id text, starts_at timestamptz, action_id text)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_staff_id text := public.current_staff_id();
  v_starts_at timestamptz := p_starts_at_local at time zone 'America/New_York';
  v_ends_at timestamptz;
  v_action_id text;
begin
  if not public.is_owner_admin() or v_staff_id is null then raise exception 'owner/admin authorization required'; end if;
  if p_starts_at_local is null or v_starts_at <= now() then raise exception 'a class session must start in the future'; end if;
  if p_duration_minutes not in (45, 50, 60) then raise exception 'class duration must be 45, 50, or 60 minutes'; end if;
  if p_capacity < 1 or p_capacity > 100 then raise exception 'class capacity must be between 1 and 100'; end if;
  if not exists (select 1 from public.staff_accounts where staff_id = p_instructor_staff_id and role = 'instructor' and account_status = 'active') then raise exception 'choose an active instructor'; end if;
  if not exists (select 1 from public.class_sessions where class_session_id = p_class_session_id and not is_cancelled for update) then raise exception 'class session not found or cancelled'; end if;
  if exists (select 1 from public.reservations where class_session_id = p_class_session_id and status in ('confirmed', 'waitlisted')) then raise exception 'a booked class session cannot be edited'; end if;
  if exists (select 1 from public.attendance_records as attendance join public.reservations as reservation on reservation.reservation_id = attendance.reservation_id where reservation.class_session_id = p_class_session_id) then raise exception 'session editing conflicts with recorded attendance'; end if;

  v_ends_at := v_starts_at + make_interval(mins => p_duration_minutes);
  if exists (select 1 from public.class_sessions where instructor_staff_id = p_instructor_staff_id and class_session_id <> p_class_session_id and not is_cancelled and tstzrange(starts_at, ends_at, '[)') && tstzrange(v_starts_at, v_ends_at, '[)')) then raise exception 'the instructor already has a class during this time'; end if;

  update public.class_sessions set starts_at = v_starts_at, ends_at = v_ends_at, capacity = p_capacity, instructor_staff_id = p_instructor_staff_id where class_session_id = p_class_session_id;
  v_action_id := 'CSA-' || upper(replace(gen_random_uuid()::text, '-', ''));
  insert into public.class_session_actions (action_id, class_session_id, action_type, reason, performed_by_staff_id, performed_at) values (v_action_id, p_class_session_id, 'session_updated', 'Updated from Manage classes', v_staff_id, now());
  return query select p_class_session_id, v_starts_at, v_action_id;
end;
$$;

revoke all on function public.update_class_session(text, timestamp, integer, integer, text) from public, anon;
grant execute on function public.update_class_session(text, timestamp, integer, integer, text) to authenticated;

commit;
