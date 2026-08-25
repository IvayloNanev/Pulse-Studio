-- Extend the live operational calendar through September 2026 so month
-- navigation always opens a populated, bookable schedule.

begin;

with calendar_days as (
  select day::date as session_date
  from generate_series(date '2026-09-01', date '2026-09-30', interval '1 day') as day
), session_templates as (
  select
    session_date,
    'AM'::text as slot,
    case extract(dow from session_date)::integer % 3
      when 0 then 'yoga'::public.class_type
      when 1 then 'cycling'::public.class_type
      else 'hiit'::public.class_type
    end as class_type,
    case extract(dow from session_date)::integer % 3
      when 0 then 'STF-0002'
      when 1 then 'STF-0004'
      else 'STF-0003'
    end as instructor_staff_id,
    case when extract(isodow from session_date) in (6, 7) then 9 else 7 end as start_hour
  from calendar_days

  union all

  select
    session_date,
    'PM'::text,
    case extract(dow from session_date)::integer % 3
      when 0 then 'cycling'::public.class_type
      when 1 then 'hiit'::public.class_type
      else 'yoga'::public.class_type
    end,
    case extract(dow from session_date)::integer % 3
      when 0 then 'STF-0004'
      when 1 then 'STF-0003'
      else 'STF-0002'
    end,
    18
  from calendar_days
), prepared_sessions as (
  select
    'SESSION-SEPTEMBER-' || to_char(session_date, 'YYYYMMDD') || '-' || slot as class_session_id,
    class_type,
    make_timestamptz(
      extract(year from session_date)::integer,
      extract(month from session_date)::integer,
      extract(day from session_date)::integer,
      start_hour,
      0,
      0,
      'America/New_York'
    ) as starts_at,
    case class_type
      when 'yoga' then interval '50 minutes'
      else interval '45 minutes'
    end as duration,
    case class_type
      when 'yoga' then 20
      when 'cycling' then 18
      else 16
    end as capacity,
    instructor_staff_id
  from session_templates
)
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
  session.class_session_id,
  session.class_type,
  session.starts_at,
  session.starts_at + session.duration,
  session.capacity,
  false,
  session.instructor_staff_id
from prepared_sessions as session
where exists (
  select 1
  from public.staff_accounts as staff
  where staff.staff_id = session.instructor_staff_id
)
on conflict (class_session_id) do nothing;

commit;
