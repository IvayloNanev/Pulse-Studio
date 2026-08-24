-- Complete the school-project payment lifecycle with non-sensitive simulated methods.
-- Full card numbers and security codes are validated by the intake command and never stored.

begin;

create table public.simulated_payment_methods (
  payment_method_id text primary key,
  member_id text references public.members(member_id) on update cascade on delete restrict,
  application_id text references public.membership_applications(application_id) on update cascade on delete restrict,
  cardholder_name text not null check (btrim(cardholder_name) <> ''),
  card_brand text not null check (card_brand in ('visa', 'mastercard', 'amex')),
  last_four text not null check (last_four ~ '^[0-9]{4}$'),
  expiration_month integer not null check (expiration_month between 1 and 12),
  expiration_year integer not null check (expiration_year between 2026 and 2100),
  billing_zip text not null check (billing_zip ~ '^[0-9]{5}(-[0-9]{4})?$'),
  is_default boolean not null default true,
  status text not null default 'active' check (status in ('active', 'removed', 'expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint simulated_payment_method_owner check (num_nonnulls(member_id, application_id) = 1)
);

create unique index simulated_payment_methods_application_unique
  on public.simulated_payment_methods(application_id) where application_id is not null;
create unique index simulated_payment_methods_member_default_unique
  on public.simulated_payment_methods(member_id) where member_id is not null and is_default and status = 'active';
create index simulated_payment_methods_member_idx on public.simulated_payment_methods(member_id, created_at desc);

alter table public.simulated_payment_methods enable row level security;
create policy simulated_payment_methods_self_read on public.simulated_payment_methods
for select to authenticated using (member_id = public.current_member_id());
create policy simulated_payment_methods_staff_read on public.simulated_payment_methods
for select to authenticated using (public.is_active_staff());

revoke all on public.simulated_payment_methods from public, anon, authenticated;
grant select on public.simulated_payment_methods to authenticated;

comment on table public.simulated_payment_methods is
  'School-project payment methods containing display-only simulated card facts; full numbers and security codes are never stored.';

insert into public.simulated_payment_methods (
  payment_method_id, member_id, cardholder_name, card_brand, last_four,
  expiration_month, expiration_year, billing_zip, is_default, status, created_at, updated_at
)
select
  'SPM-' || member.member_id,
  member.member_id,
  concat_ws(' ', member.first_name, member.last_name),
  case mod(length(member.member_id), 3) when 0 then 'visa' when 1 then 'mastercard' else 'amex' end,
  right('0000' || coalesce(nullif(regexp_replace(member.member_id, '[^0-9]', '', 'g'), ''), '4242'), 4),
  mod(length(member.member_id), 12) + 1,
  2029 + mod(length(member.member_id), 3),
  '10001',
  true,
  'active',
  now(),
  now()
from public.members as member
on conflict (payment_method_id) do nothing;

alter table public.drop_in_payments add column payment_method_id text;
update public.drop_in_payments as payment
set payment_method_id = method.payment_method_id
from public.simulated_payment_methods as method
where method.member_id = payment.member_id and method.is_default and method.status = 'active';
alter table public.drop_in_payments alter column payment_method_id set not null;
alter table public.drop_in_payments add constraint drop_in_payment_method_fk
  foreign key (payment_method_id) references public.simulated_payment_methods(payment_method_id) on update cascade on delete restrict;

create function public.assign_default_simulated_payment_method()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.payment_method_id is null then
    select method.payment_method_id into new.payment_method_id
    from public.simulated_payment_methods as method
    where method.member_id = new.member_id and method.is_default and method.status = 'active'
    order by method.created_at desc limit 1;
  end if;
  if new.payment_method_id is null then raise exception 'an active simulated payment method is required'; end if;
  if not exists (select 1 from public.simulated_payment_methods method where method.payment_method_id = new.payment_method_id and method.member_id = new.member_id and method.status = 'active') then
    raise exception 'simulated payment method is unavailable for this member';
  end if;
  return new;
end;
$$;

create trigger drop_in_payment_method_assignment
before insert on public.drop_in_payments
for each row execute function public.assign_default_simulated_payment_method();

drop function public.submit_membership_application(text, text, text, text, text);
create function public.submit_membership_application(
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
  insert into public.membership_applications(application_id, first_name, last_name, email, phone, plan_id, submitted_at)
  values (v_application_id, btrim(p_first_name), btrim(p_last_name), v_email, nullif(btrim(p_phone), ''), p_plan_id, v_submitted_at);
  insert into public.simulated_payment_methods(
    payment_method_id, application_id, cardholder_name, card_brand, last_four,
    expiration_month, expiration_year, billing_zip, is_default, status, created_at, updated_at
  ) values (
    v_payment_method_id, v_application_id, btrim(p_cardholder_name), p_card_brand, right(v_card_number, 4),
    p_expiration_month, p_expiration_year, p_billing_zip, true, 'active', v_submitted_at, v_submitted_at
  );
  return query select v_application_id, 'pending'::text, v_submitted_at;
exception when unique_violation then raise exception 'an active membership application already exists for this email address';
end;
$$;

revoke all on function public.submit_membership_application(text,text,text,text,text,text,text,text,integer,integer,text,text) from public;
grant execute on function public.submit_membership_application(text,text,text,text,text,text,text,text,integer,integer,text,text) to anon, authenticated;

commit;
