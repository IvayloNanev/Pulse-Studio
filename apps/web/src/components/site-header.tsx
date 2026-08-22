import Link from "next/link";

import { Brand } from "@/components/brand";

const links = [
  { href: "/membership", label: "Membership" },
  { href: "/classes", label: "Classes" },
  { href: "/login", label: "Member login" },
];

export function SiteHeader() {
  return (
    <header className="flex h-20 items-center justify-between border-b border-black/15 px-6 sm:px-10 lg:px-16">
      <Brand />
      <nav className="flex items-center gap-5 text-xs font-semibold uppercase tracking-[0.13em] sm:gap-8" aria-label="Public navigation">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="hidden underline-offset-4 hover:underline sm:block">
            {link.label}
          </Link>
        ))}
        <Link href="/join" className="border border-black bg-black px-4 py-2.5 text-white transition-colors hover:bg-transparent hover:text-black">
          Join today
        </Link>
      </nav>
    </header>
  );
}
