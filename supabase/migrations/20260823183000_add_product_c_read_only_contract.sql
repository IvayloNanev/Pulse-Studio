-- Product C read-only policy and authenticated member context contract.
-- Product C never receives mutation access to Products A, B, or D.

begin;

create table public.product_c_policy_answers (
  policy_key text primary key,
  category text not null check (category in ('classes', 'booking', 'cancellation', 'membership', 'credits', 'waitlist', 'support')),
  question text not null check (btrim(question) <> ''),
  answer text not null check (btrim(answer) <> ''),
  source_section text not null check (btrim(source_section) <> ''),
  sort_order integer not null unique check (sort_order > 0)
);

insert into public.product_c_policy_answers(policy_key, category, question, answer, source_section, sort_order) values
  ('supported-classes', 'classes', 'What classes does Pulse Studio offer?', 'Pulse Studio offers yoga, cycling, and HIIT classes. Check the current schedule for session times and live availability.', 'Business Rules v1 §11', 10),
  ('class-preparation', 'classes', 'How should I prepare for class?', 'Class-specific level and preparation details are not defined in the approved studio rules. Please ask Pulse Studio staff for guidance about a specific session.', 'Business Rules v1 §2', 20),
  ('booking-eligibility', 'booking', 'Who can book a class?', 'A membership booking requires your membership to be active both when you book and when the class occurs. You may hold only one open reservation for the same session.', 'Business Rules v1 §5', 30),
  ('full-class', 'waitlist', 'What happens when a class is full?', 'You may choose to join the waitlist. Waitlisting does not use capacity or a credit. When a spot opens, the earliest eligible waitlisted member is promoted automatically before class starts.', 'Business Rules v1 §5–6', 40),
  ('cancellation-window', 'cancellation', 'When is a cancellation late?', 'A member cancellation is late only when it occurs less than 12 hours before class. A cancellation exactly 12 hours before class is early.', 'Business Rules v1 §8', 50),
  ('credit-outcomes', 'credits', 'Which outcomes use a class credit?', 'Attended classes, confirmed no-shows, and late member cancellations use one credit. Early member cancellations, studio cancellations, and waitlist-only entries use no credit.', 'Business Rules v1 §7', 60),
  ('drop-in', 'credits', 'Can I book after using all included credits?', 'You may make an additional booking with a simulated $35 drop-in payment. This school MVP does not charge a real card.', 'Business Rules v1 §7', 70),
  ('plan-prices', 'membership', 'What membership plans are available?', 'Pulse Studio offers 4 classes monthly for $99, 8 classes monthly for $179, and 12 classes monthly for $249. Existing memberships retain their agreed price until staff explicitly changes or renews them.', 'Business Rules v1 §3', 80),
  ('membership-pause', 'membership', 'Can I pause my membership?', 'A pause requires owner approval and 30 days advance notice. It lasts 30 to 90 days, is limited to once in a rolling 12 months, and has a simulated $25 fee.', 'Business Rules v1 §9', 90),
  ('unsupported-question', 'support', 'What if the assistant cannot answer?', 'The assistant must not invent a policy or availability fact. Please contact Pulse Studio staff for help.', 'Business Rules v1 §2', 100);

alter table public.product_c_policy_answers enable row level security;
create policy product_c_policy_answers_public_read on public.product_c_policy_answers
for select to anon, authenticated using (true);

revoke all on public.product_c_policy_answers from public;
grant select on public.product_c_policy_answers to anon, authenticated;

create or replace function public.product_c_member_context(
  p_from timestamptz default now(),
  p_as_of timestamptz default now()
)
returns table (
  member_summary jsonb,
  upcoming_reservations jsonb
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    coalesce((select to_jsonb(dashboard) from public.member_dashboard(p_as_of) as dashboard), '{}'::jsonb),
    coalesce((
      select jsonb_agg(to_jsonb(reservation) order by reservation.starts_at)
      from public.member_reservations(p_from) as reservation
    ), '[]'::jsonb)
  where public.current_member_id() is not null
$$;

comment on table public.product_c_policy_answers is
  'Approved general-answer facts for the read-only Product C member-support assistant.';
comment on function public.product_c_member_context(timestamptz, timestamptz) is
  'Returns only the authenticated member credit summary and upcoming reservations for Product C answers.';

revoke all on function public.product_c_member_context(timestamptz, timestamptz) from public;
grant execute on function public.product_c_member_context(timestamptz, timestamptz) to authenticated;

commit;
