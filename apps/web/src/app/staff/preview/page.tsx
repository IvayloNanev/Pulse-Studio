import { notFound } from "next/navigation";

import { PortalShell } from "@/components/portal-shell";
import { StaffOverview } from "@/components/staff-overview";
import { staffPreviewLinks } from "@/lib/staff-preview-navigation";

const history = Array.from({ length: 26 }, (_, index) => ({ date: new Date(Date.UTC(2026, 1, 23 + index * 7)).toISOString().slice(0, 10), booked: 126 + index * 3 + (index % 3) * 4, capacity: 252 + (index % 4) * 8, attended: 114 + index * 3 + (index % 3) * 3, no_show: 7 + index % 4 }));
const outlook = Array.from({ length: 4 }, (_, index) => ({ date: new Date(Date.UTC(2026, 7, 24 + index * 7)).toISOString().slice(0, 10), booked: 108 + index * 8, capacity: 254 }));

const monthlyClassPerformance = [
  { month: "2026-03", label: "March 2026", classes: [{ class_type: "yoga" as const, booked: 68, capacity: 120, waitlisted: 1, cancelled: 6 }, { class_type: "cycling" as const, booked: 59, capacity: 110, waitlisted: 1, cancelled: 4 }, { class_type: "hiit" as const, booked: 61, capacity: 96, waitlisted: 0, cancelled: 5 }] },
  { month: "2026-04", label: "April 2026", classes: [{ class_type: "yoga" as const, booked: 73, capacity: 120, waitlisted: 1, cancelled: 5 }, { class_type: "cycling" as const, booked: 64, capacity: 110, waitlisted: 2, cancelled: 5 }, { class_type: "hiit" as const, booked: 64, capacity: 96, waitlisted: 1, cancelled: 4 }] },
  { month: "2026-05", label: "May 2026", classes: [{ class_type: "yoga" as const, booked: 82, capacity: 120, waitlisted: 2, cancelled: 7 }, { class_type: "cycling" as const, booked: 69, capacity: 110, waitlisted: 2, cancelled: 4 }, { class_type: "hiit" as const, booked: 66, capacity: 96, waitlisted: 1, cancelled: 6 }] },
  { month: "2026-06", label: "June 2026", classes: [{ class_type: "yoga" as const, booked: 88, capacity: 120, waitlisted: 3, cancelled: 4 }, { class_type: "cycling" as const, booked: 72, capacity: 110, waitlisted: 3, cancelled: 5 }, { class_type: "hiit" as const, booked: 70, capacity: 96, waitlisted: 1, cancelled: 4 }] },
  { month: "2026-07", label: "July 2026", classes: [{ class_type: "yoga" as const, booked: 84, capacity: 120, waitlisted: 2, cancelled: 6 }, { class_type: "cycling" as const, booked: 73, capacity: 110, waitlisted: 3, cancelled: 3 }, { class_type: "hiit" as const, booked: 68, capacity: 96, waitlisted: 1, cancelled: 5 }] },
  { month: "2026-08", label: "August 2026", classes: [{ class_type: "yoga" as const, booked: 78, capacity: 120, waitlisted: 2, cancelled: 8 }, { class_type: "cycling" as const, booked: 86, capacity: 110, waitlisted: 4, cancelled: 4 }, { class_type: "hiit" as const, booked: 67, capacity: 96, waitlisted: 1, cancelled: 6 }] },
];

const monthlyTeacherPerformance = [
  { month: "2026-03", teachers: [{ name: "Aisha Brooks", classes_taught: 10, bookings: 64, capacity: 100, attendance_rate: 91 }, { name: "Daniel Kim", classes_taught: 9, bookings: 58, capacity: 90, attendance_rate: 89 }, { name: "Mina Patel", classes_taught: 8, bookings: 52, capacity: 80, attendance_rate: 92 }] },
  { month: "2026-04", teachers: [{ name: "Aisha Brooks", classes_taught: 10, bookings: 69, capacity: 100, attendance_rate: 92 }, { name: "Daniel Kim", classes_taught: 9, bookings: 62, capacity: 90, attendance_rate: 90 }, { name: "Mina Patel", classes_taught: 8, bookings: 56, capacity: 80, attendance_rate: 93 }] },
  { month: "2026-05", teachers: [{ name: "Aisha Brooks", classes_taught: 10, bookings: 76, capacity: 100, attendance_rate: 91 }, { name: "Daniel Kim", classes_taught: 9, bookings: 67, capacity: 90, attendance_rate: 91 }, { name: "Mina Patel", classes_taught: 8, bookings: 60, capacity: 80, attendance_rate: 94 }] },
  { month: "2026-06", teachers: [{ name: "Aisha Brooks", classes_taught: 10, bookings: 81, capacity: 100, attendance_rate: 94 }, { name: "Daniel Kim", classes_taught: 9, bookings: 71, capacity: 90, attendance_rate: 92 }, { name: "Mina Patel", classes_taught: 8, bookings: 63, capacity: 80, attendance_rate: 95 }] },
  { month: "2026-07", teachers: [{ name: "Aisha Brooks", classes_taught: 10, bookings: 78, capacity: 100, attendance_rate: 92 }, { name: "Daniel Kim", classes_taught: 9, bookings: 72, capacity: 90, attendance_rate: 91 }, { name: "Mina Patel", classes_taught: 8, bookings: 61, capacity: 80, attendance_rate: 94 }] },
  { month: "2026-08", teachers: [{ name: "Aisha Brooks", classes_taught: 10, bookings: 77, capacity: 100, attendance_rate: 93 }, { name: "Daniel Kim", classes_taught: 9, bookings: 79, capacity: 90, attendance_rate: 94 }, { name: "Mina Patel", classes_taught: 8, bookings: 60, capacity: 80, attendance_rate: 95 }] },
];

export default function StaffPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PortalShell audience="staff" eyebrow="Staff portal · Overview" title="Studio overview" description="Representative business-health data." links={staffPreviewLinks} showHeader={false}><div role="status" className="mb-6 rounded-2xl bg-black px-5 py-4 text-sm text-white"><strong>Local preview mode.</strong> Representative data only; no changes are saved.</div><StaffOverview staffName="Ivaylo Nanev" staffRole="Owner / administrator" health={{ weekly_history: history, scheduled_outlook: outlook, class_performance: monthlyClassPerformance.at(-1)?.classes, monthly_class_performance: monthlyClassPerformance, monthly_teacher_performance: monthlyTeacherPerformance, memberships: { active: 48, paused: 4 }, history_source: "Representative month-over-month demonstration data" }} risks={[{ risk_level: "high", review_status: "pending" }, { risk_level: "medium", review_status: "in_progress" }]} /></PortalShell>;
}
