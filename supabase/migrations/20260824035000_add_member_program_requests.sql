-- Member-facing service requests for referrals, guest passes, and studio programs.

begin;

create table public.member_program_requests (
  program_request_id text primary key,
  member_id text not null references public.members(member_id) on update cascade on delete restrict,
  program_key text not null check (program_key in ('friend_referral', 'mission_guide', 'guest_pass', 'wellness_orientation')),
  guest_name text,
  guest_email text,
  status text not null default 'submitted' check (status in ('submitted', 'in_review', 'approved', 'completed', 'declined')),
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_program_requests_guest_details check (
    (program_key in ('friend_referral', 'guest_pass') and nullif(btrim(guest_name), '') is not null and nullif(btrim(guest_email), '') is not null)
    or (program_key in ('mission_guide', 'wellness_orientation') and guest_name is null and guest_email is null)
  )
);

create unique index member_program_requests_one_open_program
  on public.member_program_requests(member_id, program_key, coalesce(lower(guest_email), ''))
  where status in ('submitted', 'in_review', 'approved');

alter table public.member_program_requests enable row level security;
grant select on public.member_program_requests to authenticated;

create policy member_program_requests_self_read on public.member_program_requests
for select to authenticated
using (member_id = public.current_member_id());

create policy member_program_requests_staff_read on public.member_program_requests
for select to authenticated
using (public.is_active_staff());

create function public.request_member_program(
  p_program_key text,
  p_guest_name text default null,
  p_guest_email text default null
)
returns table (
  program_request_id text,
  program_key text,
  status text,
  requested_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_member_id text := public.current_member_id();
  v_request_id text := 'MPR-' || upper(replace(gen_random_uuid()::text, '-', ''));
  v_guest_name text := nullif(btrim(p_guest_name), '');
  v_guest_email text := nullif(lower(btrim(p_guest_email)), '');
begin
  if v_member_id is null then
    raise exception 'active member account required';
  end if;

  if p_program_key not in ('friend_referral', 'mission_guide', 'guest_pass', 'wellness_orientation') then
    raise exception 'unsupported member program';
  end if;

  if p_program_key in ('friend_referral', 'guest_pass') then
    if v_guest_name is null or v_guest_email is null
       or v_guest_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
      raise exception 'valid guest name and email required';
    end if;
  else
    v_guest_name := null;
    v_guest_email := null;
  end if;

  if exists (
    select 1 from public.member_program_requests as request
    where request.member_id = v_member_id
      and request.program_key = p_program_key
      and coalesce(lower(request.guest_email), '') = coalesce(v_guest_email, '')
      and request.status in ('submitted', 'in_review', 'approved')
  ) then
    raise exception 'program request already open';
  end if;

  insert into public.member_program_requests (
    program_request_id, member_id, program_key, guest_name, guest_email, status, requested_at, updated_at
  ) values (
    v_request_id, v_member_id, p_program_key, v_guest_name, v_guest_email, 'submitted', now(), now()
  );

  return query
  select request.program_request_id, request.program_key, request.status, request.requested_at
  from public.member_program_requests as request
  where request.program_request_id = v_request_id;
end;
$$;

revoke all on function public.request_member_program(text, text, text) from public;
grant execute on function public.request_member_program(text, text, text) to authenticated;

commit;
