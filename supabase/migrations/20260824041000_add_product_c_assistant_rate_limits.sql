-- Automatic Product C abuse and model-spend protection.

begin;

create table public.product_c_assistant_usage (
  member_id text primary key references public.members(member_id) on update cascade on delete cascade,
  request_window_started_at timestamptz not null default clock_timestamp(),
  request_count integer not null default 0 check (request_count >= 0),
  model_day date not null default (timezone('America/New_York', clock_timestamp()))::date,
  model_count integer not null default 0 check (model_count >= 0),
  updated_at timestamptz not null default clock_timestamp()
);

alter table public.product_c_assistant_usage enable row level security;
revoke all on public.product_c_assistant_usage from public, anon, authenticated;

create or replace function public.consume_product_c_assistant_quota(p_bucket text)
returns table (allowed boolean, retry_after_seconds integer, remaining integer)
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_member_id text := public.current_member_id();
  v_now timestamptz := clock_timestamp();
  v_today date := (timezone('America/New_York', v_now))::date;
  v_usage public.product_c_assistant_usage%rowtype;
  v_limit integer;
begin
  if v_member_id is null then
    raise exception 'member access required';
  end if;
  if p_bucket is null or p_bucket not in ('request', 'model') then
    raise exception 'invalid assistant quota bucket';
  end if;

  insert into public.product_c_assistant_usage (member_id)
  values (v_member_id)
  on conflict (member_id) do nothing;

  select * into v_usage
  from public.product_c_assistant_usage
  where member_id = v_member_id
  for update;

  if p_bucket = 'request' then
    v_limit := 20;
    if v_now >= v_usage.request_window_started_at + interval '1 minute' then
      v_usage.request_window_started_at := v_now;
      v_usage.request_count := 0;
    end if;
    if v_usage.request_count >= v_limit then
      return query select false,
        greatest(1, ceil(extract(epoch from (v_usage.request_window_started_at + interval '1 minute' - v_now)))::integer),
        0;
      return;
    end if;
    update public.product_c_assistant_usage
    set request_window_started_at = v_usage.request_window_started_at,
        request_count = v_usage.request_count + 1,
        updated_at = v_now
    where member_id = v_member_id;
    return query select true, 0, v_limit - v_usage.request_count - 1;
    return;
  end if;

  v_limit := 50;
  if v_usage.model_day <> v_today then
    v_usage.model_day := v_today;
    v_usage.model_count := 0;
  end if;
  if v_usage.model_count >= v_limit then
    return query select false,
      greatest(1, ceil(extract(epoch from (((v_today + 1)::timestamp at time zone 'America/New_York') - v_now)))::integer),
      0;
    return;
  end if;
  update public.product_c_assistant_usage
  set model_day = v_usage.model_day,
      model_count = v_usage.model_count + 1,
      updated_at = v_now
  where member_id = v_member_id;
  return query select true, 0, v_limit - v_usage.model_count - 1;
end;
$$;

revoke all on function public.consume_product_c_assistant_quota(text) from public;
grant execute on function public.consume_product_c_assistant_quota(text) to authenticated;

commit;
