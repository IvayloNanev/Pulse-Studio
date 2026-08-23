-- Product B authoritative attendance write commands.
-- Contract: docs/06-shared-api-contracts-v1.md

begin;

create or replace function public.validate_attendance()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_reservation public.reservations%rowtype;
  v_session public.class_sessions%rowtype;
  v_correction_id text;
begin
  if tg_op = 'UPDATE' and new.attendance_status is distinct from old.attendance_status then
    if new.reservation_id is distinct from old.reservation_id
      or new.recorded_at is distinct from old.recorded_at then
      raise exception 'attendance reservation and original recorded time are immutable';
    end if;

    v_correction_id := current_setting('pulse.attendance_correction_id', true);
    if v_correction_id is null or not exists (
      select 1
      from public.attendance_corrections as correction
      where correction.correction_id = v_correction_id
        and correction.attendance_record_id = old.attendance_record_id
        and correction.previous_status = old.attendance_status
        and correction.new_status = new.attendance_status
        and correction.corrected_by_staff_id = public.current_staff_id()
    ) then
      raise exception 'attendance outcome changes require an audited correction';
    end if;

    return new;
  end if;

  select * into v_reservation
  from public.reservations
  where reservation_id = new.reservation_id;

  select * into v_session
  from public.class_sessions
  where class_session_id = v_reservation.class_session_id;

  if v_reservation.status <> 'confirmed' or v_session.is_cancelled then
    raise exception 'attendance requires a confirmed reservation on a non-cancelled session';
  end if;
  if new.attendance_status = 'attended' and
     (new.recorded_at < v_session.starts_at - interval '15 minutes' or new.recorded_at > v_session.starts_at + interval '20 minutes') then
    raise exception 'attended check-in is outside the valid window';
  end if;
  if new.attendance_status = 'no_show' and new.recorded_at < v_session.starts_at + interval '20 minutes' then
    raise exception 'no-show cannot be recorded before the check-in window closes';
  end if;
  return new;
end;
$$;

drop policy if exists attendance_records_staff_manage on public.attendance_records;
create policy attendance_records_staff_read on public.attendance_records
for select to authenticated
using (public.is_active_staff());

drop policy if exists attendance_corrections_staff_manage on public.attendance_corrections;
create policy attendance_corrections_staff_read on public.attendance_corrections
for select to authenticated
using (public.is_active_staff());

create or replace function public.record_attendance(
  p_reservation_id text,
  p_attendance_status public.attendance_status
)
returns table (
  attendance_record_id text,
  reservation_id text,
  attendance_status text,
  recorded_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_attendance_record_id text;
begin
  if not public.is_active_staff() then
    raise exception 'active staff account required';
  end if;

  if exists (
    select 1
    from public.attendance_records as attendance
    where attendance.reservation_id = p_reservation_id
  ) then
    raise exception 'attendance has already been recorded for this reservation';
  end if;

  v_attendance_record_id := 'ATT-' || upper(replace(gen_random_uuid()::text, '-', ''));

  insert into public.attendance_records (
    attendance_record_id,
    reservation_id,
    attendance_status,
    recorded_at
  ) values (
    v_attendance_record_id,
    p_reservation_id,
    p_attendance_status,
    v_now
  );

  return query
  select v_attendance_record_id, p_reservation_id, p_attendance_status::text, v_now;
end;
$$;

create or replace function public.correct_attendance(
  p_attendance_record_id text,
  p_new_status public.attendance_status,
  p_reason text
)
returns table (
  correction_id text,
  attendance_record_id text,
  previous_status text,
  new_status text,
  corrected_by_staff_id text,
  corrected_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_now timestamptz := now();
  v_staff_id text := public.current_staff_id();
  v_attendance public.attendance_records%rowtype;
  v_correction_id text;
begin
  if v_staff_id is null then
    raise exception 'active staff account required';
  end if;

  if nullif(btrim(p_reason), '') is null then
    raise exception 'attendance correction reason is required';
  end if;

  select attendance.*
  into v_attendance
  from public.attendance_records as attendance
  where attendance.attendance_record_id = p_attendance_record_id
  for update;

  if not found then
    raise exception 'attendance record not found';
  end if;

  if v_attendance.attendance_status = p_new_status then
    raise exception 'attendance correction must change the outcome';
  end if;

  v_correction_id := 'CORR-' || upper(replace(gen_random_uuid()::text, '-', ''));

  insert into public.attendance_corrections (
    correction_id,
    attendance_record_id,
    previous_status,
    new_status,
    reason,
    corrected_by_staff_id,
    corrected_at
  ) values (
    v_correction_id,
    p_attendance_record_id,
    v_attendance.attendance_status,
    p_new_status,
    btrim(p_reason),
    v_staff_id,
    v_now
  );

  perform set_config('pulse.attendance_correction_id', v_correction_id, true);

  update public.attendance_records
  set attendance_status = p_new_status
  where public.attendance_records.attendance_record_id = p_attendance_record_id;

  return query
  select
    v_correction_id,
    p_attendance_record_id,
    v_attendance.attendance_status::text,
    p_new_status::text,
    v_staff_id,
    v_now;
end;
$$;

comment on function public.record_attendance(text, public.attendance_status) is
  'Records an authoritative attended or no-show outcome for active staff using the database clock.';
comment on function public.correct_attendance(text, public.attendance_status, text) is
  'Changes an attendance outcome only after persisting an attributable correction with a required reason.';

revoke all on function public.record_attendance(text, public.attendance_status) from public;
revoke all on function public.correct_attendance(text, public.attendance_status, text) from public;
grant execute on function public.record_attendance(text, public.attendance_status) to authenticated;
grant execute on function public.correct_attendance(text, public.attendance_status, text) to authenticated;

commit;
