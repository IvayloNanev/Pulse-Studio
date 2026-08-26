import { FoundationGrid } from "@/components/foundation-grid";
import { PortalShell } from "@/components/portal-shell";
import { requireStaff } from "@/lib/auth";
import { staffLinks } from "@/lib/staff-navigation";

const items = [
  { href: "/staff/rosters", title: "Schedule and rosters", description: "Open upcoming sessions, check capacity, and review confirmed or waitlisted members.", label: "Product B · Studio operations" },
  { href: "/staff/rosters", title: "Record attendance", description: "Record attended or no-show outcomes within the approved check-in window.", label: "Product B · Studio operations" },
  { href: "/staff/retention", title: "Retention queue", description: "Prioritize members whose attendance has declined and review the supporting evidence.", label: "Product D · Re-engagement" },
  { href: "/staff/retention", title: "Outreach and follow-up", description: "Prepare outreach, record responses, and manage eligible follow-up attempts.", label: "Product D · Re-engagement" },
];

export default async function StaffPortalPage() {
  await requireStaff();
  return <PortalShell audience="staff" eyebrow="Staff portal" title="Today at Pulse" description="Manage studio operations and member re-engagement from one staff workspace." links={staffLinks}><FoundationGrid items={items} /></PortalShell>;
}
