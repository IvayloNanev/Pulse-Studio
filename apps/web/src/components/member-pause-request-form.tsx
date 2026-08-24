"use client";

import { useFormStatus } from "react-dom";

import { requestMembershipPause } from "@/app/member/services/actions";

function SubmitPauseRequest({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={disabled || pending} aria-busy={pending} className="inline-flex min-h-11 items-center justify-center rounded-full bg-black px-5 text-sm font-semibold text-white transition hover:bg-[#c72c25] focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40">{pending ? "Submitting…" : "Request membership pause"}</button>;
}

export function MemberPauseRequestForm({ disabled, membershipId, minimumStart }: { disabled: boolean; membershipId: string; minimumStart: string }) {
  return <form action={requestMembershipPause} className="mt-5 grid gap-4 sm:grid-cols-2"><input type="hidden" name="membership_id" value={membershipId} /><label className="text-sm font-semibold">Pause starts<input name="starts_on" type="date" min={minimumStart} required className="mt-2 min-h-12 w-full rounded-xl border border-black/20 bg-white/80 px-3 font-normal focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2" /></label><label className="text-sm font-semibold">Pause ends<input name="ends_on" type="date" min={minimumStart} required className="mt-2 min-h-12 w-full rounded-xl border border-black/20 bg-white/80 px-3 font-normal focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2" /></label><div className="sm:col-span-2"><SubmitPauseRequest disabled={disabled} /></div></form>;
}
