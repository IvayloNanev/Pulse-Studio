"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type LoginPanelProps = {
  audience: "member" | "staff";
  initialNotice?: string | null;
  initialError?: string | null;
  memberReturnTo?: string;
};

function signInErrorMessage(error: unknown) {
  if (error instanceof Error && /invalid login credentials/i.test(error.message)) {
    return "The email or password is incorrect. Try again, or use ‘Forgot or need to create your password?’ below.";
  }

  return error instanceof Error ? error.message : "Sign in failed. Please try again.";
}

function recoveryCooldownSeconds(message: string) {
  const match = message.match(/after\s+(\d+)\s+seconds?/i);
  return match ? Number(match[1]) : 0;
}

export function LoginPanel({ audience, initialNotice = null, initialError = null, memberReturnTo = "/member" }: LoginPanelProps) {
  const isStaff = audience === "staff";
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingRecovery, setIsSendingRecovery] = useState(false);
  const [notice] = useState<string | null>(initialNotice);
  const [error, setError] = useState<string | null>(initialError);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoveryCooldown, setRecoveryCooldown] = useState(0);

  useEffect(() => {
    if (recoveryCooldown <= 0) return;

    const timer = window.setInterval(() => {
      setRecoveryCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [recoveryCooldown]);

  async function sendPasswordRecovery() {
    setRecoveryError(null);
    setRecoveryNotice(null);
    if (!email) {
      setRecoveryError("Enter your email address above before requesting a recovery link.");
      return;
    }

    setIsSendingRecovery(true);
    const supabase = createClient();
    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email, {
      // Keep the portal identity in the path. Some email clients and auth
      // redirects can discard query parameters, which previously caused staff
      // recovery links to fall back to the member password flow.
      redirectTo: `${window.location.origin}/auth/callback/${audience}`,
    });
    setIsSendingRecovery(false);

    if (recoveryError) {
      const seconds = recoveryCooldownSeconds(recoveryError.message);
      if (seconds > 0) {
        setRecoveryCooldown(seconds);
        setRecoveryError("A recovery email was requested recently. You can request another when the countdown ends.");
      } else {
        setRecoveryError("We could not send a recovery email. Please try again in a moment.");
      }
      return;
    }
    setRecoveryNotice("Recovery email sent. Open the newest Pulse Studio email and use its secure link.");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setRecoveryError(null);
    setRecoveryNotice(null);
    setIsSubmitting(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;

      const functionName = isStaff ? "current_staff_id" : "current_member_id";
      const { data: accountId, error: accountError } = await supabase.rpc(functionName);

      if (accountError || !accountId) {
        await supabase.auth.signOut();
        throw new Error(`This account is not linked to an active ${audience} profile.`);
      }

      router.replace(isStaff ? "/staff" : memberReturnTo);
      router.refresh();
    } catch (caughtError) {
      setError(signInErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="relative isolate grid min-h-[calc(100vh-5rem)] min-w-0 overflow-x-hidden bg-transparent text-[#111] lg:grid-cols-2">
      <div className="absolute inset-0 -z-20">
        <Image
          src={isStaff ? "/media/pulse-staff-operations.png" : "/media/classes/yoga.jpg"}
          alt={isStaff ? "Pulse Studio staff reviewing the class schedule" : "Pulse Studio yoga practice"}
          fill
          priority
          sizes="100vw"
          className={`object-cover ${isStaff ? "object-[35%_center]" : "object-center"}`}
        />
      </div>
      <div className="absolute inset-0 -z-10 bg-black/38" aria-hidden="true" />
      <div className="relative flex min-h-[18rem] min-w-0 flex-col justify-end overflow-hidden bg-transparent p-6 text-white sm:p-12 lg:p-16">
        <div className="relative z-10">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/70">
            {isStaff ? "Private staff access" : "Member access"}
          </p>
          <h1 className="mt-5 max-w-xl font-heading text-5xl leading-[0.9] tracking-[-0.055em] sm:text-7xl">
            {isStaff ? "Run the studio with clarity." : "Return to your practice."}
          </h1>
        </div>
      </div>
      <div className="relative flex items-center overflow-hidden bg-transparent px-6 py-14 sm:px-12 lg:px-20">
        <div className="editorial-rise glass-panel relative w-full max-w-lg rounded-3xl p-7 sm:p-10">
          <p className="route-eyebrow text-black/60">Secure sign in</p>
          <h2 className="route-title mt-4 text-4xl">Welcome back</h2>
          <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium">
              Email address
              <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-12 w-full rounded-xl border border-black/20 bg-white/60 px-4 focus-visible:border-black/20 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2" />
            </label>
            <div>
              <label htmlFor={`${audience}-password`} className="block text-sm font-medium">Password</label>
              <div className="relative mt-2">
                <input id={`${audience}-password`} required type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-xl border border-black/20 bg-white/60 px-4 pr-20 focus-visible:border-black/20 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2" />
                <button type="button" aria-pressed={showPassword} aria-label={showPassword ? "Conceal entry" : "Reveal entry"} onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-1 right-1 min-w-16 rounded-lg px-3 text-sm font-semibold text-black/65 transition hover:bg-black/[0.06] hover:text-black focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {error ? <p role="alert" className="rounded-xl border border-black/15 bg-[#c72c25]/5 p-3 text-sm leading-6 text-[#9f1f1a]">{error}</p> : null}
            {notice ? <p role="status" className="text-sm leading-6 text-black/65">{notice}</p> : null}
            <Button disabled={isSubmitting} type="submit" className="h-12 w-full rounded-full bg-[#c72c25] text-white hover:bg-[#a9231e] focus-visible:outline-[#c72c25] disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? "Signing in…" : `Sign in as ${isStaff ? "staff" : "member"}`}
            </Button>
            <div className="space-y-2 pt-2">
              {recoveryError ? <p role="alert" className="rounded-xl border border-black/15 bg-[#c72c25]/5 p-3 text-sm leading-6 text-[#9f1f1a]">{recoveryError}</p> : null}
              {recoveryNotice ? <p role="status" className="text-sm leading-6 text-black/65">{recoveryNotice}</p> : null}
            </div>
            <button disabled={isSendingRecovery || recoveryCooldown > 0} type="button" onClick={sendPasswordRecovery} className="min-h-11 w-full text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60">
              {isSendingRecovery
                ? "Sending recovery email…"
                : recoveryCooldown > 0
                  ? `Request another recovery email in ${recoveryCooldown}s`
                  : "Forgot or need to create your password?"}
            </button>
          </form>
          <p className="mt-6 text-xs leading-5 text-black/60">
            Access is limited to active Pulse Studio {isStaff ? "staff" : "member"} accounts.
          </p>
        </div>
      </div>
      </main>
    </>
  );
}
