import { FoundationGrid } from "@/components/foundation-grid";
import { PortalShell } from "@/components/portal-shell";
import { requireStaff } from "@/lib/auth";

const links = [
  { href: "/staff", label: "Overview" },
  { href: "/staff", label: "Rosters" },
  { href: "/staff", label: "Attendance" },
  { href: "/staff", label: "Member retention" },
];

const items = [
  { href: "/staff", title: "Class rosters", description: "Review session capacity and the confirmed member roster.", label: "Product B" },
  { href: "/staff", title: "Record attendance", description: "Record attended or no-show outcomes after each session.", label: "Product B" },
  { href: "/staff", title: "Flagged members", description: "Review risk evidence and manage staff-approved outreach.", label: "Product D" },
];

export default async function StaffPortalPage() {
  await requireStaff();
  return <PortalShell eyebrow="Staff portal" title="Today at Pulse" description="A separate operational workspace for schedules, attendance, and member re-engagement." links={links}><FoundationGrid items={items} /></PortalShell>;
}
