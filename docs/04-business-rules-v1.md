# Pulse Studio Business Rules v1

**Status:** approved rule-by-rule; consolidated for final document review  
**Approved through:** Decision 74  
**Authority:** original Pulse Studio project overview plus the team's explicit rule decisions  
**Business timezone:** `America/New_York`

## 1. Purpose and precedence

This document is the business-rule gate for the Pulse Studio backend and shared product interfaces. The original product descriptions control whenever an older planning document conflicts with them.

All four products use one shared database and API contract with the same identifiers, fields, statuses, and definitions. Invalid imported rows are quarantined and reported; they are never silently corrected or loaded into live application tables.

This document intentionally comes before the next schema and dataset revision. Rules approved here may require new tables, fields, enums, validation logic, fixtures, or migrations. Until that reconciliation is approved, the current schema and dataset remain the existing technical baseline rather than proof that every rule below is implemented.

## 2. Product ownership

### Product A — Member Booking App

Product A owns the member booking experience:

- weekly schedule and class details;
- current availability;
- confirmed reservations and waitlists;
- reservation cancellation;
- upcoming and historical bookings;
- membership-credit and simulated drop-in booking choices;
- the returning-member rebooking flow.

Product A creates reservation facts used by Product B.

### Product B — Staff Scheduling Dashboard

Product B owns studio scheduling and attendance operations:

- upcoming sessions, capacity, demand, and underbooked warnings;
- confirmed and waitlisted rosters;
- check-in, attended, and no-show outcomes;
- audited staff corrections to attendance.

Product B creates attendance facts used by Product D.

### Product C — Member Support Chatbot

Product C is a member-support chatbot. It answers questions about:

- class levels and preparation;
- booking and cancellation rules;
- membership policies and prices;
- the current schedule and availability;
- authenticated member credits and reservations.

Before login, Product C may answer only general questions. After login, it may read member-specific credits and reservations, but it directs the member to Product A for booking and cancellation actions. Product C reads the same shared database/API used by Products A and B and must not invent policy, schedule, price, or availability facts. When it cannot answer confidently from approved shared information, it says so and directs the member to studio staff.

Product C may not create, edit, approve, send, complete, or otherwise mutate risk assessments, outreach records, or Product D case notes.

### Product D — Member Re-engagement Tool

Product D owns the complete staff re-engagement workflow:

- calculate meaningful attendance decline;
- create and prioritize risk cases;
- show factual evidence for each flag;
- recommend a current class using Product A's schedule;
- create, preserve, edit, and approve outreach drafts;
- simulate outreach sending;
- record member responses and follow-up attempts;
- support coworker notes;
- resolve or dismiss risk cases.

Product D may direct a member to Product C for follow-up questions and Product A for rebooking. Product C never owns Product D outreach.

## 3. Membership plans and pricing

Pulse Studio offers these monthly plans:

| Plan | Monthly price | Included classes |
|---|---:|---:|
| 4 Classes Monthly | $99 | 4 |
| 8 Classes Monthly | $179 | 8 |
| 12 Classes Monthly | $249 | 12 |

- Existing members keep their agreed price until they confirm a plan change or staff explicitly changes or renews the membership.
- A price change does not silently rewrite historical membership pricing.
- Unused included credits expire at the end of the applicable billing cycle and do not roll over.
- A cancelled member who returns receives a new active membership at the current plan price.
- The previous membership remains historical and expired credits are not restored.
- An active member may request a plan change from the member Account experience without owner/admin approval.
- Before confirmation, the interface shows the requested plan's included classes, current price, and effective date.
- A confirmed plan change is scheduled automatically for the next billing-cycle boundary.
- The current plan, price, credits, and reservations remain unchanged through the current billing cycle.
- At the next cycle boundary, the requested plan and its then-confirmed price become the new agreed membership terms.
- Pulse Assistant may explain plan options and link to Account but cannot submit or confirm the change in chat.

## 4. Authentication, accounts, and permissions

Pulse Studio will implement real account registration and login, email verification, and password recovery.

Roles are:

- `member`;
- `instructor`;
- `owner_admin`.

Rules:

- each verified email belongs to one account;
- public registration creates member accounts only;
- an existing owner/admin invites instructor or owner/admin accounts;
- Product D is accessible to instructors and owner/admins;
- instructors and owner/admins have equal Product D permissions to review evidence, add or manage notes, edit and approve drafts, simulate sends, and complete cases;
- global Product D retention reads are provided through dedicated Product D interfaces that validate the active Staff actor internally;
- Product D access does not grant instructors unrestricted direct access to canonical member, reservation, membership, or attendance records;
- the system records which staff account performs each sensitive Product D action and when.

## 5. Reservation eligibility and capacity

- A reservation references one member, class session, and applicable membership or simulated drop-in payment.
- A membership booking requires the membership to belong to the member and be active when booking and when the class occurs.
- A member may hold at most one non-cancelled reservation for the same session.
- A cancelled studio session cannot accept reservations.
- Confirmed reservations may never exceed capacity.
- If capacity is available, an eligible reservation is confirmed immediately.
- If the class is full, the member is offered a waitlist position and chooses whether to join.
- If two members request the final spot concurrently, the first completed reservation is confirmed and the other is offered the waitlist.

## 6. Waitlist

- A waitlist entry does not consume capacity, an included credit, or a simulated drop-in charge.
- Waitlisted members are ordered by the time they joined.
- When a confirmed spot opens, the first eligible waitlisted member is promoted automatically.
- Automatic promotion continues until the class begins.
- A member still waitlisted at class start is not charged, cannot check in, and remains recorded as waitlisted rather than attended or no-show.
- A promoted member receives a notification.
- A drop-in member is charged only after promotion to confirmed.

## 7. Credits and simulated drop-in payments

Included membership credits are derived for the applicable pause-adjusted billing cycle.

| Outcome | Included credit effect |
|---|---:|
| Attended confirmed reservation | Uses 1 |
| Confirmed no-show | Uses 1 |
| Early member cancellation | Uses 0 |
| Late member cancellation | Uses 1 |
| Studio cancellation | Uses 0 |
| Waitlist only | Uses 0 |

- `classes_used` and `classes_remaining` are calculated values.
- When no included credits remain, a member may make an additional booking using a simulated $35 drop-in payment.
- An early drop-in cancellation or studio cancellation receives a simulated refund.
- A late drop-in cancellation or no-show receives no refund.
- Billing and drop-in payments are simulated; no real card is charged in this MVP.

## 8. Member cancellation and studio cancellation

- A member cancellation is late when it occurs less than 12 hours before the session starts.
- A cancellation exactly 12 hours before the session is early.
- Studio cancellation automatically cancels affected reservations, restores applicable credits or simulated drop-in payments, and notifies confirmed and waitlisted members.
- A member reservation cancellation requires confirmation in the interface.

## 9. Membership pauses

- A pause requires owner/admin approval.
- A pause request requires 30 days' advance notice.
- A member may receive one pause during any rolling 12-month period.
- An approved pause lasts at least 30 days and at most 90 days.
- Each approved pause has a simulated $25 administrative fee.
- During a pause, the membership billing cycle and unused credits freeze.
- Resumption continues the cycle after extending it by the exact paused duration.
- Existing reservations occurring during an approved pause are cancelled automatically and applicable credits or simulated payments are restored.
- Paused members cannot create or keep class reservations occurring during the paused interval.

## 10. Membership cancellation and reactivation

- Membership cancellation requires 30 days' notice.
- A member submits and confirms a cancellation from the member Account experience without staff approval.
- Before confirmation, the interface shows the exact cancellation effective date.
- The membership remains active through the paid period covered by the notice.
- Existing credits may be used while the membership remains active.
- No additional membership-cancellation fee applies.
- A member may withdraw a scheduled cancellation before its effective date, keeping the existing membership active.
- Reactivation after cancellation creates a new membership at the current plan price rather than reopening the previous membership.
- Reactivation after cancellation uses the membership enrollment flow and a new confirmed membership agreement.
- Pulse Assistant may explain cancellation/reactivation rules and link to Account or enrollment, but cannot submit, withdraw, confirm, or complete either action in chat.

## 11. Class demand and schedule changes

For Product B, a non-cancelled class has a live underbooking warning when:

`confirmed reservations / capacity < 50%`

Exactly 50% does not warn. Waitlisted, cancelled, and studio-cancelled reservations do not count. Canceled sessions never warn. Presentation bands are separate from the warning: 0–39% Underbooked, 40–69% Moderate, 70–89% Healthy, and 90–100% Nearly full. Owner/admin operational decisions (`monitor`, `promote_class`, `adjust_operations`, or `review_for_cancellation`) record intent only and remain historical when current demand changes; they do not mutate reservations, staffing, capacity, or cancellation state.

Staff may change a class after reservations exist, subject to these rules:

- affected members are notified of a time or capacity change;
- capacity may never be reduced below the number of confirmed reservations;
- a cancellation follows the studio-cancellation rules in §8.

Supported class types in v1 are `yoga`, `cycling`, and `hiit` only.

Class level and modification rules are:

- yoga is open to all levels and instructors provide movement modifications;
- cycling is open to all levels, members control their resistance, and instructors may assist with bike setup;
- HIIT is intermediate intensity by default, and beginners may participate using instructor-provided modifications;
- instructors may offer general exercise modifications but do not diagnose injuries or provide medical clearance;
- members with an injury, medical concern, or uncertainty about exercise safety must consult a qualified healthcare professional.

## 12. Check-in, attendance, and no-show

- Members should arrive before the scheduled class start.
- A member may enter up to five minutes after the scheduled start, at the instructor's discretion.
- More than five minutes after the scheduled start, entry is not permitted for safety and to avoid disrupting the class.
- The late-entry rule is separate from the staff attendance-recording window and does not extend a member's right to enter class.
- Attendance is permitted only for a confirmed reservation on a non-cancelled session.
- Valid check-in begins 15 minutes before the session and ends 20 minutes after it starts.
- A confirmed member who has not checked in when the window closes is marked `no_show` automatically.
- A waitlisted member cannot check in unless promoted before class start.
- Exactly one current attendance outcome exists per reservation.
- Staff may correct attendance after recording it, but the system retains the acting staff account, timestamp, previous outcome, new outcome, and correction reason.
- Attendance correction requires confirmation in the interface.

## 13. Product D evaluation eligibility and periods

At evaluation time `T`, Product D compares two consecutive half-open 30-day windows:

- previous: `[T - 60 days, T - 30 days)`;
- current: `[T - 30 days, T)`.

Eligibility and counting rules:

- the member must have held a membership for at least 60 days at `T`;
- paused days count toward membership age;
- attended visits occurring during a paused interval are excluded;
- count only `attended` outcomes;
- require at least four attended visits in the previous window;
- running the same member/evaluation combination again reuses the existing assessment rather than creating a duplicate.

## 14. Product D risk calculation

`decline_percentage = ((previous_visits - current_visits) / previous_visits) × 100`

Classification:

- `50 <= decline_percentage < 75` → `medium`;
- `75 <= decline_percentage <= 100` → `high`;
- below 50 → no qualifying assessment.

A later risk case may be created only after:

1. the earlier case has been handled;
2. the member records at least one later attended visit; and
3. a subsequent 60-day evaluation independently qualifies.

Product D may calculate historical risk for paused or cancelled members, but it creates outreach only for active and contactable members.

## 15. Risk-case workflow

Risk-case review statuses are:

- `pending` — not yet reviewed;
- `in_progress` — staff is handling the case;
- `resolved` — the outreach/follow-up process is finished;
- `dismissed` — staff determined that outreach was unnecessary.

The main flagged-members queue shows `pending` and `in_progress` cases. Resolved and dismissed cases remain accessible through history and filters.

A case becomes resolved when:

- outreach reaches `completed` after a member response; or
- three simulated attempts receive no response, using resolution reason `no_response`.

Dismissal does not erase the factual risk assessment.

## 16. Class recommendation

Product D recommends an upcoming, non-cancelled class with available capacity. It prefers a class type and general time period matching the member's earlier attendance history. Staff sees the recommendation and may use it in the outreach message.

## 17. Product D outreach workflow

One qualifying risk assessment produces one initial personalized outreach draft.

The ordered workflow is:

`draft → ready → sent → completed`

- `draft`: Product D generated `original_message`.
- `ready`: staff reviewed and approved a non-empty `final_message`.
- `sent`: Product D simulated sending and stored `sent_at`; no real message is delivered.
- `completed`: staff closed the case after recording a member response.
- States may not be skipped or reversed.
- `original_message` is immutable.
- Staff edits are stored separately as `final_message`.
- Simulated sending requires confirmation in the interface.
- Product C has no write permission to this workflow.

## 18. Outreach responses and repeated attempts

Member response outcomes are:

- `interested`;
- `needs_support`;
- `not_interested`;
- `do_not_contact`.

Rules:

- a sent case remains open until the member responds or the maximum unanswered attempts is reached;
- another attempt may be created after 14 full days from the previous simulated send;
- exactly 14 days is eligible;
- one risk case permits no more than three attempts;
- after three unanswered attempts, resolve the case as `no_response`;
- a `do_not_contact` response completes the case and blocks future re-engagement outreach across later risk cases;
- Product D may continue calculating risk for a do-not-contact member, but it may not generate or send outreach;
- only the member may remove the restriction through their account or a documented member request.

## 19. Outreach channel eligibility

- Use the member's preferred permitted channel when it has valid contact information.
- Email is the fallback channel.
- SMS and phone require a valid phone number.
- Email requires a valid email address.
- If the preferred channel is unavailable, use another permitted valid channel.
- If no permitted valid channel exists, block simulated sending and display the reason.

## 20. Product D coworker notes

Staff may create, edit, and delete notes connected to a member and optionally a specific risk case.

Each note retains:

- author staff account;
- body;
- creation timestamp;
- last-edit timestamp and editor;
- deletion timestamp and deleting staff account when deleted.

Deleted notes are hidden from the normal interface but remain retained for accountability. Note deletion requires confirmation.

## 21. Notifications

Members receive notifications for:

- booking confirmation;
- waitlist promotion;
- member cancellation confirmation;
- studio cancellation;
- class time or capacity changes affecting their booking;
- Product D simulated outreach.

Notifications use the in-app notification center plus the member's valid preferred channel. Notification timing and policy boundaries use `America/New_York`.

- Each in-app notification records its creation time and unread/read status.
- Opening a notification marks it read, and the member may mark all notifications as read.
- In-app delivery is the authoritative notification experience for this school-project MVP.
- Email and SMS delivery remain simulated and are labeled as simulated wherever shown.
- Pulse Assistant may summarize existing authenticated notification facts and link to the notification center, but may not mark notifications read or claim that a real email or SMS was delivered.

## 22. Confirmations and auditability

The interface requires confirmation before:

- cancelling a member reservation;
- simulating an outreach send;
- deleting a coworker note;
- applying an attendance correction.

The system records the acting staff account and timestamp for outreach edits, approvals, simulated sends, completions, note changes, and attendance corrections.

## 23. Re-engagement success measures

Pulse Studio tracks two separate outcomes after completed outreach:

- `rebooked_within_14_days`: the member creates a confirmed reservation within 14 days;
- `attended_within_30_days`: the member records an attended outcome within 30 days.

Rebooking measures initial interest; attendance is the stronger return signal. Neither outcome changes Product C's ownership or gives the chatbot control over Product D.

## 24. Shared data and invalid imports

- Products A–D use one shared database and API contract.
- CSV files are deterministic seed and validation fixtures, not the writable runtime database.
- Imported rows must pass schema, foreign-key, status, date, capacity, eligibility, and cross-table rules.
- Invalid rows are quarantined with exact rule codes and explanations.
- The system does not guess repairs or import invalid rows with warnings.

## 25. Explicit MVP boundaries

The following are deliberately simulated or limited:

- membership billing and $25 pause fees;
- $35 drop-in charges and refunds;
- Product D sending and member-response fixtures;
- member notifications unless a later implementation decision adds a delivery provider.

The following remain outside v1 unless approved separately:

- real card charging;
- real SMS/email outreach delivery;
- multi-location operations;
- unrestricted class-type creation;
- autonomous chatbot booking or cancellation;
- automatic correction of invalid imported data.

## 26. Required schema reconciliation before backend implementation

The current technical package must not be treated as fully aligned until a separate approved update adds or revises support for:

1. plan and membership price facts, including agreed-price history;
2. pause requests, approval, $25 fee, duration, frequency, and notice;
3. simulated drop-in payments and refunds;
4. real accounts, roles, invitations, verification, and password recovery;
5. waitlist ordering, automatic promotion, and member notifications;
6. risk review statuses and resolution reasons;
7. Product D `draft → ready → sent → completed` states and action actors;
8. response outcomes, do-not-contact state, 14-day attempts, and three-attempt maximum;
9. preferred communication channel and channel eligibility;
10. coworker notes with edit/delete accountability;
11. attendance-correction audit records;
12. notification records;
13. re-engagement outcome definitions.

After that schema revision is approved, the generator, valid/invalid fixtures, manifests, validators, reports, workbook, and backend API contracts must be regenerated and tested together. No schema or dataset update is authorized merely by this consolidated document review.

## 27. Member support channels and hours

For the school-project experience, Pulse Studio publishes these simulated support channels:

- email: `support@pulsestudio.com`;
- phone: `(212) 555-0198`;
- staffed hours Monday through Friday: 6:00 AM–9:00 PM America/New_York;
- staffed hours Saturday and Sunday: 8:00 AM–6:00 PM America/New_York;
- email response target: within one business day.

Pulse Assistant may provide these contact details and expectations but may not claim that a message was received, reviewed, or resolved. Immediate health or safety concerns are directed to on-site staff or local emergency services rather than email or Pulse Assistant.
