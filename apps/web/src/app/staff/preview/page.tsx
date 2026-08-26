import { notFound } from "next/navigation";

import { PortalShell } from "@/components/portal-shell";
import { StaffOverview, type StaffOverviewSession } from "@/components/staff-overview";
import { staffPreviewLinks } from "@/lib/staff-preview-navigation";

const dateFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric", year: "numeric" });
const dayPartsFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" });
const offsetFormatter = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", timeZoneName: "shortOffset" });

function representativeSessions(now: Date): StaffOverviewSession[] {
  const parts = Object.fromEntries(dayPartsFormatter.formatToParts(now).map((part) => [part.type, part.value]));
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const offsetName = offsetFormatter.formatToParts(now).find((part) => part.type === "timeZoneName")?.value ?? "GMT-5";
  const offsetHours = offsetName.replace("GMT", "");
  const offset = `${offsetHours.startsWith("-") ? "-" : "+"}${offsetHours.replace(/[+-]/, "").padStart(2, "0")}:00`;
  const atDay = (dayOffset: number, time: string) => {
    const dayDate = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const dayParts = Object.fromEntries(dayPartsFormatter.formatToParts(dayDate).map((part) => [part.type, part.value]));
    return `${dayParts.year}-${dayParts.month}-${dayParts.day}T${time}:00${offset}`;
  };
  return [
    { id: "preview-flow", name: "Studio Flow", startsAt: `${date}T08:00:00${offset}`, instructor: "Maya Chen", confirmed: 11, capacity: 16, waitlisted: 0 },
    { id: "preview-ride", name: "Pulse Ride", startsAt: `${date}T12:30:00${offset}`, instructor: "Jordan Lee", confirmed: 14, capacity: 18, waitlisted: 0 },
    { id: "preview-interval", name: "Power Interval", startsAt: `${date}T18:00:00${offset}`, instructor: "Jordan Lee", confirmed: 16, capacity: 16, waitlisted: 3 },
    { id: "preview-next-flow", name: "Studio Flow", startsAt: atDay(1, "09:00"), instructor: "Maya Chen", confirmed: 10, capacity: 16, waitlisted: 0 },
    { id: "preview-next-ride", name: "Pulse Ride", startsAt: atDay(2, "17:30"), instructor: "Jordan Lee", confirmed: 15, capacity: 18, waitlisted: 0 },
    { id: "preview-next-hiit", name: "Power Interval", startsAt: atDay(4, "18:00"), instructor: "Jordan Lee", confirmed: 13, capacity: 16, waitlisted: 0 },
  ];
}

export default function StaffPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const now = new Date();

  return (
    <PortalShell audience="staff" eyebrow="Staff portal · Overview" title="Staff overview" description="Your authorized seven-day schedule." links={staffPreviewLinks} showHeader={false}>
      <StaffOverview
        preview
        dateLabel={dateFormatter.format(now)}
        todayKey={dayPartsFormatter.format(now)}
        staffName="Ivaylo Nanev"
        staffRole="Owner / administrator"
        sessions={representativeSessions(now)}
        allowInstructorFilter
      />
    </PortalShell>
  );
}
