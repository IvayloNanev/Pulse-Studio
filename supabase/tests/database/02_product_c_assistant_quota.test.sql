begin;

create extension if not exists pgtap with schema extensions;
select plan(9);

insert into public.members (member_id, first_name, last_name, email, preferred_channel, do_not_contact)
values ('TEST-MEM-C-QUOTA', 'Assistant', 'Quota', 'assistant.quota@pulse.example', 'email', false);

insert into public.member_accounts (account_id, member_id, auth_subject, email_verified, account_status, created_at)
values ('TEST-ACC-C-QUOTA', 'TEST-MEM-C-QUOTA', '33333333-3333-4333-8333-333333333333', true, 'active', now());

select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);

select ok(
  has_function_privilege('authenticated', 'public.consume_product_c_assistant_quota(text)', 'EXECUTE'),
  'authenticated members can consume Assistant quota'
);
select ok(
  not has_table_privilege('authenticated', 'public.product_c_assistant_usage', 'SELECT'),
  'members cannot read internal Assistant usage counters'
);
select ok(
  not has_table_privilege('authenticated', 'public.product_c_assistant_usage', 'UPDATE'),
  'members cannot alter internal Assistant usage counters'
);

create temporary table first_request as
select * from public.consume_product_c_assistant_quota('request');
select is((select allowed from first_request), true, 'first request in a minute is allowed');
select is((select remaining from first_request), 19, 'request quota reports the remaining minute allowance');

update public.product_c_assistant_usage
set request_count = 20
where member_id = 'TEST-MEM-C-QUOTA';
create temporary table blocked_request as
select * from public.consume_product_c_assistant_quota('request');
select is((select allowed from blocked_request), false, 'twenty-first request in a minute is blocked');
select cmp_ok((select retry_after_seconds from blocked_request), '>', 0, 'blocked request reports a positive retry delay');

update public.product_c_assistant_usage
set model_count = 50,
    model_day = (timezone('America/New_York', clock_timestamp()))::date
where member_id = 'TEST-MEM-C-QUOTA';
create temporary table blocked_model as
select * from public.consume_product_c_assistant_quota('model');
select is((select allowed from blocked_model), false, 'daily model call beyond the budget is blocked');

select throws_ok(
  $$select * from public.consume_product_c_assistant_quota('unknown')$$,
  'P0001',
  'invalid assistant quota bucket',
  'unknown quota buckets are rejected'
);

select * from finish();
rollback;
