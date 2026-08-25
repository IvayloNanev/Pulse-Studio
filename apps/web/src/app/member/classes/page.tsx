import { MemberDashboard, type MemberDashboardReservation, type MemberDashboardSession, type MemberDashboardSummary } from "@/components/member-dashboard";
import { MemberStatusMessage } from "@/components/member-status-message";
import { PortalShell } from "@/components/portal-shell";
import { requireMember } from "@/lib/auth";
import { newYorkMonthDays, newYorkMonthWindow, newYorkDateParts } from "@/lib/member-calendar";
import { memberLinks } from "@/lib/member-navigation";

export default async function MemberClassesPage({ searchParams }: { searchParams: Promise<{ success?: string; error?: string; month?: string; day?: string; class?: string; instructor?: string }> }) {
  const { supabase } = await requireMember();
  const params = await searchParams;
  const now = new Date();
  const currentMonth = newYorkDateParts(now);
  const monthMatch = params.month?.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
  const viewedYear = monthMatch ? Number(monthMatch[1]) : currentMonth.year;
  const viewedMonthNumber = monthMatch ? Number(monthMatch[2]) : currentMonth.month;
  const viewedMonthDate = new Date(Date.UTC(viewedYear, viewedMonthNumber - 1, 15, 12));
  const viewedMonth = `${viewedYear}-${String(viewedMonthNumber).padStart(2, "0")}`;
  const currentMonthKey = `${currentMonth.year}-${String(currentMonth.month).padStart(2, "0")}`;
  const adjacentMonth = (offset: number) => {
    const date = new Date(Date.UTC(viewedYear, viewedMonthNumber - 1 + offset, 1, 12));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  };
  const monthLabel = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", year: "numeric" }).format(viewedMonthDate);
  const calendarDays = newYorkMonthDays(viewedMonthDate);
  const { startsAt: monthStartsAt, endsAt: monthEndsAt } = newYorkMonthWindow(viewedYear, viewedMonthNumber);
  const [{ data: dashboardData, error: dashboardError }, { data: scheduleData, error: scheduleError }, { data: reservationData, error: reservationError }] = await Promise.all([
    supabase.rpc("member_dashboard", { p_as_of: now.toISOString() }),
    supabase.from("public_class_schedule").select("class_session_id,class_type,class_type_label,starts_at,ends_at,capacity,confirmed_reservations,waitlisted_reservations,available_spots,is_full,instructor_name").gte("starts_at", monthStartsAt.toISOString()).lt("starts_at", monthEndsAt.toISOString()).order("starts_at", { ascending: true }),
    supabase.rpc("member_reservations", { p_from: now.toISOString() }),
  ]);
  const dashboard = dashboardData?.[0] as MemberDashboardSummary | undefined;

  return <PortalShell audience="member" eyebrow="Member portal" title="Classes" description="Find and reserve your next class." links={memberLinks} showHeader={false}>
    <MemberStatusMessage success={params.success} error={params.error} />
    <MemberDashboard calendarDays={calendarDays} currentMonth={currentMonthKey} dataFetchedAt={now.toISOString()} eligibilityError={dashboardError || !dashboard ? "Your booking eligibility could not be verified." : undefined} initialClassType={params.class} initialDay={params.day} initialInstructor={params.instructor} monthLabel={monthLabel} nextMonth={adjacentMonth(1)} previousMonth={adjacentMonth(-1)} viewedMonth={viewedMonth} summary={dashboard} sessions={(scheduleData ?? []) as MemberDashboardSession[]} reservations={(reservationData ?? []) as MemberDashboardReservation[]} scheduleError={scheduleError ? "The current class schedule is temporarily unavailable. Refresh and try again." : undefined} reservationError={reservationError ? "Your reservations could not be verified. Refresh before booking or managing a reservation." : undefined} />
  </PortalShell>;
}
