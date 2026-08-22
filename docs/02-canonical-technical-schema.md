# Pulse Studio Canonical Technical Schema

**Version:** `2.0.0`  
**Status:** canonical assignment specification  
**Companion:** `01-product-shared-contract.md`  
**Test fixtures:** `03-synthetic-dataset-test-contract.md`

## 1. Authority and conventions

This document is the machine-readable source of truth for Products A–D. All table, field, enum, and identifier names use `snake_case`. Where the source documents conflicted, this revision applies the requested reconciliation: three class types only, normalized plans, `membership_id` on reservations, retained credit rules, retained Product D formulas, and a separately labeled underbooking recommendation.

Unless stated otherwise:

- identifiers are non-empty strings unique within their table;
- timestamps are ISO 8601 values with an explicit offset or `Z`;
- dates are ISO 8601 calendar dates;
- percentages are represented as decimal percentages from `0` through `100`;
- foreign keys must resolve, except in explicitly invalid synthetic test fixtures;
- derived fields are not persisted as authoritative source facts.

Pulse Studio's assignment timezone is `America/New_York`. Stored timestamps still require an explicit offset or `Z`; policy boundaries are evaluated in the studio timezone.

## 2. Enums

| Enum | Allowed values |
|---|---|
| `class_type` | `yoga`, `cycling`, `hiit` |
| `membership_status` | `active`, `paused`, `cancelled` |
| `reservation_status` | `confirmed`, `waitlisted`, `cancelled`, `studio_cancelled` |
| `attendance_status` | `attended`, `no_show` |
| `risk_level` | `medium`, `high` |
| `outreach_status` | `draft`, `ready`, `sent`, `completed` |
| `outreach_channel` | `email`, `sms`, `phone` |
| `risk_review_status` | `pending`, `in_progress`, `resolved`, `dismissed` |
| `outreach_response` | `interested`, `needs_support`, `not_interested`, `do_not_contact` |
| `staff_role` | `owner_admin`, `instructor` |

`low` is not stored as a qualifying risk assessment. A member who does not meet the Product D threshold simply has no qualifying assessment for that evaluation. This resolves the simpler source's descriptive `low` category in favor of the technical draft's qualifying-assessment model.

## 3. Core tables

### 3.1 `members`

| Field | Type | Required | Rule |
|---|---|---:|---|
| `member_id` | string | yes | Primary key |
| `first_name` | string | yes | Non-empty |
| `last_name` | string | yes | Non-empty |
| `email` | string | yes | Syntactically valid for the fixture |
| `phone` | string | no | Current contact value only |
| `preferred_channel` | `outreach_channel` | yes | Preferred current channel; fall back to email when phone is unavailable |
| `do_not_contact` | boolean | yes | Blocks new Product D outreach until removed by the member |

### 3.2 `membership_plans`

| Field | Type | Required | Rule |
|---|---|---:|---|
| `plan_id` | string | yes | Primary key |
| `plan_name` | string | yes | Unique |
| `classes_per_month` | integer | yes | Greater than zero |
| `monthly_price` | decimal | yes | 4 classes = $99; 8 = $179; 12 = $249 |

Plan records are normalized and reusable. The dataset contract must use the plan definitions supplied by the source fixture or document any newly recommended fixture values; this schema does not invent plan names or allowances.

### 3.3 `memberships`

| Field | Type | Required | Rule |
|---|---|---:|---|
| `membership_id` | string | yes | Primary key |
| `member_id` | string | yes | FK → `members.member_id` |
| `plan_id` | string | yes | FK → `membership_plans.plan_id` |
| `status` | `membership_status` | yes | Current state |
| `start_date` | date | yes | On or before `end_date`, when present |
| `billing_cycle_start_date` | date | yes | Anchor for monthly credit calculation |
| `end_date` | date | no | Required when the membership has ended |
| `agreed_monthly_price` | decimal | yes | Price accepted when the membership began; retained after later plan-price changes |

### 3.4 `membership_status_history`

This is the one history table retained in assignment scope because pauses, resumptions, cancellations, reactivations, billing-cycle behavior, and Product D eligibility are time-dependent.

| Field | Type | Required | Rule |
|---|---|---:|---|
| `membership_status_history_id` | string | yes | Primary key |
| `membership_id` | string | yes | FK → `memberships.membership_id` |
| `status` | `membership_status` | yes | State effective in the interval |
| `effective_at` | timestamp | yes | Interval start |
| `ended_at` | timestamp | no | Must be after `effective_at` |

Intervals for the same membership must not overlap. A pause freezes the billing cycle and available credits; resumption is represented by a new `active` interval and continues from the frozen position rather than consuming paused time. The billing-cycle end is extended by the exact total duration of all non-overlapping pause intervals in that cycle.

### 3.5 `class_sessions`

| Field | Type | Required | Rule |
|---|---|---:|---|
| `class_session_id` | string | yes | Primary key |
| `class_type` | `class_type` | yes | Three allowed values only |
| `starts_at` | timestamp | yes | Session start |
| `ends_at` | timestamp | yes | After `starts_at` |
| `capacity` | integer | yes | Greater than zero |
| `is_cancelled` | boolean | yes | Default `false` |
| `instructor_staff_id` | string | yes | FK → `staff_accounts.staff_id`; role must be `instructor` or `owner_admin` |

### 3.6 `reservations`

| Field | Type | Required | Rule |
|---|---|---:|---|
| `reservation_id` | string | yes | Primary key |
| `member_id` | string | yes | FK → `members.member_id` |
| `class_session_id` | string | yes | FK → `class_sessions.class_session_id` |
| `membership_id` | string | conditional | FK → `memberships.membership_id`; blank only when an authorized $35 drop-in payment exists |
| `status` | `reservation_status` | yes | Current reservation state |
| `reserved_at` | timestamp | yes | On or before session start |
| `cancelled_at` | timestamp | no | Required for member cancellation |
| `is_late_cancellation` | boolean | no | Applies only to member-cancelled reservations; `true` when cancellation is less than 12 hours before `starts_at` |

There may be at most one non-cancelled reservation per member and class session. Confirmed reservations for a non-cancelled session must not exceed capacity. A waitlisted reservation does not consume capacity or credit.

The referenced membership must belong to the member and be active/effective both at `reserved_at` and when the class session occurs. A cancellation exactly 12 hours before `starts_at` is early; only a cancellation strictly inside the 12-hour window is late.

### 3.7 `attendance_records`

| Field | Type | Required | Rule |
|---|---|---:|---|
| `attendance_record_id` | string | yes | Primary key |
| `reservation_id` | string | yes | Unique FK → `reservations.reservation_id` |
| `attendance_status` | `attendance_status` | yes | `attended` or `no_show` |
| `recorded_at` | timestamp | yes | At or after session start |

Attendance is recorded only for a confirmed reservation whose session was not studio-cancelled. Product D counts only `attended` records. For deterministic assignment fixtures, a `no_show` record may not be created until 20 minutes after `class_sessions.starts_at`, when the agreed check-in window has closed.

### 3.8 `risk_assessments`

| Field | Type | Required | Rule |
|---|---|---:|---|
| `risk_assessment_id` | string | yes | Primary key |
| `member_id` | string | yes | FK → `members.member_id` |
| `evaluated_at` | timestamp | yes | Deterministic evaluation boundary |
| `previous_period_start` | timestamp | yes | Inclusive |
| `previous_period_end` | timestamp | yes | Exclusive |
| `current_period_start` | timestamp | yes | Inclusive; equals previous end |
| `current_period_end` | timestamp | yes | Exclusive; equals `evaluated_at` |
| `previous_visits` | integer | yes | Derived snapshot; at least 4 for qualifying rows |
| `current_visits` | integer | yes | Derived snapshot; zero or greater |
| `decline_percentage` | decimal | yes | Derived snapshot from formula below |
| `risk_level` | `risk_level` | yes | `medium` or `high` |
| `review_status` | `risk_review_status` | yes | Staff case state |
| `resolved_at` | timestamp | no | Required for resolved/dismissed cases |
| `resolution_reason` | string | no | Required for resolved/dismissed cases |

This table stores the reproducible result of a workflow calculation, including its inputs and evaluation boundary. It does not store non-qualifying `low` rows.

### 3.9 `outreach_records`

| Field | Type | Required | Rule |
|---|---|---:|---|
| `outreach_id` | string | yes | Primary key |
| `risk_assessment_id` | string | yes | FK → `risk_assessments.risk_assessment_id` |
| `member_id` | string | yes | FK → `members.member_id`; must match assessment member |
| `attempt_number` | integer | yes | 1 through 3, sequential per assessment |
| `channel` | `outreach_channel` | yes | Chosen contact channel |
| `original_message` | string | yes | Immutable generated draft |
| `final_message` | string | no | Staff-reviewed message |
| `status` | `outreach_status` | yes | Workflow state |
| `response_outcome` | `outreach_response` | no | Required when completed |
| `created_by_staff_id` | string | yes | FK → `staff_accounts.staff_id` |
| `created_at` | timestamp | yes | Draft creation time |
| `approved_by_staff_id`, `approved_at` | string, timestamp | conditional | Required for ready/sent/completed |
| `sent_by_staff_id`, `sent_at` | string, timestamp | conditional | Required for sent/completed |
| `completed_by_staff_id`, `completed_at` | string, timestamp | conditional | Required for completed |

Soft deletion is intentionally excluded from assignment scope.

Outreach follows `draft → ready → sent → completed`; states may not be skipped or reversed. `ready` requires a non-empty `final_message`; `sent` records the simulated contact attempt and requires `sent_at`; `completed` closes the staff follow-up and requires `completed_at` plus a response outcome. Product D owns the entire workflow. Product C is the member-support chatbot and may not create or mutate outreach records. A new attempt is allowed only after 14 full days without a response, with at most three attempts total.

## 4. Derived calculations

### 4.1 Capacity and utilization

`confirmed_count` is the number of reservations with `status = confirmed` for the class session.

`available_spots = max(capacity - confirmed_count, 0)`

`utilization_percentage = (confirmed_count / capacity) * 100`

**New recommended decision:** for a non-cancelled session, `underbooked = true` when `utilization_percentage < 50`. The threshold is an assignment default and should be configurable; exactly `50` is not underbooked. Evaluation timing is supplied by the caller or deterministic test fixture.

### 4.2 Membership credits

Within the applicable, pause-adjusted billing cycle:

- attended: consumes one credit;
- confirmed no-show: consumes one credit;
- early member cancellation: consumes no credit;
- late member cancellation: consumes one credit;
- studio cancellation: consumes no credit;
- waitlisted reservation: consumes no credit.

`classes_used` is the count of credit-consuming outcomes.  
`classes_remaining = max(classes_per_month - classes_used, 0)`

Both are derived, not authoritative stored columns.

### 4.3 Product D decline

For evaluation time `T`, use two consecutive 30-day half-open periods:

- previous: `[T - 60 days, T - 30 days)`;
- current: `[T - 30 days, T)`.

Count only attended classes. A member qualifies for evaluation when the membership has been held for at least 60 days at `T` and `previous_visits >= 4`. Paused days count toward membership age, but attendance occurring during a paused interval is excluded from visit counts.

`decline_percentage = ((previous_visits - current_visits) / previous_visits) * 100`

If current visits exceed previous visits, the result is negative and does not qualify. Classification:

- `50 <= decline_percentage < 75` → `medium`;
- `75 <= decline_percentage <= 100` → `high`;
- below 50 → no qualifying assessment.

A qualifying assessment creates its first outreach draft. A later assessment is a new decline episode only after the earlier assessment has been handled, the member records at least one new attended visit, and a subsequent 60-day evaluation independently qualifies. A non-response permits another Product D attempt after exactly 14 full days; the maximum is three attempts. Any response ends retries, and `do_not_contact` blocks future outreach.

## 5. Cross-table validation

1. Every FK resolves outside explicit invalid fixtures.
2. A reservation's membership belongs to the same member.
3. A reservation cannot be confirmed against a cancelled session.
4. Confirmed reservations cannot exceed session capacity.
5. Attendance must reference an eligible confirmed reservation.
6. Risk-period boundaries must be consecutive and match `evaluated_at`.
7. Stored risk counts, percentage, and level must recompute exactly.
8. Outreach member must match the assessment member.
9. Outreach state transitions and required message/actor/timestamp fields follow `draft → ready → sent → completed` in §3.9.
10. Outreach attempts are sequential, no more than three per assessment, and at least 14 full days apart.
11. `original_message` is retained even when `final_message` differs.
12. A reservation's membership belongs to the member and is active/effective at booking and session time.
13. A membership's current `status` matches its latest open status-history interval.
14. A no-show is not recorded before 20 minutes after session start.

## 6. Schema 2.0 supporting tables

These tables are part of the simulation contract and keep runtime facts separate and testable:

| Table | Key fields and purpose |
|---|---|
| `staff_accounts` | `staff_id`, auth provider subject, identity, email, role, account status, created time. One owner/admin and three instructors; no passwords or password hashes are stored. |
| `member_accounts` | `account_id`, `member_id`, auth provider subject, email verification flag, account status, created time. No passwords or hashes. |
| `membership_pause_requests` | Request/start/end/status, owner approval, approval time, and $25 fee; approved duration is 30–90 days with 30 days' notice. |
| `drop_in_payments` | Reservation/member, $35 amount, authorized/refunded state, created/refunded times. |
| `waitlist_promotions` | Reservation/session, promotion time, and linked notification. Promotion is automatic while capacity exists and the class has not started. |
| `attendance_corrections` | Attendance row, previous/new status, reason, correcting staff member, and timestamp. |
| `risk_case_notes` | Member/assessment note with creator, edit, and soft-delete actor/timestamps. |
| `notifications` | Simulated booking, cancellation, schedule-change, promotion, and outreach messages with channel/status and related record. |
| `outreach_actions` | Append-only action audit for Product D creation, approval, simulated send, and completion. |

## 7. Explicitly deferred production features

The following are **optional extensions, not canonical assignment tables**:

- `member_contact_history`;
- effective-dated `member_communication_preferences` history;
- universal audit fields on every table beyond the workflow-specific audit tables above;
- outreach soft deletion.

Adding any of them requires a versioned change and a stated product requirement. Communication consent remains a real production concern; this scope decision only says that a full historical consent subsystem is not needed to prove the four-product simulation.
