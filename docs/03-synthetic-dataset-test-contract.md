# Pulse Studio Synthetic Dataset and Test Contract

**Status:** assignment fixture specification — decisions complete  
**Schema dependency:** `02-canonical-technical-schema.md`

## 1. Purpose

This document governs deterministic synthetic data, intentional invalid records, and acceptance tests. It is separate from the canonical schema so test-only errors and scenario quotas cannot be mistaken for valid production data.

## 2. Determinism and privacy

- Generation must accept and record a fixed random seed.
- The same schema version, generator version, seed, and configuration must produce identical ordered output.
- All people and contact details are fictional.
- Stable identifiers must be reproducible and unique within valid rows.
- Output metadata must include `schema_version`, `generator_version`, `seed`, `generated_at`, `assumptions_version`, and the expected validation totals.
- Ordering must be deterministic before serialization so file hashes are reproducible.

## 3. Coverage requirements

The valid fixture set must include enough records to exercise:

- every class type: `yoga`, `cycling`, and `hiit`;
- confirmed, waitlisted, cancelled, and studio-cancelled reservations;
- attended and no-show outcomes;
- early and late member cancellation credit behavior;
- an underbooked session below 50%, a boundary session at exactly 50%, and a session above 50%;
- active, paused, cancelled, and reactivated membership histories;
- members with fewer than 60 days of history;
- members with fewer than four visits in the previous Product D period;
- non-qualifying, medium, and high decline calculations;
- a recovered member and a member who later declines again;
- Product D outreach examples across draft, ready, sent, and completed states;
- an edited outreach where `original_message` and `final_message` differ;
- the mandatory A → B → D → C → A integration journey.

The source assessment describes these scenario categories without reliable record-count quotas in the accessible preview. The coverage requirements remain authoritative; the fixture profile below records the team's subsequently approved synthetic-data production assumptions.

### 3.1 Assignment fixture profile

These are synthetic-data production assumptions, not additional production application requirements.

| Decision | Fixture value |
|---|---|
| Fixed random seed | `20260820` |
| Historical period | `2025-01-01` through `2025-12-31` |
| Product D evaluation boundary | `2026-01-01T00:00:00-05:00` |
| Upcoming schedule | `2026-01-01` through `2026-01-30` |
| Studio timezone | `America/New_York` |
| Members | 250 |
| Membership plans | 4, 8, and 12 classes per month |
| Plan distribution | 25%, 50%, and 25%, respectively |
| Final membership status distribution | 80% active, 10% paused, 10% cancelled |
| Reactivation coverage | 25 members have at least one later `active` history interval |
| Daily schedule | Three sessions every calendar day |
| Historical sessions | 1,095 |
| Upcoming sessions | 90 |
| Class-type distribution | 40% yoga, 30% cycling, 30% HIIT |
| Session capacity | 30 for every class type |
| Approximate reservation volume | 20,000; exact total is deterministic for the fixed seed |

Session utilization targets are 20% below 50%, 5% exactly 50%, and 75% above 50%. Reservation outcomes target 70% confirmed, 10% waitlisted, 10% early member cancellations, 5% late member cancellations, and 5% studio cancellations. Among eligible confirmed reservations with attendance outcomes, 90% are attended and 10% are no-shows.

Risk coverage includes 15 medium-risk members, 10 high-risk members, 15 members with insufficient membership age, and non-qualifying members covering fewer than four previous visits, decline below 50%, no decline, increased attendance, and paused intervals. Only qualifying medium/high rows appear in `risk_assessments`; non-qualifying expectations live in the scenario manifest.

Outreach-channel targets for qualifying scenarios are approximately 60% email, 24% SMS, and 16% phone. Product D fixtures cover `draft → ready → sent → completed`, immutable originals, edited finals, simulated sending, response outcomes, the exact 14-day retry boundary, and the maximum of three attempts. Product C must never be assigned ownership of outreach.

## 4. Mandatory golden journey

One named fixture member must complete this deterministic trace:

1. valid member, plan, active membership, and status history;
2. confirmed Product A reservation with `membership_id`;
3. appearance on the Product B roster;
4. attended Product B outcome;
5. later attendance pattern with at least four previous-period visits and a decline of at least 50%;
6. Product D assessment whose stored counts, percentage, and level match recomputation;
7. Product D outreach draft with immutable `original_message`;
8. Product D staff edit saved as `final_message`, approved outreach, simulated send, response, and completion;
9. a later Product A confirmed reservation for the same `member_id`.

The golden member uses the 8-class plan, has 8 previous-period visits and 2 current-period visits, receives a 75% high-risk assessment, completes Product D's reviewed and simulated outreach workflow with an interested response, receives Product C chatbot support, and later creates another confirmed reservation. The test manifest identifies the member and every related record ID, timestamp, and expected outcome.

## 5. Product D boundary fixtures

At minimum, deterministic cases must prove:

| Case | Previous visits | Current visits | Expected result |
|---|---:|---:|---|
| Insufficient baseline | 3 | 0 | No qualifying assessment |
| Just below threshold | 4 | 3 | No qualifying assessment; 25% decline |
| Medium lower boundary | 4 | 2 | `medium`; 50% decline |
| High lower boundary | 4 | 1 | `high`; 75% decline |
| High maximum | 4 | 0 | `high`; 100% decline |
| No decline | 4 | 4 | No qualifying assessment |

The 75% case is `high`; the table calls it an upper-interior transition only to make the boundary visible. Tests must also cover half-open time-window edges at exactly `T - 60 days`, `T - 30 days`, and `T`.

## 6. Product B boundary fixtures

**Current implemented Product B rule under test:** `underbooked` means utilization below 50%.

For a capacity of 10:

| Confirmed | Utilization | Expected |
|---:|---:|---|
| 4 | 40% | Underbooked |
| 5 | 50% | Not underbooked |
| 6 | 60% | Not underbooked |

Cancelled sessions must not emit an underbooked warning.

## 7. Credit-policy fixtures

Each policy row must be tested independently within a known billing cycle:

| Fixture outcome | Expected credit delta |
|---|---:|
| Attended | 1 |
| Confirmed no-show | 1 |
| Early cancellation | 0 |
| Late cancellation | 1 |
| Studio cancellation | 0 |
| Waitlisted only | 0 |

Pause fixtures must prove that the billing cycle and available credits freeze during the pause and continue after resumption.

## 8. Intentional invalid-data suite

The dataset contains exactly 12 intentional, realistic fixture errors distributed across Products A–D and shared data. Exactly two are orphan foreign keys. These simulate imports, synchronization races, duplicate events, staff mistakes, and boundary-calculation defects; they are not random corruption and do not add product features.

| Error ID | Realistic scenario | Target rule |
|---|---|---|
| `ERR-001` | Duplicate member profiles are merged, but one imported reservation still references the retired member ID. | Orphan FK: `reservations.member_id` |
| `ERR-002` | A check-in synchronizes before its booking record, leaving attendance linked to a temporarily missing reservation. | Orphan FK: `attendance_records.reservation_id` |
| `ERR-003` | Two simultaneous requests confirm the final class spot. | Confirmed reservations exceed capacity |
| `ERR-004` | A cancellation at 11 hours 59 minutes before class is incorrectly marked early. | Late-cancellation boundary mismatch |
| `ERR-005` | A pause approval is saved before its required $25 fee is attached. | Approved pause fee mismatch |
| `ERR-006` | Checkout uses an old cached $30 drop-in price. | Drop-in amount differs from $35 |
| `ERR-007` | A legacy staff import uses the unsupported role `manager`. | Staff role enum violation |
| `ERR-008` | A timezone configuration error marks a member no-show before the check-in window closes. | No-show recorded before `starts_at + 20 minutes` |
| `ERR-009` | Staff checks in a waitlisted member who was never promoted to confirmed. | Attendance requires confirmed reservation |
| `ERR-010` | A scanner retry creates two attendance rows for one reservation. | Unique attendance per reservation |
| `ERR-011` | A timezone-boundary defect places one attended visit in the wrong 30-day risk period. | Stored risk counts do not recompute |
| `ERR-012` | Decline is rounded before classification, producing the wrong risk level. | Stored percentage/level do not recompute |

Each invalid row has a stable target record and expected rule code in the error manifest. Fixtures are constructed so each error produces its declared primary violation without accidental cascade errors. Invalid records remain in `invalid/`; validation quarantines them and never silently repairs or merges them into valid output. The validator must report all 12 expected errors and no unexpected errors.

## 9. Output separation

Recommended file groups:

- `valid/` — schema-valid canonical tables;
- `invalid/` — intentional invalid input rows only;
- `manifests/scenarios` — fixture IDs and expected outcomes;
- `manifests/errors` — the 12 intentional errors and expected rule codes;
- `reports/validation` — actual validator results.

This directory layout is a **new recommended implementation decision**, not a source fact.

## 10. Acceptance gates

The dataset passes only when:

1. deterministic regeneration yields byte-identical ordered outputs;
2. all valid rows pass the canonical schema and cross-table rules;
3. all required scenario and boundary tests pass;
4. the golden journey resolves end to end with one `member_id`;
5. derived capacity, credit, utilization, and Product D results recompute exactly;
6. all 12 intentional errors are found, including exactly two orphan FKs;
7. no unexpected validation errors occur;
8. quarantined invalid rows do not appear in valid product inputs.

The fixture suite may receive a final PASS only when all eight gates succeed for the same schema version, generator version, seed, and assumptions version.
