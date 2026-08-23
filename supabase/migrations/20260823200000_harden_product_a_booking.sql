-- Close Product A direct-write bypasses and complete the simulated drop-in path.
-- Contract: docs/06-shared-api-contracts-v1.md

begin;

alter table public.reservations
  add column uses_drop_in boolean not null default false;

comment on column public.reservations.uses_drop_in is
  'Member chose the simulated $35 drop-in path. Waitlisted choices are charged only if promoted.';

-- Members must use the authoritative commands below. Read access remains unchanged.
drop policy if exists reservations_self_create on public.reservations;
drop policy if exists reservations_self_cancel on public.reservations;
drop policy if exists drop_in_payments_self_create on public.drop_in_payments;

drop function if exists public.book_class_session(text);

create function public.book_class_session(
  p_class_session_id text,
  p_use_drop_in boolean default false
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
  v_notification_id text;
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

  select membership.membership_id
  into v_membership_id
  from public.memberships as membership
  where membership.member_id = v_member_id
    and exists (
      select 1
      from public.membership_status_history as current_history
      where current_history.membership_id = membership.membership_id
        and current_history.status = 'active'
        and v_now >= current_history.effective_at
        and v_now < coalesce(current_history.ended_at, 'infinity'::timestamptz)
    )
    and exists (
      select 1
      from public.membership_status_history as class_history
      where class_history.membership_id = membership.membership_id
        and class_history.status = 'active'
        and v_session.starts_at >= class_history.effective_at
        and v_session.starts_at < coalesce(class_history.ended_at, 'infinity'::timestamptz)
    )
  order by membership.start_date desc, membership.membership_id
  limit 1;

  if v_membership_id is null then
    raise exception 'membership must be active now and at class time';
  end if;

  v_classes_remaining := public.membership_classes_remaining(
    v_membership_id,
    v_session.starts_at
  );

  select count(*)::integer
  into v_confirmed_count
  from public.reservations as reservation
  where reservation.class_session_id = p_class_session_id
    and reservation.status = 'confirmed';

  if v_confirmed_count < v_session.capacity then
    if not p_use_drop_in and coalesce(v_classes_remaining, 0) <= 0 then
      raise exception 'no membership credits remaining; choose the simulated $35 drop-in option';
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
    reserved_at,
    uses_drop_in
  ) values (
    v_reservation_id,
    v_member_id,
    p_class_session_id,
    case when p_use_drop_in then null else v_membership_id end,
    v_status,
    v_now,
    p_use_drop_in
  );

  -- A waitlist choice is not charged until it becomes a confirmed reservation.
  if p_use_drop_in and v_status = 'confirmed' then
    insert into public.drop_in_payments (
      payment_id,
      reservation_id,
      member_id,
      amount,
      status,
      created_at
    ) values (
      'PAY-' || upper(replace(gen_random_uuid()::text, '-', '')),
      v_reservation_id,
      v_member_id,
      35.00,
      'authorized',
      v_now
    );
  end if;

  if v_status = 'confirmed' then
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
      'booking_confirmed',
      member.preferred_channel,
      'simulated',
      v_now,
      'reservation',
      v_reservation_id
    from public.members as member
    where member.member_id = v_member_id;
  end if;

  return query
  select
    v_reservation_id,
    p_class_session_id,
    v_status::text,
    v_now,
    greatest(
      v_session.capacity - v_confirmed_count - case when v_status = 'confirmed' then 1 else 0 end,
      0
    );
end;
$$;

comment on function public.book_class_session(text, boolean) is
  'Books with a class-cycle membership credit or simulated $35 drop-in, deriving confirmed versus waitlisted under a session lock.';

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

  if v_reservation.uses_drop_in and v_was_confirmed and not v_is_late then
    update public.drop_in_payments
    set status = 'refunded', refunded_at = v_now
    where drop_in_payments.reservation_id = p_reservation_id
      and drop_in_payments.status = 'authorized';
  end if;

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
        waitlisted.uses_drop_in
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
            and public.membership_classes_remaining(
              waitlisted.membership_id,
              v_session.starts_at
            ) > 0
        )
      )
    order by waitlisted.reserved_at, waitlisted.reservation_id
    limit 1
    for update skip locked;

    if found then
      update public.reservations
      set status = 'confirmed'
      where public.reservations.reservation_id = v_waitlisted.reservation_id;

      if v_waitlisted.uses_drop_in then
        insert into public.drop_in_payments (
          payment_id,
          reservation_id,
          member_id,
          amount,
          status,
          created_at
        ) values (
          'PAY-' || upper(replace(gen_random_uuid()::text, '-', '')),
          v_waitlisted.reservation_id,
          v_waitlisted.member_id,
          35.00,
          'authorized',
          v_now
        );
      end if;

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
  'Cancels an owned reservation, applies the 12-hour credit/refund rule, and promotes the earliest eligible waitlist entry.';

revoke all on function public.book_class_session(text, boolean) from public;
revoke all on function public.cancel_member_reservation(text) from public;
grant execute on function public.book_class_session(text, boolean) to authenticated;
grant execute on function public.cancel_member_reservation(text) to authenticated;

commit;
