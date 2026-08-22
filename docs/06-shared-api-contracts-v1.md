# Pulse Studio Shared API Contracts v1

**Status:** incremental implementation  
**Naming:** database and API fields use `snake_case`

These interfaces are shared boundaries for Products A–D. Product code should consume these contracts instead of reproducing joins or renaming fields independently.

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

## Planned next interfaces

- `member_dashboard`
- `staff_session_roster`
- `product_d_risk_queue`
- `product_d_member_detail`

Each interface will be added and tested in a separate increment.
