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

## Planned next interfaces

- `member_dashboard`
- `product_d_risk_queue`
- `product_d_member_detail`

Each interface will be added and tested in a separate increment.
