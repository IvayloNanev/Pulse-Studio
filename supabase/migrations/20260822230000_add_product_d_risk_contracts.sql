-- Product D staff risk queue and member-detail contracts.
-- Contract: docs/06-shared-api-contracts-v1.md

begin;

create or replace function public.staff_display_name(p_staff_id text)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when public.is_active_staff() then (
      select concat_ws(' ', staff.first_name, staff.last_name)
      from public.staff_accounts as staff
      where staff.staff_id = p_staff_id and staff.account_status = 'active'
    )
  end
$$;

create or replace view public.product_d_risk_queue
with (security_barrier = true, security_invoker = true)
as
select
  risk.risk_assessment_id,
  risk.member_id,
  concat_ws(' ', member.first_name, member.last_name) as member_name,
  risk.risk_level,
  case risk.risk_level when 'high' then 1 when 'medium' then 2 end as risk_priority,
  risk.review_status,
  risk.evaluated_at,
  risk.previous_period_start,
  risk.previous_period_end,
  risk.current_period_start,
  risk.current_period_end,
  risk.previous_visits,
  risk.current_visits,
  risk.decline_percentage,
  format(
    'Visits fell from %s to %s: %s%% decline',
    risk.previous_visits,
    risk.current_visits,
    risk.decline_percentage
  ) as risk_reason,
  last_visit.last_attended_at,
  coalesce(note_count.active_note_count, 0)::integer as active_note_count,
  latest_outreach.outreach_id,
  latest_outreach.attempt_number as outreach_attempt_number,
  latest_outreach.status as outreach_status,
  latest_outreach.response_outcome,
  latest_outreach.sent_at as last_sent_at,
  case
    when latest_outreach.status = 'sent' and latest_outreach.response_outcome is null
      then latest_outreach.sent_at + interval '14 days'
  end as cooldown_until,
  case
    when member.do_not_contact then false
    when not exists (
      select 1
      from public.memberships as membership
      join public.membership_status_history as history
        on history.membership_id = membership.membership_id
      where membership.member_id = member.member_id
        and membership.status = 'active'
        and history.status = 'active'
        and now() >= history.effective_at
        and now() < coalesce(history.ended_at, 'infinity'::timestamptz)
    ) then false
    when latest_outreach.outreach_id is null then true
    when latest_outreach.status = 'sent'
      and latest_outreach.response_outcome is null
      and latest_outreach.attempt_number < 3
      and now() >= latest_outreach.sent_at + interval '14 days' then true
    else false
  end as can_start_outreach,
  case
    when member.do_not_contact then 'Member has requested no contact'
    when not exists (
      select 1
      from public.memberships as membership
      join public.membership_status_history as history
        on history.membership_id = membership.membership_id
      where membership.member_id = member.member_id
        and membership.status = 'active'
        and history.status = 'active'
        and now() >= history.effective_at
        and now() < coalesce(history.ended_at, 'infinity'::timestamptz)
    ) then 'Member does not have an active membership'
    when latest_outreach.outreach_id is null then null
    when latest_outreach.response_outcome is not null then 'Member has already responded'
    when latest_outreach.attempt_number >= 3 then 'Maximum of three outreach attempts reached'
    when latest_outreach.status in ('draft', 'ready') then 'An outreach attempt is already being prepared'
    when latest_outreach.status = 'sent' and now() < latest_outreach.sent_at + interval '14 days'
      then 'Fourteen-day outreach cooldown is active'
    else null
  end as outreach_blocked_reason
from public.risk_assessments as risk
join public.members as member on member.member_id = risk.member_id
left join lateral (
  select outreach.*
  from public.outreach_records as outreach
  where outreach.risk_assessment_id = risk.risk_assessment_id
  order by outreach.attempt_number desc
  limit 1
) as latest_outreach on true
left join lateral (
  select max(session.starts_at) as last_attended_at
  from public.attendance_records as attendance
  join public.reservations as reservation on reservation.reservation_id = attendance.reservation_id
  join public.class_sessions as session on session.class_session_id = reservation.class_session_id
  where reservation.member_id = risk.member_id
    and attendance.attendance_status = 'attended'
    and session.starts_at < risk.evaluated_at
) as last_visit on true
left join lateral (
  select count(*) as active_note_count
  from public.risk_case_notes as note
  where note.member_id = risk.member_id and note.deleted_at is null
) as note_count on true
where risk.review_status in ('pending', 'in_progress')
  and public.is_active_staff();

create or replace view public.product_d_member_detail
with (security_barrier = true, security_invoker = true)
as
select
  risk.risk_assessment_id,
  risk.member_id,
  concat_ws(' ', member.first_name, member.last_name) as member_name,
  member.email,
  member.phone,
  member.preferred_channel,
  member.do_not_contact,
  risk.risk_level,
  risk.review_status,
  risk.evaluated_at,
  risk.previous_period_start,
  risk.previous_period_end,
  risk.current_period_start,
  risk.current_period_end,
  risk.previous_visits,
  risk.current_visits,
  risk.decline_percentage,
  format(
    'Visits fell from %s to %s: %s%% decline',
    risk.previous_visits,
    risk.current_visits,
    risk.decline_percentage
  ) as risk_reason,
  risk.resolved_at,
  risk.resolution_reason,
  coalesce(evidence.attendance_evidence, '[]'::jsonb) as attendance_evidence,
  coalesce(notes.active_notes, '[]'::jsonb) as active_notes,
  coalesce(attempts.outreach_attempts, '[]'::jsonb) as outreach_attempts,
  recommendation.recommended_class_session_id,
  recommendation.recommended_class_type,
  recommendation.recommended_class_type_label,
  recommendation.recommended_starts_at,
  recommendation.recommended_instructor_name,
  recommendation.recommended_available_spots
from public.risk_assessments as risk
join public.members as member on member.member_id = risk.member_id
left join lateral (
  select jsonb_agg(
    jsonb_build_object(
      'attendance_record_id', attendance.attendance_record_id,
      'reservation_id', reservation.reservation_id,
      'class_session_id', session.class_session_id,
      'class_type', session.class_type,
      'starts_at', session.starts_at,
      'recorded_at', attendance.recorded_at
    ) order by session.starts_at
  ) as attendance_evidence
  from public.attendance_records as attendance
  join public.reservations as reservation on reservation.reservation_id = attendance.reservation_id
  join public.class_sessions as session on session.class_session_id = reservation.class_session_id
  where reservation.member_id = risk.member_id
    and attendance.attendance_status = 'attended'
    and session.starts_at >= risk.previous_period_start
    and session.starts_at < risk.current_period_end
) as evidence on true
left join lateral (
  select jsonb_agg(
    jsonb_build_object(
      'note_id', note.note_id,
      'risk_assessment_id', note.risk_assessment_id,
      'body', note.body,
      'created_by_staff_id', note.created_by_staff_id,
      'author_name', public.staff_display_name(note.created_by_staff_id),
      'created_at', note.created_at,
      'updated_by_staff_id', note.updated_by_staff_id,
      'updated_at', note.updated_at
    ) order by note.created_at desc
  ) as active_notes
  from public.risk_case_notes as note
  where note.member_id = risk.member_id and note.deleted_at is null
) as notes on true
left join lateral (
  select jsonb_agg(
    jsonb_build_object(
      'outreach_id', outreach.outreach_id,
      'attempt_number', outreach.attempt_number,
      'channel', outreach.channel,
      'original_message', outreach.original_message,
      'final_message', outreach.final_message,
      'status', outreach.status,
      'response_outcome', outreach.response_outcome,
      'created_at', outreach.created_at,
      'approved_at', outreach.approved_at,
      'sent_at', outreach.sent_at,
      'completed_at', outreach.completed_at,
      'cooldown_until', case when outreach.sent_at is not null then outreach.sent_at + interval '14 days' end
    ) order by outreach.attempt_number
  ) as outreach_attempts
  from public.outreach_records as outreach
  where outreach.risk_assessment_id = risk.risk_assessment_id
) as attempts on true
left join lateral (
  select session.class_type as preferred_class_type
  from public.attendance_records as attendance
  join public.reservations as reservation on reservation.reservation_id = attendance.reservation_id
  join public.class_sessions as session on session.class_session_id = reservation.class_session_id
  where reservation.member_id = risk.member_id
    and attendance.attendance_status = 'attended'
    and session.starts_at < risk.evaluated_at
  group by session.class_type
  order by count(*) desc, session.class_type
  limit 1
) as preference on true
left join lateral (
  select
    schedule.class_session_id as recommended_class_session_id,
    schedule.class_type as recommended_class_type,
    schedule.class_type_label as recommended_class_type_label,
    schedule.starts_at as recommended_starts_at,
    schedule.instructor_name as recommended_instructor_name,
    schedule.available_spots as recommended_available_spots
  from public.public_class_schedule as schedule
  where schedule.starts_at >= now() and schedule.available_spots > 0
  order by (schedule.class_type = preference.preferred_class_type) desc, schedule.starts_at
  limit 1
) as recommendation on true
where public.is_active_staff();

comment on view public.product_d_risk_queue is
  'Staff-only open Product D risk queue with evidence summary, latest outreach, and cooldown eligibility.';
comment on view public.product_d_member_detail is
  'Staff-only Product D member review with attendance evidence, notes, outreach history, and class recommendation.';

revoke all on function public.staff_display_name(text) from public;
grant execute on function public.staff_display_name(text) to authenticated;

revoke all on public.product_d_risk_queue from public;
revoke all on public.product_d_risk_queue from anon;
revoke all on public.product_d_member_detail from public;
revoke all on public.product_d_member_detail from anon;
grant select on public.product_d_risk_queue to authenticated;
grant select on public.product_d_member_detail to authenticated;

commit;
