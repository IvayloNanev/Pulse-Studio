-- Product D deterministic member risk-evaluation command.
-- Contract: docs/06-shared-api-contracts-v1.md

begin;

create or replace function public.evaluate_member_risk(
  p_member_id text,
  p_evaluated_at timestamptz default now()
)
returns table (
  assessment_created boolean,
  risk_assessment_id text,
  previous_visits integer,
  current_visits integer,
  decline_percentage numeric,
  risk_level text,
  initial_outreach_id text,
  evaluation_result text
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_staff_id text := public.current_staff_id();
  v_previous_start timestamptz := p_evaluated_at - interval '60 days';
  v_previous_end timestamptz := p_evaluated_at - interval '30 days';
  v_previous_visits integer;
  v_current_visits integer;
  v_decline numeric(5,1);
  v_risk_level public.risk_level;
  v_risk_id text;
  v_outreach_id text;
  v_latest_risk public.risk_assessments%rowtype;
  v_member public.members%rowtype;
  v_channel public.outreach_channel;
  v_message text;
begin
  if v_staff_id is null then
    raise exception 'active staff account required';
  end if;

  if p_evaluated_at > now() then
    raise exception 'risk evaluation time cannot be in the future';
  end if;

  select member.* into v_member
  from public.members as member
  where member.member_id = p_member_id;

  if not found then
    raise exception 'member not found';
  end if;

  if exists (
    select 1
    from public.risk_assessments as risk
    where risk.member_id = p_member_id
      and risk.evaluated_at = p_evaluated_at
  ) then
    select risk.* into v_latest_risk
    from public.risk_assessments as risk
    where risk.member_id = p_member_id
      and risk.evaluated_at = p_evaluated_at;

    return query select
      false,
      v_latest_risk.risk_assessment_id,
      v_latest_risk.previous_visits,
      v_latest_risk.current_visits,
      v_latest_risk.decline_percentage,
      v_latest_risk.risk_level::text,
      null::text,
      'already_evaluated'::text;
    return;
  end if;

  if not exists (
    select 1
    from public.memberships as membership
    where membership.member_id = p_member_id
      and membership.start_date <= (v_previous_start at time zone 'America/New_York')::date
  ) then
    return query select false, null::text, 0, 0, null::numeric, null::text, null::text, 'insufficient_membership_history'::text;
    return;
  end if;

  select risk.* into v_latest_risk
  from public.risk_assessments as risk
  where risk.member_id = p_member_id
  order by risk.evaluated_at desc
  limit 1
  for update;

  if found and v_latest_risk.review_status in ('pending', 'in_progress') then
    return query select false, v_latest_risk.risk_assessment_id, null::integer, null::integer, null::numeric, null::text, null::text, 'open_episode_exists'::text;
    return;
  end if;

  if found and not exists (
    select 1
    from public.attendance_records as attendance
    join public.reservations as reservation on reservation.reservation_id = attendance.reservation_id
    join public.class_sessions as session on session.class_session_id = reservation.class_session_id
    where reservation.member_id = p_member_id
      and attendance.attendance_status = 'attended'
      and session.starts_at > v_latest_risk.resolved_at
      and session.starts_at < p_evaluated_at
  ) then
    return query select false, v_latest_risk.risk_assessment_id, null::integer, null::integer, null::numeric, null::text, null::text, 'no_recovery_since_previous_episode'::text;
    return;
  end if;

  select count(*)::integer
  into v_previous_visits
  from public.attendance_records as attendance
  join public.reservations as reservation on reservation.reservation_id = attendance.reservation_id
  join public.class_sessions as session on session.class_session_id = reservation.class_session_id
  where reservation.member_id = p_member_id
    and attendance.attendance_status = 'attended'
    and session.starts_at >= v_previous_start
    and session.starts_at < v_previous_end
    and not exists (
      select 1
      from public.membership_status_history as pause
      where pause.membership_id = reservation.membership_id
        and pause.status = 'paused'
        and session.starts_at >= pause.effective_at
        and session.starts_at < coalesce(pause.ended_at, 'infinity'::timestamptz)
    );

  select count(*)::integer
  into v_current_visits
  from public.attendance_records as attendance
  join public.reservations as reservation on reservation.reservation_id = attendance.reservation_id
  join public.class_sessions as session on session.class_session_id = reservation.class_session_id
  where reservation.member_id = p_member_id
    and attendance.attendance_status = 'attended'
    and session.starts_at >= v_previous_end
    and session.starts_at < p_evaluated_at
    and not exists (
      select 1
      from public.membership_status_history as pause
      where pause.membership_id = reservation.membership_id
        and pause.status = 'paused'
        and session.starts_at >= pause.effective_at
        and session.starts_at < coalesce(pause.ended_at, 'infinity'::timestamptz)
    );

  if v_previous_visits < 4 then
    return query select false, null::text, v_previous_visits, v_current_visits, null::numeric, null::text, null::text, 'insufficient_previous_visits'::text;
    return;
  end if;

  v_decline := round(((v_previous_visits - v_current_visits)::numeric / v_previous_visits::numeric) * 100, 1);

  if v_decline < 50 then
    return query select false, null::text, v_previous_visits, v_current_visits, v_decline, null::text, null::text, 'decline_below_threshold'::text;
    return;
  end if;

  v_risk_level := case when v_decline >= 75 then 'high'::public.risk_level else 'medium'::public.risk_level end;
  v_risk_id := 'RISK-' || upper(replace(gen_random_uuid()::text, '-', ''));

  insert into public.risk_assessments (
    risk_assessment_id,
    member_id,
    evaluated_at,
    previous_period_start,
    previous_period_end,
    current_period_start,
    current_period_end,
    previous_visits,
    current_visits,
    decline_percentage,
    risk_level,
    review_status
  ) values (
    v_risk_id,
    p_member_id,
    p_evaluated_at,
    v_previous_start,
    v_previous_end,
    v_previous_end,
    p_evaluated_at,
    v_previous_visits,
    v_current_visits,
    v_decline,
    v_risk_level,
    'pending'
  );

  if not v_member.do_not_contact and exists (
    select 1
    from public.memberships as membership
    join public.membership_status_history as history on history.membership_id = membership.membership_id
    where membership.member_id = p_member_id
      and membership.status = 'active'
      and history.status = 'active'
      and p_evaluated_at >= history.effective_at
      and p_evaluated_at < coalesce(history.ended_at, 'infinity'::timestamptz)
  ) then
    v_channel := case
      when v_member.preferred_channel in ('sms', 'phone') and nullif(btrim(v_member.phone), '') is null then 'email'::public.outreach_channel
      else v_member.preferred_channel
    end;
    v_message := format(
      'Hi %s, we noticed your visits changed from %s to %s in the last two 30-day periods. We would love to help you find a class that fits your schedule.',
      v_member.first_name,
      v_previous_visits,
      v_current_visits
    );
    v_outreach_id := 'OUT-' || upper(replace(gen_random_uuid()::text, '-', ''));

    insert into public.outreach_records (
      outreach_id,
      risk_assessment_id,
      member_id,
      attempt_number,
      channel,
      original_message,
      final_message,
      status,
      created_by_staff_id,
      created_at
    ) values (
      v_outreach_id,
      v_risk_id,
      p_member_id,
      1,
      v_channel,
      v_message,
      v_message,
      'draft',
      v_staff_id,
      p_evaluated_at
    );

    insert into public.outreach_actions (
      action_id,
      outreach_id,
      action,
      staff_id,
      occurred_at
    ) values (
      'ACT-' || upper(replace(gen_random_uuid()::text, '-', '')),
      v_outreach_id,
      'created',
      v_staff_id,
      p_evaluated_at
    );
  end if;

  return query select
    true,
    v_risk_id,
    v_previous_visits,
    v_current_visits,
    v_decline,
    v_risk_level::text,
    v_outreach_id,
    'qualifying_assessment_created'::text;
end;
$$;

comment on function public.evaluate_member_risk(text, timestamptz) is
  'Evaluates one member against the canonical Product D windows and creates an idempotent qualifying risk episode plus an eligible initial outreach draft.';

revoke all on function public.evaluate_member_risk(text, timestamptz) from public;
grant execute on function public.evaluate_member_risk(text, timestamptz) to authenticated;

commit;
