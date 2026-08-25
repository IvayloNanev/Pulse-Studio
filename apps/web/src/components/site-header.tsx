"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Brand } from "@/components/brand";

const links = [
  { href: "/membership", label: "Membership" },
  { href: "/classes", label: "Classes" },
  { href: "/login", label: "Member login" },
];

export function SiteHeader({ inverse = false }: { inverse?: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href;
  return (
    <header className={`sticky top-0 z-50 flex h-20 items-center justify-between border-b px-6 shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-xl sm:px-10 lg:px-16 ${inverse ? "border-white/15 bg-[#111111]/90 text-white" : "border-black/15 bg-[#f3f0e9]/90 text-black"}`}>
      <Brand inverse={inverse} />
      <nav className="hidden items-center gap-5 text-xs font-semibold uppercase tracking-[0.13em] md:flex lg:gap-8" aria-label="Public navigation">
        {links.map((link) => (
          <Link key={link.href} href={link.href} aria-current={isActive(link.href) ? "page" : undefined} className={`inline-flex min-h-11 items-center px-1 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 ${isActive(link.href) ? "underline decoration-2" : ""}`}>
            {link.label}
          </Link>
        ))}
        <Link href="/join" aria-current={isActive("/join") ? "page" : undefined} className={`inline-flex min-h-11 items-center border px-4 transition-colors ${inverse ? "border-white bg-white text-black hover:bg-transparent hover:text-white" : "border-black bg-black text-white hover:bg-transparent hover:text-black"}`}>
          Join today
        </Link>
      </nav>
      <details className="group relative md:hidden">
        <summary className={`flex min-h-11 cursor-pointer list-none items-center border px-4 text-xs font-semibold uppercase tracking-[0.13em] focus-visible:outline-2 focus-visible:outline-offset-2 ${inverse ? "border-white/50" : "border-black/40"}`}>
          Menu
        </summary>
        <nav aria-label="Mobile public navigation" className={`absolute right-0 top-12 z-50 grid min-w-56 border p-2 shadow-2xl ${inverse ? "border-white/20 bg-[#171717] text-white" : "border-black/15 bg-[#f7f6f2] text-black"}`}>
          {links.map((link) => (
            <Link key={link.href} href={link.href} aria-current={isActive(link.href) ? "page" : undefined} className={`min-h-11 px-4 py-3 text-sm font-semibold uppercase tracking-[0.1em] hover:bg-current/5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${isActive(link.href) ? inverse ? "bg-white/15" : "bg-black/10" : ""}`}>
              {link.label}
            </Link>
          ))}
          <Link href="/join" aria-current={isActive("/join") ? "page" : undefined} className={`mt-2 min-h-11 px-4 py-3 text-sm font-semibold uppercase tracking-[0.1em] ${inverse ? "bg-white text-black" : "bg-black text-white"}`}>
            Join today
          </Link>
        </nav>
      </details>
    </header>
  );
}
