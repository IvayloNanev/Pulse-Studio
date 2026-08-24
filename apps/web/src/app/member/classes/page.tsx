import { MemberDashboard, type MemberDashboardReservation, type MemberDashboardSession, type MemberDashboardSummary } from "@/components/member-dashboard";
import { MemberStatusMessage } from "@/components/member-status-message";
import { PortalShell } from "@/components/portal-shell";
import { requireMember } from "@/lib/auth";
import { newYorkMonthDays, newYorkMonthWindow, newYorkDateParts } from "@/lib/member-calendar";
import { memberLinks } from "@/lib/member-navigation";

export default async function MemberClassesPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string; day?: string; class?: string; instructor?: string }> }) {
  const { supabase } = await requireMember();
  const params = await searchParams;
  const now = new Date();
  const currentMonth = newYorkDateParts(now);
  const monthLabel = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "long", year: "numeric" }).format(now);
  const calendarDays = newYorkMonthDays(now);
  const { startsAt: monthStartsAt, endsAt: monthEndsAt } = newYorkMonthWindow(currentMonth.year, currentMonth.month);
  const [{ data: dashboardData, error: dashboardError }, { data: scheduleData, error: scheduleError }, { data: reservationData, error: reservationError }] = await Promise.all([
    supabase.rpc("member_dashboard", { p_as_of: now.toISOString() }),
    supabase.from("public_class_schedule").select("class_session_id,class_type,class_type_label,starts_at,ends_at,capacity,confirmed_reservations,waitlisted_reservations,available_spots,is_full,instructor_name").gte("starts_at", monthStartsAt.toISOString()).lt("starts_at", monthEndsAt.toISOString()).order("starts_at", { ascending: true }),
    supabase.rpc("member_reservations", { p_from: now.toISOString() }),
  ]);
  const dashboard = dashboardData?.[0] as MemberDashboardSummary | undefined;

  return <PortalShell audience="member" eyebrow="Member portal" title="Classes" description="Find and reserve your next class." links={memberLinks} showHeader={false}>
    <MemberStatusMessage success={params.success} error={params.error} />
    <MemberDashboard calendarDays={calendarDays} dataFetchedAt={now.toISOString()} eligibilityError={dashboardError || !dashboard ? "Your booking eligibility could not be verified." : undefined} initialClassType={params.class} initialDay={params.day} initialInstructor={params.instructor} monthLabel={monthLabel} summary={dashboard} sessions={(scheduleData ?? []) as MemberDashboardSession[]} reservations={(reservationData ?? []) as MemberDashboardReservation[]} scheduleError={scheduleError ? "The current class schedule is temporarily unavailable. Refresh and try again." : undefined} reservationError={reservationError ? "Your reservations could not be verified. Refresh before booking or managing a reservation." : undefined} />
  </PortalShell>;
}
