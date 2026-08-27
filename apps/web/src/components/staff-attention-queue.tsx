"use client";

import Link from "next/link";
import { useState } from "react";

import type { AttendanceAction } from "@/lib/product-b/attention-priority";

type AttentionSession = {
  class_session_id: string;
  class_type_label: string;
  starts_at: string;
  instructor_name: string;
  confirmed_reservations: number;
  attendance_action: AttendanceAction;
};

const dateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
const timeFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", minute: "2-digit" });

export function StaffAttentionQueue({ sessions, instructorScope }: { sessions: AttentionSession[]; instructorScope: string }) {
  const [expanded, setExpanded] = useState(false);
  const visibleSessions = expanded ? sessions : sessions.slice(0, 3);

  return (
    <section aria-labelledby="staff-attention-heading" className="mt-8">
      <div className="mb-3">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Operational priority</p>
        <h2 id="staff-attention-heading" className="mt-2 text-2xl font-semibold">Needs attention now <span className="ml-1 font-mono text-lg text-[#c72c25]" aria-label={`${sessions.length} items`}>{sessions.length}</span></h2>
        <p className="mt-1 text-sm text-black/65">Attendance and no-show actions available right now.</p>
      </div>
      {visibleSessions.length ? <div id="staff-attention-items" className="divide-y divide-black/10 overflow-hidden rounded-2xl border border-black/10 bg-white/60">
        {visibleSessions.map((session) => {
          const noShow = session.attendance_action === "no_show";
          const date = dateFormatter.format(new Date(session.starts_at));
          const href = `/staff/rosters?instructor=${encodeURIComponent(instructorScope)}&date=${date}&roster=${encodeURIComponent(session.class_session_id)}`;
          return <article key={session.class_session_id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${noShow ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-900"}`}>{noShow ? "No-show action" : "Check-in open"}</span><span className="font-mono text-xs text-black/55">{timeFormatter.format(new Date(session.starts_at))}</span></div>
              <h3 className="mt-2 text-lg font-semibold">{session.class_type_label}</h3>
              <p className="truncate text-sm text-black/60">{session.instructor_name} · {session.confirmed_reservations} confirmed</p>
            </div>
            <Link href={href} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-black px-4 text-sm font-semibold text-white transition hover:bg-[#c72c25] focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">{noShow ? "Record no-show" : "Open attendance"}</Link>
          </article>;
        })}
      </div> : <p className="rounded-2xl border border-black/10 bg-white/40 p-4 text-sm text-black/60">No attendance actions right now. Eligible sessions will appear as their recording windows open.</p>}
      {sessions.length > 3 ? <button type="button" aria-expanded={expanded} aria-controls="staff-attention-items" onClick={() => setExpanded((current) => !current)} className="mt-3 min-h-11 rounded-full border border-black/15 bg-white/60 px-4 text-sm font-semibold hover:border-black/30 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">{expanded ? "Show less" : `View all ${sessions.length}`}<span className="sr-only"> attention items</span></button> : null}
    </section>
  );
}
