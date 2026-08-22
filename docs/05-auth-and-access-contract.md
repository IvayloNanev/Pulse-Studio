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
| Class schedule | Read non-cancelled sessions | Read non-cancelled sessions | Read and manage all sessions |
| Member profile | None | Read/update own profile | Read for studio operations |
| Membership and status history | None | Read own | Read; owner/admin manages |
| Reservations | None | Read/create/cancel own | Read and manage |
| Drop-in payments | None | Read/create own simulated authorization | Read; owner/admin refunds |
| Notifications and waitlist promotions | None | Read own | Read/manage operational records |
| Attendance | None | Read own outcomes | Read and manage |
| Risk, notes, outreach, action audit | None | None | Product D read/write; action audit is append-only |
| Staff and member account mappings | None | Member reads own mapping | Staff reads own mapping; owner/admin reads all |

## Safety rules

- RLS is enforced on every canonical table.
- Anonymous access is limited to membership plans and non-cancelled class sessions.
- Member policies resolve ownership through the authenticated member mapping rather than trusting client-supplied identifiers.
- Members may update a reservation only into the `cancelled` state; database triggers enforce timing and credit rules.
- Product C uses public facts before login and member-owned facts after login. It receives no Product D mutation permission.
- `outreach_actions` is append-only for staff.
- Service-role operations remain server-only and bypass RLS only in trusted backend code.
- Real delivery, billing, and production consent systems remain outside this school-project simulation.
