-- Reconcile newer Staff retention workflows with the hardened Product D
-- boundary. These fixed-purpose interfaces preserve all-active-Staff Product D
-- access without restoring direct global reads on canonical tables or views.

begin;

drop function if exists public.product_d_risk_queue();

create function public.product_d_risk_queue()
returns table (
  risk_assessment_id text,
  member_name text,
  risk_level text,
  risk_priority integer,
  review_status text,
  evaluated_at timestamptz,
  previous_visits integer,
  current_visits integer,
  decline_percentage numeric,
  risk_reason text,
  last_attended_at timestamptz,
  active_note_count integer,
  outreach_status text,
  can_start_outreach boolean,
  cooldown_until timestamptz,
  outreach_blocked_reason text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if public.current_staff_id() is null then
    raise exception 'active staff account required';
  end if;

  return query
  select
    queue.risk_assessment_id,
    queue.member_name,
    queue.risk_level::text,
    queue.risk_priority,
    queue.review_status::text,
    queue.evaluated_at,
    queue.previous_visits,
    queue.current_visits,
    queue.decline_percentage,
    queue.risk_reason,
    queue.last_attended_at,
    queue.active_note_count,
    queue.outreach_status::text,
    queue.can_start_outreach,
    queue.cooldown_until,
    queue.outreach_blocked_reason
  from public.product_d_risk_queue as queue
  order by queue.risk_priority, queue.evaluated_at;
end;
$$;

drop function if exists public.product_d_member_detail(text);

create function public.product_d_member_detail(p_risk_assessment_id text)
returns table (
  risk_assessment_id text,
  member_name text,
  email text,
  phone text,
  preferred_channel text,
  do_not_contact boolean,
  risk_level text,
  review_status text,
  risk_reason text,
  evaluated_at timestamptz,
  previous_visits integer,
  current_visits integer,
  decline_percentage numeric,
  resolved_at timestamptz,
  resolution_reason text,
  previous_period_start timestamptz,
  previous_period_end timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  attendance_evidence jsonb,
  active_notes jsonb,
  outreach_attempts jsonb,
  recommended_class_type_label text,
  recommended_starts_at timestamptz,
  recommended_instructor_name text,
  recommended_available_spots integer,
  can_start_outreach boolean,
  outreach_blocked_reason text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if public.current_staff_id() is null then
    raise exception 'active staff account required';
  end if;

  return query
  select
    detail.risk_assessment_id,
    detail.member_name,
    detail.email,
    detail.phone,
    detail.preferred_channel::text,
    detail.do_not_contact,
    detail.risk_level::text,
    detail.review_status::text,
    detail.risk_reason,
    detail.evaluated_at,
    detail.previous_visits,
    detail.current_visits,
    detail.decline_percentage,
    detail.resolved_at,
    detail.resolution_reason,
    detail.previous_period_start,
    detail.previous_period_end,
    detail.current_period_start,
    detail.current_period_end,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'attendance_record_id', evidence.item ->> 'attendance_record_id',
        'class_type', evidence.item ->> 'class_type',
        'starts_at', evidence.item ->> 'starts_at'
      ) order by evidence.ordinality)
      from jsonb_array_elements(detail.attendance_evidence) with ordinality as evidence(item, ordinality)
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'note_id', note.item ->> 'note_id',
        'body', note.item ->> 'body',
        'author_name', note.item ->> 'author_name',
        'created_at', note.item ->> 'created_at'
      ) order by note.ordinality)
      from jsonb_array_elements(detail.active_notes) with ordinality as note(item, ordinality)
    ), '[]'::jsonb),
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'outreach_id', outreach.item ->> 'outreach_id',
        'attempt_number', (outreach.item ->> 'attempt_number')::integer,
        'channel', outreach.item ->> 'channel',
        'original_message', outreach.item ->> 'original_message',
        'final_message', outreach.item ->> 'final_message',
        'status', outreach.item ->> 'status',
        'response_outcome', outreach.item ->> 'response_outcome',
        'sent_at', outreach.item ->> 'sent_at',
        'cooldown_until', outreach.item ->> 'cooldown_until'
      ) order by outreach.ordinality)
      from jsonb_array_elements(detail.outreach_attempts) with ordinality as outreach(item, ordinality)
    ), '[]'::jsonb),
    detail.recommended_class_type_label,
    detail.recommended_starts_at,
    detail.recommended_instructor_name,
    detail.recommended_available_spots,
    queue.can_start_outreach,
    queue.outreach_blocked_reason
  from public.product_d_member_detail as detail
  left join public.product_d_risk_queue as queue
    on queue.risk_assessment_id = detail.risk_assessment_id
  where detail.risk_assessment_id = p_risk_assessment_id;
end;
$$;

create or replace function public.product_d_evaluation_member_options()
returns table (
  member_id text,
  first_name text,
  last_name text,
  email text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if public.current_staff_id() is null then
    raise exception 'active staff account required';
  end if;

  return query
  select member.member_id, member.first_name, member.last_name, member.email
  from public.members as member
  order by member.last_name, member.first_name, member.member_id;
end;
$$;

create or replace function public.product_d_case_history()
returns table (
  risk_assessment_id text,
  member_name text,
  risk_level text,
  review_status text,
  evaluated_at timestamptz,
  resolved_at timestamptz,
  resolution_reason text,
  previous_visits integer,
  current_visits integer,
  decline_percentage numeric,
  outreach_attempts jsonb
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if public.current_staff_id() is null then
    raise exception 'active staff account required';
  end if;

  return query
  select
    detail.risk_assessment_id,
    detail.member_name,
    detail.risk_level::text,
    detail.review_status::text,
    detail.evaluated_at,
    detail.resolved_at,
    detail.resolution_reason,
    detail.previous_visits,
    detail.current_visits,
    detail.decline_percentage,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'response_outcome', outreach.item ->> 'response_outcome'
      ) order by outreach.ordinality)
      from jsonb_array_elements(detail.outreach_attempts) with ordinality as outreach(item, ordinality)
    ), '[]'::jsonb)
  from public.product_d_member_detail as detail
  order by detail.evaluated_at desc;
end;
$$;

comment on function public.product_d_risk_queue() is
  'Returns the active Product D queue and workflow metrics to authenticated active Staff without broad canonical-table access.';
comment on function public.product_d_member_detail(text) is
  'Returns one fixed Product D evidence and journey contract to authenticated active Staff, including complete cross-instructor evidence.';
comment on function public.product_d_evaluation_member_options() is
  'Returns only the member selector fields required for Staff-triggered Product D evaluation.';
comment on function public.product_d_case_history() is
  'Returns the limited Product D case-history metrics required by the Staff retention history visualization.';

revoke all on function public.product_d_risk_queue() from public, anon, authenticated;
grant execute on function public.product_d_risk_queue() to authenticated;
revoke all on function public.product_d_member_detail(text) from public, anon, authenticated;
grant execute on function public.product_d_member_detail(text) to authenticated;
revoke all on function public.product_d_evaluation_member_options() from public, anon, authenticated;
grant execute on function public.product_d_evaluation_member_options() to authenticated;
revoke all on function public.product_d_case_history() from public, anon, authenticated;
grant execute on function public.product_d_case_history() to authenticated;

-- Direct Product D view access remains unavailable to authenticated clients.
revoke all on public.product_d_risk_queue from authenticated;
revoke all on public.product_d_member_detail from authenticated;

commit;
