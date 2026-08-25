"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PortalNavigation({ label, links }: { label: string; links: Array<{ href: string; label: string }> }) {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-5 overflow-x-auto text-xs font-semibold uppercase tracking-[0.13em] lg:gap-8" aria-label={label}>
      {links.map((link) => {
        const active = pathname === link.href || (link.href.split("/").length > 2 && pathname.startsWith(`${link.href}/`));
        return (
          <Link
            key={`${link.href}-${link.label}`}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-3 underline-offset-4 transition hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 ${active ? "bg-black/5 underline decoration-2" : ""}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
