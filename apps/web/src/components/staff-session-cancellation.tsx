"use client";

import { TriangleAlert } from "lucide-react";

import { cancelClassSession } from "@/app/staff/actions";

export function StaffSessionCancellation({ sessionId, sessionLabel, startsAt, instructorName, confirmed, waitlisted }: { sessionId: string; sessionLabel: string; startsAt: string; instructorName: string; confirmed: number; waitlisted: number }) {
  const formatted = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(startsAt));
  return (
    <details className="rounded-3xl border border-[#c72c25]/35 bg-[#c72c25]/5 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] sm:p-6">
      <summary className="cursor-pointer list-none rounded-2xl focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-4 [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#c72c25] text-white"><TriangleAlert className="size-5" aria-hidden="true" /></span><span className="min-w-0"><span className="block font-mono text-xs font-semibold uppercase tracking-[0.14em] text-[#8e211c]">Critical command</span><span className="mt-1 block text-lg font-semibold text-[#8e211c]">Cancel this session</span><span className="mt-1 block truncate text-sm font-medium text-black/70">{formatted} · {instructorName} · {confirmed} confirmed{waitlisted ? ` · ${waitlisted} waitlisted` : ""}</span></span></span></summary>
      <div className="mt-5 space-y-4 border-t border-[#c72c25]/20 pt-5">
        <div className="rounded-2xl border border-black/10 bg-white/65 p-4"><p className="font-semibold">{sessionLabel}</p><p className="mt-1 text-sm text-black/70">{formatted} with {instructorName}</p><p className="mt-1 text-sm font-semibold text-black/75">{confirmed} confirmed · {waitlisted} waitlisted</p></div>
        <p className="text-sm leading-6 text-[#8e211c]">This is an actual state-changing command. It studio-cancels open reservations, creates member notifications, and refunds eligible simulated drop-ins. It is separate from “Review for cancellation,” which records only an operational decision.</p>
        <form action={cancelClassSession} className="space-y-3" onSubmit={(event) => { if (!window.confirm(`Cancel ${sessionLabel} on ${formatted}? This affects ${confirmed + waitlisted} member reservation${confirmed + waitlisted === 1 ? "" : "s"}.`)) event.preventDefault(); }}>
          <input type="hidden" name="class_session_id" value={sessionId} />
          <label className="block text-sm font-semibold">Cancellation reason<input required name="reason" maxLength={1000} className="mt-2 min-h-11 w-full rounded-xl border border-black/20 bg-white/80 px-3 font-normal focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2" /></label>
          <button type="submit" className="min-h-11 rounded-full bg-[#8e211c] px-5 text-sm font-semibold text-white transition hover:bg-black focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">Confirm session cancellation</button>
        </form>
      </div>
    </details>
  );
}
