-- Product B Stage 3: prevent studio cancellation from contradicting recorded attendance.

begin;

create or replace function public.cancel_class_session(
  p_class_session_id text,
  p_reason text
)
returns table (
  class_session_id text,
  cancelled_at timestamptz,
  cancelled_reservations integer,
  refunded_drop_ins integer,
  notifications_created integer,
  action_id text
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_staff_id text := public.current_staff_id();
  v_session public.class_sessions%rowtype;
  v_cancelled_count integer := 0;
  v_refunded_count integer := 0;
  v_notification_count integer := 0;
  v_action_id text;
begin
  if not public.is_owner_admin() or v_staff_id is null then
    raise exception 'owner/admin authorization required';
  end if;

  if nullif(btrim(p_reason), '') is null then
    raise exception 'studio cancellation reason is required';
  end if;

  select session.* into v_session
  from public.class_sessions as session
  where session.class_session_id = p_class_session_id
  for update;

  if not found then raise exception 'class session not found'; end if;
  if v_session.is_cancelled then raise exception 'class session is already cancelled'; end if;
  if v_now >= v_session.starts_at then raise exception 'a started or completed class session cannot be cancelled'; end if;
  if exists (
    select 1
    from public.attendance_records as attendance
    join public.reservations as reservation on reservation.reservation_id = attendance.reservation_id
    where reservation.class_session_id = p_class_session_id
  ) then
    raise exception 'session cancellation conflicts with recorded attendance';
  end if;

  update public.class_sessions set is_cancelled = true
  where public.class_sessions.class_session_id = p_class_session_id;

  with affected as (
    update public.reservations set status = 'studio_cancelled'
    where reservations.class_session_id = p_class_session_id
      and reservations.status in ('confirmed', 'waitlisted')
    returning reservations.reservation_id
  )
  select count(*)::integer into v_cancelled_count from affected;

  with refunded as (
    update public.drop_in_payments as payment
    set status = 'refunded', refunded_at = v_now
    from public.reservations as reservation
    where reservation.reservation_id = payment.reservation_id
      and reservation.class_session_id = p_class_session_id
      and reservation.status = 'studio_cancelled'
      and payment.status = 'authorized'
    returning payment.payment_id
  )
  select count(*)::integer into v_refunded_count from refunded;

  with affected_reservations as (
    select reservation.reservation_id, reservation.member_id
    from public.reservations as reservation
    where reservation.class_session_id = p_class_session_id
      and reservation.status = 'studio_cancelled'
  ), inserted as (
    insert into public.notifications (
      notification_id, member_id, event_type, channel, status, created_at,
      related_record_type, related_record_id
    )
    select
      'NTF-' || upper(replace(gen_random_uuid()::text, '-', '')),
      member.member_id,
      'studio_cancelled',
      member.preferred_channel,
      'simulated',
      v_now,
      'reservation',
      affected.reservation_id
    from affected_reservations as affected
    join public.members as member on member.member_id = affected.member_id
    returning notification_id
  )
  select count(*)::integer into v_notification_count from inserted;

  v_action_id := 'CSA-' || upper(replace(gen_random_uuid()::text, '-', ''));
  insert into public.class_session_actions (
    action_id, class_session_id, action_type, reason, performed_by_staff_id, performed_at
  ) values (
    v_action_id, p_class_session_id, 'studio_cancelled', btrim(p_reason), v_staff_id, v_now
  );

  return query select p_class_session_id, v_now, v_cancelled_count, v_refunded_count, v_notification_count, v_action_id;
end;
$$;

comment on function public.cancel_class_session(text, text) is
  'Owner/admin command that cancels a future session only when attendance is absent, preserving reservations, refunds, notifications, and an attributed audit action atomically.';

revoke all on function public.cancel_class_session(text, text) from public, anon;
grant execute on function public.cancel_class_session(text, text) to authenticated;

commit;
