import { FoundationGrid } from "@/components/foundation-grid";
import { MemberStatusMessage } from "@/components/member-status-message";
import { PortalShell } from "@/components/portal-shell";
import { ProductBSession, SessionOperationsCard } from "@/components/staff/session-operations-card";
import { requireStaff } from "@/lib/auth";
import { getUnderbookingState } from "@/lib/product-b/underbooking";
import { staffLinks } from "@/lib/staff-navigation";

const items = [
  { href: "/staff/rosters", title: "Schedule and rosters", description: "Open upcoming sessions, check capacity, and review confirmed or waitlisted members.", label: "Product B · Studio operations" },
  { href: "/staff/rosters", title: "Record attendance", description: "Record attended or no-show outcomes within the approved check-in window.", label: "Product B · Studio operations" },
  { href: "/staff/retention", title: "Retention queue", description: "Prioritize members whose attendance has declined and review the supporting evidence.", label: "Product D · Re-engagement" },
  { href: "/staff/retention", title: "Outreach and follow-up", description: "Prepare outreach, record responses, and manage eligible follow-up attempts.", label: "Product D · Re-engagement" },
];

type Decision = {
  decision_id: string;
  class_session_id: string;
  action: string;
  note: string | null;
  state: "open" | "resolved";
  created_at: string;
};

export default async function StaffPortalPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const messages = await searchParams;
  const { supabase, staffId } = await requireStaff();
  const now = new Date();
  const through = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [staffResult, sessionResult, decisionResult] = await Promise.all([
    supabase.from("staff_accounts").select("role").eq("staff_id", staffId).single(),
    supabase.from("staff_product_b_sessions")
      .select("class_session_id,class_type,class_type_label,instructor_name,starts_at,ends_at,capacity,is_cancelled,confirmed_reservations,waitlisted_reservations,available_spots,attended_count,no_show_count,marked_count")
      .gte("starts_at", new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
      .lt("starts_at", through.toISOString())
      .order("starts_at", { ascending: true }),
    supabase.from("product_b_underbooking_decisions")
      .select("decision_id,class_session_id,action,note,state,created_at")
      .order("created_at", { ascending: false }),
  ]);

  const sessions = (sessionResult.data ?? []) as ProductBSession[];
  const decisions = (decisionResult.data ?? []) as Decision[];
  const openDecisionBySession = new Map<string, Decision>();
  const resolvedDecisionsBySession = new Map<string, Decision[]>();
  for (const decision of decisions) {
    if (decision.state === "open") {
      openDecisionBySession.set(decision.class_session_id, decision);
    } else {
      const history = resolvedDecisionsBySession.get(decision.class_session_id) ?? [];
      history.push(decision);
      resolvedDecisionsBySession.set(decision.class_session_id, history);
    }
  }
  const canManageDecisions = staffResult.data?.role === "owner_admin";
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(now);
  const localDate = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date(value));
  const todaySessions = sessions.filter((session) => localDate(session.starts_at) === today);
  const attention = sessions.filter((session) => getUnderbookingState(session.confirmed_reservations, session.capacity, session.is_cancelled).warning);
  const upcoming = sessions.filter((session) => localDate(session.starts_at) !== today);
  const error = sessionResult.error ?? decisionResult.error ?? staffResult.error;

  return (
    <PortalShell audience="staff" eyebrow="Staff portal · Product B" title="Operations command center" description="Understand current demand, respond to underbooking, and move directly into authorized roster and attendance work." links={staffLinks}>
      <MemberStatusMessage success={messages.success} error={messages.error} />
      <section aria-labelledby="staff-workflows-heading" className="mb-10">
        <div className="mb-4"><h2 id="staff-workflows-heading" className="text-2xl font-semibold">Staff workflows</h2><p className="mt-1 text-sm text-black/65">Move between studio operations and member re-engagement without leaving the shared Staff workspace.</p></div>
        <FoundationGrid items={items} />
      </section>
      {error ? (
        <div role="alert" className="rounded-2xl border border-black/15 bg-white/65 p-6 text-sm text-[#8e211c]">The authorized Product B session feed could not be loaded.</div>
      ) : sessions.length === 0 ? (
        <div className="glass-panel rounded-3xl p-8"><h2 className="text-2xl font-semibold">No authorized sessions</h2><p className="mt-2 text-sm text-black/60">There are no Product B sessions in your current operational window.</p></div>
      ) : (
        <div className="space-y-10">
          <SessionSection title="Needs attention" description="Live warnings use current confirmed reservations only." sessions={attention} openDecisions={openDecisionBySession} resolvedDecisions={resolvedDecisionsBySession} canManage={canManageDecisions} empty="No current underbooking warnings." />
          <SessionSection title="Today" description="The sessions happening today in New York time." sessions={todaySessions} openDecisions={openDecisionBySession} resolvedDecisions={resolvedDecisionsBySession} canManage={canManageDecisions} empty="No authorized sessions today." />
          <SessionSection title="Upcoming" description="Authorized sessions across the next 30 days." sessions={upcoming} openDecisions={openDecisionBySession} resolvedDecisions={resolvedDecisionsBySession} canManage={canManageDecisions} empty="No additional upcoming sessions." />
        </div>
      )}
    </PortalShell>
  );
}

function SessionSection({ title, description, sessions, openDecisions, resolvedDecisions, canManage, empty }: { title: string; description: string; sessions: ProductBSession[]; openDecisions: Map<string, Decision>; resolvedDecisions: Map<string, Decision[]>; canManage: boolean; empty: string }) {
  const headingId = `product-b-${title.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <section aria-labelledby={headingId}>
      <div className="mb-4"><h2 id={headingId} className="text-2xl font-semibold tracking-[-0.03em]">{title}</h2><p className="mt-1 text-sm text-black/60">{description}</p></div>
      {sessions.length ? <div className="space-y-4">{sessions.map((session) => <SessionOperationsCard key={session.class_session_id} session={session} openDecision={openDecisions.get(session.class_session_id)} resolvedDecisions={resolvedDecisions.get(session.class_session_id) ?? []} canManageDecisions={canManage} />)}</div> : <p className="rounded-2xl border border-black/10 bg-white/40 p-5 text-sm text-black/60">{empty}</p>}
    </section>
  );
}
