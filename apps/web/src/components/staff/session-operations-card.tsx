import Link from "next/link";

import { UnderbookingDecisionForm } from "@/components/staff/underbooking-decision-form";
import { getUnderbookingState } from "@/lib/product-b/underbooking";

export type ProductBSession = {
  class_session_id: string;
  class_type: "yoga" | "cycling" | "hiit";
  class_type_label: string;
  instructor_name: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  is_cancelled: boolean;
  confirmed_reservations: number;
  waitlisted_reservations: number;
  available_spots: number;
};

type Decision = {
  decision_id: string;
  class_session_id: string;
  action: string;
  note: string | null;
  state: "open" | "resolved";
  created_at: string;
};

const names = { yoga: "Studio Flow", cycling: "Pulse Ride", hiit: "Power Interval" };
const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function SessionOperationsCard({
  session,
  openDecision,
  resolvedDecisions,
  canManageDecisions,
}: {
  session: ProductBSession;
  openDecision?: Decision;
  resolvedDecisions: Decision[];
  canManageDecisions: boolean;
}) {
  const status = getUnderbookingState(session.confirmed_reservations, session.capacity, session.is_cancelled);

  return (
    <article className="glass-panel grid gap-5 rounded-3xl p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-black/15 bg-white/55 px-2.5 py-1 text-xs font-semibold">{status.band}</span>
          {status.warning ? <span className="rounded-full bg-[#c72c25] px-2.5 py-1 text-xs font-semibold text-white">Needs attention</span> : null}
          {session.is_cancelled ? <span className="rounded-full bg-black px-2.5 py-1 text-xs font-semibold text-white">Canceled</span> : null}
        </div>
        <p className="mt-4 font-mono text-xs uppercase tracking-[0.14em] text-black/60">{formatter.format(new Date(session.starts_at))}</p>
        <h3 className="mt-1 text-3xl font-semibold tracking-[-0.04em]">{names[session.class_type]}</h3>
        <p className="mt-1 text-sm text-black/60">{session.class_type_label} with {session.instructor_name}</p>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Utilization" value={`${status.utilization}%`} />
          <Metric label="Confirmed" value={`${session.confirmed_reservations}/${session.capacity}`} />
          <Metric label="Waitlisted" value={String(session.waitlisted_reservations)} />
          <Metric label="Open spots" value={String(session.available_spots)} />
        </div>
        <Link href={`/staff/rosters/${encodeURIComponent(session.class_session_id)}`} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-black px-5 text-sm font-semibold text-white hover:bg-[#c72c25]">
          Open roster and attendance
        </Link>
      </div>
      <UnderbookingDecisionForm sessionId={session.class_session_id} openDecision={openDecision} resolvedDecisions={resolvedDecisions} canManage={canManageDecisions} warning={status.warning} />
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-black/10 bg-white/45 p-3"><p className="text-xs text-black/55">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>;
}
