begin;

-- Aggregate-only baseline for owner reporting. This deliberately contains no
-- member, reservation, or attendance-record rows.
create table if not exists public.staff_business_class_history (
  month_start date not null,
  class_type public.class_type not null,
  instructor_name text not null,
  classes_taught integer not null check (classes_taught > 0),
  booked integer not null check (booked >= 0),
  capacity integer not null check (capacity > 0 and booked <= capacity),
  waitlisted integer not null default 0 check (waitlisted >= 0),
  cancelled integer not null default 0 check (cancelled >= 0),
  attended integer not null check (attended >= 0 and attended <= booked),
  source text not null default 'aggregate_baseline' check (source = 'aggregate_baseline'),
  primary key (month_start, class_type, instructor_name)
);

alter table public.staff_business_class_history enable row level security;
revoke all on public.staff_business_class_history from public, anon;
grant select on public.staff_business_class_history to authenticated;

drop policy if exists staff_business_class_history_owner_read on public.staff_business_class_history;
create policy staff_business_class_history_owner_read
  on public.staff_business_class_history
  for select
  to authenticated
  using (public.is_owner_admin());

insert into public.staff_business_class_history
  (month_start, class_type, instructor_name, classes_taught, booked, capacity, waitlisted, cancelled, attended)
values
  ('2026-03-01', 'yoga',    'Aisha Patel',  12, 72, 120, 3, 3, 67),
  ('2026-03-01', 'cycling', 'Mina Chen',    10, 68, 110, 1, 4, 63),
  ('2026-03-01', 'hiit',    'Daniel Brooks', 9, 65,  96, 0, 7, 59),
  ('2026-04-01', 'yoga',    'Aisha Patel',  12, 76, 120, 3, 4, 70),
  ('2026-04-01', 'cycling', 'Mina Chen',    10, 72, 110, 2, 4, 67),
  ('2026-04-01', 'hiit',    'Daniel Brooks', 9, 64,  96, 1, 7, 59),
  ('2026-05-01', 'yoga',    'Aisha Patel',  12, 80, 120, 4, 3, 75),
  ('2026-05-01', 'cycling', 'Mina Chen',    10, 76, 110, 3, 3, 71),
  ('2026-05-01', 'hiit',    'Daniel Brooks', 9, 67,  96, 1, 5, 62),
  ('2026-06-01', 'yoga',    'Aisha Patel',  12, 78, 120, 2, 4, 72),
  ('2026-06-01', 'cycling', 'Mina Chen',    10, 80, 110, 4, 3, 75),
  ('2026-06-01', 'hiit',    'Daniel Brooks', 9, 70,  96, 2, 5, 65),
  ('2026-07-01', 'yoga',    'Aisha Patel',  12, 84, 120, 4, 3, 78),
  ('2026-07-01', 'cycling', 'Mina Chen',    10, 85, 110, 5, 2, 80),
  ('2026-07-01', 'hiit',    'Daniel Brooks', 9, 69,  96, 1, 6, 64)
on conflict (month_start, class_type, instructor_name) do nothing;

commit;
