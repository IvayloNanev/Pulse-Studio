"use client";

import { recordAttendanceBulk } from "@/app/staff/actions";

type Target = { reservationId: string; memberName: string; canRecordAttended: boolean; canRecordNoShow: boolean };

export function StaffAttendanceBulkActions({ sessionId, targets }: { sessionId: string; targets: Target[] }) {
  const attendedTargets = targets.filter((target) => target.canRecordAttended);
  const noShowTargets = targets.filter((target) => target.canRecordNoShow);
  if (!targets.length) return null;

  return (
    <section aria-labelledby="bulk-attendance-heading" className="glass-panel rounded-3xl p-5 sm:p-6">
      <h2 id="bulk-attendance-heading" className="text-2xl font-semibold">Bulk attendance</h2>
      <p className="mt-1 text-sm text-black/65">Select unmarked confirmed members, or mark every remaining eligible member in one atomic update. Existing outcomes are never overwritten.</p>
      <form action={recordAttendanceBulk} className="mt-5 space-y-4">
        <input type="hidden" name="class_session_id" value={sessionId} />
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="sr-only">Select members for bulk attendance</legend>
          {targets.map((target) => (
            <label key={target.reservationId} className="flex min-h-11 items-center gap-3 rounded-2xl border border-black/10 bg-white/50 px-4 py-3 text-sm font-medium">
              <input type="checkbox" name="reservation_ids" value={target.reservationId} className="size-4 accent-[#c72c25]" />
              {target.memberName}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <button type="submit" name="attendance_status" value="attended" disabled={!attendedTargets.length} className="min-h-11 rounded-full bg-black px-5 text-sm font-semibold text-white disabled:opacity-35">Mark selected attended</button>
          <button type="submit" name="attendance_status" value="no_show" disabled={!noShowTargets.length} className="min-h-11 rounded-full border border-black/20 bg-white/60 px-5 text-sm font-semibold text-[#a9231e] disabled:opacity-35">Mark selected no-show</button>
        </div>
      </form>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <AllRemainingForm sessionId={sessionId} status="attended" targets={attendedTargets} />
        <AllRemainingForm sessionId={sessionId} status="no_show" targets={noShowTargets} />
      </div>
    </section>
  );
}

function AllRemainingForm({ sessionId, status, targets }: { sessionId: string; status: "attended" | "no_show"; targets: Target[] }) {
  return (
    <form action={recordAttendanceBulk}>
      <input type="hidden" name="class_session_id" value={sessionId} />
      <input type="hidden" name="attendance_status" value={status} />
      {targets.map((target) => <input key={target.reservationId} type="hidden" name="reservation_ids" value={target.reservationId} />)}
      <button
        type="submit"
        disabled={!targets.length}
        onClick={status === "no_show" ? (event) => { if (!window.confirm(`Mark all ${targets.length} remaining eligible members as no-show? Previously recorded attendance will not change.`)) event.preventDefault(); } : undefined}
        className="min-h-11 w-full rounded-2xl border border-black/15 bg-white/55 px-4 text-sm font-semibold disabled:opacity-35"
      >
        Mark all remaining {status === "attended" ? "attended" : "no-show"} ({targets.length})
      </button>
    </form>
  );
}
