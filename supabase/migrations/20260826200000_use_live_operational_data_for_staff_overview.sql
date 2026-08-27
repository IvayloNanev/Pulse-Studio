-- Replace demonstration aggregates with owner-authorized live operating data.

begin;

create or replace function public.staff_business_health(p_as_of timestamptz default now())
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_today date := (p_as_of at time zone 'America/New_York')::date;
  v_start_month date := (date_trunc('month', (p_as_of at time zone 'America/New_York'))::date - interval '5 months')::date;
  v_history jsonb;
  v_outlook jsonb;
  v_class_performance jsonb;
  v_monthly_class_performance jsonb;
  v_monthly_teacher_performance jsonb;
  v_memberships jsonb;
begin
  if not public.is_owner_admin() then
    raise exception 'owner/admin authorization required';
  end if;

  with session_rollup as (
    select
      date_trunc('week', session.starts_at at time zone 'America/New_York')::date as week_start,
      session.capacity,
      count(reservation.reservation_id) filter (where reservation.status = 'confirmed')::integer as booked,
      count(attendance.attendance_record_id) filter (where attendance.attendance_status = 'attended')::integer as attended,
      count(attendance.attendance_record_id) filter (where attendance.attendance_status = 'no_show')::integer as no_show
    from public.class_sessions as session
    left join public.reservations as reservation on reservation.class_session_id = session.class_session_id
    left join public.attendance_records as attendance on attendance.reservation_id = reservation.reservation_id
    where not session.is_cancelled and session.starts_at >= v_start_month and session.starts_at < p_as_of
    group by session.class_session_id, session.starts_at, session.capacity
  )
  select coalesce(jsonb_agg(jsonb_build_object('week_start', week_start::text, 'booked', booked, 'capacity', capacity, 'attended', attended, 'no_show', no_show) order by week_start), '[]'::jsonb)
  into v_history
  from (
    select week_start, sum(booked)::integer as booked, sum(capacity)::integer as capacity, sum(attended)::integer as attended, sum(no_show)::integer as no_show
    from session_rollup
    group by week_start
  ) as weekly;

  with session_rollup as (
    select
      date_trunc('month', session.starts_at at time zone 'America/New_York')::date as month_start,
      session.class_type::text as class_type,
      session.instructor_staff_id,
      session.capacity,
      count(reservation.reservation_id) filter (where reservation.status = 'confirmed')::integer as booked,
      count(reservation.reservation_id) filter (where reservation.status = 'waitlisted')::integer as waitlisted,
      count(reservation.reservation_id) filter (where reservation.status in ('cancelled', 'studio_cancelled'))::integer as cancelled,
      count(attendance.attendance_record_id) filter (where attendance.attendance_status = 'attended')::integer as attended
    from public.class_sessions as session
    left join public.reservations as reservation on reservation.class_session_id = session.class_session_id
    left join public.attendance_records as attendance on attendance.reservation_id = reservation.reservation_id
    where not session.is_cancelled and session.starts_at >= v_start_month and session.starts_at < p_as_of
    group by session.class_session_id, session.starts_at, session.class_type, session.instructor_staff_id, session.capacity
  ),
  class_month as (
    select month_start, class_type, sum(booked)::integer as booked, sum(capacity)::integer as capacity, sum(waitlisted)::integer as waitlisted, sum(cancelled)::integer as cancelled
    from session_rollup
    group by month_start, class_type
  ),
  monthly_classes as (
    select month_start, jsonb_agg(jsonb_build_object('class_type', class_type, 'booked', booked, 'capacity', capacity, 'waitlisted', waitlisted, 'cancelled', cancelled) order by class_type) as classes
    from class_month
    group by month_start
  )
  select coalesce(jsonb_agg(jsonb_build_object('month', to_char(month_start, 'YYYY-MM'), 'label', to_char(month_start, 'Mon YYYY'), 'classes', classes) order by month_start), '[]'::jsonb)
  into v_monthly_class_performance
  from monthly_classes;

  with session_rollup as (
    select
      date_trunc('month', session.starts_at at time zone 'America/New_York')::date as month_start,
      session.instructor_staff_id,
      session.capacity,
      count(reservation.reservation_id) filter (where reservation.status = 'confirmed')::integer as booked,
      count(attendance.attendance_record_id) filter (where attendance.attendance_status = 'attended')::integer as attended
    from public.class_sessions as session
    left join public.reservations as reservation on reservation.class_session_id = session.class_session_id
    left join public.attendance_records as attendance on attendance.reservation_id = reservation.reservation_id
    where not session.is_cancelled and session.starts_at >= v_start_month and session.starts_at < p_as_of
    group by session.class_session_id, session.starts_at, session.instructor_staff_id, session.capacity
  ),
  teacher_month as (
    select
      session_rollup.month_start,
      staff.first_name || ' ' || staff.last_name as name,
      count(*)::integer as classes_taught,
      sum(session_rollup.booked)::integer as bookings,
      sum(session_rollup.capacity)::integer as capacity,
      case when sum(session_rollup.booked) > 0 then round(sum(session_rollup.attended)::numeric / sum(session_rollup.booked) * 100)::integer else 0 end as attendance_rate
    from session_rollup
    join public.staff_accounts as staff on staff.staff_id = session_rollup.instructor_staff_id
    group by session_rollup.month_start, staff.staff_id, staff.first_name, staff.last_name
  ),
  monthly_teachers as (
    select month_start, jsonb_agg(jsonb_build_object('name', name, 'classes_taught', classes_taught, 'bookings', bookings, 'capacity', capacity, 'attendance_rate', attendance_rate) order by name) as teachers
    from teacher_month
    group by month_start
  )
  select coalesce(jsonb_agg(jsonb_build_object('month', to_char(month_start, 'YYYY-MM'), 'teachers', teachers) order by month_start), '[]'::jsonb)
  into v_monthly_teacher_performance
  from monthly_teachers;

  select coalesce(monthly.classes, '[]'::jsonb)
  into v_class_performance
  from (
    select
      date_trunc('month', session.starts_at at time zone 'America/New_York')::date as month_start,
      jsonb_agg(jsonb_build_object('class_type', session.class_type::text, 'booked', booked, 'capacity', capacity, 'waitlisted', waitlisted, 'cancelled', cancelled) order by session.class_type::text) as classes
    from (
      select
        session.class_session_id, session.starts_at, session.class_type, session.capacity,
        count(reservation.reservation_id) filter (where reservation.status = 'confirmed')::integer as booked,
        count(reservation.reservation_id) filter (where reservation.status = 'waitlisted')::integer as waitlisted,
        count(reservation.reservation_id) filter (where reservation.status in ('cancelled', 'studio_cancelled'))::integer as cancelled
      from public.class_sessions as session
      left join public.reservations as reservation on reservation.class_session_id = session.class_session_id
      where not session.is_cancelled
        and session.starts_at >= date_trunc('month', p_as_of at time zone 'America/New_York')
        and session.starts_at < p_as_of
      group by session.class_session_id, session.starts_at, session.class_type, session.capacity
    ) as session
    group by month_start
  ) as monthly
  where monthly.month_start = date_trunc('month', p_as_of at time zone 'America/New_York')::date;

  with session_rollup as (
    select
      date_trunc('week', session.starts_at at time zone 'America/New_York')::date as week_start,
      session.capacity,
      count(reservation.reservation_id) filter (where reservation.status = 'confirmed')::integer as booked
    from public.class_sessions as session
    left join public.reservations as reservation on reservation.class_session_id = session.class_session_id
    where not session.is_cancelled
      and session.starts_at >= date_trunc('week', p_as_of at time zone 'America/New_York')
      and session.starts_at < date_trunc('week', p_as_of at time zone 'America/New_York') + interval '4 weeks'
    group by session.class_session_id, session.starts_at, session.capacity
  )
  select coalesce(jsonb_agg(jsonb_build_object('week_start', week_start::text, 'booked', booked, 'capacity', capacity) order by week_start), '[]'::jsonb)
  into v_outlook
  from (
    select week_start, sum(booked)::integer as booked, sum(capacity)::integer as capacity
    from session_rollup
    group by week_start
  ) as weekly;

  select jsonb_build_object(
    'active', count(*) filter (where public.membership_status_at(membership.membership_id, p_as_of) = 'active'),
    'paused', count(*) filter (where public.membership_status_at(membership.membership_id, p_as_of) = 'paused')
  )
  into v_memberships
  from public.memberships as membership
  where membership.start_date <= v_today;

  return jsonb_build_object(
    'weekly_history', v_history,
    'scheduled_outlook', v_outlook,
    'class_performance', coalesce(v_class_performance, '[]'::jsonb),
    'monthly_class_performance', v_monthly_class_performance,
    'monthly_teacher_performance', v_monthly_teacher_performance,
    'memberships', coalesce(v_memberships, '{}'::jsonb),
    'history_source', 'Live operational data from Supabase'
  );
end;
$$;

revoke all on function public.staff_business_health(timestamptz) from public, anon, authenticated;
grant execute on function public.staff_business_health(timestamptz) to authenticated;

commit;
