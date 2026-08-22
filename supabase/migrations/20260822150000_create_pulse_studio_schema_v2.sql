-- Pulse Studio canonical database schema
-- Schema contract: docs/02-canonical-technical-schema.md (2.0.0)
-- Business rules: docs/04-business-rules-v1.md

begin;

create extension if not exists btree_gist with schema extensions;

create type public.class_type as enum ('yoga', 'cycling', 'hiit');
create type public.membership_status as enum ('active', 'paused', 'cancelled');
create type public.reservation_status as enum ('confirmed', 'waitlisted', 'cancelled', 'studio_cancelled');
create type public.attendance_status as enum ('attended', 'no_show');
create type public.risk_level as enum ('medium', 'high');
create type public.risk_review_status as enum ('pending', 'in_progress', 'resolved', 'dismissed');
create type public.outreach_status as enum ('draft', 'ready', 'sent', 'completed');
create type public.outreach_channel as enum ('email', 'sms', 'phone');
create type public.outreach_response as enum ('interested', 'needs_support', 'not_interested', 'do_not_contact');
create type public.staff_role as enum ('owner_admin', 'instructor');
create type public.account_status as enum ('active', 'disabled');
create type public.pause_request_status as enum ('pending', 'approved', 'denied');
create type public.payment_status as enum ('authorized', 'refunded');
create type public.notification_status as enum ('simulated');
create type public.outreach_action_type as enum ('created', 'approved', 'sent', 'completed');

create table public.members (
  member_id text primary key,
  first_name text not null check (btrim(first_name) <> ''),
  last_name text not null check (btrim(last_name) <> ''),
  email text not null check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  phone text,
  preferred_channel public.outreach_channel not null default 'email',
  do_not_contact boolean not null default false,
  constraint members_phone_channel_check
    check (preferred_channel = 'email' or nullif(btrim(phone), '') is not null)
);
create unique index members_email_unique_ci on public.members (lower(email));

create table public.membership_plans (
  plan_id text primary key,
  plan_name text not null unique check (btrim(plan_name) <> ''),
  classes_per_month integer not null check (classes_per_month > 0),
  monthly_price numeric(10,2) not null check (monthly_price >= 0),
  constraint membership_plan_catalog_check check (
    (classes_per_month = 4 and monthly_price = 99.00) or
    (classes_per_month = 8 and monthly_price = 179.00) or
    (classes_per_month = 12 and monthly_price = 249.00)
  )
);

create table public.memberships (
  membership_id text primary key,
  member_id text not null references public.members(member_id) on update cascade on delete restrict,
  plan_id text not null references public.membership_plans(plan_id) on update cascade on delete restrict,
  status public.membership_status not null,
  start_date date not null,
  billing_cycle_start_date date not null,
  end_date date,
  agreed_monthly_price numeric(10,2) not null check (agreed_monthly_price >= 0),
  constraint memberships_date_order check (end_date is null or end_date >= start_date),
  constraint memberships_cancelled_end_date check (status <> 'cancelled' or end_date is not null)
);
create index memberships_member_idx on public.memberships(member_id);

create table public.staff_accounts (
  staff_id text primary key,
  auth_subject text not null unique,
  first_name text not null check (btrim(first_name) <> ''),
  last_name text not null check (btrim(last_name) <> ''),
  email text not null check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  role public.staff_role not null,
  account_status public.account_status not null default 'active',
  created_at timestamptz not null
);
create unique index staff_accounts_email_unique_ci on public.staff_accounts(lower(email));

create table public.member_accounts (
  account_id text primary key,
  member_id text not null unique references public.members(member_id) on update cascade on delete restrict,
  auth_subject text not null unique,
  email_verified boolean not null default false,
  account_status public.account_status not null default 'active',
  created_at timestamptz not null
);

create table public.membership_status_history (
  membership_status_history_id text primary key,
  membership_id text not null references public.memberships(membership_id) on update cascade on delete restrict,
  status public.membership_status not null,
  effective_at timestamptz not null,
  ended_at timestamptz,
  constraint membership_history_time_order check (ended_at is null or ended_at > effective_at),
  constraint membership_history_no_overlap exclude using gist (
    membership_id with =,
    tstzrange(effective_at, coalesce(ended_at, 'infinity'::timestamptz), '[)') with &&
  )
);
create index membership_history_membership_idx on public.membership_status_history(membership_id, effective_at);

create table public.membership_pause_requests (
  pause_request_id text primary key,
  membership_id text not null references public.memberships(membership_id) on update cascade on delete restrict,
  requested_at timestamptz not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.pause_request_status not null,
  approved_by_staff_id text references public.staff_accounts(staff_id) on update cascade on delete restrict,
  approved_at timestamptz,
  fee_amount numeric(10,2) not null default 0 check (fee_amount >= 0),
  constraint pause_request_notice check (starts_at >= requested_at + interval '30 days'),
  constraint pause_request_duration check (
    status <> 'approved' or
    (ends_at >= starts_at + interval '30 days' and ends_at <= starts_at + interval '90 days')
  ),
  constraint approved_pause_requirements check (
    status <> 'approved' or
    (approved_by_staff_id is not null and approved_at is not null and fee_amount = 25.00)
  ),
  constraint unapproved_pause_has_no_approval check (
    status = 'approved' or
    (approved_by_staff_id is null and approved_at is null and fee_amount = 0)
  )
);
create index pause_requests_membership_idx on public.membership_pause_requests(membership_id, requested_at);

create table public.class_sessions (
  class_session_id text primary key,
  class_type public.class_type not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity integer not null check (capacity > 0),
  is_cancelled boolean not null default false,
  instructor_staff_id text not null references public.staff_accounts(staff_id) on update cascade on delete restrict,
  constraint class_session_time_order check (ends_at > starts_at)
);
create index class_sessions_schedule_idx on public.class_sessions(starts_at) where not is_cancelled;

create table public.reservations (
  reservation_id text primary key,
  member_id text not null references public.members(member_id) on update cascade on delete restrict,
  class_session_id text not null references public.class_sessions(class_session_id) on update cascade on delete restrict,
  membership_id text references public.memberships(membership_id) on update cascade on delete restrict,
  status public.reservation_status not null,
  reserved_at timestamptz not null,
  cancelled_at timestamptz,
  is_late_cancellation boolean,
  constraint reservation_cancellation_fields check (
    (status = 'cancelled' and cancelled_at is not null and is_late_cancellation is not null) or
    (status <> 'cancelled' and cancelled_at is null and is_late_cancellation is null)
  )
);
create unique index reservations_one_open_per_member_session
  on public.reservations(member_id, class_session_id)
  where status not in ('cancelled', 'studio_cancelled');
create index reservations_session_status_idx on public.reservations(class_session_id, status);
create index reservations_member_idx on public.reservations(member_id, reserved_at desc);

create table public.drop_in_payments (
  payment_id text primary key,
  reservation_id text not null unique references public.reservations(reservation_id) on update cascade on delete restrict,
  member_id text not null references public.members(member_id) on update cascade on delete restrict,
  amount numeric(10,2) not null check (amount = 35.00),
  status public.payment_status not null,
  created_at timestamptz not null,
  refunded_at timestamptz,
  constraint payment_refund_fields check (
    (status = 'refunded' and refunded_at is not null) or
    (status = 'authorized' and refunded_at is null)
  )
);

create table public.notifications (
  notification_id text primary key,
  member_id text not null references public.members(member_id) on update cascade on delete restrict,
  event_type text not null check (event_type in ('booking_confirmed', 'waitlist_promoted', 'member_cancelled', 'studio_cancelled', 'class_changed', 'reengagement_outreach')),
  channel public.outreach_channel not null,
  status public.notification_status not null default 'simulated',
  created_at timestamptz not null,
  related_record_type text not null check (related_record_type in ('reservation', 'outreach')),
  related_record_id text not null
);
create index notifications_member_idx on public.notifications(member_id, created_at desc);

create table public.waitlist_promotions (
  promotion_id text primary key,
  reservation_id text not null unique references public.reservations(reservation_id) on update cascade on delete restrict,
  class_session_id text not null references public.class_sessions(class_session_id) on update cascade on delete restrict,
  promoted_at timestamptz not null,
  notification_id text not null unique references public.notifications(notification_id) on update cascade on delete restrict
);

create table public.attendance_records (
  attendance_record_id text primary key,
  reservation_id text not null unique references public.reservations(reservation_id) on update cascade on delete restrict,
  attendance_status public.attendance_status not null,
  recorded_at timestamptz not null
);

create table public.attendance_corrections (
  correction_id text primary key,
  attendance_record_id text not null references public.attendance_records(attendance_record_id) on update cascade on delete restrict,
  previous_status public.attendance_status not null,
  new_status public.attendance_status not null,
  reason text not null check (btrim(reason) <> ''),
  corrected_by_staff_id text not null references public.staff_accounts(staff_id) on update cascade on delete restrict,
  corrected_at timestamptz not null,
  constraint attendance_correction_changes_value check (previous_status <> new_status)
);
create index attendance_corrections_record_idx on public.attendance_corrections(attendance_record_id, corrected_at);

create table public.risk_assessments (
  risk_assessment_id text primary key,
  member_id text not null references public.members(member_id) on update cascade on delete restrict,
  evaluated_at timestamptz not null,
  previous_period_start timestamptz not null,
  previous_period_end timestamptz not null,
  current_period_start timestamptz not null,
  current_period_end timestamptz not null,
  previous_visits integer not null check (previous_visits >= 4),
  current_visits integer not null check (current_visits >= 0),
  decline_percentage numeric(5,1) not null check (decline_percentage between 50 and 100),
  risk_level public.risk_level not null,
  review_status public.risk_review_status not null default 'pending',
  resolved_at timestamptz,
  resolution_reason text,
  constraint risk_periods_check check (
    previous_period_end = current_period_start and
    current_period_end = evaluated_at and
    previous_period_start = previous_period_end - interval '30 days' and
    current_period_start = current_period_end - interval '30 days'
  ),
  constraint risk_decline_math check (
    decline_percentage = round(((previous_visits - current_visits)::numeric / previous_visits::numeric) * 100, 1)
  ),
  constraint risk_level_math check (
    (risk_level = 'medium' and decline_percentage >= 50 and decline_percentage < 75) or
    (risk_level = 'high' and decline_percentage >= 75 and decline_percentage <= 100)
  ),
  constraint risk_resolution_fields check (
    (review_status in ('resolved', 'dismissed') and resolved_at is not null and nullif(btrim(resolution_reason), '') is not null) or
    (review_status in ('pending', 'in_progress') and resolved_at is null and resolution_reason is null)
  ),
  unique(member_id, evaluated_at)
);
create index risk_queue_idx on public.risk_assessments(review_status, risk_level, evaluated_at desc);

create table public.outreach_records (
  outreach_id text primary key,
  risk_assessment_id text not null references public.risk_assessments(risk_assessment_id) on update cascade on delete restrict,
  member_id text not null references public.members(member_id) on update cascade on delete restrict,
  attempt_number integer not null check (attempt_number between 1 and 3),
  channel public.outreach_channel not null,
  original_message text not null check (btrim(original_message) <> ''),
  final_message text,
  status public.outreach_status not null default 'draft',
  response_outcome public.outreach_response,
  created_by_staff_id text not null references public.staff_accounts(staff_id) on update cascade on delete restrict,
  created_at timestamptz not null,
  approved_by_staff_id text references public.staff_accounts(staff_id) on update cascade on delete restrict,
  approved_at timestamptz,
  sent_by_staff_id text references public.staff_accounts(staff_id) on update cascade on delete restrict,
  sent_at timestamptz,
  completed_by_staff_id text references public.staff_accounts(staff_id) on update cascade on delete restrict,
  completed_at timestamptz,
  unique(risk_assessment_id, attempt_number),
  constraint outreach_ready_fields check (
    status = 'draft' or
    (nullif(btrim(final_message), '') is not null and approved_by_staff_id is not null and approved_at is not null)
  ),
  constraint outreach_sent_fields check (
    status not in ('sent', 'completed') or
    (sent_by_staff_id is not null and sent_at is not null)
  ),
  constraint outreach_completed_fields check (
    (status = 'completed' and completed_by_staff_id is not null and completed_at is not null and response_outcome is not null) or
    (status <> 'completed' and completed_by_staff_id is null and completed_at is null and response_outcome is null)
  )
);
create index outreach_member_idx on public.outreach_records(member_id, created_at desc);

create table public.risk_case_notes (
  note_id text primary key,
  member_id text not null references public.members(member_id) on update cascade on delete restrict,
  risk_assessment_id text references public.risk_assessments(risk_assessment_id) on update cascade on delete restrict,
  body text not null check (btrim(body) <> ''),
  created_by_staff_id text not null references public.staff_accounts(staff_id) on update cascade on delete restrict,
  created_at timestamptz not null,
  updated_by_staff_id text references public.staff_accounts(staff_id) on update cascade on delete restrict,
  updated_at timestamptz,
  deleted_by_staff_id text references public.staff_accounts(staff_id) on update cascade on delete restrict,
  deleted_at timestamptz,
  constraint risk_note_update_fields check ((updated_by_staff_id is null) = (updated_at is null)),
  constraint risk_note_delete_fields check ((deleted_by_staff_id is null) = (deleted_at is null)),
  constraint risk_note_time_order check (
    (updated_at is null or updated_at >= created_at) and
    (deleted_at is null or deleted_at >= created_at)
  )
);
create index risk_notes_member_idx on public.risk_case_notes(member_id, created_at desc) where deleted_at is null;

create table public.outreach_actions (
  action_id text primary key,
  outreach_id text not null references public.outreach_records(outreach_id) on update cascade on delete restrict,
  action public.outreach_action_type not null,
  staff_id text not null references public.staff_accounts(staff_id) on update cascade on delete restrict,
  occurred_at timestamptz not null
);
create index outreach_actions_outreach_idx on public.outreach_actions(outreach_id, occurred_at);

-- Cross-table safeguards that cannot be expressed as simple CHECK constraints.
create or replace function public.validate_class_instructor()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from public.staff_accounts s
    where s.staff_id = new.instructor_staff_id
      and s.role in ('owner_admin', 'instructor')
      and s.account_status = 'active'
  ) then
    raise exception 'class session instructor must be an active staff instructor or owner/admin';
  end if;
  return new;
end;
$$;

create trigger class_sessions_validate_instructor
before insert or update of instructor_staff_id on public.class_sessions
for each row execute function public.validate_class_instructor();

create or replace function public.validate_reservation()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_session public.class_sessions%rowtype;
  v_membership public.memberships%rowtype;
  v_confirmed integer;
begin
  select * into v_session from public.class_sessions where class_session_id = new.class_session_id for update;
  if not found then raise exception 'class session does not exist'; end if;
  if new.reserved_at > v_session.starts_at then raise exception 'reservation cannot be created after class starts'; end if;
  if v_session.is_cancelled and new.status in ('confirmed', 'waitlisted') then raise exception 'cancelled class cannot accept reservations'; end if;

  if new.membership_id is not null then
    select * into v_membership from public.memberships where membership_id = new.membership_id;
    if not found or v_membership.member_id <> new.member_id then raise exception 'membership must belong to reservation member'; end if;
    if new.reserved_at::date < v_membership.start_date or
       (v_membership.end_date is not null and v_session.starts_at::date > v_membership.end_date) or
       not exists (
         select 1 from public.membership_status_history h
         where h.membership_id = new.membership_id and h.status = 'active'
           and new.reserved_at >= h.effective_at and new.reserved_at < coalesce(h.ended_at, 'infinity'::timestamptz)
       ) or
       not exists (
         select 1 from public.membership_status_history h
         where h.membership_id = new.membership_id and h.status = 'active'
           and v_session.starts_at >= h.effective_at and v_session.starts_at < coalesce(h.ended_at, 'infinity'::timestamptz)
       ) then
      raise exception 'membership must be active at booking and class time';
    end if;
  end if;

  if new.status = 'confirmed' then
    select count(*) into v_confirmed from public.reservations r
    where r.class_session_id = new.class_session_id and r.status = 'confirmed'
      and r.reservation_id <> new.reservation_id;
    if v_confirmed >= v_session.capacity then raise exception 'class capacity exceeded'; end if;
  end if;
  return new;
end;
$$;

create trigger reservations_validate
before insert or update on public.reservations
for each row execute function public.validate_reservation();

create or replace function public.validate_attendance()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_reservation public.reservations%rowtype;
  v_session public.class_sessions%rowtype;
begin
  select * into v_reservation from public.reservations where reservation_id = new.reservation_id;
  select * into v_session from public.class_sessions where class_session_id = v_reservation.class_session_id;
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

create trigger attendance_validate
before insert or update on public.attendance_records
for each row execute function public.validate_attendance();

create or replace function public.validate_outreach()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_risk_member text;
  v_previous public.outreach_records%rowtype;
begin
  if tg_op = 'UPDATE' then
    if new.original_message is distinct from old.original_message then
      raise exception 'original outreach message is immutable';
    end if;
    if new.risk_assessment_id is distinct from old.risk_assessment_id or
       new.member_id is distinct from old.member_id or
       new.attempt_number is distinct from old.attempt_number or
       new.created_at is distinct from old.created_at then
      raise exception 'outreach identity and attempt facts are immutable';
    end if;
    if new.status <> old.status and not (
      (old.status = 'draft' and new.status = 'ready') or
      (old.status = 'ready' and new.status = 'sent') or
      (old.status = 'sent' and new.status = 'completed')
    ) then
      raise exception 'outreach states may not be skipped or reversed';
    end if;
  end if;

  select member_id into v_risk_member from public.risk_assessments where risk_assessment_id = new.risk_assessment_id;
  if v_risk_member <> new.member_id then raise exception 'outreach member must match risk assessment member'; end if;
  if exists (select 1 from public.members where member_id = new.member_id and do_not_contact)
     and not (new.status = 'completed' and new.response_outcome = 'do_not_contact') then
    raise exception 'member has opted out of re-engagement outreach';
  end if;
  if new.channel in ('sms', 'phone') and not exists (
    select 1 from public.members where member_id = new.member_id and nullif(btrim(phone), '') is not null
  ) then raise exception 'selected outreach channel requires a valid phone'; end if;

  if new.attempt_number > 1 then
    select * into v_previous from public.outreach_records
    where risk_assessment_id = new.risk_assessment_id and attempt_number = new.attempt_number - 1;
    if not found then raise exception 'outreach attempts must be sequential'; end if;
    if v_previous.sent_at is null or new.created_at < v_previous.sent_at + interval '14 days' then
      raise exception 'outreach retry requires 14 full days after the previous send';
    end if;
    if v_previous.response_outcome is not null then raise exception 'member response ends outreach retries'; end if;
  end if;
  return new;
end;
$$;

create trigger outreach_validate
before insert or update on public.outreach_records
for each row execute function public.validate_outreach();

create or replace function public.apply_do_not_contact_response()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'completed' and new.response_outcome = 'do_not_contact' then
    update public.members set do_not_contact = true where member_id = new.member_id;
  end if;
  return new;
end;
$$;

create trigger outreach_apply_do_not_contact
after insert or update of status, response_outcome on public.outreach_records
for each row execute function public.apply_do_not_contact_response();

-- The app uses authenticated server actions and explicit policies added in a
-- later migration. Until then, RLS intentionally denies Data API access.
alter table public.members enable row level security;
alter table public.membership_plans enable row level security;
alter table public.memberships enable row level security;
alter table public.staff_accounts enable row level security;
alter table public.member_accounts enable row level security;
alter table public.membership_status_history enable row level security;
alter table public.membership_pause_requests enable row level security;
alter table public.class_sessions enable row level security;
alter table public.reservations enable row level security;
alter table public.drop_in_payments enable row level security;
alter table public.notifications enable row level security;
alter table public.waitlist_promotions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.attendance_corrections enable row level security;
alter table public.risk_assessments enable row level security;
alter table public.outreach_records enable row level security;
alter table public.risk_case_notes enable row level security;
alter table public.outreach_actions enable row level security;

comment on schema public is 'Pulse Studio schema version 2.0.0';

commit;
