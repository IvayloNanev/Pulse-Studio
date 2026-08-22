-- Product B staff roster contract.
-- Contract: docs/06-shared-api-contracts-v1.md

begin;

create or replace view public.staff_session_roster
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
  reservation.reservation_id,
  reservation.status as reservation_status,
  reservation.reserved_at,
  member.member_id,
  concat_ws(' ', member.first_name, member.last_name) as member_name,
  attendance.attendance_record_id,
  attendance.attendance_status,
  attendance.recorded_at,
  session.starts_at - interval '15 minutes' as check_in_opens_at,
  session.starts_at + interval '20 minutes' as check_in_closes_at,
  (
    reservation.status = 'confirmed'
    and attendance.attendance_record_id is null
    and now() >= session.starts_at - interval '15 minutes'
    and now() <= session.starts_at + interval '20 minutes'
  ) as can_record_attended,
  (
    reservation.status = 'confirmed'
    and attendance.attendance_record_id is null
    and now() >= session.starts_at + interval '20 minutes'
  ) as can_record_no_show,
  (attendance.attendance_record_id is not null) as can_correct_attendance
from public.class_sessions as session
join public.reservations as reservation
  on reservation.class_session_id = session.class_session_id
join public.members as member
  on member.member_id = reservation.member_id
left join public.attendance_records as attendance
  on attendance.reservation_id = reservation.reservation_id
where not session.is_cancelled
  and reservation.status in ('confirmed', 'waitlisted')
  and public.is_active_staff();

comment on view public.staff_session_roster is
  'Staff-only Product B roster with reservation eligibility, attendance outcome, and check-in action flags.';

revoke all on public.staff_session_roster from public;
revoke all on public.staff_session_roster from anon;
grant select on public.staff_session_roster to authenticated;

commit;
