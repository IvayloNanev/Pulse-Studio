"use client";

import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { recordRosterAttendance } from "@/app/staff/actions";

type AttendanceStatus = "attended" | "no_show";
type RosterMember = {
  reservation_id: string;
  member_name: string;
  attendance_status: AttendanceStatus | null;
};

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={disabled || pending} className="min-h-12 rounded-full bg-black px-6 text-sm font-semibold text-white transition hover:bg-[#c72c25] disabled:cursor-not-allowed disabled:opacity-40">
      {pending ? "Saving attendance…" : "Save attendance"}
    </button>
  );
}

export function StaffRosterCheckIn({ sessionId, returnTo, members }: { sessionId: string; returnTo: string; members: RosterMember[] }) {
  const [selections, setSelections] = useState<Record<string, AttendanceStatus>>({});
  const unrecorded = members.filter((member) => !member.attendance_status);
  const selectedCount = useMemo(() => unrecorded.filter((member) => selections[member.reservation_id]).length, [selections, unrecorded]);
  const remaining = unrecorded.length - selectedCount;

  return (
    <form action={recordRosterAttendance} className="mt-6">
      <input type="hidden" name="class_session_id" value={sessionId} />
      <input type="hidden" name="return_to" value={returnTo} />
      <div className="divide-y divide-black/10 overflow-hidden rounded-3xl border border-white/80 bg-white/55">
        {members.map((member) => {
          const selection = selections[member.reservation_id];
          if (member.attendance_status) {
            return <div key={member.reservation_id} className="flex flex-wrap items-center justify-between gap-3 p-4"><p className="font-semibold">{member.member_name}</p><span className={`rounded-full px-3 py-1 text-sm font-semibold ${member.attendance_status === "attended" ? "bg-teal-100 text-teal-800" : "bg-rose-100 text-rose-800"}`}>{member.attendance_status === "attended" ? "✓ Checked in" : "✕ Not here"}</span></div>;
          }

          const setChoice = (status: AttendanceStatus) => setSelections((current) => ({ ...current, [member.reservation_id]: status }));
          const clearChoice = () => setSelections((current) => {
            const next = { ...current };
            delete next[member.reservation_id];
            return next;
          });

          return <div key={member.reservation_id} className="flex flex-wrap items-center justify-between gap-3 p-4"><p className="font-semibold">{member.member_name}</p><input type="hidden" name="reservation_ids" value={member.reservation_id} /><input type="hidden" name={`attendance_${member.reservation_id}`} value={selection ?? ""} /><div role="radiogroup" aria-label={`Attendance for ${member.member_name}`} className="flex flex-wrap justify-end gap-2"><button type="button" role="radio" aria-checked={selection === "attended"} onClick={() => setChoice("attended")} className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition ${selection === "attended" ? "border-teal-600 bg-teal-500 text-white" : "border-black/15 bg-white/70 text-black hover:bg-teal-50"}`}>✓ Here</button><button type="button" role="radio" aria-checked={selection === "no_show"} onClick={() => setChoice("no_show")} className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition ${selection === "no_show" ? "border-rose-600 bg-rose-500 text-white" : "border-black/15 bg-white/70 text-black hover:bg-rose-50"}`}>✕ Not here</button>{selection ? <button type="button" onClick={clearChoice} className="min-h-11 rounded-full px-3 text-sm font-semibold text-black/55 underline underline-offset-4 hover:text-black">Clear</button> : null}</div></div>;
        })}
      </div>
      {unrecorded.length ? <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-white/70 p-4"><p className="text-sm text-black/65">{remaining ? `Choose outcomes for ${remaining} remaining attendee${remaining === 1 ? "" : "s"}.` : "Every attendee has an outcome. Ready to save."}</p><SaveButton disabled={remaining !== 0} /></div> : null}
    </form>
  );
}
