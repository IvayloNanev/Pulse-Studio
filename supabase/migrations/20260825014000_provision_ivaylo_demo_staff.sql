-- Link the named operational staff login to an owner/admin profile.
-- Supabase Auth remains the credential authority; this migration never stores
-- or creates a password. Re-running the function after the Auth user exists is
-- safe and repairs an earlier placeholder mapping.

begin;

create or replace function public.provision_ivaylo_demo_staff()
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_auth_subject text;
begin
  select auth_user.id::text into v_auth_subject
  from auth.users as auth_user
  where lower(auth_user.email) = 'ivaylo.nanev@pursuit.org'
  order by auth_user.created_at desc
  limit 1;

  insert into public.staff_accounts (
    staff_id, auth_subject, first_name, last_name, email, role,
    account_status, created_at
  ) values (
    'STF-DEMO-IVAYLO',
    coalesce(v_auth_subject, 'auth_staff_demo_ivaylo_pending'),
    'Ivaylo', 'Nanev', 'ivaylo.nanev@pursuit.org',
    'owner_admin', 'active', now()
  )
  on conflict (staff_id) do update set
    auth_subject = excluded.auth_subject,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    email = excluded.email,
    role = excluded.role,
    account_status = excluded.account_status;
end;
$$;

revoke all on function public.provision_ivaylo_demo_staff() from public, anon, authenticated;

select public.provision_ivaylo_demo_staff();

commit;
