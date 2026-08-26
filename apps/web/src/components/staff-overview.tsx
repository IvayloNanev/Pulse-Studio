"use client";

import { useState } from "react";

type ClassType = "yoga" | "cycling" | "hiit";
type ClassPerformance = { class_type: ClassType; booked: number; capacity: number; waitlisted: number; cancelled?: number };
type MonthlyClassPerformance = { month: string; label: string; classes: ClassPerformance[] };
type TeacherPerformance = { name: string; classes_taught: number; bookings: number; capacity: number; attendance_rate: number; waitlist_seats?: number };
type MonthlyTeacherPerformance = { month: string; teachers: TeacherPerformance[] };
type Health = {
  history_source?: string;
  class_performance?: ClassPerformance[];
  monthly_class_performance?: MonthlyClassPerformance[];
  monthly_teacher_performance?: MonthlyTeacherPerformance[];
  weekly_history?: unknown[];
  scheduled_outlook?: unknown[];
  memberships?: { active?: number; paused?: number };
};
type Risk = { risk_level: "high" | "medium"; review_status: string };

const classLabels = { yoga: "Yoga", cycling: "Cycling", hiit: "HIIT" };

export function StaffOverview({ staffName, staffRole, health }: { staffName: string; staffRole: string; health: Health; risks: Risk[] }) {
  const months = health.monthly_class_performance ?? [];
  const [selectedMonth, setSelectedMonth] = useState(months.at(-1)?.month ?? "");
  const selectedIndex = Math.max(0, months.findIndex((month) => month.month === selectedMonth));
  const selected = months[selectedIndex];
  const previous = selectedIndex > 0 ? months[selectedIndex - 1] : undefined;
  const currentClasses = selected?.classes ?? health.class_performance ?? [];
  const previousClasses = previous?.classes ?? [];
  const totalBooked = currentClasses.reduce((sum, item) => sum + item.booked, 0);
  const totalCapacity = currentClasses.reduce((sum, item) => sum + item.capacity, 0);
  const previousBooked = previousClasses.reduce((sum, item) => sum + item.booked, 0);
  const previousCapacity = previousClasses.reduce((sum, item) => sum + item.capacity, 0);
  const seatsFilled = totalCapacity ? Math.round(totalBooked / totalCapacity * 100) : null;
  const previousSeatsFilled = previousCapacity ? Math.round(previousBooked / previousCapacity * 100) : null;
  const seatsFilledChange = seatsFilled !== null && previousSeatsFilled !== null ? seatsFilled - previousSeatsFilled : null;
  const threeMonthClasses = months.slice(Math.max(0, selectedIndex - 3), selectedIndex).flatMap((month) => month.classes);
  const threeMonthBooked = threeMonthClasses.reduce((sum, item) => sum + item.booked, 0);
  const threeMonthCapacity = threeMonthClasses.reduce((sum, item) => sum + item.capacity, 0);
  const threeMonthOccupancy = threeMonthCapacity ? Math.round(threeMonthBooked / threeMonthCapacity * 100) : null;
  const priority = [...currentClasses].sort((a, b) => a.booked / Math.max(1, a.capacity) - b.booked / Math.max(1, b.capacity))[0];
  const priorityOccupancy = priority?.capacity ? Math.round(priority.booked / priority.capacity * 100) : null;
  const selectedTeachers = health.monthly_teacher_performance?.find((item) => item.month === selected?.month)?.teachers ?? [];

  return <div className="mx-auto max-w-5xl">
    <header className="rounded-3xl bg-[#171717] p-6 text-white sm:p-8"><p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#ff776f]">Owner dashboard</p><h1 className="route-title mt-4 text-5xl">Studio overview</h1><p className="mt-3 text-sm text-white/65">{staffName} · {staffRole}</p></header>

    <section className="mt-6 rounded-3xl border border-black/10 bg-white/65 p-5 sm:p-7">
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Studio performance this month</p>
      <div className="mt-4 grid gap-5 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
        <div><p className="text-6xl font-semibold tracking-tight">{seatsFilled === null ? "—" : `${seatsFilled}%`}</p><h2 className="mt-2 text-2xl font-semibold">Seats filled</h2><p className="mt-2 text-sm text-black/60">{totalBooked} bookings across {totalCapacity} seats offered.</p></div>
        <div className="grid gap-3 sm:grid-cols-2"><SummaryCard value={seatsFilledChange === null ? "—" : `${seatsFilledChange >= 0 ? "+" : ""}${seatsFilledChange} pts`} label="Compared with last month" detail={previous ? previous.label : "No prior month available"} /><SummaryCard value={threeMonthOccupancy === null ? "—" : `${seatsFilled === null ? "" : seatsFilled - threeMonthOccupancy >= 0 ? "+" : ""}${seatsFilled === null ? "" : seatsFilled - threeMonthOccupancy} pts`} label="Compared with prior 3 months" detail={threeMonthOccupancy === null ? "No comparison yet" : `${threeMonthOccupancy}% average occupancy`} /></div>
      </div>
    </section>

    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Class performance</p><h2 className="mt-2 text-3xl font-semibold">Which classes are growing?</h2><p className="mt-2 text-sm text-black/60">Compare each format with the month before.</p></div>{months.length > 0 ? <label className="text-sm font-semibold text-black/70">Month<select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="ml-3 rounded-xl border border-black/15 bg-white px-3 py-2 font-normal text-black outline-none"><option value="" disabled>Select a month</option>{months.map((month) => <option key={month.month} value={month.month}>{month.label}</option>)}</select></label> : null}</div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">{(["yoga", "cycling", "hiit"] as const).map((classType) => <ClassComparisonCard key={classType} classType={classType} current={currentClasses.find((item) => item.class_type === classType)} previous={previousClasses.find((item) => item.class_type === classType)} previousLabel={previous?.label} />)}</div>
    </section>

    <NeedsAttention priority={priority} priorityOccupancy={priorityOccupancy} />

    {months.length > 0 ? <section className="mt-8 rounded-3xl border border-black/10 bg-white/65 p-5 sm:p-7"><div><p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Booking trends</p><h2 className="mt-2 text-2xl font-semibold">How is class demand changing?</h2><p className="mt-2 text-sm text-black/60">Compare demand across Yoga, Cycling, and HIIT.</p></div><CombinedClassTrend months={months} /></section> : null}

    {selectedTeachers.length > 0 ? <TeacherPerformanceTable teachers={selectedTeachers} monthLabel={selected?.label ?? "Selected month"} /> : null}

    <p className="mt-6 text-xs text-black/40">{health.history_source ?? "Operational data"}. Occupancy is bookings divided by seats offered.</p>
  </div>;
}

function ClassComparisonCard({ classType, current, previous, previousLabel }: { classType: ClassType; current?: ClassPerformance; previous?: ClassPerformance; previousLabel?: string }) {
  const currentOccupancy = current?.capacity ? Math.round(current.booked / current.capacity * 100) : null;
  const previousOccupancy = previous?.capacity ? Math.round(previous.booked / previous.capacity * 100) : null;
  const change = currentOccupancy !== null && previousOccupancy !== null ? currentOccupancy - previousOccupancy : null;
  const status = change === null ? "No comparison" : change > 0 ? `Up ${change} ${change === 1 ? "point" : "points"}` : change < 0 ? `Down ${Math.abs(change)} ${Math.abs(change) === 1 ? "point" : "points"}` : "No change";
  const statusStyle = change === null || change === 0 ? "bg-black/5 text-black/55" : change > 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800";

  return <article className="rounded-3xl border border-black/10 bg-white/65 p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><h3 className="text-2xl font-semibold">{classLabels[classType]}</h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle}`}>{status}</span></div><div className="mt-8 grid grid-cols-2 gap-4"><div><p className="text-4xl font-semibold">{currentOccupancy === null ? "—" : `${currentOccupancy}%`}</p><p className="mt-1 text-sm text-black/55">Selected month</p></div><div className="border-l border-black/10 pl-4"><p className="text-4xl font-semibold text-black/45">{previousOccupancy === null ? "—" : `${previousOccupancy}%`}</p><p className="mt-1 text-sm text-black/55">{previousLabel ?? "Prior month"}</p></div></div><dl className="mt-7 grid grid-cols-3 gap-3 border-t border-black/10 pt-4 text-sm"><div><dt className="text-black/50">Booked / offered</dt><dd className="mt-1 font-semibold">{current ? `${current.booked}/${current.capacity}` : "—"}</dd></div><div><dt className="text-black/50">Cancelled</dt><dd className="mt-1 font-semibold">{current?.cancelled ?? "—"}</dd></div><div><dt className="text-black/50">Waitlist</dt><dd className="mt-1 font-semibold">{current?.waitlisted ?? "—"}</dd></div></dl></article>;
}

function SummaryCard({ value, label, detail, emphasis = false }: { value: string | number; label: string; detail: string; emphasis?: boolean }) {
  return <article className={`rounded-3xl border p-5 ${emphasis ? "border-[#c72c25]/40 bg-[#c72c25]/8" : "border-black/10 bg-white/65"}`}><p className="text-3xl font-semibold">{value}</p><h2 className="mt-2 font-semibold">{label}</h2><p className="mt-1 text-sm text-black/60">{detail}</p></article>;
}

function NeedsAttention({ priority, priorityOccupancy }: { priority?: ClassPerformance; priorityOccupancy: number | null }) {
  const needsReview = priority && priorityOccupancy !== null && priorityOccupancy < 70;
  const title = needsReview ? `Review ${classLabels[priority.class_type]}` : "Keep the current schedule";
  const detail = needsReview
    ? `${classLabels[priority.class_type]} is at ${priorityOccupancy}% occupancy, below the 70% target. Review its next time slot before adding more sessions.`
    : "Every class is meeting the 70% occupancy target. Keep monitoring demand before changing the schedule.";
  return <section className="mt-8 rounded-3xl border border-[#c72c25]/25 bg-[#c72c25]/5 p-5 sm:p-7"><p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#a82a24]">Next action</p><h2 className="mt-2 text-2xl font-semibold">What should I do next?</h2><article className="mt-4 rounded-2xl bg-white/75 p-5"><h3 className="text-lg font-semibold">{title}</h3><p className="mt-1 max-w-2xl text-sm leading-6 text-black/65">{detail}</p></article></section>;
}

function TeacherPerformanceTable({ teachers, monthLabel }: { teachers: TeacherPerformance[]; monthLabel: string }) {
  const rankedTeachers = [...teachers].sort((a, b) => b.bookings / Math.max(1, b.capacity) - a.bookings / Math.max(1, a.capacity));
  return <section className="mt-8 rounded-3xl border border-black/10 bg-white/65 p-5 sm:p-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Teacher performance</p><h2 className="mt-2 text-2xl font-semibold">How are instructors doing?</h2><p className="mt-2 text-sm text-black/60">{monthLabel} · ranked by class occupancy.</p></div></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b border-black/10 text-xs uppercase tracking-[0.1em] text-black/45"><tr><th className="pb-3 font-medium">Instructor</th><th className="pb-3 font-medium">Sessions</th><th className="pb-3 font-medium">Avg. occupancy</th><th className="pb-3 font-medium">Attendance</th><th className="pb-3 font-medium">Waitlist seats</th></tr></thead><tbody>{rankedTeachers.map((teacher) => { const occupancy = Math.round(teacher.bookings / Math.max(1, teacher.capacity) * 100); return <tr key={teacher.name} className="border-b border-black/5 last:border-0"><th className="py-4 font-semibold">{teacher.name}</th><td className="py-4">{teacher.classes_taught}</td><td className="py-4"><span className="font-semibold">{occupancy}%</span> <span className="text-black/45">({teacher.bookings}/{teacher.capacity})</span></td><td className="py-4">{teacher.attendance_rate}%</td><td className="py-4">{teacher.waitlist_seats ?? "—"}</td></tr>; })}</tbody></table></div></section>;
}

function CombinedClassTrend({ months }: { months: MonthlyClassPerformance[] }) {
  const classes: ClassType[] = ["yoga", "cycling", "hiit"];
  const colors = { yoga: "#7c3aed", cycling: "#0f766e", hiit: "#c72c25" };
  const values = classes.map((classType) => ({ classType, points: months.map((month) => month.classes.find((item) => item.class_type === classType) ?? { class_type: classType, booked: 0, capacity: 0, waitlisted: 0 }) }));
  const width = 760;
  const height = 290;
  const pad = { top: 24, right: 58, bottom: 34, left: 48 };
  const bookingMax = Math.max(1, ...values.flatMap((series) => series.points.map((point) => point.booked)));
  const x = (index: number) => pad.left + index / Math.max(1, months.length - 1) * (width - pad.left - pad.right);
  const y = (value: number, max: number) => height - pad.bottom - value / max * (height - pad.top - pad.bottom);
  const line = (points: ClassPerformance[]) => points.map((point, index) => `${x(index)},${y(point.booked, bookingMax)}`).join(" ");

  return <div className="mt-6"><svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Combined booking trend for Yoga, Cycling, and HIIT"><rect x={pad.left} y={pad.top} width={width - pad.left - pad.right} height={height - pad.top - pad.bottom} fill="none" stroke="rgba(0,0,0,.16)" /><line x1={pad.left} x2={width - pad.right} y1={height / 2} y2={height / 2} stroke="rgba(0,0,0,.08)" strokeDasharray="4 5" /><text x="6" y={pad.top + 4} fontSize="12" fill="currentColor">Bookings</text>{values.map((series) => <g key={series.classType}><polyline points={line(series.points)} fill="none" stroke={colors[series.classType]} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />{series.points.map((point, index) => <circle key={months[index].month} cx={x(index)} cy={y(point.booked, bookingMax)} r="3.5" fill={colors[series.classType]}><title>{`${classLabels[series.classType]} · ${months[index].label}: ${point.booked} bookings`}</title></circle>)}</g>)}{months.map((month, index) => <text key={month.month} x={x(index)} y={height - 10} textAnchor="middle" fontSize="12" fill="currentColor">{month.label.slice(0, 3)}</text>)}</svg><div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-black/65">{classes.map((classType) => <span key={classType}><i className="mr-1 inline-block size-2 rounded-full" style={{ backgroundColor: colors[classType] }} />{classLabels[classType]}</span>)}<span className="text-black/45">Peak {bookingMax} bookings</span></div></div>;
}
