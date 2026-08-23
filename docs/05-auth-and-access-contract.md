# Pulse Studio Authentication and Access Contract

**Version:** 1.0.0  
**Status:** implementation baseline

## Identity mapping

Supabase Auth owns credentials. Pulse Studio stores no passwords or password hashes.

- An authenticated member is linked when `auth.uid()::text = member_accounts.auth_subject` and the account is active.
- An authenticated staff user is linked when `auth.uid()::text = staff_accounts.auth_subject` and the account is active.
- `owner_admin` and `instructor` are the only staff roles.
- Product D is available equally to active instructors and owner/admins, as required by Business Rules v1.

## Access matrix

| Area | Public visitor | Authenticated member | Active staff |
|---|---|---|---|
| Membership plans | Read | Read | Read; owner/admin manages |
| Class schedule | Read non-cancelled sessions | Read non-cancelled sessions | Read all; owner/admin mutates through schedule commands |
| Member profile | None | Read/update own profile | Read for studio operations |
| Membership and status history | None | Read own; request pause through command | Read; owner/admin uses administration commands |
| Reservations | None | Read own; book/cancel through Product A commands | Read; no broad direct mutation |
| Drop-in payments | None | Read own | Read; command-controlled authorization/refund |
| Notifications and waitlist promotions | None | Read own | Read; command-created operational records |
| Attendance | None | Read own outcomes | Read; record/correct through Product B commands |
| Risk, notes, outreach, action audit | None | None | Read; Product D mutations use audited commands |
| Staff and member account mappings | None | Member reads own mapping | Staff reads own mapping; owner/admin reads all |

## Safety rules

- RLS is enforced on every canonical table.
- Anonymous access is limited to membership plans and non-cancelled class sessions.
- Member policies resolve ownership through the authenticated member mapping rather than trusting client-supplied identifiers.
- Members and staff do not mutate reservation or payment tables directly. Product A commands enforce ownership, timing, capacity, credits, waitlists, and simulated payments/refunds.
- Schedule cancellation and membership-pause decisions require owner/admin commands with actor attribution and auditable side effects.
- Product C uses public facts before login and member-owned facts after login. It receives no Product D mutation permission.
- `outreach_actions` is append-only for staff.
- Service-role operations remain server-only and bypass RLS only in trusted backend code.
- Real delivery, billing, and production consent systems remain outside this school-project simulation.

## Password recovery

- Member and staff recovery emails return to `/auth/callback` with their intended audience.
- The server callback exchanges the one-time Supabase authorization code for a cookie-backed recovery session before redirecting to `/auth/update-password`.
- The password form remains disabled unless the server verifies the recovery user with `getUser()`.
- Missing, invalid, expired, or already-used links show a safe generic error and direct the user to request a new link.
- After a successful password update, the recovery session is signed out and the user returns to the appropriate member or staff login page.
- Recovery redirects are fixed application destinations; user-supplied external redirect URLs are not accepted.
