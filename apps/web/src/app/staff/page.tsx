import { PortalShell } from "@/components/portal-shell";
import { StaffOverview } from "@/components/staff-overview";
import { requireStaff } from "@/lib/auth";
import { staffLinks } from "@/lib/staff-navigation";

type StaffAccount = { first_name: string; last_name: string; role: "owner_admin" | "instructor" };
type Risk = { risk_level: "high" | "medium"; review_status: string };

export default async function StaffPortalPage() {
  const { supabase, user, staffId } = await requireStaff();
  const [accountResult, healthResult, riskResult] = await Promise.all([
    supabase.from("staff_accounts").select("first_name,last_name,role").eq("staff_id", staffId).single(),
    supabase.rpc("staff_business_health"),
    supabase.rpc("product_d_risk_queue"),
  ]);
  const account = accountResult.data as StaffAccount | null;
  const staffName = account ? `${account.first_name} ${account.last_name}` : user.email ?? "Staff member";
  const staffRole = account?.role === "owner_admin" ? "Owner / administrator" : "Instructor";

  return <PortalShell audience="staff" eyebrow="Staff portal · Overview" title="Studio overview" description="Business health at a glance." links={staffLinks} showHeader={false}>{account?.role !== "owner_admin" ? <div className="glass-panel rounded-3xl p-7"><h1 className="text-3xl font-semibold">Your teaching day</h1><p className="mt-3 text-sm leading-6 text-black/65">Studio-wide business health is available to the owner/admin. Use Schedule &amp; Attendance to run your classes and Member Retention to complete follow-up work.</p></div> : healthResult.error ? <div role="alert" className="rounded-3xl border border-black/15 bg-white/65 p-7 text-[#8e211c]">Business health is temporarily unavailable. Refresh and try again.</div> : <StaffOverview staffName={staffName} staffRole={staffRole} health={healthResult.data ?? {}} risks={(riskResult.data ?? []) as Risk[]} />}</PortalShell>;
}
