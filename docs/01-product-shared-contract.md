# Pulse Studio Product and Shared Contract

**Status:** revised assignment contract  
**Audience:** product, design, engineering, and data teammates  
**Technical authority:** `02-canonical-technical-schema.md`

## Purpose

Pulse Studio is a connected four-product simulation for a boutique fitness studio offering **yoga, cycling, and HIIT**. The assignment succeeds when the products use one shared vocabulary and one fictional member can move through the complete loop:

**Product A reservation → Product B roster and attendance → Product D decline detection and outreach → Product C follow-up information → Product A rebooking**

This document explains what the system must do. It is intentionally concise. Exact fields, types, relationships, enums, validation rules, and calculations live in the canonical technical schema.

## Canonical conventions

- Machine-readable identifiers and fields use `snake_case`.
- Products exchange canonical identifiers; they do not create product-specific aliases for the same entity.
- Class types are limited to `yoga`, `cycling`, and `hiit`.
- Membership plans are defined once in `membership_plans` and referenced by memberships.
- A reservation retains `membership_id` so the applicable membership is explicit.
- Stored facts, derived values, and workflow artifacts remain distinct.
- Synthetic-data scenarios and intentional errors are test fixtures, not part of the production schema.

## Shared entities

| Entity | Shared meaning | Used by |
|---|---|---|
| `members` | A studio member's core identity and current contact details | A, B, C, D |
| `membership_plans` | Reusable plan definitions, including monthly class allowance | A, C, D |
| `memberships` | A member's enrollment in a plan and its current lifecycle state | A, C, D |
| `membership_status_history` | Effective-dated pause, resume, cancellation, and reactivation history | A, D |
| `class_sessions` | A scheduled yoga, cycling, or HIIT class with capacity | A, B, D |
| `reservations` | A member's booking or waitlist relationship to a class session | A, B, D |
| `attendance_records` | The outcome recorded for a reservation | B, D |
| `risk_assessments` | A reproducible Product D decline result | D |
| `outreach_records` | Product D drafts, approvals, simulated sends, responses, and completion | D |

## Product contracts

### Product A — Reservations

Product A lets a member view a class session and reserve, cancel, or join a waitlist. It must use shared class capacity, reservations, memberships, and the shared credit policy.

Required outcomes:

- create a reservation tied to `member_id`, `class_session_id`, and `membership_id`;
- prevent confirmed bookings beyond capacity;
- distinguish confirmed, waitlisted, cancelled, and studio-cancelled outcomes;
- calculate available spots and remaining credits rather than storing them as independent facts;
- allow a contacted member to return and book again.

### Product B — Studio operations

Product B shows session rosters, records attendance outcomes, and warns staff about underbooked sessions.

Required outcomes:

- show confirmed and waitlisted members for a class session;
- record attendance or no-show outcomes against reservations;
- calculate session utilization as confirmed reservations divided by capacity;
- surface the underbooked state using the rule below.

**New recommended decision — underbooked threshold:** a non-cancelled class is `underbooked` when its utilization is **below 50%** at the evaluation time. Exactly 50% is not underbooked. This is a configurable assignment default because neither source fixed a numeric threshold. Tests must supply a deterministic evaluation time; the schema does not invent a production alert schedule.

### Product C — Member Support Chatbot

Product C answers member questions using the shared schedule, availability, and policy data used by Products A and B.

Required outcomes:

- answer questions about class levels and preparation;
- answer booking and cancellation policy questions;
- answer questions about the current schedule and availability;
- direct members to Product A to book or manage a reservation.

Product C may not create, edit, approve, send, complete, or otherwise mutate risk or outreach records. It does not own re-engagement outreach.

### Product D — Engagement decline

Product D evaluates attended visits across two consecutive 30-day periods and creates a reproducible assessment when the member qualifies.

Required outcomes:

- count attended classes only;
- require that the member has held a membership for at least 60 days at the evaluation boundary; paused days count toward membership age, but visits during a pause do not count;
- require at least four visits in the previous period;
- calculate percentage decline consistently;
- classify qualifying decline as `medium` or `high`;
- recommend a current class from Product A's schedule;
- generate and preserve an outreach draft;
- let staff review, edit, approve, simulate sending, record a response, and complete the case;
- retry after 14 full days without a response, up to three total attempts;
- maintain coworker notes and stop outreach when `do_not_contact` applies.

The Product D workflow is `draft → ready → sent → completed`. Sending is simulated for this school project. Product C remains the chatbot and must not create or mutate outreach.

The exact formulas and boundary rules are defined in the technical schema.

## Shared credit policy

Pulse Studio uses the `America/New_York` timezone for assignment policy calculations. A member cancellation is late when it occurs **less than 12 hours before** `class_sessions.starts_at`. A cancellation exactly 12 hours before class is early.

| Outcome | Consumes a credit? |
|---|---:|
| Attended | Yes |
| Confirmed no-show | Yes |
| Early member cancellation | No |
| Late member cancellation | Yes |
| Studio cancellation | No |
| Waitlist position | No |

Classes used and classes remaining are derived for the relevant membership billing cycle. They are not independently editable stored totals.

## Data-category boundary

**Stored facts:** members, plans, memberships, sessions, reservations, attendance outcomes, and outreach actions.

**Derived values:** available spots, classes used, classes remaining, utilization, decline percentage, and days since last visit.

**Workflow artifacts:** risk assessments, outreach drafts, and validation reports.

## Scope boundary

The assignment retains membership status history because pauses, reactivation, and the Product D time window depend on it. The following production-grade capabilities are **not required for the minimum assignment**:

- member contact-change history;
- effective-dated communication-preference history;
- separate risk-assessment notes;
- universal audit columns on every table;
- outreach soft deletion.

They may be added later through a versioned schema change. Their omission must not be interpreted as a production recommendation.

## Mandatory integration acceptance test

At least one deterministic fictional member must complete this trace with referential integrity preserved:

1. The member has an active membership tied to a defined plan.
2. The member reserves a class in Product A.
3. The reservation appears on Product B's roster.
4. Product B records attendance.
5. Later attendance facts satisfy Product D's decline rule.
6. Product D creates a qualifying assessment and outreach draft.
7. Product D shows the evidence, lets staff edit and approve the final message, simulates sending, records the response, and completes the case.
8. Product C answers the member's follow-up questions.
9. The same member returns to Product A and books another class.

The synthetic dataset contract defines the fixture and its expected outputs.
