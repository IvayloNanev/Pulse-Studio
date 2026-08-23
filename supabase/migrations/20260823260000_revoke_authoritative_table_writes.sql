-- Defense in depth: command-owned workflow tables must not retain direct DML
-- privileges. SECURITY DEFINER commands remain the only mutation surface.

begin;

revoke insert, update, delete on table
  public.class_sessions,
  public.reservations,
  public.drop_in_payments,
  public.notifications,
  public.waitlist_promotions,
  public.attendance_records,
  public.attendance_corrections,
  public.risk_assessments,
  public.outreach_records,
  public.risk_case_notes,
  public.outreach_actions,
  public.membership_pause_requests,
  public.class_session_actions
from authenticated;

comment on table public.reservations is
  'Authenticated clients have no direct DML privilege; authoritative booking and cancellation commands are the only write path.';
comment on table public.attendance_records is
  'Authenticated clients have no direct DML privilege; attendance commands enforce timing, uniqueness, and audit rules.';
comment on table public.risk_assessments is
  'Authenticated clients have no direct DML privilege; Product D commands enforce evaluation, concurrency, and workflow rules.';

commit;
