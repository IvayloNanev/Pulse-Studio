import { PortalShell } from "@/components/portal-shell";
import { StaffOverview, type StaffOverviewSession } from "@/components/staff-overview";
import { requireStaff } from "@/lib/auth";
import { staffLinks } from "@/lib/staff-navigation";

type StaffAccount = { first_name: string; last_name: string; role: "owner_admin" | "instructor" };
type StaffSessionRow = { class_session_id: string; class_type: "yoga" | "cycling" | "hiit"; starts_at: string; capacity: number; confirmed_reservations: number; waitlisted_reservations: number; instructor_name: string };

const classNames = { yoga: "Studio Flow", cycling: "Pulse Ride", hiit: "Power Interval" };
const dateFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric", year: "numeric" });
const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });

export default async function StaffPortalPage() {
  const { supabase, user, staffId } = await requireStaff();
  const now = new Date();
  const todayKey = dayKeyFormatter.format(now);
  const windowStart = new Date(now.getTime() - 12 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
  const [accountResult, scheduleResult] = await Promise.all([
    supabase.from("staff_accounts").select("first_name,last_name,role").eq("staff_id", staffId).single(),
    supabase.from("staff_product_b_sessions").select("class_session_id,class_type,starts_at,capacity,confirmed_reservations,waitlisted_reservations,instructor_name").gte("starts_at", windowStart.toISOString()).lt("starts_at", windowEnd.toISOString()).order("starts_at", { ascending: true }),
  ]);
  const account = accountResult.data as StaffAccount | null;
  const sessions = ((scheduleResult.data ?? []) as StaffSessionRow[]).map((session): StaffOverviewSession => ({
      id: session.class_session_id,
      name: classNames[session.class_type],
      startsAt: session.starts_at,
      instructor: session.instructor_name,
      confirmed: session.confirmed_reservations,
      capacity: session.capacity,
      waitlisted: session.waitlisted_reservations,
  }));
  const staffName = account ? `${account.first_name} ${account.last_name}` : user.email ?? "Staff member";
  const staffRole = account?.role === "owner_admin" ? "Owner / administrator" : account?.role === "instructor" ? "Instructor" : "Staff";

  return (
    <PortalShell
      audience="staff"
      eyebrow="Staff portal · Overview"
      title="Staff overview"
      description="Your authorized seven-day schedule."
      links={staffLinks}
      showHeader={false}
    >
      <StaffOverview
        dateLabel={dateFormatter.format(now)}
        todayKey={todayKey}
        staffName={staffName}
        staffRole={staffRole}
        sessions={sessions}
        scheduleError={Boolean(scheduleResult.error)}
        allowInstructorFilter={account?.role === "owner_admin"}
      />
    </PortalShell>
  );
}
