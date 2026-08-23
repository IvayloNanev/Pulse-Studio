import { FoundationGrid } from "@/components/foundation-grid";
import { PortalShell } from "@/components/portal-shell";
import { requireStaff } from "@/lib/auth";

const links = [
  { href: "/staff", label: "Overview" },
  { href: "/staff/rosters", label: "Rosters" },
  { href: "/staff/retention", label: "Member retention" },
];

const items = [
  { href: "/staff/rosters", title: "Class rosters", description: "Open upcoming sessions and review confirmed and waitlisted members.", label: "Product B" },
  { href: "/staff/rosters", title: "Record attendance", description: "Record attended or no-show outcomes within the approved window.", label: "Product B" },
  { href: "/staff/retention", title: "Flagged members", description: "Review risk evidence and manage staff-approved outreach.", label: "Product D" },
];

export default async function StaffPortalPage() {
  await requireStaff();
  return <PortalShell eyebrow="Staff portal" title="Today at Pulse" description="A separate operational workspace for schedules, attendance, and member re-engagement." links={links}><FoundationGrid items={items} /></PortalShell>;
}
