import { MemberBottomNavigation } from "@/components/member-bottom-navigation";
import { MemberUtilityNavigation } from "@/components/member-utility-navigation";
import { PlatformHeader } from "@/components/platform-header";
import { PulseAssistantChat } from "@/components/pulse-assistant-chat";

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
      <PlatformHeader mode="portal" links={links} audience={audience} label={`${eyebrow} navigation`} />
      {isMember ? <div className="platform-gutter border-b border-black/8 bg-white/45"><div className="mx-auto flex w-full max-w-[90rem] justify-start py-1"><MemberUtilityNavigation /></div></div> : null}
      <main className={`relative min-w-0 overflow-hidden ${showHeader ? "platform-gutter py-8 lg:py-10" : "platform-gutter py-4 sm:py-6 lg:py-7"}`}>
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
