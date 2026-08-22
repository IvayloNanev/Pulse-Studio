# Pulse Studio Supabase backend

This directory contains the versioned PostgreSQL definition for the shared Pulse Studio backend.

## Current migration

`migrations/20260822150000_create_pulse_studio_schema_v2.sql` translates the approved Schema 2.0 contract into PostgreSQL. It creates all 18 canonical tables, enum types, foreign keys, indexes, checks, cross-table validation triggers, and row-level-security defaults.

RLS is enabled without client policies in the first migration. This deliberately denies Data API access until member and staff authorization policies are reviewed in a later migration.

## Safe workflow

1. Review and test migrations locally.
2. Link the Supabase CLI to the Pulse Studio project without committing credentials.
3. Apply migrations to the hosted development database.
4. Import only CSVs from `data/valid/` using the versioned seed process.
5. Run database acceptance tests.
6. Commit changes on a working branch and merge through a validated pull request.

Never place the database password, service-role key, personal access token, or `.env` values in Git.

## Versioned dataset seed

Run `node generator/build_supabase_seed.mjs` after an accepted dataset change to regenerate `supabase/seed.sql`. The seed uses ordinary SQL inserts, follows foreign-key dependency order, and runs in one transaction. It intentionally stops if the database already contains member data so it cannot duplicate or overwrite an existing environment.
