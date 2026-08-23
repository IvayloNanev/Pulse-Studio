-- Public membership application intake for the operational Join Today flow.
-- Applications do not create auth users, charge cards, or activate memberships.

begin;

create table public.membership_applications (
  application_id text primary key,
  first_name text not null check (btrim(first_name) <> ''),
  last_name text not null check (btrim(last_name) <> ''),
  email text not null check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone text,
  plan_id text not null references public.membership_plans(plan_id) on update cascade on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'contacted', 'approved', 'declined', 'withdrawn')),
  submitted_at timestamptz not null,
  reviewed_at timestamptz,
  reviewed_by_staff_id text references public.staff_accounts(staff_id) on update cascade on delete restrict,
  constraint membership_application_phone_check check (phone is null or nullif(btrim(phone), '') is not null)
);

create unique index membership_applications_pending_email_unique
  on public.membership_applications (lower(email))
  where status in ('pending', 'contacted', 'approved');

alter table public.membership_applications enable row level security;
create policy membership_applications_staff_read on public.membership_applications
for select to authenticated using (public.is_active_staff());

revoke all on public.membership_applications from public, anon, authenticated;
grant select on public.membership_applications to authenticated;

create function public.submit_membership_application(
  p_first_name text, p_last_name text, p_email text, p_phone text, p_plan_id text
)
returns table (application_id text, status text, submitted_at timestamptz)
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare
  v_application_id text;
  v_submitted_at timestamptz := now();
  v_email text := lower(btrim(p_email));
begin
  if nullif(btrim(p_first_name), '') is null or nullif(btrim(p_last_name), '') is null then raise exception 'first and last name are required'; end if;
  if v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'valid email address is required'; end if;
  if not exists (select 1 from public.membership_plans where plan_id = p_plan_id) then raise exception 'membership plan not found'; end if;
  v_application_id := 'APP-' || upper(replace(gen_random_uuid()::text, '-', ''));
  insert into public.membership_applications(application_id, first_name, last_name, email, phone, plan_id, submitted_at)
  values (v_application_id, btrim(p_first_name), btrim(p_last_name), v_email, nullif(btrim(p_phone), ''), p_plan_id, v_submitted_at);
  return query select v_application_id, 'pending'::text, v_submitted_at;
exception when unique_violation then raise exception 'an active membership application already exists for this email address';
end;
$$;

comment on table public.membership_applications is 'Public membership applications awaiting staff review; not activated accounts or payments.';
revoke all on function public.submit_membership_application(text, text, text, text, text) from public;
grant execute on function public.submit_membership_application(text, text, text, text, text) to anon, authenticated;

commit;

