import Link from "next/link";

import { PortalShell } from "@/components/portal-shell";
import { requireStaff } from "@/lib/auth";

const links = [
  { href: "/staff", label: "Overview" },
  { href: "/staff/rosters", label: "Rosters" },
  { href: "/staff/retention", label: "Member retention" },
];

type StaffSession = {
  class_session_id: string;
  class_type: "yoga" | "cycling" | "hiit";
  class_type_label: string;
  starts_at: string;
  capacity: number;
  confirmed_reservations: number;
  waitlisted_reservations: number;
  available_spots: number;
  instructor_name: string;
};

const names = { yoga: "Studio Flow", cycling: "Pulse Ride", hiit: "Power Interval" };
const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "long",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default async function StaffRostersPage() {
  const { supabase } = await requireStaff();
  const now = new Date();
  const through = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const { data, error } = await supabase
    .from("public_class_schedule")
    .select("class_session_id,class_type,class_type_label,starts_at,capacity,confirmed_reservations,waitlisted_reservations,available_spots,instructor_name")
    .gte("starts_at", now.toISOString())
    .lt("starts_at", through.toISOString())
    .order("starts_at", { ascending: true });
  const sessions = (data ?? []) as StaffSession[];

  return (
    <PortalShell eyebrow="Staff portal · Product B" title="Class rosters" description="Open a live session roster, review confirmed and waitlisted members, and record authoritative attendance outcomes." links={links}>
      {error ? (
        <div role="alert" className="border border-[#c72c25]/35 bg-[#c72c25]/5 p-6 text-sm text-[#8e211c]">The staff schedule could not be loaded.</div>
      ) : sessions.length === 0 ? (
        <div className="glass-panel rounded-3xl p-8"><h2 className="text-2xl font-semibold">No upcoming sessions</h2><p className="mt-2 text-sm text-black/60">The next 30 days have no scheduled classes.</p></div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <article key={session.class_session_id} className="glass-panel grid gap-5 rounded-3xl p-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-black/50">{formatter.format(new Date(session.starts_at))}</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{names[session.class_type]}</h2>
                <p className="mt-2 text-sm text-black/60">{session.class_type_label} with {session.instructor_name}</p>
                <p className="mt-1 text-sm text-black/55">{session.confirmed_reservations}/{session.capacity} confirmed · {session.waitlisted_reservations} waitlisted · {session.available_spots} open</p>
              </div>
              <Link href={`/staff/rosters/${encodeURIComponent(session.class_session_id)}`} className="inline-flex min-h-11 items-center justify-center bg-black px-5 text-sm font-semibold text-white transition hover:bg-[#c72c25] focus-visible:outline-2 focus-visible:outline-offset-2">Open roster</Link>
            </article>
          ))}
        </div>
      )}
    </PortalShell>
  );
}

