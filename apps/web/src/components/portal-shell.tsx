import Link from "next/link";
import { ArrowLeft, LogOut } from "lucide-react";

import { Brand } from "@/components/brand";

type PortalShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  links: Array<{ href: string; label: string }>;
  children: React.ReactNode;
};

export function PortalShell({ eyebrow, title, description, links, children }: PortalShellProps) {
  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#151515] lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="flex flex-col justify-between border-b border-black/10 bg-[#171717] p-6 text-white lg:min-h-screen lg:border-b-0 lg:border-r">
        <div>
          <Brand inverse />
          <p className="mt-10 font-mono text-[0.65rem] uppercase tracking-[0.2em] text-white/45">{eyebrow}</p>
          <nav className="mt-5 flex gap-2 overflow-x-auto lg:flex-col" aria-label={`${eyebrow} navigation`}>
            {links.map((link) => (
              <Link key={`${link.href}-${link.label}`} href={link.href} className="whitespace-nowrap border-l border-white/15 px-4 py-2.5 text-sm text-white/70 transition hover:border-white hover:text-white">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-8 flex items-center justify-between border-t border-white/15 pt-5 text-xs text-white/50">
          <Link href="/" className="inline-flex items-center gap-2 hover:text-white"><ArrowLeft className="size-3.5" /> Public site</Link>
          <LogOut className="size-3.5" aria-hidden="true" />
        </div>
      </aside>
      <main className="px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
        <header className="max-w-4xl border-b border-black/10 pb-8">
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-black/45">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-black/55">{description}</p>
        </header>
        <div className="py-8">{children}</div>
      </main>
    </div>
  );
}
