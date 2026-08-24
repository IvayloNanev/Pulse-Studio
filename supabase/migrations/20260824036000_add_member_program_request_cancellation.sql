-- Allow a member to withdraw their own open program request.

begin;

alter table public.member_program_requests
  drop constraint member_program_requests_status_check;
alter table public.member_program_requests
  add constraint member_program_requests_status_check
  check (status in ('submitted', 'in_review', 'approved', 'completed', 'declined', 'cancelled'));

create function public.cancel_member_program_request(p_program_request_id text)
returns table (program_request_id text, status text, updated_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_member_id text := public.current_member_id();
begin
  if v_member_id is null then
    raise exception 'active member account required';
  end if;

  update public.member_program_requests as request
  set status = 'cancelled', updated_at = now()
  where request.program_request_id = p_program_request_id
    and request.member_id = v_member_id
    and request.status in ('submitted', 'in_review')
  returning request.program_request_id, request.status, request.updated_at
  into program_request_id, status, updated_at;

  if program_request_id is null then
    raise exception 'open owned program request not found';
  end if;

  return next;
end;
$$;

revoke all on function public.cancel_member_program_request(text) from public;
grant execute on function public.cancel_member_program_request(text) to authenticated;

commit;
