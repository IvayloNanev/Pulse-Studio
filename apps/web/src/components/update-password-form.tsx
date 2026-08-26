"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type UpdatePasswordFormProps = {
  audience: "member" | "staff";
  sessionReady: boolean;
  recoveryError: string | null;
};

const recoveryMessages: Record<string, string> = {
  missing_code: "This recovery link is incomplete. Request a new link from the login page.",
  invalid_or_expired: "This recovery link is invalid or has expired. Request a new link from the login page.",
  missing_session: "A secure recovery session could not be verified. Request a new link from the login page.",
};

export function UpdatePasswordForm({ audience, sessionReady, recoveryError }: UpdatePasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setIsSubmitting(false);
      setError(updateError.message);
      return;
    }

    await supabase.auth.signOut();
    router.replace(audience === "staff" ? "/staff/login?password=updated" : "/login?password=updated");
    router.refresh();
  }

  return (
    <main className="atmospheric-motion flex min-h-screen items-center justify-center bg-[linear-gradient(125deg,#171717_0%,#756f69_45%,#eeeae3_100%)] px-6 py-16">
      <section className="glass-panel w-full max-w-lg rounded-[2rem] p-8 sm:p-10">
        <Brand prominent />
        <p className="mt-10 font-mono text-xs uppercase tracking-[0.2em] text-black/60">Secure account recovery</p>
        <h1 className="display-pulse mt-4 text-5xl">Create a new password.</h1>
        {sessionReady ? <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium">
            New password
            <input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3 focus-visible:border-black focus-visible:outline-2 focus-visible:outline-offset-2" />
          </label>
          <label className="block text-sm font-medium">
            Confirm new password
            <input required minLength={8} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3 focus-visible:border-black focus-visible:outline-2 focus-visible:outline-offset-2" />
          </label>
          {error ? <p role="alert" className="rounded-xl border border-black/15 bg-[#c72c25]/5 p-3 text-sm leading-6 text-[#9f1f1a]">{error}</p> : null}
          <Button disabled={isSubmitting} type="submit" className="h-12 w-full rounded-full bg-[#c72c25] text-white hover:bg-[#a9231e] focus-visible:outline-[#c72c25] disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? "Updating password…" : "Set new password"}
          </Button>
        </form> : <div className="mt-10"><p role="alert" className="rounded-xl border border-black/15 bg-[#c72c25]/5 p-3 text-sm leading-6 text-[#9f1f1a]">{recoveryMessages[recoveryError ?? "missing_session"] ?? recoveryMessages.missing_session}</p><Link href={audience === "staff" ? "/staff/login" : "/login"} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-black px-5 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">Request a new recovery link</Link></div>}
        <Link href={audience === "staff" ? "/staff/login" : "/login"} className="mt-7 inline-block text-sm underline underline-offset-4">
          Return to {audience} login
        </Link>
      </section>
    </main>
  );
}
