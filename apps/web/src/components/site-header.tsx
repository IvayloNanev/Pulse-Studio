import { PlatformHeader } from "@/components/platform-header";

const links = [
  { href: "/", label: "Home" },
  { href: "/membership", label: "Membership" },
  { href: "/classes", label: "Classes" },
  { href: "/login", label: "Member login" },
];

export function SiteHeader() {
  return <PlatformHeader mode="public" links={links} />;
}
