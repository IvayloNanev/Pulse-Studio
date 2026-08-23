# Pulse Studio Shared API Contracts v1

**Status:** incremental implementation  
**Naming:** database and API fields use `snake_case`

These interfaces are shared boundaries for Products A–D. Product code should consume these contracts instead of reproducing joins or renaming fields independently.

### Authorization boundary

- Members and staff may read only the records granted by RLS for their role.
- Product workflow tables are not general-purpose writable APIs.
- Reservations, class-session cancellation, simulated payments, notifications, waitlist promotions, attendance, risk cases, notes, and outreach are changed only through explicit database commands.
- A command resolves the authenticated actor, validates the complete business rule, locks affected rows, derives timestamps and identifiers, and records required audit or notification side effects in one transaction.
- Instructors may operate rosters, attendance, and Product D through their approved commands. Membership administration, schedule mutation, studio cancellation, and exceptional overrides require an owner/admin command.
- Possession of an authenticated session never grants broad table mutation rights.

## 1. Public class schedule

**Database interface:** `public.public_class_schedule`  
**Consumers:** landing page, Product A, Product B schedule discovery, Product C general schedule answers  
**Authorization:** public read; cancelled sessions excluded

One row represents one non-cancelled class session.

| Field | Type | Meaning |
|---|---|---|
| `class_session_id` | string | Stable session identifier |
| `class_type` | string | Canonical `yoga`, `cycling`, or `hiit` value |
| `class_type_label` | string | Human label: `Yoga`, `Cycling`, or `HIIT` |
| `starts_at` | timestamp | Session start time |
| `ends_at` | timestamp | Session end time |
| `capacity` | integer | Maximum confirmed reservations |
| `confirmed_reservations` | integer | Current confirmed count |
| `waitlisted_reservations` | integer | Current waitlisted count |
| `available_spots` | integer | `max(capacity - confirmed_reservations, 0)` |
| `is_full` | boolean | True when confirmed reservations meet capacity |
| `instructor_staff_id` | string | Stable instructor identifier |
| `instructor_name` | string | Instructor display name |

### Rules

- Cancelled sessions never appear.
- Cancelled and studio-cancelled reservations do not consume capacity.
- Waitlisted reservations are counted separately and do not consume capacity.
- Availability is derived at query time and is never accepted from a client.
- No member identity, contact information, reservation identifier, or attendance fact is exposed.
- Consumers apply their own requested date range and sort by `starts_at`; the shared field meanings never change.

## 2. Product B staff session roster

**Database interface:** `public.staff_session_roster`
**Consumer:** Product B staff scheduling dashboard
**Authorization:** active authenticated staff only; anonymous users and authenticated members receive no access

One row represents one confirmed or waitlisted reservation on a non-cancelled class session.

| Field | Type | Meaning |
|---|---|---|
| `class_session_id` | string | Stable session identifier |
| `class_type` | string | Canonical class type |
| `class_type_label` | string | Human-readable class label |
| `starts_at` | timestamp | Session start time |
| `ends_at` | timestamp | Session end time |
| `capacity` | integer | Maximum confirmed reservations |
| `reservation_id` | string | Reservation against which attendance is recorded |
| `reservation_status` | string | `confirmed` or `waitlisted` |
| `reserved_at` | timestamp | Reservation creation time |
| `member_id` | string | Stable member identifier |
| `member_name` | string | Member display name |
| `attendance_record_id` | string or null | Existing attendance record identifier |
| `attendance_status` | string or null | Existing `attended` or `no_show` outcome |
| `recorded_at` | timestamp or null | Time the outcome was recorded |
| `check_in_opens_at` | timestamp | `starts_at - 15 minutes` |
| `check_in_closes_at` | timestamp | `starts_at + 20 minutes` |
| `can_record_attended` | boolean | True only while a confirmed member's unused check-in window is open |
| `can_record_no_show` | boolean | True only after a confirmed member's unused check-in window closes |
| `can_correct_attendance` | boolean | True when an attendance outcome already exists |

### Read rules

- Cancelled sessions and cancelled reservations do not appear.
- Confirmed and waitlisted reservations both appear so staff can understand the complete roster.
- Waitlisted members can never be marked attended or no-show unless Product A first promotes the reservation to `confirmed`.
- Email, phone, authentication identifiers, and unrelated membership details are not exposed.
- Consumers filter by `class_session_id` and sort members as needed; field meanings remain shared.

### Attendance command

Product B records an initial outcome by inserting into `public.attendance_records`:

| Field | Required value |
|---|---|
| `attendance_record_id` | New stable identifier |
| `reservation_id` | A `confirmed` roster reservation |
| `attendance_status` | `attended` or `no_show` |
| `recorded_at` | Actual recording time |

The canonical database trigger remains authoritative: it rejects non-confirmed reservations, cancelled sessions, duplicate outcomes, attended timestamps outside the −15/+20 minute window, and no-shows before the +20-minute boundary. Later changes use `attendance_corrections` so the previous value, new value, reason, staff member, and time remain auditable.

Product B writes through two authenticated staff commands:

- `record_attendance(p_reservation_id, p_attendance_status)` creates the initial outcome using the database clock and a generated stable identifier. The client supplies neither `recorded_at` nor `attendance_record_id`.
- `correct_attendance(p_attendance_record_id, p_new_status, p_reason)` requires a non-empty reason, records the previous and new outcomes with the active staff identifier and correction time, and then updates the current attendance outcome.

Direct attendance-status changes without a matching correction created in the same transaction are rejected. The original reservation association and original recording time remain immutable.

## 3. Product A member dashboard

**Database interfaces:** `public.member_dashboard(p_as_of)` and `public.member_reservations(p_from)`
**Consumers:** Product A and authenticated member-specific Product C answers
**Authorization:** authenticated member's own records only; active staff retain their separate operational access

### Member and credit summary

`member_dashboard` returns one row for the signed-in member's active or paused membership at the supplied evaluation time.

| Field | Type | Meaning |
|---|---|---|
| `member_id` | string | Signed-in member identifier |
| `member_name` | string | Member display name |
| `email` | string | Member email |
| `phone` | string or null | Member phone |
| `preferred_channel` | string | Current preferred contact channel |
| `membership_id` | string | Applicable membership identifier |
| `membership_status` | string | Current membership state |
| `plan_id` | string | Current plan identifier |
| `plan_name` | string | Human-readable plan name |
| `classes_per_month` | integer | Included classes per billing cycle |
| `agreed_monthly_price` | decimal | Price accepted for this membership |
| `billing_cycle_start_at` | timestamp | Pause-adjusted current cycle start |
| `billing_cycle_end_at` | timestamp | Pause-adjusted current cycle end |
| `classes_used` | integer | Finalized attended, no-show, and late-cancellation credits |
| `classes_reserved` | integer | Credits held by confirmed reservations without a final attendance outcome |
| `classes_remaining` | integer | `max(classes_per_month - classes_used - classes_reserved, 0)` |

### Credit rules

- Billing boundaries begin from `memberships.billing_cycle_start_date` in `America/New_York`.
- Each paused interval shifts later cycle boundaries by its exact duration.
- Month-end anchors clamp to the final valid day of shorter months.
- Attended and no-show outcomes consume one included credit.
- Late member cancellations consume one included credit.
- Early cancellations, studio cancellations, and waitlisted reservations consume no included credit.
- A confirmed reservation without a final outcome holds one credit so it cannot be promised to another booking.
- Calculated credit values are never accepted from the client.
- The optional `p_as_of` value supports deterministic test fixtures; production callers omit it to use the current time.

### Upcoming reservations

`member_reservations` returns one row per signed-in member reservation from `p_from`, restricted to `confirmed` and `waitlisted` states on non-cancelled sessions.

| Field | Type | Meaning |
|---|---|---|
| `reservation_id` | string | Stable reservation identifier |
| `reservation_status` | string | `confirmed` or `waitlisted` |
| `reserved_at` | timestamp | Reservation creation time |
| `class_session_id` | string | Stable session identifier |
| `class_type` | string | Canonical class type |
| `class_type_label` | string | Human class label |
| `starts_at` | timestamp | Session start |
| `ends_at` | timestamp | Session end |
| `instructor_name` | string | Instructor display name |
| `capacity` | integer | Session capacity |
| `confirmed_reservations` | integer | Confirmed count |
| `waitlisted_reservations` | integer | Waitlist count |
| `available_spots` | integer | Current derived availability |
| `is_full` | boolean | Whether confirmed reservations meet capacity |
| `cancellation_deadline` | timestamp | Exactly 12 hours before class; cancellation at this instant is early |

The default `p_from` is the current time. Deterministic dataset and integration tests may supply the fixture clock explicitly. Product C may read these authenticated facts but directs booking and cancellation actions to Product A.

### Book class command

**Database command:** `public.book_class_session(p_class_session_id, p_use_drop_in default false)`

**Authorization:** authenticated active member only

The command, rather than the browser, determines the booking result. It locks the requested session, rejects cancelled or started sessions and duplicate open bookings, resolves the caller through `current_member_id()`, and verifies that the membership is active both when booking and when the class occurs.

- If confirmed capacity remains, the command uses a membership credit from the billing cycle containing the class session, or creates a simulated $35 drop-in payment when `p_use_drop_in` is true.
- If confirmed capacity is full, the command creates a `waitlisted` reservation and neither holds a credit nor creates a payment. A selected drop-in choice is retained and charged only if the reservation is promoted.
- A confirmed booking with no remaining class-cycle credit is rejected unless the member explicitly chooses the simulated drop-in option.
- Capacity, membership identity, credit availability, reservation status, and reservation identifiers are never accepted from the client.
- Concurrent requests for the same session are serialized by the session-row lock, preventing overbooking.
- Members cannot insert or update reservation or payment rows directly; booking and cancellation must use these authoritative commands.

The response contains `reservation_id`, `class_session_id`, `reservation_status`, `reserved_at`, and `available_spots_after_booking`.

### Cancel reservation command

**Database command:** `public.cancel_member_reservation(p_reservation_id)`

Only the authenticated member who owns an open `confirmed` or `waitlisted` reservation may cancel it. The command locks both the reservation and its class session and rejects cancellation after the class starts.

- A confirmed cancellation strictly less than 12 hours before the class is late and consumes its credit.
- A cancellation exactly 12 hours before the class is early and does not consume a credit.
- Cancelling a waitlist entry is never a late cancellation and consumes no credit.
- An early confirmed drop-in cancellation creates a simulated refund; a late drop-in cancellation does not.
- When a confirmed spot opens, the earliest eligible waitlist entry is promoted under the same session lock.
- Cancellation and promotion notifications are simulated and persisted; a promotion also creates its audit record.

The response contains the cancelled reservation facts and the promoted reservation identifier when a promotion occurred.

## 4. Product D risk queue and member review

**Database interfaces:** `public.product_d_risk_queue` and `public.product_d_member_detail`
**Consumer:** Product D only
**Authorization:** active authenticated staff only; no anonymous or member access

### Open risk queue

`product_d_risk_queue` contains only `pending` and `in_progress` assessments. One row represents one open risk case.

| Field group | Included facts |
|---|---|
| Identity | `risk_assessment_id`, `member_id`, `member_name` |
| Priority | `risk_level`, `risk_priority`, `review_status`, `evaluated_at` |
| Evidence | Both 30-day windows, previous/current visits, decline, plain-language `risk_reason`, `last_attended_at` |
| Collaboration | `active_note_count` |
| Latest outreach | Identifier, attempt, status, response, and last send time |
| Eligibility | `cooldown_until`, `can_start_outreach`, and `outreach_blocked_reason` |

Consumers sort `risk_priority` ascending, then the oldest unresolved case first. High risk has priority `1`; medium risk has priority `2`. The database exposes both the Boolean action flag and a staff-readable reason when outreach is blocked.

### Member review detail

`product_d_member_detail` retains all assessment states, including resolved and dismissed history. It provides:

- member email, phone, preferred channel, and do-not-contact state;
- complete assessment periods and calculation inputs;
- attended session evidence from the two evaluation windows;
- non-deleted coworker notes with author display name and edit metadata;
- every outreach attempt with original/final messages, state timestamps, response, and cooldown boundary;
- the next available class recommendation, preferring the member's historically attended class type.

The class recommendation is nullable when no future non-cancelled class has capacity. It is derived from the shared public schedule and is never stored as an independent fact.

### Product D action rules

- Product D owns risk review, notes, outreach creation, editing, approval, simulated sending, response recording, and completion.
- Product C has no Product D write contract.
- New outreach is blocked for paused/cancelled memberships and members with `do_not_contact`.
- A first attempt may begin when no attempt exists.
- A later attempt requires the previous attempt to be `sent`, unanswered, at least 14 full days old, and below the three-attempt maximum.
- Existing database triggers remain authoritative for sequential attempts, exact cooldown, immutable original messages, channel eligibility, and `draft → ready → sent → completed` transitions.
- Deleted notes remain stored for accountability but are excluded from the normal detail interface.
- The narrowly scoped `staff_display_name(staff_id)` helper reveals only an active coworker's display name and only to another active staff caller.

### Risk evaluation command

`evaluate_member_risk(p_member_id, p_evaluated_at)` is an active-staff command that calculates one member's Product D result from authoritative attendance facts. It uses `[T−60 days, T−30 days)` and `[T−30 days, T)`, counts only attended classes outside paused intervals, requires 60 days of membership history and at least four previous visits, and stores an assessment only when decline is at least 50 percent.

The command is idempotent for the same member and evaluation time. It does not create a second assessment while an episode is open, and a closed episode requires at least one later attended visit before another independently qualifying episode may be stored. Medium covers 50 through less than 75 percent; high begins at exactly 75 percent.

A qualifying assessment creates attempt-one draft outreach only when the member is active and contactable. The database selects the member's valid preferred channel, generates and preserves the original message, attributes creation to the acting staff member, and appends the creation audit action. Paused, cancelled, and do-not-contact members may retain factual assessments without receiving outreach.

### Product D staff commands

Product D uses authoritative staff commands for note CRUD, starting or dismissing review, editing and approving drafts, simulated sending, response completion, eligible retries, and three-attempt no-response resolution. Every command resolves the actor from the authenticated staff account and uses database timestamps. Note edits and soft deletion preserve creator and later-actor metadata. Outreach creation, editing, approval, sending, and completion append action-audit records.

The commands enforce `draft → ready → sent → completed`, a non-empty final message before approval, response outcome at completion, exactly 14 full days before retry, a three-attempt maximum, active/contactable eligibility, and `no_response` resolution after the third unanswered cooldown. Simulated sending creates a notification fact but never contacts a real provider. Broad direct staff writes to risk, outreach, note, and action tables are removed; staff retains read access through RLS and writes only through the commands.

## Planned next interfaces

All initially planned shared read interfaces are now defined. Write-command wrappers may be added incrementally as the product UI is implemented; canonical RLS policies and triggers already protect direct table writes.

Each interface will be added and tested in a separate increment.

## 5. Product C read-only assistant context

**Database interfaces:** `public.product_c_policy_answers`, `public.product_c_member_context(p_from, p_as_of)`, and the existing `public_class_schedule`

**Authorization:** policy answers and public schedule are public read; member context is limited to the authenticated member

Product C retrieves general answers from approved, source-labelled policy records and live availability from the shared schedule. When the rules do not define a requested detail—such as class-specific preparation—the approved answer explicitly directs the member to staff instead of inventing content.

After login, `product_c_member_context` composes the existing member dashboard and reservation interfaces into one response containing only the caller's membership/credit summary and upcoming reservations. It has no write command. Product C cannot create or mutate reservations, attendance, risks, notes, outreach, or staff data; booking and cancellation actions remain in Product A.
