-- Product D authoritative notes, case, and outreach workflow commands.

begin;

create or replace function public.append_outreach_action(p_outreach_id text, p_action public.outreach_action_type)
returns void language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_staff_id text := public.current_staff_id();
begin
  if v_staff_id is null then raise exception 'active staff account required'; end if;
  insert into public.outreach_actions(action_id, outreach_id, action, staff_id, occurred_at)
  values ('ACT-' || upper(replace(gen_random_uuid()::text, '-', '')), p_outreach_id, p_action, v_staff_id, now());
end;
$$;

create or replace function public.create_risk_note(p_risk_assessment_id text, p_body text)
returns public.risk_case_notes language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_staff_id text := public.current_staff_id(); v_note public.risk_case_notes%rowtype; v_member_id text;
begin
  if v_staff_id is null then raise exception 'active staff account required'; end if;
  if nullif(btrim(p_body), '') is null then raise exception 'note body is required'; end if;
  select member_id into v_member_id from public.risk_assessments where risk_assessment_id = p_risk_assessment_id;
  if not found then raise exception 'risk assessment not found'; end if;
  insert into public.risk_case_notes(note_id, member_id, risk_assessment_id, body, created_by_staff_id, created_at)
  values ('NOTE-' || upper(replace(gen_random_uuid()::text, '-', '')), v_member_id, p_risk_assessment_id, btrim(p_body), v_staff_id, now())
  returning * into v_note;
  return v_note;
end;
$$;

create or replace function public.edit_risk_note(p_note_id text, p_body text)
returns public.risk_case_notes language plpgsql security definer set search_path = public, pg_temp as $$
declare v_staff_id text := public.current_staff_id(); v_note public.risk_case_notes%rowtype;
begin
  if v_staff_id is null then raise exception 'active staff account required'; end if;
  if nullif(btrim(p_body), '') is null then raise exception 'note body is required'; end if;
  update public.risk_case_notes set body = btrim(p_body), updated_by_staff_id = v_staff_id, updated_at = now()
  where note_id = p_note_id and deleted_at is null returning * into v_note;
  if not found then raise exception 'active note not found'; end if;
  return v_note;
end;
$$;

create or replace function public.delete_risk_note(p_note_id text)
returns public.risk_case_notes language plpgsql security definer set search_path = public, pg_temp as $$
declare v_staff_id text := public.current_staff_id(); v_note public.risk_case_notes%rowtype;
begin
  if v_staff_id is null then raise exception 'active staff account required'; end if;
  update public.risk_case_notes set deleted_by_staff_id = v_staff_id, deleted_at = now()
  where note_id = p_note_id and deleted_at is null returning * into v_note;
  if not found then raise exception 'active note not found'; end if;
  return v_note;
end;
$$;

create or replace function public.start_risk_review(p_risk_assessment_id text)
returns public.risk_assessments language plpgsql security definer set search_path = public, pg_temp as $$
declare v_risk public.risk_assessments%rowtype;
begin
  if not public.is_active_staff() then raise exception 'active staff account required'; end if;
  update public.risk_assessments set review_status = 'in_progress'
  where risk_assessment_id = p_risk_assessment_id and review_status = 'pending' returning * into v_risk;
  if not found then raise exception 'only a pending risk assessment can be started'; end if;
  return v_risk;
end;
$$;

create or replace function public.dismiss_risk_case(p_risk_assessment_id text, p_reason text)
returns public.risk_assessments language plpgsql security definer set search_path = public, pg_temp as $$
declare v_risk public.risk_assessments%rowtype;
begin
  if not public.is_active_staff() then raise exception 'active staff account required'; end if;
  if nullif(btrim(p_reason), '') is null then raise exception 'dismissal reason is required'; end if;
  update public.risk_assessments
  set review_status = 'dismissed', resolved_at = now(), resolution_reason = btrim(p_reason)
  where risk_assessment_id = p_risk_assessment_id and review_status in ('pending', 'in_progress') returning * into v_risk;
  if not found then raise exception 'open risk assessment not found'; end if;
  return v_risk;
end;
$$;

create or replace function public.edit_outreach_draft(p_outreach_id text, p_final_message text, p_channel public.outreach_channel)
returns public.outreach_records language plpgsql security definer set search_path = public, pg_temp as $$
declare v_outreach public.outreach_records%rowtype;
begin
  if not public.is_active_staff() then raise exception 'active staff account required'; end if;
  if nullif(btrim(p_final_message), '') is null then raise exception 'final message is required'; end if;
  update public.outreach_records set final_message = btrim(p_final_message), channel = p_channel
  where outreach_id = p_outreach_id and status = 'draft' returning * into v_outreach;
  if not found then raise exception 'editable draft not found'; end if;
  perform public.append_outreach_action(p_outreach_id, 'edited');
  return v_outreach;
end;
$$;

create or replace function public.approve_outreach(p_outreach_id text)
returns public.outreach_records language plpgsql security definer set search_path = public, pg_temp as $$
declare v_staff_id text := public.current_staff_id(); v_outreach public.outreach_records%rowtype;
begin
  if v_staff_id is null then raise exception 'active staff account required'; end if;
  update public.outreach_records
  set status = 'ready', approved_by_staff_id = v_staff_id, approved_at = now()
  where outreach_id = p_outreach_id and status = 'draft' and nullif(btrim(final_message), '') is not null
  returning * into v_outreach;
  if not found then raise exception 'complete draft not found'; end if;
  perform public.append_outreach_action(p_outreach_id, 'approved');
  return v_outreach;
end;
$$;

create or replace function public.send_outreach(p_outreach_id text)
returns public.outreach_records language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_staff_id text := public.current_staff_id(); v_outreach public.outreach_records%rowtype;
begin
  if v_staff_id is null then raise exception 'active staff account required'; end if;
  update public.outreach_records set status = 'sent', sent_by_staff_id = v_staff_id, sent_at = now()
  where outreach_id = p_outreach_id and status = 'ready' returning * into v_outreach;
  if not found then raise exception 'ready outreach not found'; end if;
  perform public.append_outreach_action(p_outreach_id, 'sent');
  insert into public.notifications(notification_id, member_id, event_type, channel, status, created_at, related_record_type, related_record_id)
  values ('NTF-' || upper(replace(gen_random_uuid()::text, '-', '')), v_outreach.member_id, 'reengagement_outreach', v_outreach.channel, 'simulated', now(), 'outreach', p_outreach_id);
  return v_outreach;
end;
$$;

create or replace function public.complete_outreach(p_outreach_id text, p_response public.outreach_response)
returns public.outreach_records language plpgsql security definer set search_path = public, pg_temp as $$
declare v_staff_id text := public.current_staff_id(); v_outreach public.outreach_records%rowtype;
begin
  if v_staff_id is null then raise exception 'active staff account required'; end if;
  update public.outreach_records
  set status = 'completed', response_outcome = p_response, completed_by_staff_id = v_staff_id, completed_at = now()
  where outreach_id = p_outreach_id and status = 'sent' returning * into v_outreach;
  if not found then raise exception 'sent outreach not found'; end if;
  perform public.append_outreach_action(p_outreach_id, 'completed');
  update public.risk_assessments set review_status = 'resolved', resolved_at = now(), resolution_reason = 'response_' || p_response::text
  where risk_assessment_id = v_outreach.risk_assessment_id and review_status in ('pending', 'in_progress');
  return v_outreach;
end;
$$;

create or replace function public.create_outreach_retry(p_risk_assessment_id text, p_message text)
returns public.outreach_records language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare v_staff_id text := public.current_staff_id(); v_latest public.outreach_records%rowtype; v_member public.members%rowtype; v_new public.outreach_records%rowtype;
begin
  if v_staff_id is null then raise exception 'active staff account required'; end if;
  if nullif(btrim(p_message), '') is null then raise exception 'retry message is required'; end if;
  select * into v_latest from public.outreach_records where risk_assessment_id = p_risk_assessment_id order by attempt_number desc limit 1 for update;
  if not found or v_latest.status <> 'sent' or v_latest.response_outcome is not null or v_latest.attempt_number >= 3 or now() < v_latest.sent_at + interval '14 days'
  then raise exception 'outreach retry is not eligible'; end if;
  select * into v_member from public.members where member_id = v_latest.member_id;
  if v_member.do_not_contact then raise exception 'member has requested no contact'; end if;
  if not exists (
    select 1 from public.memberships m join public.membership_status_history h on h.membership_id = m.membership_id
    where m.member_id = v_member.member_id and m.status = 'active' and h.status = 'active'
      and now() >= h.effective_at and now() < coalesce(h.ended_at, 'infinity'::timestamptz)
  ) then raise exception 'member does not have an active membership'; end if;
  insert into public.outreach_records(outreach_id, risk_assessment_id, member_id, attempt_number, channel, original_message, final_message, status, created_by_staff_id, created_at)
  values ('OUT-' || upper(replace(gen_random_uuid()::text, '-', '')), p_risk_assessment_id, v_member.member_id, v_latest.attempt_number + 1, v_member.preferred_channel, btrim(p_message), btrim(p_message), 'draft', v_staff_id, now())
  returning * into v_new;
  perform public.append_outreach_action(v_new.outreach_id, 'created');
  return v_new;
end;
$$;

create or replace function public.resolve_no_response(p_risk_assessment_id text)
returns public.risk_assessments language plpgsql security definer set search_path = public, pg_temp as $$
declare v_latest public.outreach_records%rowtype; v_risk public.risk_assessments%rowtype;
begin
  if not public.is_active_staff() then raise exception 'active staff account required'; end if;
  select * into v_latest from public.outreach_records where risk_assessment_id = p_risk_assessment_id order by attempt_number desc limit 1 for update;
  if not found or v_latest.attempt_number <> 3 or v_latest.status <> 'sent' or v_latest.response_outcome is not null or now() < v_latest.sent_at + interval '14 days'
  then raise exception 'case is not eligible for no-response resolution'; end if;
  update public.risk_assessments set review_status = 'resolved', resolved_at = now(), resolution_reason = 'no_response'
  where risk_assessment_id = p_risk_assessment_id and review_status in ('pending', 'in_progress') returning * into v_risk;
  if not found then raise exception 'open risk assessment not found'; end if;
  return v_risk;
end;
$$;

-- Staff retain read access, while writes must use the commands above.
drop policy if exists risk_assessments_staff_manage on public.risk_assessments;
create policy risk_assessments_staff_read on public.risk_assessments for select to authenticated using (public.is_active_staff());
drop policy if exists outreach_records_staff_manage on public.outreach_records;
create policy outreach_records_staff_read on public.outreach_records for select to authenticated using (public.is_active_staff());
drop policy if exists risk_case_notes_staff_manage on public.risk_case_notes;
create policy risk_case_notes_staff_read on public.risk_case_notes for select to authenticated using (public.is_active_staff());
drop policy if exists outreach_actions_staff_append on public.outreach_actions;

revoke all on function public.append_outreach_action(text, public.outreach_action_type) from public;
revoke all on function public.create_risk_note(text, text) from public;
revoke all on function public.edit_risk_note(text, text) from public;
revoke all on function public.delete_risk_note(text) from public;
revoke all on function public.start_risk_review(text) from public;
revoke all on function public.dismiss_risk_case(text, text) from public;
revoke all on function public.edit_outreach_draft(text, text, public.outreach_channel) from public;
revoke all on function public.approve_outreach(text) from public;
revoke all on function public.send_outreach(text) from public;
revoke all on function public.complete_outreach(text, public.outreach_response) from public;
revoke all on function public.create_outreach_retry(text, text) from public;
revoke all on function public.resolve_no_response(text) from public;

grant execute on function public.create_risk_note(text, text) to authenticated;
grant execute on function public.edit_risk_note(text, text) to authenticated;
grant execute on function public.delete_risk_note(text) to authenticated;
grant execute on function public.start_risk_review(text) to authenticated;
grant execute on function public.dismiss_risk_case(text, text) to authenticated;
grant execute on function public.edit_outreach_draft(text, text, public.outreach_channel) to authenticated;
grant execute on function public.approve_outreach(text) to authenticated;
grant execute on function public.send_outreach(text) to authenticated;
grant execute on function public.complete_outreach(text, public.outreach_response) to authenticated;
grant execute on function public.create_outreach_retry(text, text) to authenticated;
grant execute on function public.resolve_no_response(text) to authenticated;

commit;
