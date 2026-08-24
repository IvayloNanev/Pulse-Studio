-- Serialize all authoritative credit checks per membership to prevent concurrent overuse.

begin;

create or replace function public.membership_classes_remaining(
  p_membership_id text,
  p_as_of timestamptz
)
returns integer
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_remaining integer;
begin
  -- Held through transaction completion. A waiting transaction calculates again
  -- after the preceding reservation or waitlist promotion is committed.
  perform pg_advisory_xact_lock(hashtextextended(p_membership_id, 0));

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
  into v_remaining
  from cycle cross join usage;

  return v_remaining;
end;
$$;

comment on function public.membership_classes_remaining(text, timestamptz) is
  'Returns pause-adjusted credits remaining while serializing authoritative credit use per membership for the transaction.';

commit;
