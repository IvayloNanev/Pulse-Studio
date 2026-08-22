# Pulse Studio Schema and Dataset Decision Record

**Date:** 2026-08-20  
**Purpose:** Record the schema clarifications and synthetic-data production assumptions agreed during review.  
**Scope:** School assignment schema and deterministic synthetic test fixtures only. This note does not define application architecture or deployment.

## Updated source documents

- `docs/01-product-shared-contract.md`
- `docs/02-canonical-technical-schema.md`
- `docs/03-synthetic-dataset-test-contract.md`

The canonical schema version is now `2.0.0` after the full Business Rules v1 approval and reconciliation of Product C chatbot and Product D re-engagement responsibilities.

## Canonical rule clarifications

- Assignment timezone: `America/New_York`; timestamps retain explicit offsets.
- Membership age for Product D: at least 60 days at evaluation time. Paused days count toward membership age, but paused-period attendance does not count.
- Pauses extend a billing cycle by the exact total duration of all non-overlapping pause intervals.
- Reactivation is represented by a later `active` membership-status interval.
- Member cancellation is late only when it occurs less than 12 hours before class. Exactly 12 hours is early.
- A reservation's membership is active/effective at booking and session time.
- Product D outreach proceeds `draft → ready → sent → completed` without skipping or reversal; sending is simulated.
- `sent` records simulated transmission/contact; `completed` records staff closure of the case.
- Product D owns sending, completion, response tracking, up to three attempts, and a 14-day non-response cooldown; none are assigned to Product C.
- A new decline episode requires the prior case to close, at least one later attended visit, and a later independently qualifying evaluation.
- A no-show is not recorded before 20 minutes after session start.

Response outcomes such as awaiting response, responded, declined contact, and no response are scenario-manifest expectations unless and until a later schema version adds dedicated response fields.

## Synthetic fixture profile

- Fixed seed: `20260820`
- Historical period: 2025-01-01 through 2025-12-31
- Evaluation boundary: `2026-01-01T00:00:00-05:00`
- Upcoming schedule: 2026-01-01 through 2026-01-30
- 250 fictional members
- Plans: 4, 8, and 12 classes/month; distribution 25% / 50% / 25%
- Final statuses: 80% active / 10% paused / 10% cancelled
- 25 members with reactivation histories
- Three sessions per day; 1,095 historical and 90 upcoming sessions
- Class mix: 40% yoga / 30% cycling / 30% HIIT
- Capacity: 30 members for every session
- Approximately 20,000 reservations, with an exact deterministic total at generation
- Utilization: 20% below 50% / 5% at 50% / 75% above 50%
- Reservation targets: 70% confirmed / 10% waitlisted / 10% early-cancelled / 5% late-cancelled / 5% studio-cancelled
- Eligible confirmed attendance: 90% attended / 10% no-show
- Risk coverage: 15 medium, 10 high, 15 insufficient-history, plus non-qualifying scenarios
- Outreach channels: approximately 60% email / 24% SMS / 16% phone; data includes Product D simulated sending and responses

## Golden journey

The manifest identifies one 8-class-plan member and every connected record. The member reserves and attends, later declines from 8 visits to 2, receives a 75% high-risk assessment, completes Product D's simulated outreach workflow, uses Product C for member-support questions, and later creates another confirmed reservation.

## Intentional invalid fixtures

Exactly 12 realistic errors are isolated in `invalid/`: two orphan foreign keys caused by account merging and synchronization order; over-capacity concurrency; incorrect cancellation boundary; pause-fee, drop-in-price, and staff-role mistakes; three attendance/check-in defects; and two Product D period/rounding defects. Full IDs and expected rules are defined in `03-synthetic-dataset-test-contract.md`.

## Change control

Future build discoveries may revise the schema. Any revision must increment the schema or assumptions version, regenerate fixtures with the recorded seed, and rerun all validation and acceptance gates. Valid product inputs must never include rows from `invalid/`.
