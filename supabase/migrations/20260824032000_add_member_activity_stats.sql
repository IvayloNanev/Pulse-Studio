begin;

create or replace function public.member_activity_stats(
  p_month_from timestamptz,
  p_month_to timestamptz
)
returns table (
  total_check_ins bigint,
  classes_this_month bigint
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    count(*) filter (where attendance.attendance_status = 'attended') as total_check_ins,
    count(*) filter (
      where attendance.attendance_status = 'attended'
        and session.starts_at >= p_month_from
        and session.starts_at < p_month_to
    ) as classes_this_month
  from public.attendance_records as attendance
  join public.reservations as reservation
    on reservation.reservation_id = attendance.reservation_id
  join public.class_sessions as session
    on session.class_session_id = reservation.class_session_id
  where reservation.member_id = public.current_member_id();
$$;

comment on function public.member_activity_stats(timestamptz, timestamptz) is
  'Returns the authenticated member lifetime attended check-ins and attended classes inside an explicit half-open month window.';

revoke all on function public.member_activity_stats(timestamptz, timestamptz) from public;
grant execute on function public.member_activity_stats(timestamptz, timestamptz) to authenticated;

commit;
