-- Complete the August operational schedule so the member's August calendar
-- has bookable data through the final day of the month.

begin;

insert into public.class_sessions (
  class_session_id,
  class_type,
  starts_at,
  ends_at,
  capacity,
  is_cancelled,
  instructor_staff_id
)
select seed.*
from (
  values
    ('SESSION-LIVE-0831-0700', 'cycling'::public.class_type, '2026-08-31 07:00:00-04'::timestamptz, '2026-08-31 07:45:00-04'::timestamptz, 18, false, 'STF-0004'),
    ('SESSION-LIVE-0831-1800', 'hiit'::public.class_type, '2026-08-31 18:00:00-04'::timestamptz, '2026-08-31 18:45:00-04'::timestamptz, 16, false, 'STF-0003')
) as seed(class_session_id, class_type, starts_at, ends_at, capacity, is_cancelled, instructor_staff_id)
where exists (
  select 1
  from public.staff_accounts as staff
  where staff.staff_id = seed.instructor_staff_id
)
on conflict (class_session_id) do nothing;

commit;
