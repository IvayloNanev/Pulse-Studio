import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";

import { Brand } from "@/components/brand";
import { PortalNavigation } from "@/components/portal-navigation";
import { PulseAssistantChat } from "@/components/pulse-assistant-chat";
import { signOut } from "@/app/auth/actions";

type PortalShellProps = {
  audience: "member" | "staff";
  eyebrow: string;
  title: string;
  description: string;
  links: Array<{ href: string; label: string }>;
  showHeader?: boolean;
  children: React.ReactNode;
};

export function PortalShell({ audience, eyebrow, title, description, links, showHeader = true, children }: PortalShellProps) {
  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#151515] lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="flex flex-col justify-between border-b border-black/10 bg-[#171717] p-6 text-white lg:sticky lg:top-0 lg:h-screen lg:min-h-0 lg:self-start lg:overflow-hidden lg:border-b-0 lg:border-r">
        <div className="min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
          <Brand inverse />
          <p className="mt-10 font-mono text-xs uppercase tracking-[0.16em] text-white/70">{eyebrow}</p>
          <PortalNavigation label={`${eyebrow} navigation`} links={links} />
        </div>
        <div className="mt-8 flex items-center justify-between gap-4 border-t border-white/15 pt-5 text-sm text-white/70">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 px-2 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><ArrowLeft className="size-3.5" /> Public site</Link>
          <form action={signOut}>
            <input type="hidden" name="audience" value={audience} />
            <button type="submit" className="inline-flex min-h-11 items-center gap-2 px-2 font-semibold text-white/70 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              <LogOut className="size-3.5" aria-hidden="true" /> Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className={`relative overflow-hidden ${showHeader ? "px-6 py-10 sm:px-10 lg:px-14 lg:py-14" : "px-4 py-4 sm:px-7 sm:py-6 lg:px-10 lg:py-7"}`}>
        <div className="pointer-events-none absolute -right-32 -top-24 size-96 rounded-full bg-[#c72c25]/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-72 size-80 rounded-full bg-black/10 blur-3xl" />
        {showHeader ? (
          <header className="glass-panel editorial-rise relative max-w-4xl rounded-3xl p-6 sm:p-8">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-black/65">{eyebrow}</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-black/65">{description}</p>
          </header>
        ) : null}
        <div className={showHeader ? "relative py-8" : "relative py-1 lg:py-2"}>{children}</div>
      </main>
      {audience === "member" ? <PulseAssistantChat /> : null}
    </div>
  );
}
