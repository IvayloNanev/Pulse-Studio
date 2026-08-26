import Link from "next/link";
import { notFound } from "next/navigation";

import { PortalShell } from "@/components/portal-shell";
import { StaffRetentionPreviewJourney } from "@/components/staff-retention-preview-journey";
import { staffPreviewLinks } from "@/lib/staff-preview-navigation";
import { retentionPreviewCases } from "@/lib/staff-retention-preview-data";

export default async function StaffRetentionJourneyPreviewPage({ params }: { params: Promise<{ caseId: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { caseId } = await params;
  const item = retentionPreviewCases.find((candidate) => candidate.id === caseId);
  if (!item) notFound();
  const previewEmail = item.email ?? `${item.member.toLowerCase().replaceAll(" ", ".")}@example.com`;
  const previewPhone = item.phone ?? "(212) 555-0148";

  return (
    <PortalShell audience="staff" eyebrow="Member retention · Case journey" title={`${item.member}'s journey`} description="Follow this retention case from the attendance signal through review, outreach, and resolution." links={staffPreviewLinks}>
      <StaffRetentionPreviewJourney caseId={item.id} initialStatus={item.status} email={previewEmail} phone={previewPhone} doNotContact={item.doNotContact ?? false} />
      <div className="mt-6 flex w-full justify-end border-t border-black/10 pt-6"><Link href="/staff/preview/retention" className="inline-flex min-h-11 items-center rounded-full border border-black/15 bg-white/70 px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">← Back to member retention</Link></div>
    </PortalShell>
  );
}
