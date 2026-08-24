-- Align Pulse Assistant guidance with the class preparation information shown
-- in the member Services experience.

begin;

update public.product_c_policy_answers
set
  answer = 'Preparation depends on the class. Ask about yoga, cycling, or HIIT for approved clothing and arrival guidance.',
  source_section = 'Member experience specification v1 §Class preparation'
where policy_key = 'class-preparation';

insert into public.product_c_policy_answers (
  policy_key,
  category,
  question,
  answer,
  source_section,
  sort_order
) values
  (
    'yoga-preparation',
    'classes',
    'What should I wear and how should I prepare for yoga?',
    'Wear comfortable, flexible athletic clothing that lets you move freely. Arrive a few minutes early so you can settle in before yoga begins.',
    'Member experience specification v1 §Class preparation',
    21
  ),
  (
    'cycling-preparation',
    'classes',
    'What should I wear and how should I prepare for cycling?',
    'Wear comfortable athletic clothing and arrive a few minutes early. An instructor can help you adjust your bike before cycling begins.',
    'Member experience specification v1 §Class preparation',
    22
  ),
  (
    'hiit-preparation',
    'classes',
    'What should I wear and how should I prepare for HIIT?',
    'Wear comfortable athletic clothing and supportive training shoes, and bring water. Tell the instructor before HIIT begins if you need a modification.',
    'Member experience specification v1 §Class preparation',
    23
  )
on conflict (policy_key) do update
set
  category = excluded.category,
  question = excluded.question,
  answer = excluded.answer,
  source_section = excluded.source_section,
  sort_order = excluded.sort_order;

commit;
