alter table public.notifications
  add column if not exists read_at timestamptz;

create index if not exists notifications_member_unread_idx
  on public.notifications(member_id, created_at desc)
  where read_at is null;

create or replace function public.mark_member_notifications_read(
  p_notification_ids text[]
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_member_id text := public.current_member_id();
  v_updated integer;
begin
  if v_member_id is null then
    raise exception 'member authentication required';
  end if;

  if coalesce(cardinality(p_notification_ids), 0) = 0 then
    return 0;
  end if;

  update public.notifications
  set read_at = now()
  where member_id = v_member_id
    and notification_id = any(p_notification_ids)
    and read_at is null;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

revoke all on function public.mark_member_notifications_read(text[]) from public;
grant execute on function public.mark_member_notifications_read(text[]) to authenticated;

comment on column public.notifications.read_at is
  'Timestamp when the owning member checked the in-app notification.';

comment on function public.mark_member_notifications_read(text[]) is
  'Marks only the authenticated member''s selected notifications as read.';
