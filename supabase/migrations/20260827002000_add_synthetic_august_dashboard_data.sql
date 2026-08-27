begin;

-- Synthetic, aggregate-only August figures for the staff dashboard presentation.
-- These rows never create or alter a member, reservation, attendance record, or live class.
insert into public.staff_business_class_history
  (month_start, class_type, instructor_name, classes_taught, booked, capacity, waitlisted, cancelled, attended)
values
  ('2026-08-01', 'yoga',    'Aisha Patel',   12, 90, 120, 6, 3, 84),
  ('2026-08-01', 'cycling', 'Mina Chen',     10, 91, 110, 7, 2, 86),
  ('2026-08-01', 'hiit',    'Daniel Brooks',  9, 74,  96, 2, 5, 69)
on conflict (month_start, class_type, instructor_name) do update set
  classes_taught = excluded.classes_taught,
  booked = excluded.booked,
  capacity = excluded.capacity,
  waitlisted = excluded.waitlisted,
  cancelled = excluded.cancelled,
  attended = excluded.attended;

commit;
