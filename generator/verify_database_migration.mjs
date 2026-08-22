import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const migrationPath = path.join(root, "supabase", "migrations", "20260822150000_create_pulse_studio_schema_v2.sql");
const migration = await fs.readFile(migrationPath, "utf8");

const tables = [
  "members", "membership_plans", "memberships", "membership_status_history",
  "class_sessions", "reservations", "attendance_records", "attendance_corrections",
  "risk_assessments", "outreach_records", "staff_accounts", "member_accounts",
  "membership_pause_requests", "drop_in_payments", "waitlist_promotions",
  "risk_case_notes", "notifications", "outreach_actions",
];

const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

for (const table of tables) {
  const csvPath = path.join(root, "data", "valid", `${table}.csv`);
  const header = (await fs.readFile(csvPath, "utf8")).split(/\r?\n/, 1)[0].split(",");
  const tableMatch = migration.match(new RegExp(`create table public\\.${table} \\(([\\s\\S]*?)\\n\\);`, "i"));
  assert(Boolean(tableMatch), `missing table public.${table}`);
  if (tableMatch) {
    for (const column of header) {
      assert(new RegExp(`(^|\\n)\\s*${column}\\s+`, "i").test(tableMatch[1]), `${table} missing CSV column ${column}`);
    }
  }
  assert(new RegExp(`alter table public\\.${table} enable row level security;`, "i").test(migration), `${table} missing RLS`);
}

const requiredEnums = {
  class_type: ["yoga", "cycling", "hiit"],
  membership_status: ["active", "paused", "cancelled"],
  reservation_status: ["confirmed", "waitlisted", "cancelled", "studio_cancelled"],
  attendance_status: ["attended", "no_show"],
  risk_level: ["medium", "high"],
  risk_review_status: ["pending", "in_progress", "resolved", "dismissed"],
  outreach_status: ["draft", "ready", "sent", "completed"],
  outreach_channel: ["email", "sms", "phone"],
  outreach_response: ["interested", "needs_support", "not_interested", "do_not_contact"],
  staff_role: ["owner_admin", "instructor"],
};

for (const [name, values] of Object.entries(requiredEnums)) {
  const enumMatch = migration.match(new RegExp(`create type public\\.${name} as enum \\(([^;]+)\\);`, "i"));
  assert(Boolean(enumMatch), `missing enum ${name}`);
  for (const value of values) assert(enumMatch?.[1].includes(`'${value}'`), `enum ${name} missing ${value}`);
}

for (const safeguard of [
  "membership_history_no_overlap", "reservations_one_open_per_member_session",
  "membership_plan_catalog_check", "risk_decline_math", "risk_level_math",
  "validate_reservation", "validate_attendance", "validate_outreach",
  "original outreach message is immutable", "outreach states may not be skipped or reversed",
  "apply_do_not_contact_response",
]) assert(migration.includes(safeguard), `missing safeguard ${safeguard}`);

assert(!/(service_role|database_url|postgres(?:ql)?:\/\/|password\s*=)/i.test(migration), "migration appears to contain a credential");
assert(migration.trimStart().startsWith("-- Pulse Studio canonical database schema"), "migration header missing");
assert(migration.includes("begin;") && migration.includes("commit;"), "migration must be transactional");

if (errors.length) {
  console.error(JSON.stringify({ status: "failed", errors }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  status: "passed",
  migration: path.relative(root, migrationPath),
  canonical_tables: tables.length,
  csv_headers_aligned: true,
  rls_enabled_on_all_tables: true,
  required_enums_present: Object.keys(requiredEnums).length,
  credentials_detected: false,
}, null, 2));
