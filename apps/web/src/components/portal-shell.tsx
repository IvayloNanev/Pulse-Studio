import Link from "next/link";
import { ArrowLeft, CircleUserRound, LogOut } from "lucide-react";

import { Brand } from "@/components/brand";
import { MemberBottomNavigation } from "@/components/member-bottom-navigation";
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
  const isMember = audience === "member";
  return (
    <div className={`min-h-screen bg-[#f7f6f2] text-[#151515] lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[17rem_minmax(0,1fr)] ${isMember ? "pb-20 lg:pb-0" : ""}`}>
      {isMember ? <header className="sticky top-0 z-40 flex min-h-16 items-center justify-between border-b border-white/10 bg-[#171717]/95 px-4 text-white backdrop-blur-xl lg:hidden"><Brand inverse /><Link href="/member/account" aria-label="Open account information" className="inline-flex size-11 items-center justify-center rounded-full border border-white/15 text-white/75 transition hover:border-white/40 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><CircleUserRound className="size-5" aria-hidden="true" /></Link></header> : null}
      <aside className={`${isMember ? "hidden lg:flex" : "flex"} flex-col justify-between border-b border-black/10 bg-[#171717] p-6 text-white lg:sticky lg:top-0 lg:h-screen lg:min-h-0 lg:self-start lg:overflow-hidden lg:border-b-0 lg:border-r`}>
        <div className="min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
          <Brand inverse />
          <p className="mt-10 font-mono text-xs uppercase tracking-[0.16em] text-white/70">{eyebrow}</p>
          <PortalNavigation label={`${eyebrow} navigation`} links={links} />
        </div>
        <div className="mt-8 border-t border-white/15 pt-4 text-sm text-white/70">
          {isMember ? <Link href="/member/account" className="mb-1 inline-flex min-h-11 w-full items-center gap-2 rounded-xl px-2 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><CircleUserRound className="size-4" aria-hidden="true" /> Account</Link> : null}
          <div className="flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 px-2 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><ArrowLeft className="size-3.5" /> Public site</Link>
          <form action={signOut}>
            <input type="hidden" name="audience" value={audience} />
            <button type="submit" className="inline-flex min-h-11 items-center gap-2 px-2 font-semibold text-white/70 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              <LogOut className="size-3.5" aria-hidden="true" /> Sign out
            </button>
          </form>
          </div>
        </div>
      </aside>
      <main className={`relative min-w-0 overflow-hidden ${showHeader ? "px-4 py-8 sm:px-6 lg:px-8 lg:py-10 xl:px-10 2xl:px-12" : "px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-7 xl:px-10 2xl:px-12"}`}>
        <div className="pointer-events-none absolute -right-32 -top-24 size-96 rounded-full bg-[#c72c25]/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 top-72 size-80 rounded-full bg-black/10 blur-3xl" />
        <div className="relative mx-auto w-full max-w-[90rem]">
        {showHeader ? (
          <header className="glass-panel editorial-rise relative rounded-3xl p-6 sm:p-8">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-black/65">{eyebrow}</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-black/65">{description}</p>
          </header>
        ) : null}
        <div className={showHeader ? "relative py-8" : "relative py-1 lg:py-2"}>{children}</div>
        </div>
      </main>
      {isMember ? <MemberBottomNavigation links={links} /> : null}
      {isMember ? <PulseAssistantChat /> : null}
    </div>
  );
}
