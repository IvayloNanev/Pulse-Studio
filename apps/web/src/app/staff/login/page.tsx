import { LoginPanel } from "@/components/login-panel";

const errors: Record<string, string> = { "staff-access-required": "Sign in with an account linked to an active staff profile." };

export default async function StaffLoginPage({ searchParams }: { searchParams: Promise<{ password?: string; error?: string }> }) {
  const query = await searchParams;
  return <LoginPanel audience="staff" initialNotice={query.password === "updated" ? "Password updated. Sign in with your new password." : null} initialError={query.error ? errors[query.error] ?? "Staff access could not be verified." : null} />;
}
