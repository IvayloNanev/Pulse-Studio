-- Make effective-dated membership history the sole authority for time-sensitive
-- membership state. memberships.status remains a compatibility snapshot only.

begin;

create or replace function public.membership_status_at(
  p_membership_id text,
  p_at timestamptz default now()
)
returns public.membership_status
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select history.status
  from public.membership_status_history as history
  where history.membership_id = p_membership_id
    and p_at >= history.effective_at
    and p_at < coalesce(history.ended_at, 'infinity'::timestamptz)
  order by history.effective_at desc
  limit 1
$$;

comment on function public.membership_status_at(text, timestamptz) is
  'Returns the authoritative effective-dated membership status at the supplied instant.';

revoke all on function public.membership_status_at(text, timestamptz) from public;
grant execute on function public.membership_status_at(text, timestamptz) to authenticated;

-- Correct previously deployed functions without editing applied migrations. Each
-- replacement is guarded so deployment fails if the expected definition changed.
do $$
declare
  v_definition text;
  v_corrected text;
begin
  select pg_get_functiondef('public.member_dashboard(timestamptz)'::regprocedure) into v_definition;
  v_corrected := replace(v_definition,
    'membership.status::text as membership_status',
    'public.membership_status_at(membership.membership_id, p_as_of)::text as membership_status');
  if v_corrected = v_definition then raise exception 'member_dashboard membership status replacement did not match'; end if;
  execute v_corrected;

  select pg_get_functiondef('public.evaluate_member_risk_internal(text,timestamptz)'::regprocedure) into v_definition;
  v_corrected := replace(v_definition,
    'membership.status = ''active''',
    'public.membership_status_at(membership.membership_id, p_evaluated_at) = ''active''');
  if v_corrected = v_definition then raise exception 'risk evaluator membership status replacement did not match'; end if;
  execute v_corrected;

  select pg_get_functiondef('public.create_outreach_retry(text,text)'::regprocedure) into v_definition;
  v_corrected := replace(v_definition,
    'm.status = ''active''',
    'public.membership_status_at(m.membership_id, now()) = ''active''');
  if v_corrected = v_definition then raise exception 'outreach retry membership status replacement did not match'; end if;
  execute v_corrected;
end;
$$;

do $$
declare
  v_definition text;
  v_corrected text;
begin
  select pg_get_viewdef('public.product_d_risk_queue'::regclass, true) into v_definition;
  v_corrected := replace(v_definition,
    'membership.status = ''active''::membership_status',
    'public.membership_status_at(membership.membership_id, now()) = ''active''::membership_status');
  if v_corrected = v_definition then raise exception 'Product D queue membership status replacement did not match'; end if;
  execute 'create or replace view public.product_d_risk_queue '
    || 'with (security_barrier = true, security_invoker = true) as ' || v_corrected;
end;
$$;

commit;
