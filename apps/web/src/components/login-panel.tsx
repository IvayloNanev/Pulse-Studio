"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type LoginPanelProps = {
  audience: "member" | "staff";
  initialNotice?: string | null;
  initialError?: string | null;
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

export function LoginPanel({ audience, initialNotice = null, initialError = null }: LoginPanelProps) {
  const isStaff = audience === "staff";
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      redirectTo: `${window.location.origin}/auth/callback?audience=${audience}`,
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

      router.replace(isStaff ? "/staff" : "/member");
      router.refresh();
    } catch (caughtError) {
      setError(signInErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen min-w-0 overflow-x-hidden bg-[#f3f0e9] text-[#111] lg:grid-cols-2">
      <div className="flex min-h-[18rem] min-w-0 flex-col justify-between overflow-hidden bg-[#171717] p-6 text-white sm:p-12 lg:p-16">
        <Brand inverse prominent />
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-white/45">
            {isStaff ? "Private staff access" : "Member access"}
          </p>
          <h1 className="mt-5 max-w-xl font-heading text-5xl leading-[0.9] tracking-[-0.055em] sm:text-7xl">
            {isStaff ? "Run the studio with clarity." : "Return to your practice."}
          </h1>
        </div>
      </div>
      <div className="atmospheric-motion relative flex items-center overflow-hidden bg-[linear-gradient(125deg,#8d8781_0%,#eeeae3_32%,#b7ada3_55%,#f7f3ea_72%,#77716d_100%)] px-6 py-14 sm:px-12 lg:px-20">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_10%,rgba(255,255,255,0.48)_42%,transparent_68%)]" />
        <div className="glass-panel editorial-rise relative w-full max-w-lg rounded-[2rem] p-7 sm:p-10">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-black/45">Secure sign in</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-[-0.04em]">Welcome back</h2>
          <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium">
              Email address
              <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3 focus-visible:border-black focus-visible:outline-2 focus-visible:outline-offset-2" />
            </label>
            <label className="block text-sm font-medium">
              Password
              <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3 focus-visible:border-black focus-visible:outline-2 focus-visible:outline-offset-2" />
            </label>
            {error ? <p role="alert" className="text-sm leading-6 text-[#9f1f1a]">{error}</p> : null}
            {notice ? <p role="status" className="text-sm leading-6 text-black/65">{notice}</p> : null}
            <Button disabled={isSubmitting} type="submit" className="h-12 w-full rounded-none bg-[#c72c25] text-white hover:bg-[#a9231e] disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? "Signing in…" : `Sign in as ${isStaff ? "staff" : "member"}`}
            </Button>
            <div className="space-y-2 border-t border-black/15 pt-4">
              {recoveryError ? <p role="alert" className="text-sm leading-6 text-[#9f1f1a]">{recoveryError}</p> : null}
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
          <p className="mt-6 text-xs leading-5 text-black/50">
            Access is limited to active Pulse Studio {isStaff ? "staff" : "member"} accounts.
          </p>
        </div>
      </div>
    </main>
  );
}
