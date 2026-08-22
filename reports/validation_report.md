# Pulse Studio Reconciled Dataset Validation Report

- Schema version: 2.0.0
- Generator version: 3.0.0
- Assumptions version: 2026-08-22.2
- Seed: 20260820
- Valid-data errors: 0
- Intentional errors expected: 12
- Intentional errors detected: 12
- Unexpected errors: 0
- Attendance distribution: 90.00% attended / 10.00% no-show
- Result: **PASS**

## Table counts

| Table | Valid | Invalid | Support rows |
|---|---:|---:|---:|
| members | 250 | 0 | 0 |
| membership_plans | 3 | 0 | 0 |
| memberships | 250 | 0 | 0 |
| membership_status_history | 350 | 0 | 0 |
| class_sessions | 1185 | 0 | 0 |
| reservations | 24032 | 3 | 1 |
| attendance_records | 16806 | 4 | 0 |
| attendance_corrections | 8 | 0 | 0 |
| risk_assessments | 25 | 2 | 0 |
| outreach_records | 28 | 0 | 0 |
| staff_accounts | 4 | 1 | 0 |
| member_accounts | 250 | 0 | 0 |
| membership_pause_requests | 12 | 1 | 0 |
| drop_in_payments | 12 | 1 | 0 |
| waitlist_promotions | 5 | 0 | 0 |
| risk_case_notes | 30 | 0 | 0 |
| notifications | 46 | 0 | 0 |
| outreach_actions | 75 | 0 | 0 |

## Intentional error checks

- **ERR-001** — FK_RESERVATION_MEMBER: detected and quarantined
- **ERR-002** — FK_ATTENDANCE_RESERVATION: detected and quarantined
- **ERR-003** — SESSION_CAPACITY_EXCEEDED: detected and quarantined
- **ERR-004** — LATE_CANCELLATION_MISMATCH: detected and quarantined
- **ERR-005** — APPROVED_PAUSE_FEE: detected and quarantined
- **ERR-006** — DROP_IN_AMOUNT: detected and quarantined
- **ERR-007** — STAFF_ROLE_ENUM: detected and quarantined
- **ERR-008** — NO_SHOW_TOO_EARLY: detected and quarantined
- **ERR-009** — ATTENDANCE_REQUIRES_CONFIRMED: detected and quarantined
- **ERR-010** — ATTENDANCE_RESERVATION_UNIQUE: detected and quarantined
- **ERR-011** — RISK_COUNTS_RECOMPUTE: detected and quarantined
- **ERR-012** — RISK_PERCENT_LEVEL_RECOMPUTE: detected and quarantined
