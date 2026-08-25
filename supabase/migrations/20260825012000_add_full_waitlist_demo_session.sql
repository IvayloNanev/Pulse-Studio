-- Add the small-group session used to exercise the full-class waitlist flow.
-- Canonical seed reservations fill its eight seats after migrations complete.

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
select
  'SESSION-DEMO-FULL-0829-1400',
  'hiit'::public.class_type,
  '2026-08-29 14:00:00-04'::timestamptz,
  '2026-08-29 14:45:00-04'::timestamptz,
  8,
  false,
  'STF-0003'
where exists (
  select 1
  from public.staff_accounts
  where staff_id = 'STF-0003'
)
on conflict (class_session_id) do nothing;

commit;
