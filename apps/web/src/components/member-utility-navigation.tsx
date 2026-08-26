"use client";

import Link from "next/link";
import { Bell, CalendarDays, CircleUserRound, Search } from "lucide-react";

const utilities = [
  { href: "/member/account", label: "Account information", icon: CircleUserRound },
  { href: "/member/classes", label: "Search classes", icon: Search },
  { href: "/member?notifications=open", label: "Notifications", icon: Bell },
  { href: "/member/reservations", label: "Reservations calendar", icon: CalendarDays },
];

export function MemberUtilityNavigation() {
  return <nav aria-label="Member shortcuts" className="flex items-center gap-1">
    {utilities.map(({ href, label, icon: Icon }) => <Link key={label} href={href} aria-label={label} className="inline-flex size-11 items-center justify-center rounded-full text-black/65 transition hover:bg-black/5 hover:text-black focus-visible:outline-2 focus-visible:outline-[#c72c25] focus-visible:outline-offset-2"><Icon className="size-5" aria-hidden="true" /></Link>)}
  </nav>;
}
