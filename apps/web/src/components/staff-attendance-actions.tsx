"use client";

import { useFormStatus } from "react-dom";

import { recordAttendance } from "@/app/staff/actions";

function AttendanceButtons({ canRecordAttended, canRecordNoShow }: { canRecordAttended: boolean; canRecordNoShow: boolean }) {
  const { pending } = useFormStatus();

  return (
    <div className="flex flex-wrap gap-2" aria-busy={pending}>
      <button type="submit" name="attendance_status" value="attended" disabled={pending || !canRecordAttended} className="min-h-11 rounded-full border border-black bg-black px-4 text-xs font-semibold text-white focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-35">
        {pending ? "Recording…" : "Attended"}
      </button>
      <button type="submit" name="attendance_status" value="no_show" disabled={pending || !canRecordNoShow} className="min-h-11 rounded-full border border-black/20 bg-white/55 px-4 text-xs font-semibold text-[#a9231e] focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-35">
        {pending ? "Recording…" : "No-show"}
      </button>
    </div>
  );
}

export function StaffAttendanceActions({
  sessionId,
  reservationId,
  canRecordAttended,
  canRecordNoShow,
  guidance,
}: {
  sessionId: string;
  reservationId: string;
  canRecordAttended: boolean;
  canRecordNoShow: boolean;
  guidance: string;
}) {
  return (
    <form action={recordAttendance} className="space-y-2">
      <input type="hidden" name="class_session_id" value={sessionId} />
      <input type="hidden" name="reservation_id" value={reservationId} />
      <AttendanceButtons canRecordAttended={canRecordAttended} canRecordNoShow={canRecordNoShow} />
      <p className="max-w-xs text-xs leading-5 text-black/65">{guidance}</p>
    </form>
  );
}
