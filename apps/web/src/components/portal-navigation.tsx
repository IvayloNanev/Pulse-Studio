"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PortalNavigation({ label, links }: { label: string; links: Array<{ href: string; label: string }> }) {
  const pathname = usePathname();
  return (
    <nav className="mt-5 flex gap-2 overflow-x-auto lg:flex-col" aria-label={label}>
      {links.map((link) => {
        const active = pathname === link.href || (link.href.split("/").length > 2 && pathname.startsWith(`${link.href}/`));
        return (
          <Link
            key={`${link.href}-${link.label}`}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap border-l px-4 py-2.5 text-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${active ? "border-[#ff5b52] bg-white/10 font-semibold text-white" : "border-white/15 text-white/70 hover:border-white hover:text-white"}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
