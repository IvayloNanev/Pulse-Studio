import { LoginPanel } from "@/components/login-panel";

const errors: Record<string, string> = { "staff-access-required": "Sign in with an account linked to an active staff profile." };

export default async function StaffLoginPage({ searchParams }: { searchParams: Promise<{ password?: string; error?: string; signed_out?: string }> }) {
  const query = await searchParams;
  const notice = query.signed_out === "true"
    ? "You have been signed out securely."
    : query.password === "updated"
      ? "Password updated. Sign in with your new password."
      : null;
  return <LoginPanel audience="staff" initialNotice={notice} initialError={query.error ? errors[query.error] ?? "Staff access could not be verified." : null} />;
}
