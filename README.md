# Pulse Studio

Pulse Studio contains the reconciled synthetic dataset and schema package for the four-product school assignment.

## Contributors

Pulse Studio's schema, business rules, and synthetic dataset were developed collaboratively by Ivaylo Nanev and a project partner. The partner's name and GitHub profile will be added when those details are available.

## Product ownership

- **Product A — Member Booking App:** schedules, availability, reservations, cancellations, waitlists, and upcoming bookings.
- **Product B — Staff Scheduling Dashboard:** sessions, capacity, rosters, attendance, and no-shows.
- **Product C — Member Support Chatbot:** member questions about classes, preparation, schedules, availability, and booking/cancellation policies. Product C does not own outreach.
- **Product D — Member Re-engagement Tool:** decline detection, factual risk evidence, notes, class recommendations, and the full staff-reviewed outreach workflow through simulated sending, response tracking, and completion.

The authoritative implementation rules are in `docs/04-business-rules-v1.md`.

**Dataset status:** PASS — accepted development dataset

## Start here

- `data/valid/` — the clean CSV files products should load.
- `data/invalid/` — the 12 deliberately flawed real-world test cases, separated by table.
- `data/invalid_support/` — valid supporting rows needed to reproduce some errors.
- `docs/` — shared product contract, canonical schema, test contract, and decision log.
- `manifests/` — scenario labels, golden journey, error manifest, and generation summary.
- `reports/` — validation evidence.
- `artifacts/` — human-readable Excel review workbook.
- `generator/` — deterministic generation and independent verification scripts.
- `supabase/` — versioned PostgreSQL migrations and backend configuration.

## Dataset size

| Table | Valid rows |
|---|---:|
| Members | 250 |
| Membership plans | 3 |
| Memberships | 250 |
| Membership status history | 350 |
| Class sessions | 1,185 |
| Reservations | 24,010 |
| Attendance records | 16,806 |
| Attendance corrections | 8 |
| Risk assessments | 25 |
| Outreach records | 28 |
| Staff accounts | 4 |
| Member accounts | 250 |
| Membership pause requests | 12 |
| Drop-in payments | 12 |
| Waitlist promotions | 5 |
| Risk case notes | 30 |
| Notifications | 45 |
| Outreach actions | 74 |

## Important rule

Application code must use only `data/valid/`. The other data folders exist exclusively for validator and stress-testing exercises.

## Reproducibility

The dataset uses seed `20260820`, timezone `America/New_York`, and schema version `2.0.0`.

Attendance is normalized to 15,125 attended and 1,681 no-show records (89.998% / 10.002%). The intentionally invalid fixtures are independently recalculated by the verifier rather than accepted by manifest label.

The generator writes a fresh reproducible build to `dataset-build/`. After verification, the accepted files are promoted into the visible `data/`, `manifests/`, `reports/`, and `artifacts/` folders.
