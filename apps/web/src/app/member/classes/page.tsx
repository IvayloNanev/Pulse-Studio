import { bookClass } from "@/app/member/actions";
import { MemberStatusMessage } from "@/components/member-status-message";
import { PortalShell } from "@/components/portal-shell";
import { requireMember } from "@/lib/auth";

type ScheduleSession = {
  class_session_id: string;
  class_type: "yoga" | "cycling" | "hiit";
  class_type_label: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  confirmed_reservations: number;
  waitlisted_reservations: number;
  available_spots: number;
  is_full: boolean;
  instructor_name: string;
};

type MemberReservationSummary = { class_session_id: string };

const links = [
  { href: "/member", label: "Overview" },
  { href: "/member/classes", label: "Class schedule" },
  { href: "/member/reservations", label: "Reservations" },
  { href: "/member/assistant", label: "Pulse Assistant" },
];

const names = { yoga: "Studio Flow", cycling: "Pulse Ride", hiit: "Power Interval" };
const dateTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default async function MemberClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { supabase } = await requireMember();
  const params = await searchParams;
  const now = new Date();
  const through = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [{ data, error }, { data: reservations }] = await Promise.all([
    supabase
      .from("public_class_schedule")
      .select("class_session_id,class_type,class_type_label,starts_at,ends_at,capacity,confirmed_reservations,waitlisted_reservations,available_spots,is_full,instructor_name")
      .gte("starts_at", now.toISOString())
      .lt("starts_at", through.toISOString())
      .order("starts_at", { ascending: true }),
    supabase.rpc("member_reservations", { p_from: now.toISOString() }),
  ]);

  const openReservationIds = new Set(
    ((reservations ?? []) as MemberReservationSummary[]).map((item) => item.class_session_id),
  );
  const sessions = (data ?? []) as ScheduleSession[];

  return (
    <PortalShell eyebrow="Member portal · Product A" title="Reserve your next class" description="Live availability, membership credits, waitlists, and drop-in choices are enforced by the shared backend." links={links}>
      <MemberStatusMessage success={params.success} error={params.error} />
      {error ? (
        <div role="alert" className="border border-[#c72c25]/35 bg-[#c72c25]/5 p-6 text-sm text-[#8e211c]">The schedule could not be loaded. Refresh and try again.</div>
      ) : sessions.length === 0 ? (
        <div className="glass-panel rounded-3xl p-8">
          <h2 className="text-2xl font-semibold">No upcoming classes yet</h2>
          <p className="mt-2 text-sm text-black/60">The next 30 days are clear. Staff can add future sessions from the scheduling workspace.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => {
            const reserved = openReservationIds.has(session.class_session_id);
            return (
              <article key={session.class_session_id} className="glass-panel grid gap-5 rounded-3xl p-6 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[0.18em] text-black/50">{dateTime.format(new Date(session.starts_at))}</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{names[session.class_type]}</h2>
                  <p className="mt-2 text-sm text-black/60">{session.class_type_label} with {session.instructor_name} · {session.confirmed_reservations}/{session.capacity} reserved</p>
                  <p className="mt-1 text-sm font-medium text-[#a9231e]">{session.is_full ? `${session.waitlisted_reservations} on waitlist` : `${session.available_spots} spots available`}</p>
                </div>
                {reserved ? (
                  <Link href="/member/reservations" className="inline-flex min-h-11 items-center justify-center border border-black px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2">View reservation</Link>
                ) : (
                  <form action={bookClass} className="flex flex-col gap-2 sm:flex-row">
                    <input type="hidden" name="class_session_id" value={session.class_session_id} />
                    <button type="submit" name="use_drop_in" value="false" className="min-h-11 bg-black px-5 text-sm font-semibold text-white transition hover:bg-[#c72c25] focus-visible:outline-2 focus-visible:outline-offset-2">
                      {session.is_full ? "Join waitlist" : "Use membership credit"}
                    </button>
                    {!session.is_full && (
                      <button type="submit" name="use_drop_in" value="true" className="min-h-11 border border-black px-5 text-sm font-semibold transition hover:bg-black hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2">$35 drop-in</button>
                    )}
                  </form>
                )}
              </article>
            );
          })}
        </div>
      )}
    </PortalShell>
  );
}
import Link from "next/link";

