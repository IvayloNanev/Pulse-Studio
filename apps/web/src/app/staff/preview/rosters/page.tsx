import { notFound } from "next/navigation";

import { PortalShell } from "@/components/portal-shell";
import { StaffMetric, StaffReason, StaffUrgencyBadge, StaffWorkflowLabel } from "@/components/staff-workflow-ui";
import { staffPreviewLinks } from "@/lib/staff-preview-navigation";

const sessions = [
  { time: "6:00 PM", name: "HIIT", instructor: "Jordan Lee", confirmed: 16, capacity: 16, waitlist: 3, status: "Urgent", reason: "The class is full and three members are waiting. Confirm the roster before doors open.", next: "Review roster before 6:00 PM" },
  { time: "7:15 PM", name: "Yoga", instructor: "Mina Patel", confirmed: 14, capacity: 20, waitlist: 0, status: "Ready", reason: "Six places remain and no attendance action is open yet.", next: "Roster opens near class time" },
  { time: "8:00 PM", name: "Cycling", instructor: "Avery Brooks", confirmed: 12, capacity: 18, waitlist: 0, status: "Ready", reason: "Six places remain and no waitlist needs review.", next: "Roster opens near class time" },
  { time: "Tomorrow · 7:00 AM", name: "HIIT", instructor: "Jordan Lee", confirmed: 10, capacity: 16, waitlist: 0, status: "Upcoming", reason: "This is tomorrow’s first class; review only if the roster changes.", next: "Prepare tomorrow" },
];

export default function StaffRostersPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <PortalShell audience="staff" eyebrow="Staff portal · Product B" title="Schedule & attendance" description="Preview upcoming rosters, capacity, waitlists, and attendance readiness." links={staffPreviewLinks}>
      <div role="status" className="mb-6 rounded-2xl bg-black px-5 py-4 text-sm leading-6 text-white"><strong>Local preview mode.</strong> Attendance controls are intentionally disabled.</div>
      <section className="mb-5 rounded-3xl border border-amber-700/20 bg-amber-50 p-5" aria-labelledby="roster-priority-heading"><StaffWorkflowLabel product="Product B" workflow="Studio operations" /><h2 id="roster-priority-heading" className="mt-2 text-2xl font-semibold">Start with the 6:00 PM roster</h2><p className="mt-2 text-sm leading-6 text-amber-950">It is the only full class with an active waitlist. The remaining rosters are preparation work, not urgent work.</p></section>
      <div className="grid gap-4 xl:grid-cols-2">
        {sessions.map((session) => (
          <article key={`${session.time}-${session.name}`} className="glass-panel flex h-full flex-col rounded-3xl p-5 sm:p-6">
            <StaffWorkflowLabel product="Product B" workflow="Roster & attendance" />
            <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
              <div><p className="font-mono text-xs uppercase tracking-[0.16em] text-black/60">{session.time}</p><h2 className="mt-2 text-2xl font-semibold">{session.name}</h2><p className="mt-1 text-sm text-black/65">with {session.instructor}</p></div>
              <StaffUrgencyBadge level={session.waitlist ? "urgent" : session.status === "Ready" ? "ready" : "informational"}>{session.status}</StaffUrgencyBadge>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <StaffMetric value={session.confirmed} label="Confirmed" /><StaffMetric value={session.capacity} label="Capacity" /><StaffMetric value={session.waitlist} label="Waitlisted" emphasis={session.waitlist > 0} />
            </div>
            <div className="mt-4"><StaffReason>{session.reason}</StaffReason></div>
            <button type="button" disabled className="mt-4 inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-full bg-black/45 px-5 text-sm font-semibold text-white" aria-label={`${session.next}; disabled in local preview`}>{session.next}</button>
          </article>
        ))}
      </div>
    </PortalShell>
  );
}
