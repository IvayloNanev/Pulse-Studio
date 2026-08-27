-- Six months of weekly business history for the Pulse Studio demo.
-- This table is intentionally aggregate-only: it does not fabricate activity
-- against individual member accounts and is not exposed through the Data API.

begin;

create table if not exists public.staff_business_history (
  week_start date primary key,
  seats_offered integer not null check (seats_offered >= 0),
  seats_booked integer not null check (seats_booked >= 0 and seats_booked <= seats_offered),
  attended integer not null check (attended >= 0 and attended <= seats_booked),
  no_show integer not null check (no_show >= 0 and no_show <= seats_booked - attended),
  source text not null default 'synthetic_demo' check (source = 'synthetic_demo'),
  created_at timestamptz not null default now()
);

alter table public.staff_business_history enable row level security;
revoke all on table public.staff_business_history from public, anon, authenticated;

insert into public.staff_business_history (week_start, seats_offered, seats_booked, attended, no_show)
select
  (date '2026-02-23' + (week_number * interval '7 days'))::date,
  252 + ((week_number % 4) * 8),
  126 + (week_number * 3) + ((week_number % 3) * 4),
  114 + (week_number * 3) + ((week_number % 3) * 3),
  7 + (week_number % 4)
from generate_series(0, 25) as weeks(week_number)
on conflict (week_start) do nothing;

create or replace function public.staff_business_health(p_as_of timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_today date := (p_as_of at time zone 'America/New_York')::date;
  v_current_week date := date_trunc('week', (p_as_of at time zone 'America/New_York'))::date;
  v_history jsonb;
  v_outlook jsonb;
  v_class_performance jsonb;
  v_memberships jsonb;
begin
  if not public.is_owner_admin() then
    raise exception 'owner/admin authorization required';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'week_start', week_start::text,
    'booked', seats_booked,
    'capacity', seats_offered,
    'attended', attended,
    'no_show', no_show
  ) order by week_start), '[]'::jsonb)
  into v_history
  from public.staff_business_history
  where week_start < v_current_week
    and week_start >= v_current_week - interval '26 weeks';

  select coalesce(jsonb_agg(jsonb_build_object(
    'week_start', week_start::text,
    'booked', booked,
    'capacity', capacity
  ) order by week_start), '[]'::jsonb)
  into v_outlook
  from (
    select weeks.week_start::date as week_start,
      count(reservation.reservation_id) filter (where reservation.status = 'confirmed')::integer as booked,
      coalesce(sum(session.capacity) filter (where reservation.reservation_id is null), 0)::integer
        + coalesce(sum(session.capacity) filter (where reservation.reservation_id is not null) / nullif(count(reservation.reservation_id), 0), 0)::integer as capacity
    from generate_series(v_current_week, v_current_week + interval '3 weeks', interval '1 week') as weeks(week_start)
    left join public.class_sessions as session on session.starts_at >= weeks.week_start and session.starts_at < weeks.week_start + interval '1 week' and not session.is_cancelled
    left join public.reservations as reservation on reservation.class_session_id = session.class_session_id
    group by weeks.week_start
  ) as outlook;

  select coalesce(jsonb_agg(jsonb_build_object('class_type', class_type, 'booked', booked, 'capacity', capacity, 'waitlisted', waitlisted) order by class_type), '[]'::jsonb)
  into v_class_performance
  from (
    select session.class_type::text as class_type,
      count(reservation.reservation_id) filter (where reservation.status = 'confirmed')::integer as booked,
      sum(session.capacity)::integer / greatest(count(reservation.reservation_id), 1)::integer as capacity,
      count(reservation.reservation_id) filter (where reservation.status = 'waitlisted')::integer as waitlisted
    from public.class_sessions as session
    left join public.reservations as reservation on reservation.class_session_id = session.class_session_id
    where session.starts_at >= v_current_week - interval '8 weeks' and session.starts_at < v_current_week and not session.is_cancelled
    group by session.class_type
  ) as class_rows;

  select jsonb_build_object(
    'active', count(*) filter (where public.membership_status_at(membership.membership_id, p_as_of) = 'active'),
    'paused', count(*) filter (where public.membership_status_at(membership.membership_id, p_as_of) = 'paused')
  ) into v_memberships
  from public.memberships as membership
  where membership.start_date <= v_today;

  return jsonb_build_object(
    'weekly_history', v_history,
    'scheduled_outlook', v_outlook,
    'class_performance', v_class_performance,
    'memberships', coalesce(v_memberships, '{}'::jsonb),
    'history_source', 'Synthetic demonstration data'
  );
end;
$$;

revoke all on function public.staff_business_health(timestamptz) from public, anon, authenticated;
grant execute on function public.staff_business_health(timestamptz) to authenticated;

commit;
