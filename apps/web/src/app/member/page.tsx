import { FoundationGrid } from "@/components/foundation-grid";
import { PortalShell } from "@/components/portal-shell";
import { requireMember } from "@/lib/auth";

const links = [
  { href: "/member", label: "Overview" },
  { href: "/classes", label: "Class schedule" },
  { href: "/member", label: "Reservations" },
  { href: "/member", label: "Pulse Assistant" },
];

const items = [
  { href: "/classes", title: "Browse classes", description: "Explore this week's yoga, cycling, and HIIT sessions.", label: "Product A" },
  { href: "/member", title: "My reservations", description: "Review upcoming bookings, waitlists, and cancellations.", label: "Product A" },
  { href: "/member", title: "Pulse Assistant", description: "Ask about policies, classes, credits, or your reservations.", label: "Product C" },
];

export default async function MemberPortalPage() {
  await requireMember();
  return <PortalShell eyebrow="Member portal" title="Your week at Pulse" description="The member foundation brings booking and support into one clear experience." links={links}><FoundationGrid items={items} /></PortalShell>;
}
