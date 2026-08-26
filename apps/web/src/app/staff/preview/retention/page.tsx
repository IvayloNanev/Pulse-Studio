import { notFound } from "next/navigation";

import { PortalShell } from "@/components/portal-shell";
import { StaffRetentionPreviewQueue, type RetentionPreviewCase } from "@/components/staff-retention-preview-queue";
import { staffPreviewLinks } from "@/lib/staff-preview-navigation";

const previewCases = [
  {
    id: "preview-amara",
    member: "Amara Lewis",
    priority: "high",
    status: "Ready for review",
    evaluatedAt: "Aug 25, 2026",
    previous: 9,
    current: 3,
    decline: 67,
    lastAttended: "Aug 12, 2026",
    notes: 2,
    nextAction: "Start review",
  },
  {
    id: "preview-jordan",
    member: "Jordan Kim",
    priority: "medium",
    status: "Outreach ready",
    evaluatedAt: "Aug 24, 2026",
    previous: 7,
    current: 3,
    decline: 57,
    lastAttended: "Aug 16, 2026",
    notes: 1,
    nextAction: "Review outreach",
  },
  {
    id: "preview-sofia",
    member: "Sofia Martinez",
    priority: "medium",
    status: "Follow-up scheduled",
    evaluatedAt: "Aug 23, 2026",
    previous: 6,
    current: 3,
    decline: 50,
    lastAttended: "Aug 18, 2026",
    notes: 3,
    nextAction: "View follow-up",
  },
  {
    id: "preview-daniel",
    member: "Daniel Brooks",
    priority: "high",
    status: "Ready for review",
    evaluatedAt: "Aug 22, 2026",
    previous: 11,
    current: 4,
    decline: 64,
    lastAttended: "Aug 10, 2026",
    notes: 0,
    nextAction: "Start review",
  },
  {
    id: "preview-priya",
    member: "Priya Shah",
    priority: "medium",
    status: "Outreach sent",
    evaluatedAt: "Aug 21, 2026",
    previous: 8,
    current: 4,
    decline: 50,
    lastAttended: "Aug 15, 2026",
    notes: 2,
    nextAction: "Record response",
  },
  {
    id: "preview-marcus",
    member: "Marcus Reed",
    priority: "high",
    status: "Follow-up due",
    evaluatedAt: "Aug 20, 2026",
    previous: 10,
    current: 3,
    decline: 70,
    lastAttended: "Aug 8, 2026",
    notes: 4,
    nextAction: "Prepare follow-up",
  },
  {
    id: "preview-naomi",
    member: "Naomi Chen",
    priority: "medium",
    status: "Outreach draft",
    evaluatedAt: "Aug 19, 2026",
    previous: 6,
    current: 2,
    decline: 67,
    lastAttended: "Aug 14, 2026",
    notes: 1,
    nextAction: "Review draft",
  },
  {
    id: "preview-luis",
    member: "Luis Alvarez",
    priority: "medium",
    status: "Awaiting response",
    evaluatedAt: "Aug 18, 2026",
    previous: 7,
    current: 3,
    decline: 57,
    lastAttended: "Aug 17, 2026",
    notes: 2,
    nextAction: "View case",
  },
  {
    id: "preview-elena",
    member: "Elena Rossi",
    priority: "low",
    status: "Monitoring · no case",
    evaluatedAt: "Aug 17, 2026",
    previous: 9,
    current: 7,
    decline: 22,
    lastAttended: "Aug 23, 2026",
    notes: 0,
    nextAction: "No action needed",
  },
  {
    id: "preview-caleb",
    member: "Caleb Wright",
    priority: "low",
    status: "Monitoring · no case",
    evaluatedAt: "Aug 16, 2026",
    previous: 8,
    current: 6,
    decline: 25,
    lastAttended: "Aug 22, 2026",
    notes: 0,
    nextAction: "No action needed",
  },
  {
    id: "preview-maya",
    member: "Maya Thompson",
    priority: "low",
    status: "Monitoring · no case",
    evaluatedAt: "Aug 15, 2026",
    previous: 10,
    current: 7,
    decline: 30,
    lastAttended: "Aug 24, 2026",
    notes: 0,
    nextAction: "No action needed",
  },
] as const;

export default function StaffRetentionPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const highPriority = previewCases.filter((item) => item.priority === "high").length;
  const inProgress = previewCases.filter((item) => item.priority !== "low" && item.status !== "Ready for review").length;
  const monitored = previewCases.filter((item) => item.priority === "low").length;

  return (
    <PortalShell
      audience="staff"
      eyebrow="Staff portal · Product D"
      title="Member retention"
      description="Preview the attendance-risk queue and staff workflow without signing in or changing live member data."
      links={staffPreviewLinks}
    >
      <div role="status" className="mb-6 rounded-2xl bg-black px-5 py-4 text-sm leading-6 text-white">
        <strong>Local preview mode.</strong> This page uses representative data. Staff actions are disabled and production authentication remains unchanged.
      </div>

      <section aria-label="Retention queue summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl bg-black p-5 text-white"><p className="text-3xl font-semibold">{previewCases.length - monitored}</p><p className="mt-1 text-sm text-white/70">Open cases</p></div>
        <div className="rounded-3xl bg-[#c72c25] p-5 text-white"><p className="text-3xl font-semibold">{highPriority}</p><p className="mt-1 text-sm text-white/80">High priority</p></div>
        <div className="rounded-3xl border border-black/10 bg-white/60 p-5"><p className="text-3xl font-semibold">{inProgress}</p><p className="mt-1 text-sm text-black/65">In progress</p></div>
        <div className="rounded-3xl border border-emerald-900/10 bg-emerald-50/70 p-5"><p className="text-3xl font-semibold text-emerald-900">{monitored}</p><p className="mt-1 text-sm text-emerald-950/70">Monitoring · no case</p></div>
      </section>

      <StaffRetentionPreviewQueue cases={[...previewCases] as RetentionPreviewCase[]} />
    </PortalShell>
  );
}
