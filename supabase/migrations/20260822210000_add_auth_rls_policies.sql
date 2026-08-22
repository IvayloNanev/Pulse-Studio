-- Pulse Studio authentication helpers and row-level access policies.
-- Contract: docs/05-auth-and-access-contract.md

begin;

create or replace function public.current_member_id()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select member_id
  from public.member_accounts
  where auth_subject = auth.uid()::text
    and account_status = 'active'
  limit 1
$$;

create or replace function public.current_staff_id()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select staff_id
  from public.staff_accounts
  where auth_subject = auth.uid()::text
    and account_status = 'active'
  limit 1
$$;

create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.current_staff_id() is not null
$$;

create or replace function public.is_owner_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.staff_accounts
    where staff_id = public.current_staff_id()
      and role = 'owner_admin'
      and account_status = 'active'
  )
$$;

revoke all on function public.current_member_id() from public;
revoke all on function public.current_staff_id() from public;
revoke all on function public.is_active_staff() from public;
revoke all on function public.is_owner_admin() from public;
grant execute on function public.current_member_id() to authenticated;
grant execute on function public.current_staff_id() to authenticated;
grant execute on function public.is_active_staff() to authenticated;
grant execute on function public.is_owner_admin() to authenticated;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.membership_plans, public.class_sessions to anon;
grant select on public.membership_plans, public.class_sessions to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

create policy membership_plans_public_read on public.membership_plans
for select to anon, authenticated using (true);
create policy membership_plans_owner_manage on public.membership_plans
for all to authenticated using (public.is_owner_admin()) with check (public.is_owner_admin());

create policy class_sessions_public_read on public.class_sessions
for select to anon, authenticated using (not is_cancelled);
create policy class_sessions_staff_read on public.class_sessions
for select to authenticated using (public.is_active_staff());
create policy class_sessions_staff_manage on public.class_sessions
for all to authenticated using (public.is_active_staff()) with check (public.is_active_staff());

create policy members_self_read on public.members
for select to authenticated using (member_id = public.current_member_id());
create policy members_self_update on public.members
for update to authenticated using (member_id = public.current_member_id()) with check (member_id = public.current_member_id());
create policy members_staff_read on public.members
for select to authenticated using (public.is_active_staff());

create policy member_accounts_self_read on public.member_accounts
for select to authenticated using (member_id = public.current_member_id());
create policy member_accounts_owner_read on public.member_accounts
for select to authenticated using (public.is_owner_admin());

create policy staff_accounts_self_read on public.staff_accounts
for select to authenticated using (staff_id = public.current_staff_id());
create policy staff_accounts_owner_read on public.staff_accounts
for select to authenticated using (public.is_owner_admin());

create policy memberships_self_read on public.memberships
for select to authenticated using (member_id = public.current_member_id());
create policy memberships_staff_read on public.memberships
for select to authenticated using (public.is_active_staff());
create policy memberships_owner_manage on public.memberships
for all to authenticated using (public.is_owner_admin()) with check (public.is_owner_admin());

create policy membership_history_self_read on public.membership_status_history
for select to authenticated using (
  exists (select 1 from public.memberships m where m.membership_id = membership_status_history.membership_id and m.member_id = public.current_member_id())
);
create policy membership_history_staff_read on public.membership_status_history
for select to authenticated using (public.is_active_staff());
create policy membership_history_owner_manage on public.membership_status_history
for all to authenticated using (public.is_owner_admin()) with check (public.is_owner_admin());

create policy pause_requests_self_read on public.membership_pause_requests
for select to authenticated using (
  exists (select 1 from public.memberships m where m.membership_id = membership_pause_requests.membership_id and m.member_id = public.current_member_id())
);
create policy pause_requests_self_create on public.membership_pause_requests
for insert to authenticated with check (
  status = 'pending' and approved_by_staff_id is null and approved_at is null and fee_amount = 0 and
  exists (select 1 from public.memberships m where m.membership_id = membership_pause_requests.membership_id and m.member_id = public.current_member_id())
);
create policy pause_requests_staff_read on public.membership_pause_requests
for select to authenticated using (public.is_active_staff());
create policy pause_requests_owner_manage on public.membership_pause_requests
for all to authenticated using (public.is_owner_admin()) with check (public.is_owner_admin());

create policy reservations_self_read on public.reservations
for select to authenticated using (member_id = public.current_member_id());
create policy reservations_self_create on public.reservations
for insert to authenticated with check (
  member_id = public.current_member_id() and status in ('confirmed', 'waitlisted') and cancelled_at is null and is_late_cancellation is null
);
create policy reservations_self_cancel on public.reservations
for update to authenticated using (member_id = public.current_member_id())
with check (member_id = public.current_member_id() and status = 'cancelled' and cancelled_at is not null and is_late_cancellation is not null);
create policy reservations_staff_manage on public.reservations
for all to authenticated using (public.is_active_staff()) with check (public.is_active_staff());

create policy drop_in_payments_self_read on public.drop_in_payments
for select to authenticated using (member_id = public.current_member_id());
create policy drop_in_payments_self_create on public.drop_in_payments
for insert to authenticated with check (
  member_id = public.current_member_id() and amount = 35.00 and status = 'authorized' and refunded_at is null and
  exists (select 1 from public.reservations r where r.reservation_id = drop_in_payments.reservation_id and r.member_id = public.current_member_id())
);
create policy drop_in_payments_staff_read on public.drop_in_payments
for select to authenticated using (public.is_active_staff());
create policy drop_in_payments_owner_manage on public.drop_in_payments
for update to authenticated using (public.is_owner_admin()) with check (public.is_owner_admin());

create policy notifications_self_read on public.notifications
for select to authenticated using (member_id = public.current_member_id());
create policy notifications_staff_manage on public.notifications
for all to authenticated using (public.is_active_staff()) with check (public.is_active_staff());

create policy waitlist_promotions_self_read on public.waitlist_promotions
for select to authenticated using (
  exists (select 1 from public.reservations r where r.reservation_id = waitlist_promotions.reservation_id and r.member_id = public.current_member_id())
);
create policy waitlist_promotions_staff_manage on public.waitlist_promotions
for all to authenticated using (public.is_active_staff()) with check (public.is_active_staff());

create policy attendance_records_self_read on public.attendance_records
for select to authenticated using (
  exists (select 1 from public.reservations r where r.reservation_id = attendance_records.reservation_id and r.member_id = public.current_member_id())
);
create policy attendance_records_staff_manage on public.attendance_records
for all to authenticated using (public.is_active_staff()) with check (public.is_active_staff());

create policy attendance_corrections_staff_manage on public.attendance_corrections
for all to authenticated using (public.is_active_staff()) with check (public.is_active_staff());

create policy risk_assessments_staff_manage on public.risk_assessments
for all to authenticated using (public.is_active_staff()) with check (public.is_active_staff());
create policy outreach_records_staff_manage on public.outreach_records
for all to authenticated using (public.is_active_staff()) with check (public.is_active_staff());
create policy risk_case_notes_staff_manage on public.risk_case_notes
for all to authenticated using (public.is_active_staff()) with check (public.is_active_staff());
create policy outreach_actions_staff_read on public.outreach_actions
for select to authenticated using (public.is_active_staff());
create policy outreach_actions_staff_append on public.outreach_actions
for insert to authenticated with check (public.is_active_staff() and staff_id = public.current_staff_id());

alter function public.apply_do_not_contact_response() security definer;
alter function public.apply_do_not_contact_response() set search_path = public, pg_temp;

commit;
