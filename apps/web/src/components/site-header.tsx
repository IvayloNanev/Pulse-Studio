import Link from "next/link";

import { Brand } from "@/components/brand";

const links = [
  { href: "/membership", label: "Membership" },
  { href: "/classes", label: "Classes" },
  { href: "/login", label: "Member login" },
];

export function SiteHeader({ inverse = false }: { inverse?: boolean }) {
  return (
    <header className={`flex h-20 items-center justify-between border-b px-6 sm:px-10 lg:px-16 ${inverse ? "border-white/15 text-white" : "border-black/15 text-black"}`}>
      <Brand inverse={inverse} />
      <nav className="flex items-center gap-5 text-xs font-semibold uppercase tracking-[0.13em] sm:gap-8" aria-label="Public navigation">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="hidden underline-offset-4 hover:underline sm:block">
            {link.label}
          </Link>
        ))}
        <Link href="/join" className={`border px-4 py-2.5 transition-colors ${inverse ? "border-white bg-white text-black hover:bg-transparent hover:text-white" : "border-black bg-black text-white hover:bg-transparent hover:text-black"}`}>
          Join today
        </Link>
      </nav>
    </header>
  );
}
