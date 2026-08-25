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
  return <button autoFocus type="submit" disabled={pending} aria-busy={pending} className="min-h-11 w-full rounded-full bg-[#a9231e] px-5 text-sm font-semibold text-white transition hover:bg-[#8f1e1a] focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 disabled:opacity-55">{pending ? "Cancelling…" : "Yes, cancel"}</button>;
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

  if (!confirming) return <div className="mt-4 border-t border-black/10 pt-4"><p className={`text-sm leading-6 ${late && !waitlisted ? "font-semibold text-[#8e211c]" : "text-black/65"}`}>{consequence}</p><button ref={triggerRef} type="button" onClick={() => { setCurrentTime(Date.now()); setConfirming(true); }} className="mt-2 min-h-11 rounded-full border border-black/15 bg-white/55 px-4 text-sm font-semibold text-[#8e211c] focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">{waitlisted ? "Leave waitlist" : "Cancel reservation"}</button></div>;

  return <div className="fixed inset-0 z-[80] grid place-items-center bg-black/20 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setConfirming(false); window.setTimeout(() => triggerRef.current?.focus(), 0); } }}><section className="w-full max-w-md rounded-[2rem] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(238,230,220,0.88))] p-5 shadow-[0_2rem_5rem_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.95)] backdrop-blur-2xl sm:p-6" role="dialog" aria-modal="true" aria-labelledby={`confirm-cancellation-${reservation.reservation_id}`}><p className="font-mono text-xs uppercase tracking-[0.16em] text-[#8e211c]">Review your selection</p><h2 id={`confirm-cancellation-${reservation.reservation_id}`} className="mt-2 text-3xl font-semibold tracking-[-0.045em]">Confirm Cancellation</h2><p className="mt-4 text-sm font-semibold">{waitlisted ? "Leave this waitlist?" : "Cancel this reservation?"}</p><p className={`mt-2 rounded-2xl border border-white/75 bg-white/55 p-4 text-sm leading-6 ${late && !waitlisted ? "font-semibold text-[#8e211c]" : "text-black/70"}`}>{consequence}</p><div className="mt-5 grid gap-2 sm:grid-cols-2"><form action={cancelReservation}><input type="hidden" name="reservation_id" value={reservation.reservation_id} /><input type="hidden" name="return_to" value={returnTo} /><CancellationSubmitButton /></form><button type="button" onClick={() => { setConfirming(false); window.setTimeout(() => triggerRef.current?.focus(), 0); }} className="min-h-11 rounded-full border border-black/20 bg-white/60 px-5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">Go back</button></div><p className="sr-only">Press Escape to close without cancelling.</p></section></div>;
}
