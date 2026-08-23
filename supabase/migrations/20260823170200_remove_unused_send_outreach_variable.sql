-- Keep the already-applied remote function aligned with the warning-free canonical migration.
begin;

create or replace function public.send_outreach(p_outreach_id text)
returns public.outreach_records
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_staff_id text := public.current_staff_id();
  v_outreach public.outreach_records%rowtype;
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

commit;
