begin;

-- Retire test-only staff accounts and their assigned test sessions while
-- retaining records for auditability.
update public.staff_accounts
set account_status = 'disabled'
where staff_id in ('TEST-EOD-OWNER', 'TEST-EOD-ASSIGNED', 'TEST-EOD-UNRELATED');

update public.class_sessions
set is_cancelled = true
where instructor_staff_id = 'TEST-EOD-ASSIGNED'
  and is_cancelled = false;

commit;
