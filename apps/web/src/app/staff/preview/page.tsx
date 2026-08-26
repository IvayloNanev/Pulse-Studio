import { notFound } from "next/navigation";
import Link from "next/link";

import { PortalShell } from "@/components/portal-shell";
import { StaffReason, StaffUrgencyBadge, StaffWorkflowLabel } from "@/components/staff-workflow-ui";
import { staffPreviewLinks } from "@/lib/staff-preview-navigation";

export default function StaffPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <PortalShell audience="staff" eyebrow="Staff portal · Local preview" title="Today at Pulse" description="Your operational view of today’s classes, attendance, and members who may need support." links={staffPreviewLinks}>
      <div role="status" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-black px-5 py-3 text-sm leading-6 text-white">
        <p><strong>Local preview mode.</strong> Representative data only; staff actions are disabled.</p>
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]">Tuesday · Aug 25</span>
      </div>

      <section aria-labelledby="staff-priorities-heading" className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
        <article className="relative overflow-hidden rounded-3xl bg-[#161616] p-6 text-white sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[#c72c25]/45 blur-3xl" />
          <div className="relative">
            <div className="[&>p]:text-[#ff776f]"><StaffWorkflowLabel product="Product B" workflow="Studio operations" /></div>
            <div className="mt-3"><StaffUrgencyBadge level="urgent">Urgent · before 6:00 PM</StaffUrgencyBadge></div>
            <h2 id="staff-priorities-heading" className="mt-3 max-w-2xl text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">Prepare the next class, then follow up with members.</h2>
            <div className="mt-4 max-w-2xl [&>div]:border-white/15 [&>div]:bg-white/10 [&_p]:text-white/60 [&_div_div]:text-white/80"><StaffReason>Power Interval is full with three members waiting. Confirm the roster before the 6:00 PM start.</StaffReason></div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/staff/preview/rosters" className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-black transition hover:bg-[#ff776f] focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2">Open next roster</Link>
              <Link href="/staff/preview/retention" className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/25 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2">Review retention queue</Link>
            </div>
          </div>
        </article>

        <aside aria-label="Today’s operating summary" className="glass-panel rounded-3xl p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><div><p className="font-mono text-xs uppercase tracking-[0.16em] text-[#a9231e]">Today</p><h2 className="mt-2 text-2xl font-semibold">At a glance</h2></div><span className="size-3 rounded-full bg-emerald-500" aria-label="Studio operations online" /></div>
          <dl className="mt-5 divide-y divide-black/10">
            <div className="flex items-center justify-between gap-4 py-3"><dt className="text-sm text-black/65">Upcoming sessions</dt><dd className="text-xl font-semibold">4</dd></div>
            <div className="flex items-center justify-between gap-4 py-3"><dt className="text-sm text-black/65">Members expected</dt><dd className="text-xl font-semibold">52</dd></div>
            <div className="flex items-center justify-between gap-4 py-3"><dt className="text-sm text-black/65">Waitlisted</dt><dd className="text-xl font-semibold text-[#a9231e]">3</dd></div>
            <div className="flex items-center justify-between gap-4 py-3"><dt className="text-sm text-black/65">Retention cases</dt><dd className="text-xl font-semibold">8</dd></div>
          </dl>
        </aside>
      </section>

      <section aria-label="Staff products" className="mt-5 grid gap-5 lg:grid-cols-2">
        <article className="flex min-w-0 flex-col rounded-3xl border border-black/10 bg-white/65 p-5 shadow-[0_18px_60px_rgba(31,24,18,0.08)] backdrop-blur-xl sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><StaffWorkflowLabel product="Product B" workflow="Studio operations" /><h2 className="mt-2 text-2xl font-semibold">Schedule & attendance</h2></div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">1 roster needs attention</span>
          </div>
          <div className="mt-5 space-y-3">
            <div className="rounded-2xl bg-[#f1ebe3] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">Power Interval</p><p className="mt-1 text-sm text-black/65">6:00 PM · Jordan Lee</p></div><p className="text-right text-sm font-semibold text-[#a9231e]">16/16<br /><span className="font-normal text-black/65">3 waiting</span></p></div></div>
            <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-black/[0.04] p-4"><p className="text-2xl font-semibold">3</p><p className="text-xs text-black/65">Later sessions</p></div><div className="rounded-2xl bg-black/[0.04] p-4"><p className="text-2xl font-semibold">0</p><p className="text-xs text-black/65">Attendance overdue</p></div></div>
          </div>
          <Link href="/staff/preview/rosters" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-[#c72c25] focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">Manage schedule & attendance</Link>
        </article>

        <article className="flex min-w-0 flex-col rounded-3xl bg-[#eee6dc] p-5 shadow-[0_18px_60px_rgba(31,24,18,0.08)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><StaffWorkflowLabel product="Product D" workflow="Re-engagement" /><h2 className="mt-2 text-2xl font-semibold">Member retention</h2></div>
            <span className="rounded-full bg-[#c72c25] px-3 py-1 text-xs font-semibold text-white">3 high priority</span>
          </div>
          <div className="mt-5 space-y-2">
            {[['Marcus Reed', '70% decline', 'Follow-up due'], ['Amara Lewis', '67% decline', 'Start review'], ['Daniel Brooks', '64% decline', 'Start review']].map(([member, decline, action]) => (
              <div key={member} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-white/60 p-4"><div className="min-w-0"><p className="truncate font-semibold">{member}</p><p className="mt-1 text-xs text-black/65">{action}</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#a9231e]">{decline}</span></div>
            ))}
          </div>
          <Link href="/staff/preview/retention" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-[#c72c25] px-5 text-sm font-semibold text-white transition hover:bg-[#a9231e] focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">Open retention queue</Link>
        </article>
      </section>
    </PortalShell>
  );
}
