import { LoginPanel } from "@/components/login-panel";

const errors: Record<string, string> = { "member-access-required": "Sign in with an account linked to an active member profile." };

export default async function MemberLoginPage({ searchParams }: { searchParams: Promise<{ password?: string; error?: string; signed_out?: string }> }) {
  const query = await searchParams;
  const notice = query.signed_out === "true"
    ? "You have been signed out securely."
    : query.password === "updated"
      ? "Password updated. Sign in with your new password."
      : null;
  return <LoginPanel audience="member" initialNotice={notice} initialError={query.error ? errors[query.error] ?? "Member access could not be verified." : null} />;
}
