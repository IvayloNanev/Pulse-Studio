-- Execute the member dashboard under its tightly scoped function contract.
-- The function derives member identity from auth.uid() and never accepts a
-- caller-supplied member identifier, preventing cross-member selection.

begin;

alter function public.member_dashboard(timestamptz) security definer;

revoke all on function public.member_dashboard(timestamptz) from public;
grant execute on function public.member_dashboard(timestamptz) to authenticated;

comment on function public.member_dashboard(timestamptz) is
  'Returns the current authenticated member dashboard without repeated row-policy evaluation.';

commit;
