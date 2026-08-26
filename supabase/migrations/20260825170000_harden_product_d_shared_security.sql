-- Harden Product D global reads behind fixed-purpose interfaces and narrow
-- instructor canonical access without changing Product D's all-active-staff role model.

begin;

create or replace function public.product_d_risk_queue()
returns table (
  risk_assessment_id text,
  member_name text,
  risk_level text,
  risk_priority integer,
  review_status text,
  evaluated_at timestamptz,
  risk_reason text,
  last_attended_at timestamptz,
  active_note_count integer,
  outreach_status text,
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
    queue.risk_reason,
    queue.last_attended_at,
    queue.active_note_count,
    queue.outreach_status::text,
    queue.outreach_blocked_reason
  from public.product_d_risk_queue as queue
  order by queue.risk_priority, queue.evaluated_at;
end;
$$;

create or replace function public.product_d_member_detail(p_risk_assessment_id text)
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
  recommended_available_spots integer
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
        'sent_at', outreach.item ->> 'sent_at'
      ) order by outreach.ordinality)
      from jsonb_array_elements(detail.outreach_attempts) with ordinality as outreach(item, ordinality)
    ), '[]'::jsonb),
    detail.recommended_class_type_label,
    detail.recommended_starts_at,
    detail.recommended_instructor_name,
    detail.recommended_available_spots
  from public.product_d_member_detail as detail
  where detail.risk_assessment_id = p_risk_assessment_id;
end;
$$;

comment on function public.product_d_risk_queue() is
  'Returns the global Product D retention queue to an authenticated active staff actor without granting broad canonical-table access.';
comment on function public.product_d_member_detail(text) is
  'Returns one fixed Product D retention detail contract to an authenticated active staff actor, including complete cross-instructor evidence.';

revoke all on function public.product_d_risk_queue() from public;
revoke all on function public.product_d_risk_queue() from anon;
revoke all on function public.product_d_risk_queue() from authenticated;
grant execute on function public.product_d_risk_queue() to authenticated;

revoke all on function public.product_d_member_detail(text) from public;
revoke all on function public.product_d_member_detail(text) from anon;
revoke all on function public.product_d_member_detail(text) from authenticated;
grant execute on function public.product_d_member_detail(text) to authenticated;

-- Product D consumers now use the hardened RPCs. The relation names remain for
-- the function implementation, but clients no longer receive direct view access.
revoke all on public.product_d_risk_queue from authenticated;
revoke all on public.product_d_member_detail from authenticated;

-- Preserve member self-service and owner access while limiting instructors to
-- member and reservation facts connected to their assigned Product B sessions.
drop policy if exists members_staff_read on public.members;
create policy members_owner_read on public.members
for select to authenticated using (public.is_owner_admin());
create policy members_assigned_instructor_read on public.members
for select to authenticated using (
  exists (
    select 1
    from public.reservations as reservation
    where reservation.member_id = members.member_id
      and reservation.status in ('confirmed', 'waitlisted')
      and public.can_access_product_b_session(reservation.class_session_id)
  )
);

drop policy if exists reservations_staff_read on public.reservations;
create policy reservations_owner_read on public.reservations
for select to authenticated using (public.is_owner_admin());
create policy reservations_assigned_instructor_read on public.reservations
for select to authenticated using (public.can_access_product_b_session(class_session_id));

drop policy if exists class_sessions_staff_read on public.class_sessions;
create policy class_sessions_owner_read on public.class_sessions
for select to authenticated using (public.is_owner_admin());
create policy class_sessions_assigned_instructor_read on public.class_sessions
for select to authenticated using (instructor_staff_id = public.current_staff_id());

drop policy if exists memberships_staff_read on public.memberships;
create policy memberships_owner_read on public.memberships
for select to authenticated using (public.is_owner_admin());

drop policy if exists membership_history_staff_read on public.membership_status_history;
create policy membership_history_owner_read on public.membership_status_history
for select to authenticated using (public.is_owner_admin());

-- All active staff retain Product D workflow access through the dedicated read
-- interfaces and audited commands; unrestricted direct table reads are owner-only.
drop policy if exists risk_assessments_staff_read on public.risk_assessments;
create policy risk_assessments_owner_read on public.risk_assessments
for select to authenticated using (public.is_owner_admin());

drop policy if exists outreach_records_staff_read on public.outreach_records;
create policy outreach_records_owner_read on public.outreach_records
for select to authenticated using (public.is_owner_admin());

drop policy if exists risk_case_notes_staff_read on public.risk_case_notes;
create policy risk_case_notes_owner_read on public.risk_case_notes
for select to authenticated using (public.is_owner_admin());

drop policy if exists outreach_actions_staff_read on public.outreach_actions;
create policy outreach_actions_owner_read on public.outreach_actions
for select to authenticated using (public.is_owner_admin());

commit;
