-- Owner/admin session creation command for the Product B staff overview.

begin;

alter table public.class_session_actions
  drop constraint if exists class_session_actions_action_type_check;
alter table public.class_session_actions
  add constraint class_session_actions_action_type_check
  check (action_type in ('studio_cancelled', 'session_created'));

create or replace function public.create_class_session(
  p_class_type public.class_type,
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
  v_now timestamptz := now();
  v_staff_id text := public.current_staff_id();
  v_starts_at timestamptz := p_starts_at_local at time zone 'America/New_York';
  v_ends_at timestamptz;
  v_session_id text;
  v_action_id text;
begin
  if not public.is_owner_admin() or v_staff_id is null then
    raise exception 'owner/admin authorization required';
  end if;
  if p_starts_at_local is null or v_starts_at <= v_now then
    raise exception 'a new class session must start in the future';
  end if;
  if p_duration_minutes not in (45, 50, 60) then
    raise exception 'class duration must be 45, 50, or 60 minutes';
  end if;
  if p_capacity < 1 or p_capacity > 100 then
    raise exception 'class capacity must be between 1 and 100';
  end if;
  if not exists (
    select 1 from public.staff_accounts
    where staff_id = p_instructor_staff_id and role = 'instructor' and account_status = 'active'
  ) then
    raise exception 'choose an active instructor';
  end if;

  v_ends_at := v_starts_at + make_interval(mins => p_duration_minutes);
  if exists (
    select 1 from public.class_sessions
    where instructor_staff_id = p_instructor_staff_id
      and not is_cancelled
      and tstzrange(starts_at, ends_at, '[)') && tstzrange(v_starts_at, v_ends_at, '[)')
  ) then
    raise exception 'the instructor already has a class during this time';
  end if;

  v_session_id := 'SESSION-' || upper(replace(gen_random_uuid()::text, '-', ''));
  insert into public.class_sessions (class_session_id, class_type, starts_at, ends_at, capacity, is_cancelled, instructor_staff_id)
  values (v_session_id, p_class_type, v_starts_at, v_ends_at, p_capacity, false, p_instructor_staff_id);

  v_action_id := 'CSA-' || upper(replace(gen_random_uuid()::text, '-', ''));
  insert into public.class_session_actions (action_id, class_session_id, action_type, reason, performed_by_staff_id, performed_at)
  values (v_action_id, v_session_id, 'session_created', 'Created from the staff overview', v_staff_id, v_now);

  return query select v_session_id, v_starts_at, v_action_id;
end;
$$;

revoke all on function public.create_class_session(public.class_type, timestamp, integer, integer, text) from public, anon;
grant execute on function public.create_class_session(public.class_type, timestamp, integer, integer, text) to authenticated;

commit;
