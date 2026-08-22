"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export function UpdatePasswordForm() {
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
    setIsSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.replace("/staff");
    router.refresh();
  }

  return (
    <main className="atmospheric-motion flex min-h-screen items-center justify-center bg-[linear-gradient(125deg,#171717_0%,#756f69_45%,#eeeae3_100%)] px-6 py-16">
      <section className="glass-panel w-full max-w-lg rounded-[2rem] p-8 sm:p-10">
        <Brand prominent />
        <p className="mt-10 font-mono text-xs uppercase tracking-[0.2em] text-black/45">Secure account recovery</p>
        <h1 className="display-pulse mt-4 text-5xl">Create a new password.</h1>
        <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium">
            New password
            <input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3 outline-none focus:border-black" />
          </label>
          <label className="block text-sm font-medium">
            Confirm new password
            <input required minLength={8} type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 h-12 w-full border border-black/25 bg-transparent px-3 outline-none focus:border-black" />
          </label>
          {error ? <p role="alert" className="text-sm leading-6 text-[#9f1f1a]">{error}</p> : null}
          <Button disabled={isSubmitting} type="submit" className="h-12 w-full rounded-none bg-[#c72c25] text-white hover:bg-[#a9231e] disabled:opacity-60">
            {isSubmitting ? "Updating password…" : "Set new password"}
          </Button>
        </form>
        <Link href="/staff/login" className="mt-7 inline-block text-sm underline underline-offset-4">Return to staff login</Link>
      </section>
    </main>
  );
}
