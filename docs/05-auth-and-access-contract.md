# Pulse Studio Authentication and Access Contract

**Version:** 1.0.0  
**Status:** implementation baseline

## Identity mapping

Supabase Auth owns credentials. Pulse Studio stores no passwords or password hashes.

- An authenticated member is linked when `auth.uid()::text = member_accounts.auth_subject` and the account is active.
- An authenticated staff user is linked when `auth.uid()::text = staff_accounts.auth_subject` and the account is active.
- `owner_admin` and `instructor` are the only staff roles.
- Product D is available equally to active instructors and owner/admins, as required by Business Rules v1.
- Product D global retention facts are exposed through fixed-purpose Staff-authorized interfaces; this workflow permission does not grant instructors broad canonical-table access.

## Access matrix

| Area | Public visitor | Authenticated member | Active staff |
|---|---|---|---|
| Membership plans | Read | Read | Read; owner/admin manages |
| Class schedule | Read non-cancelled sessions | Read non-cancelled sessions | Read all; owner/admin mutates through schedule commands |
| Member profile | None | Read/update own profile | Owner/admin reads globally; instructor reads assigned Product B roster members; Product D uses its dedicated interface |
| Membership and status history | None | Read own; request pause through command | Owner/admin reads directly; Product D uses its dedicated interface |
| Reservations | None | Read own; book/cancel through Product A commands | Owner/admin reads globally; instructor reads assigned Product B sessions; Product D uses its dedicated interface |
| Drop-in payments | None | Read own | Read; command-controlled authorization/refund |
| Notifications and waitlist promotions | None | Read own | Read; command-created operational records |
| Attendance | None | Read own outcomes | Product B instructor reads assigned outcomes; Product D receives global evidence through its dedicated interface |
| Risk, notes, outreach, action audit | None | None | Owner/admin may read directly; all active Staff use Product D interfaces and audited commands |
| Staff and member account mappings | None | Member reads own mapping | Staff reads own mapping; owner/admin reads all |

### Product B Stage 1 role scope

- Owner/admin may read every protected Product B session and roster, record attendance across sessions, and create or resolve underbooking decisions.
- An instructor may read only assigned Product B sessions and rosters and may record or correct attendance only for an assigned session.
- An unrelated instructor receives no protected session, roster, attendance, or decision access for another instructor's session.
- Underbooking decisions are owner/admin-only mutations. Actor identifiers and timestamps are derived by database commands.
- Unauthenticated Product B requests redirect to Staff login.

## Safety rules

- RLS is enforced on every canonical table.
- Anonymous access is limited to membership plans and non-cancelled class sessions.
- Member policies resolve ownership through the authenticated member mapping rather than trusting client-supplied identifiers.
- Members and staff do not mutate reservation or payment tables directly. Product A commands enforce ownership, timing, capacity, credits, waitlists, and simulated payments/refunds.
- Schedule cancellation and membership-pause decisions require owner/admin commands with actor attribution and auditable side effects.
- Product C uses public facts before login and member-owned facts after login. It receives no Product D mutation permission.
- Product A member-owned booking, reservation, cancellation, waitlist, membership, and credit access is unchanged by Staff scoping.
- Product C public non-cancelled schedule access is unchanged by Staff scoping.
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
