-- Add a named operational demo account without changing the canonical
-- 250-member CSV dataset package. Clean Supabase environments apply migrations
-- before seed data, so seed.sql invokes this provisioner again after loading
-- the canonical membership-plan catalog.

begin;

create or replace function public.provision_ethan_demo_member()
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_auth_subject text;
begin
  if not exists (select 1 from public.membership_plans where plan_id = 'PLAN-008') then
    return;
  end if;

  insert into public.members (
    member_id, first_name, last_name, email, phone, preferred_channel, do_not_contact
  ) values (
    'MEM-DEMO-ETHAN', 'Ethan', 'Nanev', 'ethannanev@gmail.com',
    '+1-212-555-0199', 'email', false
  )
  on conflict (member_id) do update set
    first_name = excluded.first_name, last_name = excluded.last_name,
    email = excluded.email, phone = excluded.phone,
    preferred_channel = excluded.preferred_channel,
    do_not_contact = excluded.do_not_contact;

  insert into public.memberships (
    membership_id, member_id, plan_id, status, start_date,
    billing_cycle_start_date, end_date, agreed_monthly_price
  ) values (
    'MSP-DEMO-ETHAN', 'MEM-DEMO-ETHAN', 'PLAN-008', 'active',
    date '2025-08-23', date '2026-08-23', null, 179.00
  )
  on conflict (membership_id) do update set
    member_id = excluded.member_id, plan_id = excluded.plan_id,
    status = excluded.status, start_date = excluded.start_date,
    billing_cycle_start_date = excluded.billing_cycle_start_date,
    end_date = excluded.end_date,
    agreed_monthly_price = excluded.agreed_monthly_price;

  insert into public.membership_status_history (
    membership_status_history_id, membership_id, status, effective_at, ended_at
  ) values (
    'MSH-DEMO-ETHAN-001', 'MSP-DEMO-ETHAN', 'active',
    timestamptz '2025-08-23 09:00:00-04', null
  )
  on conflict (membership_status_history_id) do nothing;

  insert into public.simulated_payment_methods (
    payment_method_id, member_id, application_id, cardholder_name, card_brand,
    last_four, expiration_month, expiration_year, billing_zip,
    is_default, status, created_at, updated_at
  ) values (
    'SPM-MEM-DEMO-ETHAN', 'MEM-DEMO-ETHAN', null, 'Ethan Nanev', 'visa',
    '4242', 12, 2030, '10001', true, 'active', now(), now()
  )
  on conflict (payment_method_id) do update set
    member_id = excluded.member_id, application_id = excluded.application_id,
    cardholder_name = excluded.cardholder_name, card_brand = excluded.card_brand,
    last_four = excluded.last_four, expiration_month = excluded.expiration_month,
    expiration_year = excluded.expiration_year, billing_zip = excluded.billing_zip,
    is_default = excluded.is_default, status = excluded.status, updated_at = now();

  select auth_user.id::text into v_auth_subject
  from auth.users as auth_user
  where lower(auth_user.email) = 'ethannanev@gmail.com'
  order by auth_user.created_at desc limit 1;

  if v_auth_subject is not null then
    update public.member_accounts
    set auth_subject = 'auth_member_0016'
    where member_id = 'MEM-0016' and auth_subject = v_auth_subject;
  end if;

  insert into public.member_accounts (
    account_id, member_id, auth_subject, email_verified, account_status, created_at
  ) values (
    'ACC-DEMO-ETHAN', 'MEM-DEMO-ETHAN',
    coalesce(v_auth_subject, 'auth_member_demo_ethan_pending'),
    v_auth_subject is not null, 'active', now()
  )
  on conflict (account_id) do update set
    member_id = excluded.member_id, auth_subject = excluded.auth_subject,
    email_verified = excluded.email_verified,
    account_status = excluded.account_status;
end;
$$;

revoke all on function public.provision_ethan_demo_member() from public, anon, authenticated;

select public.provision_ethan_demo_member();

commit;
