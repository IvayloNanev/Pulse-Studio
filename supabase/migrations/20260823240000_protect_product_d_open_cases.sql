-- Serialize Product D evaluation per member and enforce one open case as a
-- database invariant, including for any future write path.

begin;

create unique index risk_assessments_one_open_per_member
  on public.risk_assessments(member_id)
  where review_status in ('pending', 'in_progress');

alter function public.evaluate_member_risk(text, timestamptz)
  rename to evaluate_member_risk_internal;

revoke all on function public.evaluate_member_risk_internal(text, timestamptz) from public;
revoke all on function public.evaluate_member_risk_internal(text, timestamptz) from anon;
revoke all on function public.evaluate_member_risk_internal(text, timestamptz) from authenticated;

create function public.evaluate_member_risk(
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
set search_path = public, pg_temp
as $$
begin
  if public.current_staff_id() is null then
    raise exception 'active staff account required';
  end if;

  -- A stable transaction-scoped lock serializes all evaluations for one member
  -- without blocking evaluation of other members.
  perform pg_advisory_xact_lock(hashtextextended(p_member_id, 0));

  return query
  select *
  from public.evaluate_member_risk_internal(p_member_id, p_evaluated_at);
end;
$$;

comment on function public.evaluate_member_risk(text, timestamptz) is
  'Serializes risk evaluation per member and delegates to the deterministic evaluator; the database also enforces one open case per member.';
comment on function public.evaluate_member_risk_internal(text, timestamptz) is
  'Internal deterministic evaluator. No client role has direct execution permission.';

revoke all on function public.evaluate_member_risk(text, timestamptz) from public;
grant execute on function public.evaluate_member_risk(text, timestamptz) to authenticated;

commit;
