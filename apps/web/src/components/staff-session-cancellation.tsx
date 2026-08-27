"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";

import { cancelClassSession } from "@/app/staff/actions";

const dateFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true });

function formattedSessionTime(startsAt: string) {
  const parts = Object.fromEntries(dateFormatter.formatToParts(new Date(startsAt)).map((part) => [part.type, part.value]));
  return `${parts.weekday}, ${parts.month} ${parts.day} · ${parts.hour}:${parts.minute} ${parts.dayPeriod}`;
}

type Props = { sessionId: string; sessionLabel: string; startsAt: string; instructorName: string; confirmed: number; waitlisted: number; returnToManageClasses?: boolean; modal?: boolean };

export function StaffSessionCancellation({ sessionId, sessionLabel, startsAt, instructorName, confirmed, waitlisted, returnToManageClasses = false, modal = false }: Props) {
  const [open, setOpen] = useState(modal);
  const formatted = formattedSessionTime(startsAt);
  const affectedCount = confirmed + waitlisted;
  const confirmation = <>
    <div className="rounded-2xl border border-black/10 bg-white/70 p-4"><p className="font-semibold">{sessionLabel}</p><p className="mt-1 text-sm text-black/70">{formatted} with {instructorName}</p><p className="mt-1 text-sm font-semibold text-black/75">{confirmed} confirmed · {waitlisted} waitlisted</p></div>
    <p className="text-sm leading-6 text-[#8e211c]"><span className="font-semibold">Actual state-changing command.</span> This will cancel open reservations, notify affected members, and record the action in the studio history.</p>
    <form action={cancelClassSession} className="space-y-3" onSubmit={(event) => { if (!modal && !window.confirm(`Cancel ${sessionLabel} on ${formatted}? This affects ${affectedCount} member reservation${affectedCount === 1 ? "" : "s"}.`)) event.preventDefault(); }}>
      <input type="hidden" name="class_session_id" value={sessionId} />
      {returnToManageClasses ? <input type="hidden" name="return_to" value="manage-classes" /> : null}
      <label className="block text-sm font-semibold">Cancellation reason<input required name="reason" maxLength={1000} autoFocus={modal} className="mt-2 min-h-11 w-full rounded-xl border border-black/20 bg-white px-3 font-normal focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2" placeholder="Why is this session being cancelled?" /></label>
      <button type="submit" aria-label="Confirm session cancellation" className="min-h-11 rounded-full bg-[#8e211c] px-5 text-sm font-semibold text-white transition hover:bg-black focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">Yes, cancel this class</button>
    </form>
  </>;

  if (modal) {
    return open ? <div role="dialog" aria-modal="true" aria-labelledby="cancel-class-title" className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm"><div className="w-full max-w-xl rounded-3xl border border-white/70 bg-[#fffaf8] p-6 shadow-2xl sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#a9231e]">Cancellation confirmation</p><h3 id="cancel-class-title" className="mt-2 text-2xl font-semibold">Do you really want to cancel this class?</h3></div><button type="button" onClick={() => setOpen(false)} className="rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-semibold hover:border-black">Keep class</button></div><div className="mt-6 space-y-4">{confirmation}</div></div></div> : null;
  }

  return <details className="rounded-3xl border border-[#c72c25]/35 bg-[#c72c25]/5 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] sm:p-6"><summary className="cursor-pointer list-none rounded-2xl focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-4 [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#c72c25] text-white"><TriangleAlert className="size-5" aria-hidden="true" /></span><span className="min-w-0"><span className="block font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#8e211c]">Critical command</span><span className="mt-1 block text-lg font-semibold text-[#8e211c]">Cancel this session</span><span className="mt-1 block truncate text-sm font-medium text-black/70">{formatted} · {instructorName} · {confirmed} confirmed{waitlisted ? ` · ${waitlisted} waitlisted` : ""}</span></span></span></summary><div className="mt-5 space-y-4 border-t border-[#c72c25]/20 pt-5">{confirmation}</div></details>;
}
