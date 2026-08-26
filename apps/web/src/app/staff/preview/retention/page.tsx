import { notFound } from "next/navigation";

import { PortalShell } from "@/components/portal-shell";
import { StaffRetentionPreviewQueue } from "@/components/staff-retention-preview-queue";
import { staffPreviewLinks } from "@/lib/staff-preview-navigation";
import { retentionPreviewCases } from "@/lib/staff-retention-preview-data";

export default function StaffRetentionPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const highPriority = retentionPreviewCases.filter((item) => item.priority === "high").length;
  const inProgress = retentionPreviewCases.filter((item) => item.priority !== "low" && item.status !== "Ready for review").length;
  const monitored = retentionPreviewCases.filter((item) => item.priority === "low").length;

  return (
    <PortalShell audience="staff" eyebrow="Staff portal · Product D" title="Member retention" description="Preview the attendance-risk queue and approved staff workflow without signing in or changing member records." links={staffPreviewLinks}>
      <div role="status" className="mb-6 rounded-2xl bg-black px-5 py-4 text-sm leading-6 text-white"><strong>Practice workspace.</strong> Representative data is used here. Journey actions demonstrate the required sequence but do not save production changes.</div>
      <section aria-label="Retention queue summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl bg-black p-5 text-white"><p className="text-3xl font-semibold">{retentionPreviewCases.length - monitored}</p><p className="mt-1 text-sm text-white/70">Open cases</p></div>
        <div className="rounded-3xl bg-[#c72c25] p-5 text-white"><p className="text-3xl font-semibold">{highPriority}</p><p className="mt-1 text-sm text-white/80">High priority</p></div>
        <div className="rounded-3xl border border-black/10 bg-white/60 p-5"><p className="text-3xl font-semibold">{inProgress}</p><p className="mt-1 text-sm text-black/65">In progress</p></div>
        <div className="rounded-3xl border border-emerald-900/10 bg-emerald-50/70 p-5"><p className="text-3xl font-semibold text-emerald-900">{monitored}</p><p className="mt-1 text-sm text-emerald-950/70">Monitoring · no case</p></div>
      </section>
      <StaffRetentionPreviewQueue cases={retentionPreviewCases} />
    </PortalShell>
  );
}
