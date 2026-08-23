import { FoundationGrid } from "@/components/foundation-grid";
import { PortalShell } from "@/components/portal-shell";
import { requireMember } from "@/lib/auth";

const links = [
  { href: "/member", label: "Overview" },
  { href: "/member/classes", label: "Class schedule" },
  { href: "/member/reservations", label: "Reservations" },
  { href: "/member/assistant", label: "Pulse Assistant" },
];

const items = [
  { href: "/member/classes", title: "Browse classes", description: "Reserve with a credit, choose drop-in, or join a waitlist.", label: "Product A" },
  { href: "/member/reservations", title: "My reservations", description: "Review upcoming bookings, waitlists, and cancellations.", label: "Product A" },
  { href: "/member/assistant", title: "Pulse Assistant", description: "Ask about policies, classes, credits, or your reservations.", label: "Product C" },
];

export default async function MemberPortalPage() {
  const { supabase } = await requireMember();
  const { data } = await supabase.rpc("member_dashboard", { p_as_of: new Date().toISOString() });
  const dashboard = data?.[0];

  return (
    <PortalShell eyebrow="Member portal" title={dashboard ? `Welcome, ${dashboard.member_name}` : "Your week at Pulse"} description="Book classes, manage reservations, and see your current membership in one place." links={links}>
      {dashboard && (
        <section className="glass-panel mb-8 grid gap-5 rounded-3xl p-6 sm:grid-cols-3" aria-label="Membership summary">
          <div><p className="font-mono text-xs uppercase tracking-[0.16em] text-black/50">Plan</p><p className="mt-2 text-xl font-semibold">{dashboard.plan_name}</p></div>
          <div><p className="font-mono text-xs uppercase tracking-[0.16em] text-black/50">Credits remaining</p><p className="mt-2 text-xl font-semibold">{dashboard.classes_remaining} of {dashboard.classes_per_month}</p></div>
          <div><p className="font-mono text-xs uppercase tracking-[0.16em] text-black/50">Membership</p><p className="mt-2 text-xl font-semibold capitalize">{dashboard.membership_status}</p></div>
        </section>
      )}
      <FoundationGrid items={items} />
    </PortalShell>
  );
}
