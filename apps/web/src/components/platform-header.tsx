"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOut } from "@/app/auth/actions";
import { Brand } from "@/components/brand";

type HeaderLink = { href: string; label: string };

type PlatformHeaderProps =
  | { mode: "public"; links: HeaderLink[] }
  | { mode: "portal"; links: HeaderLink[]; audience: "member" | "staff"; label: string };

function isActivePath(pathname: string, href: string) {
  return pathname === href || (href.split("/").length > 2 && pathname.startsWith(`${href}/`));
}

function activeHrefForPath(pathname: string, links: HeaderLink[]) {
  return links
    .filter((link) => isActivePath(pathname, link.href))
    .toSorted((left, right) => right.href.length - left.href.length)[0]?.href;
}

function HeaderLinkItem({ href, label, active, mobile = false }: HeaderLink & { active: boolean; mobile?: boolean }) {
  return <Link href={href} aria-current={active ? "page" : undefined} className={mobile
    ? `min-h-11 rounded-xl px-4 py-3 text-sm font-semibold uppercase tracking-[0.1em] hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${active ? "bg-black/10" : ""}`
    : `inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-2 text-xs font-semibold uppercase tracking-[0.13em] underline-offset-4 transition hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 xl:px-3 ${active ? "bg-black/5 underline decoration-2" : ""}`
  }>{label}</Link>;
}

export function PlatformHeader(props: PlatformHeaderProps) {
  const pathname = usePathname();
  const isPublic = props.mode === "public";
  const mobileLinks = isPublic || props.audience === "staff" ? props.links : [{ href: "/member/account", label: "Account" }];
  const navigationLabel = isPublic ? "Public navigation" : props.label;
  const activeHref = activeHrefForPath(pathname, props.links);
  const activeMobileHref = activeHrefForPath(pathname, mobileLinks);

  return (
    <header className="platform-header">
      <Brand linked={false} />
      <nav className="hidden min-w-0 items-center gap-1 lg:flex xl:gap-4 2xl:gap-6" aria-label={navigationLabel}>
        {props.links.map((link) => <HeaderLinkItem key={`${link.href}-${link.label}`} {...link} active={link.href === activeHref} />)}
        {isPublic ? (
          <Link href="/join" aria-current={pathname === "/join" ? "page" : undefined} className="platform-header-cta">Join today</Link>
        ) : (
          <form action={signOut} className="shrink-0">
            <input type="hidden" name="audience" value={props.audience} />
            <button type="submit" className="platform-header-cta">Sign out</button>
          </form>
        )}
      </nav>
      <details className="group relative lg:hidden">
        <summary className="platform-menu-trigger">Menu</summary>
        <nav aria-label={`${navigationLabel} mobile`} className="platform-mobile-menu">
          {mobileLinks.map((link) => <HeaderLinkItem key={`${link.href}-${link.label}`} {...link} active={link.href === activeMobileHref} mobile />)}
          {isPublic ? (
            <Link href="/join" aria-current={pathname === "/join" ? "page" : undefined} className="mt-2 inline-flex min-h-11 items-center rounded-xl bg-black px-4 py-3 text-sm font-semibold uppercase tracking-[0.1em] text-white focus-visible:outline-2 focus-visible:outline-offset-[-2px]">Join today</Link>
          ) : (
            <form action={signOut}>
              <input type="hidden" name="audience" value={props.audience} />
              <button type="submit" className="mt-2 min-h-11 w-full rounded-xl bg-black px-4 py-3 text-left text-sm font-semibold uppercase tracking-[0.1em] text-white focus-visible:outline-2 focus-visible:outline-offset-[-2px]">Sign out</button>
            </form>
          )}
        </nav>
      </details>
    </header>
  );
}
