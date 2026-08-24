begin;

create or replace function public.member_activity(
  p_from timestamptz,
  p_to timestamptz
)
returns table (
  reservation_id text,
  reservation_status text,
  attendance_status text,
  class_session_id text,
  class_type text,
  class_type_label text,
  starts_at timestamptz,
  ends_at timestamptz,
  instructor_name text,
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
    attendance.attendance_status::text,
    schedule.class_session_id,
    schedule.class_type::text,
    schedule.class_type_label,
    schedule.starts_at,
    schedule.ends_at,
    schedule.instructor_name,
    schedule.starts_at - interval '12 hours'
  from public.reservations as reservation
  join public.public_class_schedule as schedule
    on schedule.class_session_id = reservation.class_session_id
  left join public.attendance_records as attendance
    on attendance.reservation_id = reservation.reservation_id
  where reservation.member_id = public.current_member_id()
    and schedule.starts_at >= p_from
    and schedule.starts_at < p_to
  order by schedule.starts_at, reservation.reserved_at;
$$;

comment on function public.member_activity(timestamptz, timestamptz) is
  'Returns the authenticated member reservation and attendance activity inside an explicit half-open session window.';

revoke all on function public.member_activity(timestamptz, timestamptz) from public;
grant execute on function public.member_activity(timestamptz, timestamptz) to authenticated;

commit;
