begin;

create or replace function public.member_waitlist_position(
  p_reservation_id text
)
returns integer
language plpgsql
stable
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_member_id text := public.current_member_id();
  v_session_id text;
  v_reserved_at timestamptz;
  v_position integer;
begin
  select reservation.class_session_id, reservation.reserved_at
  into v_session_id, v_reserved_at
  from public.reservations as reservation
  where reservation.reservation_id = p_reservation_id
    and reservation.member_id = v_member_id
    and reservation.status = 'waitlisted';

  if not found then
    return null;
  end if;

  select count(*)::integer
  into v_position
  from public.reservations as reservation
  where reservation.class_session_id = v_session_id
    and reservation.status = 'waitlisted'
    and (reservation.reserved_at, reservation.reservation_id) <= (v_reserved_at, p_reservation_id);

  return v_position;
end;
$$;

comment on function public.member_waitlist_position(text) is
  'Returns the authenticated member reservation position in the FIFO waitlist without exposing other members.';

revoke all on function public.member_waitlist_position(text) from public;
grant execute on function public.member_waitlist_position(text) to authenticated;

commit;
