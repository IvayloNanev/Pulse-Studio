-- Add an upcoming operational schedule for live Product A/B workflow testing.
-- Historical synthetic fixtures remain unchanged for risk and attendance evidence.

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
    ('SESSION-LIVE-0824-0700', 'yoga'::public.class_type, '2026-08-24 07:00:00-04'::timestamptz, '2026-08-24 07:50:00-04'::timestamptz, 20, false, 'STF-0002'),
    ('SESSION-LIVE-0824-1800', 'cycling'::public.class_type, '2026-08-24 18:00:00-04'::timestamptz, '2026-08-24 18:45:00-04'::timestamptz, 18, false, 'STF-0004'),
    ('SESSION-LIVE-0825-0700', 'hiit'::public.class_type, '2026-08-25 07:00:00-04'::timestamptz, '2026-08-25 07:45:00-04'::timestamptz, 16, false, 'STF-0003'),
    ('SESSION-LIVE-0825-1800', 'yoga'::public.class_type, '2026-08-25 18:00:00-04'::timestamptz, '2026-08-25 18:50:00-04'::timestamptz, 20, false, 'STF-0002'),
    ('SESSION-LIVE-0826-0700', 'cycling'::public.class_type, '2026-08-26 07:00:00-04'::timestamptz, '2026-08-26 07:45:00-04'::timestamptz, 18, false, 'STF-0004'),
    ('SESSION-LIVE-0826-1800', 'hiit'::public.class_type, '2026-08-26 18:00:00-04'::timestamptz, '2026-08-26 18:45:00-04'::timestamptz, 16, false, 'STF-0003'),
    ('SESSION-LIVE-0827-0700', 'yoga'::public.class_type, '2026-08-27 07:00:00-04'::timestamptz, '2026-08-27 07:50:00-04'::timestamptz, 20, false, 'STF-0002'),
    ('SESSION-LIVE-0827-1800', 'cycling'::public.class_type, '2026-08-27 18:00:00-04'::timestamptz, '2026-08-27 18:45:00-04'::timestamptz, 18, false, 'STF-0004'),
    ('SESSION-LIVE-0828-0700', 'hiit'::public.class_type, '2026-08-28 07:00:00-04'::timestamptz, '2026-08-28 07:45:00-04'::timestamptz, 16, false, 'STF-0003'),
    ('SESSION-LIVE-0828-1730', 'yoga'::public.class_type, '2026-08-28 17:30:00-04'::timestamptz, '2026-08-28 18:20:00-04'::timestamptz, 20, false, 'STF-0002'),
    ('SESSION-LIVE-0829-0900', 'cycling'::public.class_type, '2026-08-29 09:00:00-04'::timestamptz, '2026-08-29 09:45:00-04'::timestamptz, 18, false, 'STF-0004'),
    ('SESSION-LIVE-0830-1000', 'hiit'::public.class_type, '2026-08-30 10:00:00-04'::timestamptz, '2026-08-30 10:45:00-04'::timestamptz, 16, false, 'STF-0003')
) as seed(class_session_id, class_type, starts_at, ends_at, capacity, is_cancelled, instructor_staff_id)
where exists (
  select 1
  from public.staff_accounts as staff
  where staff.staff_id = seed.instructor_staff_id
)
on conflict (class_session_id) do nothing;

commit;
