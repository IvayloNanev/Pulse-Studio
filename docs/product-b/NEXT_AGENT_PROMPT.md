# Product B continuation prompt

Read [HANDOFF.md](./HANDOFF.md) first. It is the authoritative continuation record.

Before doing anything in production, verify all of the following:

1. The current GitHub `main` SHA and Vercel production deployment still match the accepted release.
2. Supabase project `nsreydnhggxcwdjnekpb` is healthy.
3. The approved `TEST-EOD-*` fixture state and zero acceptance-effect counts remain unchanged.
4. The preserved STOP reason is still authentication-only.
5. Choose and record one path before any production action:
   - **Path A:** acceptance waiver and technical release sign-off; or
   - **Path B:** formal live acceptance with compliant isolated authentication.

Do nothing to production until that decision is recorded. Under Path B, first confirm that a normal supported application-authentication method can establish separate sessions for `TEST-EOD-OWNER`, `TEST-EOD-ASSIGNED`, and `TEST-EOD-UNRELATED` without exposing credentials, changing Auth tables, or sending communications. Do not clear or replace the current STOP marker before that confirmation.

If Path B is available, use one operator and run the remaining tests sequentially: negative authorization and invalid-operation checks; Fixture A attendance and atomic bulk attendance; unrelated correction denial; Fixture A correction; attendance-conflict cancellation rejection; Fixture B blank-reason rejection; Fixture B successful owner cancellation; repeat-cancellation rejection; populated 390px audit-history review; then final integrity and release reporting.

Do not change code, migrations, configuration, fixtures outside the approved `TEST-EOD-*` scope, or deployment state. Do not propose an authentication workaround that depends on exposing, persisting, or transmitting passwords, tokens, OTPs, magic links, cookies, or service-role credentials.
