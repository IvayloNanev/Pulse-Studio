import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarDays, ClipboardCheck, UsersRound } from "lucide-react";

import { PortalShell } from "@/components/portal-shell";
import { requireStaff } from "@/lib/auth";
import { newYorkCalendarDays } from "@/lib/member-calendar";

const links = [
  { href: "/staff", label: "Overview" },
  { href: "/staff/rosters", label: "Rosters" },
  { href: "/staff/retention", label: "Member retention" },
];

type StaffProfile = {
  first_name: string;
  last_name: string;
  role: "owner_admin" | "instructor";
};

type StaffSession = {
  class_session_id: string;
  class_type: "yoga" | "cycling" | "hiit";
  class_type_label: string;
  starts_at: string;
  capacity: number;
  confirmed_reservations: number;
  waitlisted_reservations: number;
  available_spots: number;
  instructor_name: string;
};

type RiskCase = {
  risk_assessment_id: string;
  member_name: string;
  risk_level: "high" | "medium";
  review_status: "pending" | "in_progress";
  risk_reason: string;
  outreach_status: string | null;
};

const classNames = { yoga: "Studio Flow", cycling: "Pulse Ride", hiit: "Power Interval" };
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  hour: "numeric",
  minute: "2-digit",
});
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "long",
  month: "long",
  day: "numeric",
});

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl border border-white/65 bg-white/55 p-4 shadow-[0_0.75rem_2rem_rgba(17,17,17,0.05)] backdrop-blur-xl"><dd className="text-3xl font-semibold tracking-[-0.05em]">{value}</dd><dt className="mt-1 text-sm text-black/65">{label}</dt></div>;
}

export default async function StaffPortalPage() {
  const { supabase, staffId } = await requireStaff();
  const now = new Date();
  const [today, tomorrow] = newYorkCalendarDays(now, 2);

  const [profileResult, scheduleResult, riskResult] = await Promise.all([
    supabase.from("staff_accounts").select("first_name,last_name,role").eq("staff_id", staffId).single(),
    supabase
      .from("public_class_schedule")
      .select("class_session_id,class_type,class_type_label,starts_at,capacity,confirmed_reservations,waitlisted_reservations,available_spots,instructor_name")
      .gte("starts_at", today.starts_at)
      .lt("starts_at", tomorrow.starts_at)
      .order("starts_at", { ascending: true }),
    supabase
      .from("product_d_risk_queue")
      .select("risk_assessment_id,member_name,risk_level,review_status,risk_reason,outreach_status")
      .order("risk_priority", { ascending: true })
      .order("evaluated_at", { ascending: true }),
  ]);

  const profile = profileResult.data as StaffProfile | null;
  const sessions = (scheduleResult.data ?? []) as StaffSession[];
  const cases = (riskResult.data ?? []) as RiskCase[];
  const confirmedToday = sessions.reduce((total, session) => total + session.confirmed_reservations, 0);
  const waitlistedToday = sessions.reduce((total, session) => total + session.waitlisted_reservations, 0);
  const highRiskCases = cases.filter((item) => item.risk_level === "high").length;

  return (
    <PortalShell audience="staff" eyebrow="Staff portal" title="Today at Pulse" description="Live studio operations for schedules, attendance, and member re-engagement." links={links} showHeader={false}>
      <header className="rounded-3xl bg-[#171717] p-6 text-white shadow-[0_1.5rem_4rem_rgba(17,17,17,0.18)] sm:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-white/65">{dateFormatter.format(now)}</p>
        <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><h1 className="text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">{profile ? `Hello, ${profile.first_name}.` : "Studio overview"}</h1><p className="mt-2 text-sm text-white/70">{profile ? `${profile.role === "owner_admin" ? "Owner / administrator" : "Instructor"} · Staff ID ${staffId}` : "Your staff profile could not be loaded."}</p></div>
          <Link href="/staff/rosters" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#c72c25] px-5 text-sm font-semibold transition hover:bg-[#a9231e] focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2">Open all rosters <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>
      </header>

      <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Today’s operational summary">
        <Metric label="Sessions today" value={sessions.length} />
        <Metric label="Confirmed members" value={confirmedToday} />
        <Metric label="Waitlisted today" value={waitlistedToday} />
        <Metric label="High-risk cases" value={highRiskCases} />
      </section>

      <section className="mt-4 rounded-3xl border border-black/10 bg-[#eee6dc] p-4 sm:p-6" aria-labelledby="today-sessions-title">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-[0.14em] text-black/60">Product B · live schedule</p><h2 id="today-sessions-title" className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">Today’s sessions</h2></div><Link href="/staff/rosters" className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold underline decoration-[#c72c25] decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">View 30-day schedule <CalendarDays className="size-4" aria-hidden="true" /></Link></div>

        {scheduleResult.error ? <div role="alert" className="mt-5 rounded-2xl border border-[#c72c25]/30 bg-white/70 p-5 text-sm text-[#8e211c]">Today’s schedule is temporarily unavailable. Rosters and attendance actions have not been changed.</div> : sessions.length === 0 ? <div className="mt-5 rounded-2xl border border-black/10 bg-white/70 p-5"><h3 className="font-semibold">No sessions scheduled today</h3><p className="mt-1 text-sm text-black/65">Use the 30-day schedule to review upcoming studio operations.</p></div> : <div className="mt-5 divide-y divide-black/10 rounded-2xl border border-white/70 bg-white/68 px-4 backdrop-blur-xl sm:px-5">
          {sessions.map((session) => {
            const utilization = session.capacity > 0 ? Math.round((session.confirmed_reservations / session.capacity) * 100) : 0;
            return <article key={session.class_session_id} className="grid gap-4 py-5 md:grid-cols-[5rem_1fr_auto] md:items-center"><div><p className="font-mono text-sm font-semibold">{timeFormatter.format(new Date(session.starts_at))}</p><p className="mt-1 text-xs text-black/60">{utilization}% full</p></div><div><h3 className="text-lg font-semibold">{classNames[session.class_type]}</h3><p className="mt-1 text-sm text-black/65">{session.class_type_label} with {session.instructor_name}</p><p className="mt-1 text-sm font-medium">{session.confirmed_reservations}/{session.capacity} confirmed · {session.waitlisted_reservations} waitlisted · {session.available_spots} open</p></div><Link href={`/staff/rosters/${encodeURIComponent(session.class_session_id)}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-[#c72c25] focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2"><ClipboardCheck className="size-4" aria-hidden="true" /> Open roster</Link></article>;
          })}
        </div>}
      </section>

      <section className="mt-4 rounded-3xl border border-white/70 bg-white/62 p-4 shadow-[0_1rem_3rem_rgba(17,17,17,0.06)] backdrop-blur-xl sm:p-6" aria-labelledby="retention-priority-title">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-xs uppercase tracking-[0.14em] text-black/60">Product D · prioritized queue</p><h2 id="retention-priority-title" className="mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">Members needing attention</h2></div><Link href="/staff/retention" className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-semibold underline decoration-[#c72c25] decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">Open full queue <UsersRound className="size-4" aria-hidden="true" /></Link></div>

        {riskResult.error ? <div role="alert" className="mt-5 rounded-2xl border border-[#c72c25]/30 bg-[#c72c25]/5 p-5 text-sm text-[#8e211c]">The retention queue is temporarily unavailable. Today’s roster remains usable.</div> : cases.length === 0 ? <div className="mt-5 rounded-2xl border border-black/10 bg-[#f7f4ee] p-5"><h3 className="font-semibold">The queue is clear</h3><p className="mt-1 text-sm text-black/65">There are no pending or in-progress attendance-decline cases.</p></div> : <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {cases.slice(0, 3).map((item) => <article key={item.risk_assessment_id} className="rounded-2xl border border-black/10 bg-[#f7f4ee] p-5"><div className="flex flex-wrap gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.risk_level === "high" ? "bg-[#c72c25] text-white" : "bg-amber-100 text-amber-900"}`}><AlertTriangle className="mr-1 inline size-3.5" aria-hidden="true" />{item.risk_level} risk</span><span className="rounded-full border border-black/15 px-2.5 py-1 text-xs font-semibold capitalize">{item.review_status.replace("_", " ")}</span></div><h3 className="mt-4 text-xl font-semibold">{item.member_name}</h3><p className="mt-2 line-clamp-2 text-sm leading-6 text-black/65">{item.risk_reason}</p><p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-black/60">Outreach: {item.outreach_status ?? "not started"}</p><Link href={`/staff/retention/${encodeURIComponent(item.risk_assessment_id)}`} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-black px-4 text-sm font-semibold text-white transition hover:bg-[#c72c25] focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">Review member <ArrowRight className="size-4" aria-hidden="true" /></Link></article>)}
        </div>}
      </section>
    </PortalShell>
  );
}
