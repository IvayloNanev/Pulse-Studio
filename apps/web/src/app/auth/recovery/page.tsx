import Link from "next/link";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";

import { confirmRecovery } from "./actions";

type RecoveryPageProps = {
  searchParams: Promise<{ token_hash?: string; redirect_to?: string; audience?: string }>;
};

function recoveryAudience(redirectTo?: string, explicitAudience?: string) {
  if (explicitAudience === "staff") return "staff";
  if (!redirectTo) return "member";

  try {
    const destination = new URL(redirectTo, "https://pulse.local");
    return destination.searchParams.get("audience") === "staff" || destination.pathname.endsWith("/staff") ? "staff" : "member";
  } catch {
    return "member";
  }
}

export default async function RecoveryPage({ searchParams }: RecoveryPageProps) {
  const query = await searchParams;
  const audience = recoveryAudience(query.redirect_to, query.audience);
  const loginPath = audience === "staff" ? "/staff/login" : "/login";

  return (
    <main className="atmospheric-motion flex min-h-screen items-center justify-center bg-[linear-gradient(125deg,#171717_0%,#756f69_45%,#eeeae3_100%)] px-6 py-16">
      <section className="glass-panel w-full max-w-lg rounded-[2rem] p-8 sm:p-10">
        <Brand prominent />
        <p className="mt-10 font-mono text-xs uppercase tracking-[0.2em] text-black/60">Secure account recovery</p>
        <h1 className="display-pulse mt-4 text-5xl">Continue securely.</h1>
        {query.token_hash ? (
          <>
            <p className="mt-7 text-sm leading-6 text-black/65">
              Confirm that you opened this recovery request. Your password will not change until you complete the next screen.
            </p>
            <form action={confirmRecovery} className="mt-8">
              <input type="hidden" name="token_hash" value={query.token_hash} />
              <input type="hidden" name="audience" value={audience} />
              <Button type="submit" className="h-12 w-full rounded-full bg-[#c72c25] text-white hover:bg-[#a9231e] focus-visible:outline-[#c72c25]">
                Continue to create a new password
              </Button>
            </form>
          </>
        ) : (
          <p role="alert" className="mt-8 rounded-xl border border-black/15 bg-[#c72c25]/5 p-3 text-sm leading-6 text-[#9f1f1a]">
            This recovery request is incomplete. Return to login and request a new email.
          </p>
        )}
        <Link href={loginPath} className="mt-7 inline-flex min-h-11 items-center rounded-full border border-black/15 bg-white/55 px-4 text-sm font-semibold underline decoration-[#c72c25] decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2">
          Return to {audience} login
        </Link>
      </section>
    </main>
  );
}
