"use client";

import Link from "next/link";
import { Activity, CalendarDays, Compass, Grid2X2, House } from "lucide-react";
import { usePathname } from "next/navigation";

const icons = {
  Home: House,
  Classes: CalendarDays,
  Services: Grid2X2,
  Activity,
  Explore: Compass,
};

export function MemberBottomNavigation({ links }: { links: Array<{ href: string; label: string }> }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Member navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#111]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 text-white shadow-[0_-1rem_3rem_rgba(0,0,0,0.22)] backdrop-blur-2xl lg:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-5">
        {links.map((link) => {
          const active = pathname === link.href || (link.href !== "/member" && pathname.startsWith(`${link.href}/`));
          const Icon = icons[link.label as keyof typeof icons];
          return (
            <Link key={link.href} href={link.href} aria-current={active ? "page" : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.68rem] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${active ? "bg-white/10 text-white" : "text-white/55 hover:text-white"}`}>
              {Icon ? <Icon className={`size-5 ${active ? "text-[#ff5b52]" : ""}`} strokeWidth={active ? 2.4 : 1.8} aria-hidden="true" /> : null}
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
