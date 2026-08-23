-- Product A authoritative member booking command.
-- Contract: docs/06-shared-api-contracts-v1.md

begin;

create or replace function public.book_class_session(
  p_class_session_id text
)
returns table (
  reservation_id text,
  class_session_id text,
  reservation_status text,
  reserved_at timestamptz,
  available_spots_after_booking integer
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_member_id text := public.current_member_id();
  v_session public.class_sessions%rowtype;
  v_membership_id text;
  v_classes_remaining integer;
  v_confirmed_count integer;
  v_status public.reservation_status;
  v_reservation_id text;
begin
  if v_member_id is null then
    raise exception 'active member account required';
  end if;

  select session.*
  into v_session
  from public.class_sessions as session
  where session.class_session_id = p_class_session_id
  for update;

  if not found or v_session.is_cancelled then
    raise exception 'class session is unavailable';
  end if;

  if v_now >= v_session.starts_at then
    raise exception 'class session has already started';
  end if;

  if exists (
    select 1
    from public.reservations as reservation
    where reservation.member_id = v_member_id
      and reservation.class_session_id = p_class_session_id
      and reservation.status in ('confirmed', 'waitlisted')
  ) then
    raise exception 'member already has an open reservation for this class session';
  end if;

  select dashboard.membership_id, dashboard.classes_remaining
  into v_membership_id, v_classes_remaining
  from public.member_dashboard(v_now) as dashboard
  where dashboard.membership_status = 'active'
  limit 1;

  if v_membership_id is null then
    raise exception 'active membership required';
  end if;

  if not exists (
    select 1
    from public.membership_status_history as history
    where history.membership_id = v_membership_id
      and history.status = 'active'
      and v_session.starts_at >= history.effective_at
      and v_session.starts_at < coalesce(history.ended_at, 'infinity'::timestamptz)
  ) then
    raise exception 'membership must be active at class time';
  end if;

  select count(*)::integer
  into v_confirmed_count
  from public.reservations as reservation
  where reservation.class_session_id = p_class_session_id
    and reservation.status = 'confirmed';

  if v_confirmed_count < v_session.capacity then
    if v_classes_remaining <= 0 then
      raise exception 'no membership credits remaining';
    end if;
    v_status := 'confirmed';
  else
    v_status := 'waitlisted';
  end if;

  v_reservation_id := 'RES-' || upper(replace(gen_random_uuid()::text, '-', ''));

  insert into public.reservations (
    reservation_id,
    member_id,
    class_session_id,
    membership_id,
    status,
    reserved_at
  ) values (
    v_reservation_id,
    v_member_id,
    p_class_session_id,
    v_membership_id,
    v_status,
    v_now
  );

  return query
  select
    v_reservation_id,
    p_class_session_id,
    v_status::text,
    v_now,
    greatest(v_session.capacity - v_confirmed_count - case when v_status = 'confirmed' then 1 else 0 end, 0);
end;
$$;

comment on function public.book_class_session(text) is
  'Books the authenticated member into a class, deriving confirmed versus waitlisted status under a session lock.';

create or replace function public.membership_classes_remaining(
  p_membership_id text,
  p_as_of timestamptz
)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with membership_context as (
    select membership.membership_id, plan.classes_per_month
    from public.memberships as membership
    join public.membership_plans as plan on plan.plan_id = membership.plan_id
    where membership.membership_id = p_membership_id
  ), cycle as (
    select
      context.membership_id,
      context.classes_per_month,
      candidate.cycle_start_at,
      public.membership_cycle_boundary(context.membership_id, candidate.cycle_index + 1, p_as_of) as cycle_end_at
    from membership_context as context
    join lateral (
      select
        cycle_index,
        public.membership_cycle_boundary(context.membership_id, cycle_index, p_as_of) as cycle_start_at
      from generate_series(0, 600) as cycle_index
      where public.membership_cycle_boundary(context.membership_id, cycle_index, p_as_of) <= p_as_of
        and public.membership_cycle_boundary(context.membership_id, cycle_index + 1, p_as_of) > p_as_of
      order by cycle_index desc
      limit 1
    ) as candidate on true
  ), usage as (
    select count(*)::integer as credits_committed
    from cycle
    join public.reservations as reservation
      on reservation.membership_id = cycle.membership_id
    join public.class_sessions as session
      on session.class_session_id = reservation.class_session_id
      and session.starts_at >= cycle.cycle_start_at
      and session.starts_at < cycle.cycle_end_at
      and not session.is_cancelled
    left join public.attendance_records as attendance
      on attendance.reservation_id = reservation.reservation_id
    where attendance.attendance_record_id is not null
      or reservation.status = 'confirmed'
      or (reservation.status = 'cancelled' and reservation.is_late_cancellation)
  )
  select greatest(cycle.classes_per_month - usage.credits_committed, 0)::integer
  from cycle cross join usage
$$;

create or replace function public.cancel_member_reservation(
  p_reservation_id text
)
returns table (
  reservation_id text,
  reservation_status text,
  cancelled_at timestamptz,
  is_late_cancellation boolean,
  promoted_reservation_id text
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_member_id text := public.current_member_id();
  v_reservation public.reservations%rowtype;
  v_session public.class_sessions%rowtype;
  v_was_confirmed boolean;
  v_is_late boolean;
  v_promoted_reservation_id text;
  v_notification_id text;
  v_waitlisted public.reservations%rowtype;
begin
  if v_member_id is null then
    raise exception 'active member account required';
  end if;

  select reservation.*
  into v_reservation
  from public.reservations as reservation
  where reservation.reservation_id = p_reservation_id
    and reservation.member_id = v_member_id
  for update;

  if not found then
    raise exception 'reservation not found';
  end if;

  if v_reservation.status not in ('confirmed', 'waitlisted') then
    raise exception 'only an open reservation can be cancelled';
  end if;

  select session.*
  into v_session
  from public.class_sessions as session
  where session.class_session_id = v_reservation.class_session_id
  for update;

  if v_now >= v_session.starts_at then
    raise exception 'reservation cannot be cancelled after class starts';
  end if;

  v_was_confirmed := v_reservation.status = 'confirmed';
  v_is_late := v_was_confirmed and v_now > v_session.starts_at - interval '12 hours';

  update public.reservations
  set
    status = 'cancelled',
    cancelled_at = v_now,
    is_late_cancellation = v_is_late
  where public.reservations.reservation_id = p_reservation_id;

  v_notification_id := 'NTF-' || upper(replace(gen_random_uuid()::text, '-', ''));
  insert into public.notifications (
    notification_id,
    member_id,
    event_type,
    channel,
    status,
    created_at,
    related_record_type,
    related_record_id
  )
  select
    v_notification_id,
    member.member_id,
    'member_cancelled',
    member.preferred_channel,
    'simulated',
    v_now,
    'reservation',
    p_reservation_id
  from public.members as member
  where member.member_id = v_member_id;

  if v_was_confirmed then
    select waitlisted.*
    into v_waitlisted
    from public.reservations as waitlisted
    where waitlisted.class_session_id = v_session.class_session_id
      and waitlisted.status = 'waitlisted'
      and (
        exists (
          select 1
          from public.drop_in_payments as payment
          where payment.reservation_id = waitlisted.reservation_id
            and payment.status = 'authorized'
        )
        or exists (
          select 1
          from public.membership_status_history as current_history
          join public.membership_status_history as class_history
            on class_history.membership_id = current_history.membership_id
          where current_history.membership_id = waitlisted.membership_id
            and current_history.status = 'active'
            and v_now >= current_history.effective_at
            and v_now < coalesce(current_history.ended_at, 'infinity'::timestamptz)
            and class_history.status = 'active'
            and v_session.starts_at >= class_history.effective_at
            and v_session.starts_at < coalesce(class_history.ended_at, 'infinity'::timestamptz)
            and public.membership_classes_remaining(waitlisted.membership_id, v_now) > 0
        )
      )
    order by waitlisted.reserved_at, waitlisted.reservation_id
    limit 1
    for update skip locked;

    if found then
      update public.reservations
      set status = 'confirmed'
      where public.reservations.reservation_id = v_waitlisted.reservation_id;

      v_promoted_reservation_id := v_waitlisted.reservation_id;
      v_notification_id := 'NTF-' || upper(replace(gen_random_uuid()::text, '-', ''));

      insert into public.notifications (
        notification_id,
        member_id,
        event_type,
        channel,
        status,
        created_at,
        related_record_type,
        related_record_id
      )
      select
        v_notification_id,
        member.member_id,
        'waitlist_promoted',
        member.preferred_channel,
        'simulated',
        v_now,
        'reservation',
        v_waitlisted.reservation_id
      from public.members as member
      where member.member_id = v_waitlisted.member_id;

      insert into public.waitlist_promotions (
        promotion_id,
        reservation_id,
        class_session_id,
        promoted_at,
        notification_id
      ) values (
        'PROMO-' || upper(replace(gen_random_uuid()::text, '-', '')),
        v_waitlisted.reservation_id,
        v_session.class_session_id,
        v_now,
        v_notification_id
      );
    end if;
  end if;

  return query
  select
    p_reservation_id,
    'cancelled'::text,
    v_now,
    v_is_late,
    v_promoted_reservation_id;
end;
$$;

comment on function public.cancel_member_reservation(text) is
  'Cancels the authenticated member reservation, derives the 12-hour policy result, and promotes the earliest eligible waitlist entry.';

revoke all on function public.book_class_session(text) from public;
revoke all on function public.membership_classes_remaining(text, timestamptz) from public;
revoke all on function public.cancel_member_reservation(text) from public;
grant execute on function public.book_class_session(text) to authenticated;
grant execute on function public.cancel_member_reservation(text) to authenticated;

commit;
