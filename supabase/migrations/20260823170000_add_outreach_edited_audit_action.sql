-- Add the missing audit vocabulary before Product D edit commands use it.
alter type public.outreach_action_type add value if not exists 'edited';
