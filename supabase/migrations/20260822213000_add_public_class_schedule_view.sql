-- Shared public schedule contract for Products A, B, and C.
-- Contract: docs/06-shared-api-contracts-v1.md

begin;

create or replace view public.public_class_schedule
with (security_barrier = true)
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
  count(reservation.reservation_id) filter (where reservation.status = 'confirmed')::integer as confirmed_reservations,
  count(reservation.reservation_id) filter (where reservation.status = 'waitlisted')::integer as waitlisted_reservations,
  greatest(
    session.capacity - count(reservation.reservation_id) filter (where reservation.status = 'confirmed')::integer,
    0
  ) as available_spots,
  count(reservation.reservation_id) filter (where reservation.status = 'confirmed') >= session.capacity as is_full,
  session.instructor_staff_id,
  concat_ws(' ', instructor.first_name, instructor.last_name) as instructor_name
from public.class_sessions as session
join public.staff_accounts as instructor
  on instructor.staff_id = session.instructor_staff_id
left join public.reservations as reservation
  on reservation.class_session_id = session.class_session_id
where not session.is_cancelled
group by
  session.class_session_id,
  session.class_type,
  session.starts_at,
  session.ends_at,
  session.capacity,
  session.instructor_staff_id,
  instructor.first_name,
  instructor.last_name;

comment on view public.public_class_schedule is
  'Safe public class schedule with derived availability and no member-level reservation data.';

revoke all on public.public_class_schedule from public;
grant select on public.public_class_schedule to anon, authenticated;

commit;
