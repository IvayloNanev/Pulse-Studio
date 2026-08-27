import { PortalShell } from "@/components/portal-shell";
import { StaffOverview } from "@/components/staff-overview";
import { requireStaff } from "@/lib/auth";
import { staffLinks } from "@/lib/staff-navigation";

type StaffAccount = { first_name: string; last_name: string; role: "owner_admin" | "instructor" };
type Risk = { risk_level: "high" | "medium"; review_status: string };
type ClassType = "yoga" | "cycling" | "hiit";
type HistoryRow = { month_start: string; class_type: ClassType; instructor_name: string; classes_taught: number; booked: number; capacity: number; waitlisted: number; cancelled: number; attended: number };
type DashboardHealth = {
  history_source?: string;
  monthly_class_performance?: { month: string; label: string; classes: { class_type: ClassType; booked: number; capacity: number; waitlisted: number; cancelled?: number }[] }[];
  monthly_teacher_performance?: { month: string; teachers: { name: string; classes_taught: number; bookings: number; capacity: number; attendance_rate: number }[] }[];
  [key: string]: unknown;
};

function monthLabel(month: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`));
}

function mergeAggregateHistory(health: DashboardHealth, rows: HistoryRow[]): DashboardHealth {
  if (!rows.length) return health;
  const classMonths = new Map((health.monthly_class_performance ?? []).map((item) => [item.month, item]));
  const teacherMonths = new Map((health.monthly_teacher_performance ?? []).map((item) => [item.month, item]));
  const rowsByMonth = new Map<string, HistoryRow[]>();
  for (const row of rows) {
    const month = row.month_start.slice(0, 7);
    rowsByMonth.set(month, [...(rowsByMonth.get(month) ?? []), row]);
  }
  for (const [month, monthRows] of rowsByMonth) {
    classMonths.set(month, { month, label: monthLabel(month), classes: monthRows.map((row) => ({ class_type: row.class_type, booked: row.booked, capacity: row.capacity, waitlisted: row.waitlisted, cancelled: row.cancelled })) });
    teacherMonths.set(month, { month, teachers: monthRows.map((row) => ({ name: row.instructor_name, classes_taught: row.classes_taught, bookings: row.booked, capacity: row.capacity, attendance_rate: Math.round(row.attended / Math.max(1, row.booked) * 100) })) });
  }
  return {
    ...health,
    history_source: "Synthetic aggregate dashboard data for presentation",
    monthly_class_performance: [...classMonths.values()].sort((a, b) => a.month.localeCompare(b.month)),
    monthly_teacher_performance: [...teacherMonths.values()].sort((a, b) => a.month.localeCompare(b.month)),
  };
}

export default async function StaffPortalPage() {
  const { supabase, user, staffId } = await requireStaff();
  const [accountResult, healthResult, riskResult, historyResult] = await Promise.all([
    supabase.from("staff_accounts").select("first_name,last_name,role").eq("staff_id", staffId).single(),
    supabase.rpc("staff_business_health"),
    supabase.rpc("product_d_risk_queue"),
    supabase.from("staff_business_class_history").select("month_start,class_type,instructor_name,classes_taught,booked,capacity,waitlisted,cancelled,attended").order("month_start"),
  ]);
  const account = accountResult.data as StaffAccount | null;
  const staffName = account ? `${account.first_name} ${account.last_name}` : user.email ?? "Staff member";
  const staffRole = account?.role === "owner_admin" ? "Owner / administrator" : "Instructor";
  const health = mergeAggregateHistory((healthResult.data ?? {}) as DashboardHealth, (historyResult.data ?? []) as HistoryRow[]);

  return <PortalShell audience="staff" eyebrow="Staff portal · Overview" title="Studio overview" description="Business health at a glance." links={staffLinks} showHeader={false}>{account?.role !== "owner_admin" ? <div className="glass-panel rounded-3xl p-7"><h1 className="text-3xl font-semibold">Your teaching day</h1><p className="mt-3 text-sm leading-6 text-black/65">Studio-wide business health is available to the owner/admin. Use Schedule &amp; Attendance to run your classes and Member Retention to complete follow-up work.</p></div> : healthResult.error ? <div role="alert" className="rounded-3xl border border-black/15 bg-white/65 p-7 text-[#8e211c]">Business health is temporarily unavailable. Refresh and try again.</div> : <StaffOverview staffName={staffName} staffRole={staffRole} health={health} risks={(riskResult.data ?? []) as Risk[]} />}</PortalShell>;
}
