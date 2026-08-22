# Pulse Studio Web

The shared Next.js application for Pulse Studio's public site, member experience, and separate staff experience.

## Current foundation

- Public landing page, membership overview, class preview, and join flow
- Separate member and staff login pages
- Member portal foundation for Product A booking and Product C support
- Staff portal foundation for Product B attendance and Product D re-engagement
- Shared editorial visual system and reusable UI components
- Supabase browser and server client factories

The four products are connected modules of one application, not four separate deployments.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add the Supabase project URL and publishable key.
3. Install dependencies with `pnpm install`.
4. Start the application with `pnpm run dev`.
5. Open [http://localhost:3000](http://localhost:3000).

Never commit `.env.local`, passwords, service-role keys, or access tokens.

## Validation

```bash
pnpm run lint
pnpm run build
```

## Routes

- `/` — public landing page
- `/membership` — membership plans
- `/classes` — public schedule preview
- `/join` — membership join foundation
- `/login` — member login
- `/member` — member portal
- `/staff/login` — separate staff login
- `/staff` — staff portal

## Next implementation step

Connect Supabase authentication and enforce the member/staff route boundary before wiring live schedule, reservation, roster, attendance, risk, and outreach data into the interfaces.
