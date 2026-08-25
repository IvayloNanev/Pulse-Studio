import Link from "next/link";

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
    <div className={`min-h-screen bg-[#f7f6f2] text-[#151515] ${isMember ? "pb-20 lg:pb-0" : ""}`}>
      <header className="sticky top-0 z-50 flex h-20 items-center justify-between border-b border-black/15 bg-[#f3f0e9]/90 px-6 text-black shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-xl sm:px-10 lg:px-16">
        <Brand linked={false} />
        <div className="hidden min-w-0 items-center gap-5 lg:flex lg:gap-8">
          <PortalNavigation label={`${eyebrow} navigation`} links={links} />
          <form action={signOut} className="shrink-0">
            <input type="hidden" name="audience" value={audience} />
            <button type="submit" className="inline-flex min-h-11 items-center rounded-full border border-black bg-black px-5 text-xs font-semibold uppercase tracking-[0.13em] text-white transition-colors hover:bg-transparent hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2">Sign out</button>
          </form>
        </div>
        <details className="group relative lg:hidden">
          <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-full border border-black/40 px-4 text-xs font-semibold uppercase tracking-[0.13em] focus-visible:outline-2 focus-visible:outline-offset-2">Menu</summary>
          <nav aria-label={`${eyebrow} mobile navigation`} className="absolute right-0 top-12 z-50 grid min-w-64 rounded-2xl border border-black/15 bg-[#f7f6f2] p-2 text-black shadow-2xl">
            {links.map((link) => <Link key={`${link.href}-${link.label}`} href={link.href} className="min-h-11 rounded-xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.1em] hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-[-2px]">{link.label}</Link>)}
            <form action={signOut}>
              <input type="hidden" name="audience" value={audience} />
              <button type="submit" className="mt-2 min-h-11 w-full rounded-xl bg-black px-4 py-3 text-left text-sm font-semibold uppercase tracking-[0.1em] text-white focus-visible:outline-2 focus-visible:outline-offset-[-2px]">Sign out</button>
            </form>
          </nav>
        </details>
      </header>
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
