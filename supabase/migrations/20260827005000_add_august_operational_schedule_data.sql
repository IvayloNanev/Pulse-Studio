begin;

-- Synthetic August operations data for the staff dashboard and attendance
-- workflow. Every record is clearly namespaced so it can be identified later.
with class_days as (
  select day::date as session_day
  from generate_series(date '2026-08-03', date '2026-08-28', interval '1 day') as day
  where extract(isodow from day) in (1, 3, 5)
), synthetic_sessions as (
  select
    'SYN-AUG-' || to_char(session_day, 'YYYYMMDD') || '-' || class_type as class_session_id,
    class_type::public.class_type as class_type,
    case class_type
      when 'yoga' then (session_day + time '09:00') at time zone 'America/New_York'
      when 'cycling' then (session_day + time '12:00') at time zone 'America/New_York'
      else (session_day + time '18:00') at time zone 'America/New_York'
    end as starts_at,
    case class_type
      when 'yoga' then (session_day + time '10:00') at time zone 'America/New_York'
      when 'cycling' then (session_day + time '13:00') at time zone 'America/New_York'
      else (session_day + time '19:00') at time zone 'America/New_York'
    end as ends_at,
    case class_type when 'cycling' then 14 else 16 end as capacity,
    case class_type
      when 'yoga' then 'STF-0004'
      when 'cycling' then 'STF-0003'
      else 'STF-0002'
    end as instructor_staff_id
  from class_days
  cross join (values ('yoga'), ('cycling'), ('hiit')) as formats(class_type)
)
insert into public.class_sessions (
  class_session_id, class_type, starts_at, ends_at, capacity, is_cancelled, instructor_staff_id
)
select class_session_id, class_type, starts_at, ends_at, capacity, false, instructor_staff_id
from synthetic_sessions as session
where exists (
  select 1
  from public.staff_accounts as staff
  where staff.staff_id = session.instructor_staff_id
    and staff.role in ('owner_admin', 'instructor')
    and staff.account_status = 'active'
)
on conflict (class_session_id) do nothing;

with synthetic_sessions as (
  select
    class_session_id,
    class_type,
    starts_at,
    case class_type when 'yoga' then 12 when 'cycling' then 13 else 11 end as confirmed_count
  from public.class_sessions
  where class_session_id like 'SYN-AUG-%'
), synthetic_members as (
  select member_id, row_number() over (order by member_id) as member_number
  from public.members
), synthetic_reservations as (
  select
    'RES-' || session.class_session_id || '-' || lpad(member.member_number::text, 3, '0') as reservation_id,
    member.member_id,
    session.class_session_id,
    'confirmed'::public.reservation_status as status,
    session.starts_at - interval '8 days' + (member.member_number % 5) * interval '1 day' as reserved_at
  from synthetic_sessions session
  join synthetic_members member
    on member.member_number between
      ((extract(day from session.starts_at)::integer * 7) % 180) + 1
      and ((extract(day from session.starts_at)::integer * 7) % 180) + session.confirmed_count
), synthetic_cancellations as (
  select
    'RES-' || session.class_session_id || '-CAN' as reservation_id,
    member.member_id,
    session.class_session_id,
    'cancelled'::public.reservation_status as status,
    session.starts_at - interval '6 days' as reserved_at,
    session.starts_at - interval '2 days' as cancelled_at
  from synthetic_sessions session
  join synthetic_members member
    on member.member_number = ((extract(day from session.starts_at)::integer * 11) % 180) + 50
)
insert into public.reservations (
  reservation_id, member_id, class_session_id, membership_id, status,
  reserved_at, cancelled_at, is_late_cancellation, uses_drop_in
)
select reservation_id, member_id, class_session_id, null, status, reserved_at, null, null, false
from synthetic_reservations
union all
select reservation_id, member_id, class_session_id, null, status, reserved_at, cancelled_at, false, false
from synthetic_cancellations
on conflict (reservation_id) do nothing;

commit;
