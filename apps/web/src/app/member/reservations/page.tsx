import { cancelReservation } from "@/app/member/actions";
import { MemberStatusMessage } from "@/components/member-status-message";
import { PortalShell } from "@/components/portal-shell";
import { requireMember } from "@/lib/auth";

const links = [
  { href: "/member", label: "Overview" },
  { href: "/member/classes", label: "Class schedule" },
  { href: "/member/reservations", label: "Reservations" },
  { href: "/member/assistant", label: "Pulse Assistant" },
];

const formatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "long",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

type MemberReservation = {
  reservation_id: string;
  reservation_status: string;
  class_type_label: string;
  starts_at: string;
  instructor_name: string;
  cancellation_deadline: string;
};

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { supabase } = await requireMember();
  const params = await searchParams;
  const { data, error } = await supabase.rpc("member_reservations", { p_from: new Date().toISOString() });

  return (
    <PortalShell eyebrow="Member portal · Product A" title="Your reservations" description="Confirmed classes and waitlist positions are shown directly from your account." links={links}>
      <MemberStatusMessage success={params.success} error={params.error} />
      {error ? (
        <div role="alert" className="border border-[#c72c25]/35 bg-[#c72c25]/5 p-6 text-sm text-[#8e211c]">Your reservations could not be loaded. Refresh and try again.</div>
      ) : !data?.length ? (
        <div className="glass-panel rounded-3xl p-8">
          <h2 className="text-2xl font-semibold">Nothing booked yet</h2>
          <p className="mt-2 text-sm text-black/60">Choose a class and it will appear here immediately.</p>
          <Link href="/member/classes" className="mt-5 inline-flex min-h-11 items-center bg-black px-5 text-sm font-semibold text-white">Browse classes</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {(data as MemberReservation[]).map((reservation) => (
            <article key={reservation.reservation_id} className="glass-panel grid gap-5 rounded-3xl p-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <span className="inline-flex border border-black/20 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-[0.16em]">{reservation.reservation_status}</span>
                <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">{reservation.class_type_label}</h2>
                <p className="mt-2 text-sm text-black/60">{formatter.format(new Date(reservation.starts_at))} · with {reservation.instructor_name}</p>
                <p className="mt-1 text-xs text-black/50">Cancel by {formatter.format(new Date(reservation.cancellation_deadline))} to return your credit.</p>
              </div>
              <form action={cancelReservation}>
                <input type="hidden" name="reservation_id" value={reservation.reservation_id} />
                <button type="submit" className="min-h-11 border border-[#c72c25] px-5 text-sm font-semibold text-[#a9231e] transition hover:bg-[#c72c25] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2">Cancel reservation</button>
              </form>
            </article>
          ))}
        </div>
      )}
    </PortalShell>
  );
}
import Link from "next/link";

