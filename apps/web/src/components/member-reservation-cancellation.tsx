"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { cancelReservation } from "@/app/member/actions";

const timeZone = "America/New_York";
const deadlineFormatter = new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hourCycle: "h12" });

function formatDeadline(value: string) {
  const parts = deadlineFormatter.formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("month")} ${part("day")}, ${part("hour")}:${part("minute")} ${part("dayPeriod")}`;
}

export type CancellableReservation = {
  reservation_id: string;
  reservation_status: "confirmed" | "waitlisted";
  cancellation_deadline: string;
};

function CancellationSubmitButton() {
  const { pending } = useFormStatus();
  return <button autoFocus type="submit" disabled={pending} aria-busy={pending} className="min-h-11 rounded-full bg-[#a9231e] px-5 text-sm font-semibold text-white transition hover:bg-[#8f1e1a] focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 disabled:opacity-55">{pending ? "Cancelling…" : "Yes, cancel"}</button>;
}

export function MemberReservationCancellation({ reservation, returnTo, now }: { reservation: CancellableReservation; returnTo: string; now: string }) {
  const [confirming, setConfirming] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => new Date(now).getTime());
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!confirming) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setConfirming(false);
      window.setTimeout(() => triggerRef.current?.focus(), 0);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [confirming]);
  const waitlisted = reservation.reservation_status === "waitlisted";
  const late = currentTime > new Date(reservation.cancellation_deadline).getTime();
  const consequence = waitlisted
    ? "No credit or drop-in authorization is held. Leaving removes you from the waitlist."
    : late
      ? "Late cancellation: your credit or drop-in authorization will not be returned."
      : `Cancel by ${formatDeadline(reservation.cancellation_deadline)} to return your credit or drop-in authorization.`;

  if (!confirming) return <div className="mt-4 border-t border-black/10 pt-4"><p className={`text-sm leading-6 ${late && !waitlisted ? "font-semibold text-[#8e211c]" : "text-black/65"}`}>{consequence}</p><button ref={triggerRef} type="button" onClick={() => { setCurrentTime(Date.now()); setConfirming(true); }} className="mt-2 min-h-11 text-sm font-semibold text-[#8e211c] underline decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">{waitlisted ? "Leave waitlist" : "Cancel reservation"}</button></div>;

  return <div className="mt-4 rounded-2xl border border-[#c72c25]/25 bg-white/60 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]" role="region" aria-live="polite" aria-label="Confirm cancellation"><p className="text-sm font-semibold">Confirm {waitlisted ? "leaving the waitlist" : "cancellation"}?</p><p className="mt-1 text-sm leading-6 text-black/70">{consequence}</p><div className="mt-3 flex flex-wrap gap-3"><form action={cancelReservation}><input type="hidden" name="reservation_id" value={reservation.reservation_id} /><input type="hidden" name="return_to" value={returnTo} /><CancellationSubmitButton /></form><button type="button" onClick={() => { setConfirming(false); window.setTimeout(() => triggerRef.current?.focus(), 0); }} className="min-h-11 rounded-full border border-black/20 bg-white/55 px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">Keep it</button></div><p className="sr-only">Press Escape to keep this reservation.</p></div>;
}
