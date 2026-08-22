-- Product A authenticated member dashboard contracts.
-- Contract: docs/06-shared-api-contracts-v1.md

begin;

create or replace function public.membership_cycle_boundary(
  p_membership_id text,
  p_cycle_index integer,
  p_as_of timestamptz default now()
)
returns timestamptz
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_anchor_date date;
  v_boundary timestamptz;
  v_pause record;
  v_pause_end timestamptz;
begin
  if p_cycle_index < 0 then
    raise exception 'cycle index cannot be negative';
  end if;

  select billing_cycle_start_date
  into v_anchor_date
  from public.memberships
  where membership_id = p_membership_id;

  if not found then return null; end if;

  v_boundary := (
    v_anchor_date + make_interval(months => p_cycle_index)
  )::timestamp at time zone 'America/New_York';

  for v_pause in
    select effective_at, ended_at
    from public.membership_status_history
    where membership_id = p_membership_id
      and status = 'paused'
      and effective_at < p_as_of
    order by effective_at
  loop
    v_pause_end := least(coalesce(v_pause.ended_at, p_as_of), p_as_of);
    if v_pause.effective_at < v_boundary and v_pause_end > v_pause.effective_at then
      v_boundary := v_boundary + (v_pause_end - v_pause.effective_at);
    end if;
  end loop;

  return v_boundary;
end;
$$;

create or replace function public.member_dashboard(
  p_as_of timestamptz default now()
)
returns table (
  member_id text,
  member_name text,
  email text,
  phone text,
  preferred_channel text,
  membership_id text,
  membership_status text,
  plan_id text,
  plan_name text,
  classes_per_month integer,
  agreed_monthly_price numeric,
  billing_cycle_start_at timestamptz,
  billing_cycle_end_at timestamptz,
  classes_used integer,
  classes_reserved integer,
  classes_remaining integer
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with eligible_membership as (
    select membership.*
    from public.memberships as membership
    where membership.member_id = public.current_member_id()
      and membership.start_date <= (p_as_of at time zone 'America/New_York')::date
      and (membership.end_date is null or membership.end_date >= (p_as_of at time zone 'America/New_York')::date)
      and exists (
        select 1
        from public.membership_status_history as history
        where history.membership_id = membership.membership_id
          and history.status in ('active', 'paused')
          and p_as_of >= history.effective_at
          and p_as_of < coalesce(history.ended_at, 'infinity'::timestamptz)
      )
    order by membership.start_date desc
    limit 1
  ), cycle as (
    select
      membership.membership_id,
      candidate.cycle_start_at,
      public.membership_cycle_boundary(membership.membership_id, candidate.cycle_index + 1, p_as_of) as cycle_end_at
    from eligible_membership as membership
    join lateral (
      select
        cycle_index,
        public.membership_cycle_boundary(membership.membership_id, cycle_index, p_as_of) as cycle_start_at
      from generate_series(0, 600) as cycle_index
      where public.membership_cycle_boundary(membership.membership_id, cycle_index, p_as_of) <= p_as_of
        and public.membership_cycle_boundary(membership.membership_id, cycle_index + 1, p_as_of) > p_as_of
      order by cycle_index desc
      limit 1
    ) as candidate on true
  ), usage as (
    select
      membership.membership_id,
      count(*) filter (
        where attendance.attendance_record_id is not null
          or (reservation.status = 'cancelled' and reservation.is_late_cancellation)
      )::integer as classes_used,
      count(*) filter (
        where reservation.status = 'confirmed'
          and attendance.attendance_record_id is null
      )::integer as classes_reserved
    from eligible_membership as membership
    join cycle on cycle.membership_id = membership.membership_id
    left join public.reservations as reservation
      on reservation.membership_id = membership.membership_id
    left join public.class_sessions as session
      on session.class_session_id = reservation.class_session_id
      and session.starts_at >= cycle.cycle_start_at
      and session.starts_at < cycle.cycle_end_at
      and not session.is_cancelled
    left join public.attendance_records as attendance
      on attendance.reservation_id = reservation.reservation_id
    where reservation.reservation_id is null or session.class_session_id is not null
    group by membership.membership_id
  )
  select
    member.member_id,
    concat_ws(' ', member.first_name, member.last_name) as member_name,
    member.email,
    member.phone,
    member.preferred_channel::text,
    membership.membership_id,
    membership.status::text as membership_status,
    plan.plan_id,
    plan.plan_name,
    plan.classes_per_month,
    membership.agreed_monthly_price,
    cycle.cycle_start_at,
    cycle.cycle_end_at,
    coalesce(usage.classes_used, 0),
    coalesce(usage.classes_reserved, 0),
    greatest(plan.classes_per_month - coalesce(usage.classes_used, 0) - coalesce(usage.classes_reserved, 0), 0)::integer
  from eligible_membership as membership
  join public.members as member on member.member_id = membership.member_id
  join public.membership_plans as plan on plan.plan_id = membership.plan_id
  join cycle on cycle.membership_id = membership.membership_id
  left join usage on usage.membership_id = membership.membership_id;
$$;

create or replace function public.member_reservations(
  p_from timestamptz default now()
)
returns table (
  reservation_id text,
  reservation_status text,
  reserved_at timestamptz,
  class_session_id text,
  class_type text,
  class_type_label text,
  starts_at timestamptz,
  ends_at timestamptz,
  instructor_name text,
  capacity integer,
  confirmed_reservations integer,
  waitlisted_reservations integer,
  available_spots integer,
  is_full boolean,
  cancellation_deadline timestamptz
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    reservation.reservation_id,
    reservation.status::text,
    reservation.reserved_at,
    schedule.class_session_id,
    schedule.class_type::text,
    schedule.class_type_label,
    schedule.starts_at,
    schedule.ends_at,
    schedule.instructor_name,
    schedule.capacity,
    schedule.confirmed_reservations,
    schedule.waitlisted_reservations,
    schedule.available_spots,
    schedule.is_full,
    schedule.starts_at - interval '12 hours' as cancellation_deadline
  from public.reservations as reservation
  join public.public_class_schedule as schedule
    on schedule.class_session_id = reservation.class_session_id
  where reservation.member_id = public.current_member_id()
    and reservation.status in ('confirmed', 'waitlisted')
    and schedule.starts_at >= p_from
  order by schedule.starts_at, reservation.reserved_at;
$$;

comment on function public.membership_cycle_boundary(text, integer, timestamptz) is
  'Returns a membership billing-cycle boundary shifted by paused duration as of a supplied time.';
comment on function public.member_dashboard(timestamptz) is
  'Returns the authenticated member membership and pause-adjusted credit summary.';
comment on function public.member_reservations(timestamptz) is
  'Returns the authenticated member confirmed and waitlisted reservations from a supplied time.';

revoke all on function public.membership_cycle_boundary(text, integer, timestamptz) from public;
revoke all on function public.member_dashboard(timestamptz) from public;
revoke all on function public.member_reservations(timestamptz) from public;
grant execute on function public.membership_cycle_boundary(text, integer, timestamptz) to authenticated;
grant execute on function public.member_dashboard(timestamptz) to authenticated;
grant execute on function public.member_reservations(timestamptz) to authenticated;

commit;
