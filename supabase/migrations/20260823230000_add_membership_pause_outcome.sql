-- Add an explicit reservation outcome for automatic cancellation caused by an
-- approved membership pause. Enum values must be committed before later use.

begin;

alter type public.reservation_status add value if not exists 'membership_paused';

commit;
