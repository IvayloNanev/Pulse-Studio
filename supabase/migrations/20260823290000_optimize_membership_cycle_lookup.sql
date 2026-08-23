-- Replace exhaustive billing-cycle scans with one shared logarithmic lookup.

begin;

create or replace function public.membership_cycle_at(
  p_membership_id text,
  p_as_of timestamptz default now()
)
returns table (
  cycle_index integer,
  cycle_start_at timestamptz,
  cycle_end_at timestamptz
)
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_low integer := 0;
  v_high integer := 600;
  v_mid integer;
  v_candidate integer := -1;
  v_boundary timestamptz;
begin
  while v_low <= v_high loop
    v_mid := (v_low + v_high) / 2;
    v_boundary := public.membership_cycle_boundary(p_membership_id, v_mid, p_as_of);

    if v_boundary is null then
      return;
    elsif v_boundary <= p_as_of then
      v_candidate := v_mid;
      v_low := v_mid + 1;
    else
      v_high := v_mid - 1;
    end if;
  end loop;

  if v_candidate < 0 then return; end if;

  return query select
    v_candidate,
    public.membership_cycle_boundary(p_membership_id, v_candidate, p_as_of),
    public.membership_cycle_boundary(p_membership_id, v_candidate + 1, p_as_of);
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
      and public.membership_status_at(membership.membership_id, p_as_of) in ('active', 'paused')
    order by membership.start_date desc
    limit 1
  ), cycle as (
    select membership.membership_id, current_cycle.cycle_start_at, current_cycle.cycle_end_at
    from eligible_membership as membership
    join lateral public.membership_cycle_at(membership.membership_id, p_as_of) as current_cycle on true
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
    left join public.reservations as reservation on reservation.membership_id = membership.membership_id
    left join public.class_sessions as session
      on session.class_session_id = reservation.class_session_id
      and session.starts_at >= cycle.cycle_start_at
      and session.starts_at < cycle.cycle_end_at
      and not session.is_cancelled
    left join public.attendance_records as attendance on attendance.reservation_id = reservation.reservation_id
    where reservation.reservation_id is null or session.class_session_id is not null
    group by membership.membership_id
  )
  select
    member.member_id,
    concat_ws(' ', member.first_name, member.last_name),
    member.email,
    member.phone,
    member.preferred_channel::text,
    membership.membership_id,
    public.membership_status_at(membership.membership_id, p_as_of)::text,
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

create or replace function public.membership_classes_remaining(
  p_membership_id text,
  p_as_of timestamptz
)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with membership_context as (
    select membership.membership_id, plan.classes_per_month
    from public.memberships as membership
    join public.membership_plans as plan on plan.plan_id = membership.plan_id
    where membership.membership_id = p_membership_id
  ), cycle as (
    select context.membership_id, context.classes_per_month,
      current_cycle.cycle_start_at, current_cycle.cycle_end_at
    from membership_context as context
    join lateral public.membership_cycle_at(context.membership_id, p_as_of) as current_cycle on true
  ), usage as (
    select count(*)::integer as credits_committed
    from cycle
    join public.reservations as reservation on reservation.membership_id = cycle.membership_id
    join public.class_sessions as session
      on session.class_session_id = reservation.class_session_id
      and session.starts_at >= cycle.cycle_start_at
      and session.starts_at < cycle.cycle_end_at
      and not session.is_cancelled
    left join public.attendance_records as attendance on attendance.reservation_id = reservation.reservation_id
    where attendance.attendance_record_id is not null
      or reservation.status = 'confirmed'
      or (reservation.status = 'cancelled' and reservation.is_late_cancellation)
  )
  select greatest(cycle.classes_per_month - usage.credits_committed, 0)::integer
  from cycle cross join usage
$$;

comment on function public.membership_cycle_at(text, timestamptz) is
  'Finds the pause-adjusted current billing cycle with logarithmic boundary lookup.';

revoke all on function public.membership_cycle_at(text, timestamptz) from public;
grant execute on function public.membership_cycle_at(text, timestamptz) to authenticated;

commit;
