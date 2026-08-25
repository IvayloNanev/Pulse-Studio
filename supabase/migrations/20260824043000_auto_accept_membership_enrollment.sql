-- Membership enrollment is accepted automatically for the school-project workflow.
-- Approval records acceptance; secure account creation remains a separate identity step.

begin;

alter table public.membership_applications alter column status set default 'approved';

create or replace function public.submit_membership_application(
  p_first_name text, p_last_name text, p_email text, p_phone text, p_plan_id text,
  p_cardholder_name text, p_card_brand text, p_card_number text,
  p_expiration_month integer, p_expiration_year integer, p_security_code text, p_billing_zip text
)
returns table (application_id text, status text, submitted_at timestamptz)
language plpgsql security definer set search_path = public, extensions, pg_temp
as $$
declare
  v_application_id text;
  v_payment_method_id text;
  v_submitted_at timestamptz := now();
  v_email text := lower(btrim(p_email));
  v_card_number text := regexp_replace(coalesce(p_card_number, ''), '[^0-9]', '', 'g');
begin
  if nullif(btrim(p_first_name), '') is null or nullif(btrim(p_last_name), '') is null then raise exception 'first and last name are required'; end if;
  if v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'valid email address is required'; end if;
  if not exists (select 1 from public.membership_plans where plan_id = p_plan_id) then raise exception 'membership plan not found'; end if;
  if nullif(btrim(p_cardholder_name), '') is null then raise exception 'cardholder name is required'; end if;
  if p_card_brand not in ('visa', 'mastercard', 'amex') then raise exception 'supported simulated card brand is required'; end if;
  if v_card_number !~ '^[0-9]{15,16}$' then raise exception 'simulated card number must contain 15 or 16 digits'; end if;
  if coalesce(p_security_code, '') !~ '^[0-9]{3,4}$' then raise exception 'simulated security code must contain 3 or 4 digits'; end if;
  if p_expiration_month not between 1 and 12 or make_date(p_expiration_year, p_expiration_month, 1) < date_trunc('month', current_date)::date then raise exception 'simulated payment method is expired'; end if;
  if coalesce(p_billing_zip, '') !~ '^[0-9]{5}(-[0-9]{4})?$' then raise exception 'valid billing ZIP is required'; end if;

  v_application_id := 'APP-' || upper(replace(gen_random_uuid()::text, '-', ''));
  v_payment_method_id := 'SPM-' || upper(replace(gen_random_uuid()::text, '-', ''));
  insert into public.membership_applications(
    application_id, first_name, last_name, email, phone, plan_id,
    status, submitted_at, reviewed_at
  ) values (
    v_application_id, btrim(p_first_name), btrim(p_last_name), v_email,
    nullif(btrim(p_phone), ''), p_plan_id, 'approved', v_submitted_at, v_submitted_at
  );
  insert into public.simulated_payment_methods(
    payment_method_id, application_id, cardholder_name, card_brand, last_four,
    expiration_month, expiration_year, billing_zip, is_default, status, created_at, updated_at
  ) values (
    v_payment_method_id, v_application_id, btrim(p_cardholder_name), p_card_brand, right(v_card_number, 4),
    p_expiration_month, p_expiration_year, p_billing_zip, true, 'active', v_submitted_at, v_submitted_at
  );
  return query select v_application_id, 'approved'::text, v_submitted_at;
exception when unique_violation then raise exception 'an active membership enrollment already exists for this email address';
end;
$$;

comment on table public.membership_applications is
  'Automatically accepted public enrollment records; approval does not create an auth identity or process a real payment.';

revoke all on function public.submit_membership_application(text,text,text,text,text,text,text,text,integer,integer,text,text) from public;
grant execute on function public.submit_membership_application(text,text,text,text,text,text,text,text,integer,integer,text,text) to anon, authenticated;

commit;
