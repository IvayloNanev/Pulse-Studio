-- Owner-level business-health aggregates for the staff overview.

begin;

create or replace function public.staff_business_health(p_as_of timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_start_today timestamptz := date_trunc('day', p_as_of at time zone 'America/New_York') at time zone 'America/New_York';
  v_memberships jsonb;
  v_bookings jsonb;
  v_attendance jsonb;
  v_class_performance jsonb;
begin
  if not public.is_owner_admin() then
    raise exception 'owner/admin authorization required';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('date', day_key, 'booked', booked, 'capacity', capacity) order by day_key), '[]'::jsonb)
  into v_bookings
  from (
    select (day at time zone 'America/New_York')::date::text as day_key,
      coalesce(sum(session.confirmed_reservations), 0)::integer as booked,
      coalesce(sum(session.capacity), 0)::integer as capacity
    from generate_series(v_start_today, v_start_today + interval '29 days', interval '1 day') as day
    left join public.staff_product_b_sessions as session
      on session.starts_at >= day and session.starts_at < day + interval '1 day'
      and not session.is_cancelled
    group by day
  ) as booking_days;

  select coalesce(jsonb_agg(jsonb_build_object('date', day_key, 'attended', attended, 'no_show', no_show) order by day_key), '[]'::jsonb)
  into v_attendance
  from (
    select (day at time zone 'America/New_York')::date::text as day_key,
      count(attendance.attendance_record_id) filter (where attendance.attendance_status = 'attended')::integer as attended,
      count(attendance.attendance_record_id) filter (where attendance.attendance_status = 'no_show')::integer as no_show
    from generate_series(v_start_today - interval '29 days', v_start_today, interval '1 day') as day
    left join public.class_sessions as session on session.starts_at >= day and session.starts_at < day + interval '1 day'
    left join public.reservations as reservation on reservation.class_session_id = session.class_session_id
    left join public.attendance_records as attendance on attendance.reservation_id = reservation.reservation_id
    group by day
  ) as attendance_days;

  select coalesce(jsonb_agg(jsonb_build_object('class_type', class_type, 'booked', booked, 'capacity', capacity, 'waitlisted', waitlisted) order by class_type), '[]'::jsonb)
  into v_class_performance
  from (
    select session.class_type::text as class_type,
      sum(session.confirmed_reservations)::integer as booked,
      sum(session.capacity)::integer as capacity,
      sum(session.waitlisted_reservations)::integer as waitlisted
    from public.staff_product_b_sessions as session
    where session.starts_at >= v_start_today and session.starts_at < v_start_today + interval '30 days'
      and not session.is_cancelled
    group by session.class_type
  ) as class_rows;

  select jsonb_build_object(
    'active', count(*) filter (where public.membership_status_at(membership.membership_id, p_as_of) = 'active'),
    'paused', count(*) filter (where public.membership_status_at(membership.membership_id, p_as_of) = 'paused'),
    'cancelled', count(*) filter (where public.membership_status_at(membership.membership_id, p_as_of) = 'cancelled')
  ) into v_memberships
  from public.memberships as membership
  where membership.start_date <= (p_as_of at time zone 'America/New_York')::date;

  return jsonb_build_object('bookings_by_day', v_bookings, 'attendance_by_day', v_attendance, 'class_performance', v_class_performance, 'memberships', coalesce(v_memberships, '{}'::jsonb));
end;
$$;

revoke all on function public.staff_business_health(timestamptz) from public, anon, authenticated;
grant execute on function public.staff_business_health(timestamptz) to authenticated;

commit;
