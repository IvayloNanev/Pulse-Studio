"use client";

import { useFormStatus } from "react-dom";

import { cancelMemberProgramRequest, requestMemberProgram } from "@/app/member/services/actions";

function ProgramSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} aria-busy={pending} className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-black px-4 text-sm font-semibold text-white transition hover:bg-[#c72c25] focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-55">{pending ? "Submitting…" : label}</button>;
}

export function MemberProgramRequestForm({ programKey, label, needsGuest = false }: { programKey: "friend_referral" | "mission_guide" | "guest_pass" | "wellness_orientation"; label: string; needsGuest?: boolean }) {
  return <form action={requestMemberProgram} className="mt-auto pt-5">
    <input type="hidden" name="program_key" value={programKey} />
    {needsGuest ? <div className="mb-3 grid gap-2 sm:grid-cols-2">
      <label className="text-xs font-semibold uppercase tracking-[0.08em] text-black/60">Friend or guest name<input name="guest_name" required maxLength={100} autoComplete="off" className="mt-1.5 min-h-11 w-full rounded-xl border border-black/20 bg-white/80 px-3 text-sm font-normal normal-case tracking-normal focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2" /></label>
      <label className="text-xs font-semibold uppercase tracking-[0.08em] text-black/60">Email address<input name="guest_email" type="email" required maxLength={254} autoComplete="off" className="mt-1.5 min-h-11 w-full rounded-xl border border-black/20 bg-white/80 px-3 text-sm font-normal normal-case tracking-normal focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2" /></label>
    </div> : null}
    <ProgramSubmitButton label={label} />
  </form>;
}

export function CancelMemberProgramRequest({ requestId }: { requestId: string }) {
  return <form action={cancelMemberProgramRequest} className="mt-3"><input type="hidden" name="program_request_id" value={requestId} /><CancelProgramButton /></form>;
}

function CancelProgramButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending} aria-busy={pending} className="inline-flex min-h-11 items-center justify-center rounded-full border border-black/20 px-4 text-sm font-semibold text-black transition hover:border-black hover:bg-black hover:text-white focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-55">{pending ? "Cancelling…" : "Cancel request"}</button>;
}
