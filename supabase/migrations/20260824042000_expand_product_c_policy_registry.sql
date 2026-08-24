-- Complete the approved Product C member-concierge policy registry.

begin;

insert into public.product_c_policy_answers (
  policy_key, category, question, answer, source_section, sort_order
) values
  (
    'class-levels', 'classes', 'Which class levels are appropriate for me?',
    'Yoga and cycling are designed for all levels. HIIT is intermediate by default, and instructors can offer modifications. Instructors cannot provide medical clearance or treatment advice.',
    'Business Rules v1 §11', 110
  ),
  (
    'late-arrival', 'classes', 'Can I arrive late and still enter class?',
    'Please arrive before class starts. Entry up to 5 minutes late is at the instructor’s discretion; after 5 minutes, entry is not permitted. The separate staff check-in window does not guarantee late admission.',
    'Business Rules v1 §11', 120
  ),
  (
    'credit-rollover', 'credits', 'Do unused membership credits roll over?',
    'Unused included credits expire at the end of their applicable pause-adjusted billing cycle and do not roll over.',
    'Business Rules v1 §3', 130
  ),
  (
    'studio-cancellation', 'cancellation', 'What happens if Pulse Studio cancels a class?',
    'A studio cancellation cancels affected reservations automatically, restores any applicable membership credit or simulated drop-in payment, and notifies confirmed and waitlisted members.',
    'Business Rules v1 §8', 140
  ),
  (
    'plan-change', 'membership', 'How do I change my membership plan?',
    'An active member may confirm a plan change in Account without owner approval. The change is scheduled automatically for the next billing-cycle boundary after the member reviews the new price, allowance, and effective date.',
    'Business Rules v1 §3', 150
  ),
  (
    'membership-cancellation', 'membership', 'How do I cancel my membership?',
    'Membership cancellation is a self-service Account confirmation with 30 days notice. You may withdraw the scheduled cancellation before its effective date. Pulse Assistant can explain or link to the workflow but cannot submit it for you.',
    'Business Rules v1 §10', 160
  ),
  (
    'membership-reactivation', 'membership', 'How do I reactivate a cancelled membership?',
    'After cancellation, reactivation uses the enrollment flow to create a new membership at the current plan price; the previous membership is not reopened.',
    'Business Rules v1 §10', 170
  ),
  (
    'account-recovery', 'support', 'How do I reset my password?',
    'Use “Forgot or need to create your password?” on the member login page. Pulse Assistant will never ask for or handle your password or recovery code.',
    'Authentication contract v1 §Recovery', 180
  ),
  (
    'notifications', 'support', 'Where can I see my notifications?',
    'Open the in-app Notifications center for the authoritative message status. Opening a notification marks it read, and Mark all read clears the unread list. Email and SMS delivery are simulated in this school MVP.',
    'Business Rules v1 §15', 190
  ),
  (
    'studio-support', 'support', 'How do I contact Pulse Studio?',
    'Contact Pulse Studio at support@pulsestudio.com or (212) 555-0198. Staffed support hours are Monday through Friday, 6:00 AM–9:00 PM ET, and weekends, 8:00 AM–6:00 PM ET. Email responses are targeted within one business day.',
    'Business Rules v1 §16', 200
  ),
  (
    'medical-safety', 'support', 'Can you give me medical or injury advice?',
    'Pulse Assistant and instructors cannot diagnose, treat, or provide medical clearance. For an immediate health or safety emergency, contact local emergency services and on-site staff.',
    'Business Rules v1 §16', 210
  )
on conflict (policy_key) do update
set category = excluded.category,
    question = excluded.question,
    answer = excluded.answer,
    source_section = excluded.source_section,
    sort_order = excluded.sort_order;

commit;
