-- Controlled membership-pause request, approval, and denial workflows.

begin;

alter table public.membership_pause_requests
  add column decision_reason text,
  add column decided_by_staff_id text references public.staff_accounts(staff_id) on update cascade on delete restrict,
  add column decided_at timestamptz;

drop index public.reservations_one_open_per_member_session;
create unique index reservations_one_open_per_member_session
  on public.reservations(member_id, class_session_id)
  where status not in ('cancelled', 'studio_cancelled', 'membership_paused');

alter table public.notifications
  drop constraint notifications_event_type_check;
alter table public.notifications
  add constraint notifications_event_type_check check (
    event_type in (
      'booking_confirmed', 'waitlist_promoted', 'member_cancelled',
      'studio_cancelled', 'membership_pause_cancelled', 'class_changed',
      'reengagement_outreach'
    )
  );

create table public.membership_fee_transactions (
  transaction_id text primary key,
  membership_id text not null references public.memberships(membership_id) on update cascade on delete restrict,
  pause_request_id text not null unique references public.membership_pause_requests(pause_request_id) on update cascade on delete restrict,
  fee_type text not null check (fee_type = 'pause_administration'),
  amount numeric(10,2) not null check (amount = 25.00),
  status text not null default 'simulated' check (status = 'simulated'),
  created_at timestamptz not null,
  created_by_staff_id text not null references public.staff_accounts(staff_id) on update cascade on delete restrict
);

alter table public.membership_fee_transactions enable row level security;
grant select on public.membership_fee_transactions to authenticated;

create policy membership_fee_transactions_self_read on public.membership_fee_transactions
for select to authenticated
using (
  exists (
    select 1 from public.memberships as membership
    where membership.membership_id = membership_fee_transactions.membership_id
      and membership.member_id = public.current_member_id()
  )
);

create policy membership_fee_transactions_staff_read on public.membership_fee_transactions
for select to authenticated using (public.is_active_staff());

drop policy if exists pause_requests_self_create on public.membership_pause_requests;
drop policy if exists pause_requests_owner_manage on public.membership_pause_requests;

create function public.request_membership_pause(
  p_membership_id text,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns table (
  pause_request_id text,
  membership_id text,
  status text,
  requested_at timestamptz,
  starts_at timestamptz,
  ends_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_member_id text := public.current_member_id();
  v_request_id text;
begin
  if v_member_id is null then
    raise exception 'active member account required';
  end if;

  perform 1
  from public.memberships as membership
  where membership.membership_id = p_membership_id
    and membership.member_id = v_member_id
  for update;

  if not found then
    raise exception 'owned membership not found';
  end if;

  if not exists (
    select 1 from public.membership_status_history as history
    where history.membership_id = p_membership_id
      and history.status = 'active'
      and v_now >= history.effective_at
      and v_now < coalesce(history.ended_at, 'infinity'::timestamptz)
  ) then
    raise exception 'membership must be active when requesting a pause';
  end if;

  if p_starts_at < v_now + interval '30 days' then
    raise exception 'pause requires at least 30 days advance notice';
  end if;

  if p_ends_at < p_starts_at + interval '30 days'
     or p_ends_at > p_starts_at + interval '90 days' then
    raise exception 'pause duration must be between 30 and 90 days';
  end if;

  if exists (
    select 1 from public.membership_pause_requests as request
    where request.membership_id = p_membership_id
      and request.status = 'pending'
  ) then
    raise exception 'membership already has a pending pause request';
  end if;

  if exists (
    select 1 from public.membership_pause_requests as request
    where request.membership_id = p_membership_id
      and request.status = 'approved'
      and request.starts_at > p_starts_at - interval '12 months'
      and request.starts_at < p_starts_at + interval '12 months'
  ) then
    raise exception 'only one approved pause is allowed in any rolling 12-month period';
  end if;

  if not exists (
    select 1 from public.membership_status_history as history
    where history.membership_id = p_membership_id
      and history.status = 'active'
      and p_starts_at >= history.effective_at
      and p_ends_at <= coalesce(history.ended_at, 'infinity'::timestamptz)
  ) then
    raise exception 'requested pause must fit inside an active membership interval';
  end if;

  v_request_id := 'PAUSE-' || upper(replace(gen_random_uuid()::text, '-', ''));
  insert into public.membership_pause_requests (
    pause_request_id, membership_id, requested_at, starts_at, ends_at,
    status, fee_amount
  ) values (
    v_request_id, p_membership_id, v_now, p_starts_at, p_ends_at,
    'pending', 0
  );

  return query select v_request_id, p_membership_id, 'pending'::text, v_now, p_starts_at, p_ends_at;
end;
$$;

create function public.approve_membership_pause(
  p_pause_request_id text,
  p_decision_reason text default null
)
returns table (
  pause_request_id text,
  status text,
  approved_at timestamptz,
  cancelled_reservations integer,
  refunded_drop_ins integer,
  notifications_created integer,
  fee_transaction_id text
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_staff_id text := public.current_staff_id();
  v_request public.membership_pause_requests%rowtype;
  v_active_history public.membership_status_history%rowtype;
  v_member_id text;
  v_cancelled_count integer := 0;
  v_refunded_count integer := 0;
  v_notification_count integer := 0;
  v_fee_id text;
begin
  if not public.is_owner_admin() or v_staff_id is null then
    raise exception 'owner/admin authorization required';
  end if;

  select request.* into v_request
  from public.membership_pause_requests as request
  where request.pause_request_id = p_pause_request_id
  for update;

  if not found then raise exception 'pause request not found'; end if;
  if v_request.status <> 'pending' then raise exception 'only a pending pause request may be approved'; end if;
  if v_now >= v_request.starts_at then raise exception 'pause must be approved before its start time'; end if;
  if v_request.starts_at < v_request.requested_at + interval '30 days' then
    raise exception 'pause request does not satisfy 30-day notice';
  end if;
  if v_request.ends_at < v_request.starts_at + interval '30 days'
     or v_request.ends_at > v_request.starts_at + interval '90 days' then
    raise exception 'pause duration must be between 30 and 90 days';
  end if;

  select membership.member_id into v_member_id
  from public.memberships as membership
  where membership.membership_id = v_request.membership_id
  for update;

  if not found then raise exception 'membership not found'; end if;

  if exists (
    select 1 from public.membership_pause_requests as other
    where other.membership_id = v_request.membership_id
      and other.status = 'approved'
      and other.pause_request_id <> p_pause_request_id
      and other.starts_at > v_request.starts_at - interval '12 months'
      and other.starts_at < v_request.starts_at + interval '12 months'
  ) then
    raise exception 'only one approved pause is allowed in any rolling 12-month period';
  end if;

  select history.* into v_active_history
  from public.membership_status_history as history
  where history.membership_id = v_request.membership_id
    and history.status = 'active'
    and v_request.starts_at >= history.effective_at
    and v_request.ends_at <= coalesce(history.ended_at, 'infinity'::timestamptz)
  for update;

  if not found then raise exception 'pause no longer fits inside an active membership interval'; end if;

  update public.membership_status_history
  set ended_at = v_request.starts_at
  where membership_status_history_id = v_active_history.membership_status_history_id;

  insert into public.membership_status_history (
    membership_status_history_id, membership_id, status, effective_at, ended_at
  ) values (
    'MSH-' || upper(replace(gen_random_uuid()::text, '-', '')),
    v_request.membership_id, 'paused', v_request.starts_at, v_request.ends_at
  );

  if v_active_history.ended_at is null or v_request.ends_at < v_active_history.ended_at then
    insert into public.membership_status_history (
      membership_status_history_id, membership_id, status, effective_at, ended_at
    ) values (
      'MSH-' || upper(replace(gen_random_uuid()::text, '-', '')),
      v_request.membership_id, 'active', v_request.ends_at, v_active_history.ended_at
    );
  end if;

  update public.membership_pause_requests
  set status = 'approved', approved_by_staff_id = v_staff_id,
      approved_at = v_now, fee_amount = 25.00,
      decision_reason = nullif(btrim(p_decision_reason), ''),
      decided_by_staff_id = v_staff_id, decided_at = v_now
  where membership_pause_requests.pause_request_id = p_pause_request_id;

  with affected as (
    update public.reservations as reservation
    set status = 'membership_paused'
    from public.class_sessions as session
    where session.class_session_id = reservation.class_session_id
      and reservation.member_id = v_member_id
      and reservation.status in ('confirmed', 'waitlisted')
      and session.starts_at >= v_request.starts_at
      and session.starts_at < v_request.ends_at
    returning reservation.reservation_id
  ) select count(*)::integer into v_cancelled_count from affected;

  with refunded as (
    update public.drop_in_payments as payment
    set status = 'refunded', refunded_at = v_now
    from public.reservations as reservation, public.class_sessions as session
    where reservation.reservation_id = payment.reservation_id
      and session.class_session_id = reservation.class_session_id
      and reservation.member_id = v_member_id
      and reservation.status = 'membership_paused'
      and session.starts_at >= v_request.starts_at
      and session.starts_at < v_request.ends_at
      and payment.status = 'authorized'
    returning payment.payment_id
  ) select count(*)::integer into v_refunded_count from refunded;

  with affected as (
    select reservation.reservation_id, reservation.member_id
    from public.reservations as reservation
    join public.class_sessions as session on session.class_session_id = reservation.class_session_id
    where reservation.status = 'membership_paused'
      and reservation.member_id = v_member_id
      and session.starts_at >= v_request.starts_at
      and session.starts_at < v_request.ends_at
  ), inserted as (
    insert into public.notifications (
      notification_id, member_id, event_type, channel, status, created_at,
      related_record_type, related_record_id
    )
    select 'NTF-' || upper(replace(gen_random_uuid()::text, '-', '')),
      member.member_id, 'membership_pause_cancelled', member.preferred_channel,
      'simulated', v_now, 'reservation', affected.reservation_id
    from affected
    join public.members as member on member.member_id = affected.member_id
    returning notification_id
  ) select count(*)::integer into v_notification_count from inserted;

  v_fee_id := 'FEE-' || upper(replace(gen_random_uuid()::text, '-', ''));
  insert into public.membership_fee_transactions (
    transaction_id, membership_id, pause_request_id, fee_type, amount,
    status, created_at, created_by_staff_id
  ) values (
    v_fee_id, v_request.membership_id, p_pause_request_id,
    'pause_administration', 25.00, 'simulated', v_now, v_staff_id
  );

  return query select p_pause_request_id, 'approved'::text, v_now,
    v_cancelled_count, v_refunded_count, v_notification_count, v_fee_id;
end;
$$;

create function public.deny_membership_pause(
  p_pause_request_id text,
  p_reason text
)
returns table (pause_request_id text, status text, denied_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_staff_id text := public.current_staff_id();
begin
  if not public.is_owner_admin() or v_staff_id is null then raise exception 'owner/admin authorization required'; end if;
  if nullif(btrim(p_reason), '') is null then raise exception 'denial reason is required'; end if;

  update public.membership_pause_requests
  set status = 'denied', decision_reason = btrim(p_reason),
      decided_by_staff_id = v_staff_id, decided_at = v_now
  where membership_pause_requests.pause_request_id = p_pause_request_id
    and membership_pause_requests.status = 'pending';

  if not found then raise exception 'pending pause request not found'; end if;
  return query select p_pause_request_id, 'denied'::text, v_now;
end;
$$;

revoke all on function public.request_membership_pause(text, timestamptz, timestamptz) from public;
revoke all on function public.approve_membership_pause(text, text) from public;
revoke all on function public.deny_membership_pause(text, text) from public;
grant execute on function public.request_membership_pause(text, timestamptz, timestamptz) to authenticated;
grant execute on function public.approve_membership_pause(text, text) to authenticated;
grant execute on function public.deny_membership_pause(text, text) to authenticated;

commit;
