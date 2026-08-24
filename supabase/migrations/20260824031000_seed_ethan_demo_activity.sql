-- Give the dedicated Ethan demo member a small, realistic attendance history.
-- These are ordinary sessions, reservations, and attendance facts so every
-- member-facing summary continues to be derived by the production contracts.

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
    ('SESSION-DEMO-ETHAN-0804', 'yoga'::public.class_type, '2026-08-04 07:00:00-04'::timestamptz, '2026-08-04 07:50:00-04'::timestamptz, 20, false, 'STF-0002'),
    ('SESSION-DEMO-ETHAN-0808', 'cycling'::public.class_type, '2026-08-08 09:00:00-04'::timestamptz, '2026-08-08 09:45:00-04'::timestamptz, 18, false, 'STF-0004'),
    ('SESSION-DEMO-ETHAN-0812', 'hiit'::public.class_type, '2026-08-12 18:00:00-04'::timestamptz, '2026-08-12 18:45:00-04'::timestamptz, 16, false, 'STF-0003'),
    ('SESSION-DEMO-ETHAN-0817', 'yoga'::public.class_type, '2026-08-17 18:00:00-04'::timestamptz, '2026-08-17 18:50:00-04'::timestamptz, 20, false, 'STF-0002'),
    ('SESSION-DEMO-ETHAN-0820', 'cycling'::public.class_type, '2026-08-20 07:00:00-04'::timestamptz, '2026-08-20 07:45:00-04'::timestamptz, 18, false, 'STF-0004'),
    ('SESSION-DEMO-ETHAN-0823', 'hiit'::public.class_type, '2026-08-23 07:00:00-04'::timestamptz, '2026-08-23 07:45:00-04'::timestamptz, 16, false, 'STF-0003')
) as seed(class_session_id, class_type, starts_at, ends_at, capacity, is_cancelled, instructor_staff_id)
where exists (select 1 from public.staff_accounts where staff_id = seed.instructor_staff_id)
on conflict (class_session_id) do nothing;

insert into public.reservations (
  reservation_id,
  member_id,
  class_session_id,
  membership_id,
  status,
  reserved_at,
  cancelled_at,
  is_late_cancellation
)
select
  seed.reservation_id,
  'MEM-DEMO-ETHAN',
  seed.class_session_id,
  'MSP-DEMO-ETHAN',
  'confirmed'::public.reservation_status,
  seed.reserved_at,
  null,
  null
from (
  values
    ('RSV-DEMO-ETHAN-0804', 'SESSION-DEMO-ETHAN-0804', '2026-08-01 12:00:00-04'::timestamptz),
    ('RSV-DEMO-ETHAN-0808', 'SESSION-DEMO-ETHAN-0808', '2026-08-05 12:00:00-04'::timestamptz),
    ('RSV-DEMO-ETHAN-0812', 'SESSION-DEMO-ETHAN-0812', '2026-08-09 12:00:00-04'::timestamptz),
    ('RSV-DEMO-ETHAN-0817', 'SESSION-DEMO-ETHAN-0817', '2026-08-14 12:00:00-04'::timestamptz),
    ('RSV-DEMO-ETHAN-0820', 'SESSION-DEMO-ETHAN-0820', '2026-08-18 12:00:00-04'::timestamptz),
    ('RSV-DEMO-ETHAN-0823', 'SESSION-DEMO-ETHAN-0823', '2026-08-20 12:00:00-04'::timestamptz)
) as seed(reservation_id, class_session_id, reserved_at)
where exists (select 1 from public.members where member_id = 'MEM-DEMO-ETHAN')
  and exists (select 1 from public.memberships where membership_id = 'MSP-DEMO-ETHAN')
  and exists (select 1 from public.class_sessions where class_session_id = seed.class_session_id)
on conflict (reservation_id) do nothing;

insert into public.attendance_records (
  attendance_record_id,
  reservation_id,
  attendance_status,
  recorded_at
)
select seed.*
from (
  values
    ('ATT-DEMO-ETHAN-0804', 'RSV-DEMO-ETHAN-0804', 'attended'::public.attendance_status, '2026-08-04 07:05:00-04'::timestamptz),
    ('ATT-DEMO-ETHAN-0808', 'RSV-DEMO-ETHAN-0808', 'attended'::public.attendance_status, '2026-08-08 09:04:00-04'::timestamptz),
    ('ATT-DEMO-ETHAN-0812', 'RSV-DEMO-ETHAN-0812', 'attended'::public.attendance_status, '2026-08-12 18:06:00-04'::timestamptz),
    ('ATT-DEMO-ETHAN-0817', 'RSV-DEMO-ETHAN-0817', 'no_show'::public.attendance_status, '2026-08-17 18:21:00-04'::timestamptz),
    ('ATT-DEMO-ETHAN-0820', 'RSV-DEMO-ETHAN-0820', 'attended'::public.attendance_status, '2026-08-20 07:03:00-04'::timestamptz),
    ('ATT-DEMO-ETHAN-0823', 'RSV-DEMO-ETHAN-0823', 'attended'::public.attendance_status, '2026-08-23 07:02:00-04'::timestamptz)
) as seed(attendance_record_id, reservation_id, attendance_status, recorded_at)
where exists (select 1 from public.reservations where reservation_id = seed.reservation_id)
on conflict (attendance_record_id) do nothing;

commit;
