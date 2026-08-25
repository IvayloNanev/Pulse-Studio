import { LoginPanel } from "@/components/login-panel";

const errors: Record<string, string> = { "member-access-required": "Sign in with an account linked to an active member profile." };

function safeMemberReturnPath(value?: string) {
  if (!value) return "/member";
  try {
    const parsed = new URL(value, "https://pulse.local");
    if (parsed.origin !== "https://pulse.local" || parsed.pathname !== "/member/classes") return "/member";
    const params = new URLSearchParams();
    const day = parsed.searchParams.get("day");
    const classType = parsed.searchParams.get("class");
    if (day && /^\d{4}-\d{2}-\d{2}$/.test(day)) params.set("day", day);
    if (classType && ["yoga", "cycling", "hiit"].includes(classType)) params.set("class", classType);
    const query = params.toString();
    return `/member/classes${query ? `?${query}` : ""}`;
  } catch {
    return "/member";
  }
}

export default async function MemberLoginPage({ searchParams }: { searchParams: Promise<{ password?: string; error?: string; signed_out?: string; next?: string }> }) {
  const query = await searchParams;
  const notice = query.signed_out === "true"
    ? "You have been signed out securely."
    : query.password === "updated"
      ? "Password updated. Sign in with your new password."
      : null;
  return <LoginPanel audience="member" memberReturnTo={safeMemberReturnPath(query.next)} initialNotice={notice} initialError={query.error ? errors[query.error] ?? "Member access could not be verified." : null} />;
}
