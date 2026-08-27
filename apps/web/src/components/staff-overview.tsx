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

function comparisonTone(change: number | null) {
  return change === null || change === 0 ? "neutral" : change > 0 ? "positive" : "negative";
}

export function StaffOverview({ staffName, staffRole, health, risks }: { staffName: string; staffRole: string; health: Health; risks: Risk[] }) {
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
  const threeMonthChange = seatsFilled !== null && threeMonthOccupancy !== null ? seatsFilled - threeMonthOccupancy : null;
  const priority = [...currentClasses].sort((a, b) => a.booked / Math.max(1, a.capacity) - b.booked / Math.max(1, b.capacity))[0];
  const priorityOccupancy = priority?.capacity ? Math.round(priority.booked / priority.capacity * 100) : null;
  const lowOccupancyClasses = currentClasses.filter((item) => item.capacity > 0 && item.booked / item.capacity < 0.7);
  const waitlistClasses = currentClasses.filter((item) => item.waitlisted > 0);
  const waitlistSeats = waitlistClasses.reduce((sum, item) => sum + item.waitlisted, 0);
  const atRiskMembers = risks.filter((risk) => risk.risk_level === "high").length;
  const selectedTeachers = health.monthly_teacher_performance?.find((item) => item.month === selected?.month)?.teachers ?? [];
  const previousTeachers = health.monthly_teacher_performance?.find((item) => item.month === previous?.month)?.teachers ?? [];

  return <div>
    <header className="rounded-3xl bg-[#171717] p-6 text-white shadow-[0_1.5rem_4rem_rgba(17,17,17,0.18)] sm:p-8"><p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#ff776f]">Owner dashboard</p><h1 className="route-title mt-4 text-5xl">Studio overview</h1><p className="mt-3 text-sm text-white/65">{staffName} · {staffRole}</p></header>

    <section className="mt-6 rounded-3xl border border-white/70 bg-white/68 p-5 shadow-[0_1rem_3rem_rgba(17,17,17,0.06)] backdrop-blur-xl sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Studio performance · {selected?.label ?? "Selected month"}</p>{months.length > 0 ? <label className="text-sm font-semibold text-black/70">Month<select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="ml-2 rounded-xl border border-white/80 bg-white/85 px-3 py-2 shadow-sm backdrop-blur-xl font-normal text-black outline-none"><option value="" disabled>Select a month</option>{months.map((month) => <option key={month.month} value={month.month}>{month.label}</option>)}</select></label> : null}</div>
      <div className="mt-4 grid gap-5 lg:grid-cols-[1.15fr_.85fr] lg:items-end">
        <div><p className={`text-6xl font-semibold tracking-tight ${seatsFilledChange === null ? "" : seatsFilledChange >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{seatsFilled === null ? "—" : `${seatsFilled}%`}</p><h2 className="mt-2 text-2xl font-semibold">Seats filled</h2><p className="mt-2 text-sm text-black/60">{totalBooked} bookings across {totalCapacity} seats offered.</p></div>
        <div className="grid gap-3 sm:grid-cols-2"><SummaryCard value={seatsFilledChange === null ? "—" : seatsFilledChange > 0 ? `↑ +${seatsFilledChange} pts` : seatsFilledChange < 0 ? `↓ ${Math.abs(seatsFilledChange)} pts` : "→ 0 pts"} label="Compared with last month" detail={previous ? previous.label : "No prior month available"} tone={comparisonTone(seatsFilledChange)} /><SummaryCard value={threeMonthChange === null ? "—" : threeMonthChange > 0 ? `↑ +${threeMonthChange} pts` : threeMonthChange < 0 ? `↓ ${Math.abs(threeMonthChange)} pts` : "→ 0 pts"} label="Compared with prior 3 months" detail={threeMonthOccupancy === null ? "No comparison yet" : `${threeMonthOccupancy}% average occupancy`} tone={comparisonTone(threeMonthChange)} /></div>
      </div>
    </section>

    <ActionQueue priority={priority} priorityOccupancy={priorityOccupancy} lowOccupancyClasses={lowOccupancyClasses} waitlistClasses={waitlistClasses} waitlistSeats={waitlistSeats} atRiskMembers={atRiskMembers} />

    <section className="mt-8">
      <div><p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Class performance</p><h2 className="mt-2 text-3xl font-semibold">Which classes are growing?</h2><p className="mt-2 text-sm text-black/60">Compare each format with the month before.</p></div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">{(["yoga", "cycling", "hiit"] as const).map((classType) => <ClassComparisonCard key={classType} classType={classType} current={currentClasses.find((item) => item.class_type === classType)} currentLabel={selected?.label} previous={previousClasses.find((item) => item.class_type === classType)} previousLabel={previous?.label} />)}</div>
    </section>

    <section className="mt-8 rounded-3xl border border-white/70 bg-white/68 p-5 shadow-[0_1rem_3rem_rgba(17,17,17,0.06)] backdrop-blur-xl sm:p-7"><p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Member health</p><h2 className="mt-2 text-2xl font-semibold">Current membership signals</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-black/60">Use these signals to add capacity where demand is highest, follow up before members leave, and protect membership revenue.</p><div className="mt-5 grid gap-4 sm:grid-cols-3"><SignalCard value={waitlistSeats} label="Members waitlisted" signal="Demand signal" detail={waitlistSeats ? `${waitlistClasses.map((item) => `${classLabels[item.class_type]}: ${item.waitlisted}`).join(" · ")}. Add seats or another session.` : "No unmet demand this month"} tone="demand" /><SignalCard value={health.memberships?.active ?? "—"} label="Active members" signal="Membership base" detail={health.memberships?.paused ? `${health.memberships.paused} memberships paused` : "Your current membership base"} tone="healthy" /><SignalCard value={atRiskMembers} label="Members at risk" signal="Retention alert" detail={atRiskMembers ? "Follow up before their next renewal to protect revenue." : "No high-risk members flagged"} tone="risk" /></div><p className="mt-4 text-xs text-black/45">Growth and churn comparisons will appear once membership history is available.</p></section>

    {months.length > 0 ? <section className="mt-8 overflow-hidden rounded-3xl border border-white/70 bg-white/68 p-5 shadow-[0_1rem_3rem_rgba(17,17,17,0.06)] backdrop-blur-xl sm:p-7"><div className="min-w-0"><p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Occupancy trends</p><h2 className="mt-2 break-words text-2xl font-semibold">Which class demand is improving?</h2><p className="mt-2 text-sm text-black/60">Compare monthly occupancy across Yoga, Cycling, and HIIT.</p></div><CombinedClassTrend months={months} /></section> : null}

    {selectedTeachers.length > 0 ? <TeacherPerformanceTable teachers={selectedTeachers} previousTeachers={previousTeachers} monthLabel={selected?.label ?? "Selected month"} /> : null}

    <p className="mt-6 text-xs text-black/40">{health.history_source ?? "Operational data"}. Occupancy is bookings divided by seats offered.</p>
  </div>;
}

function ClassComparisonCard({ classType, current, currentLabel, previous, previousLabel }: { classType: ClassType; current?: ClassPerformance; currentLabel?: string; previous?: ClassPerformance; previousLabel?: string }) {
  const currentOccupancy = current?.capacity ? Math.round(current.booked / current.capacity * 100) : null;
  const previousOccupancy = previous?.capacity ? Math.round(previous.booked / previous.capacity * 100) : null;
  const change = currentOccupancy !== null && previousOccupancy !== null ? currentOccupancy - previousOccupancy : null;
  const status = change === null ? "No comparison" : change > 0 ? `↑ ${change} ${change === 1 ? "point" : "points"} vs prior month` : change < 0 ? `↓ ${Math.abs(change)} ${Math.abs(change) === 1 ? "point" : "points"} vs prior month` : "No change vs prior month";
 const statusStyle = change === null || change === 0 ? "bg-black/5 text-black/55" : change > 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800";
  const accent = { yoga: "bg-violet-600", cycling: "bg-teal-600", hiit: "bg-rose-600" }[classType];

  return <article className="overflow-hidden rounded-3xl border border-white/80 bg-white/72 shadow-[0_1rem_3rem_rgba(17,17,17,0.08)] backdrop-blur-xl"><div className={`h-1.5 ${accent}`} /><div className="p-5 sm:p-6"><div className="flex items-start justify-between gap-3"><h3 className="text-2xl font-semibold">{classLabels[classType]}</h3><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyle}`}>{status}</span></div><div className="mt-8 grid grid-cols-2 gap-4"><div><p className="text-4xl font-semibold">{currentOccupancy === null ? "—" : `${currentOccupancy}%`}</p><p className="mt-1 text-sm text-black/55">{currentLabel ?? "Selected month"}</p></div><div className="border-l border-black/10 pl-4"><p className="text-4xl font-semibold text-black/45">{previousOccupancy === null ? "—" : `${previousOccupancy}%`}</p><p className="mt-1 text-sm text-black/55">{previousLabel ?? "Prior month"}</p></div></div><dl className="mt-7 grid grid-cols-3 gap-3 border-t border-black/10 pt-4 text-sm"><div><dt className="text-black/50">Booked / offered</dt><dd className="mt-1 font-semibold">{current ? `${current.booked}/${current.capacity}` : "—"}</dd></div><div><dt className="text-black/50">Cancelled</dt><dd className="mt-1 font-semibold">{current?.cancelled ?? "—"}</dd></div><div><dt className="text-black/50">Waitlist</dt><dd className="mt-1 font-semibold">{current?.waitlisted ?? "—"}</dd></div></dl></div></article>;
}

function SummaryCard({ value, label, detail, tone = "neutral" }: { value: string | number; label: string; detail: string; tone?: "positive" | "negative" | "neutral" | "attention" }) {
  const tones = { positive: "border-emerald-300/80 bg-emerald-50/90", negative: "border-rose-300/80 bg-rose-50/90", attention: "border-amber-300/80 bg-amber-50/90", neutral: "border-white/80 bg-white/72" };
  const valueTones = { positive: "text-emerald-700", negative: "text-rose-700", attention: "text-amber-800", neutral: "text-black" };
  return <article className={`rounded-3xl border p-5 shadow-[0_1rem_3rem_rgba(17,17,17,0.06)] backdrop-blur-xl ${tones[tone]}`}><p className={`text-3xl font-semibold ${valueTones[tone]}`}>{value}</p><h2 className="mt-2 font-semibold">{label}</h2><p className="mt-1 text-sm text-black/60">{detail}</p></article>;
}

function SignalCard({ value, label, signal, detail, tone }: { value: string | number; label: string; signal: string; detail: string; tone: "demand" | "healthy" | "risk" }) {
  const styles = {
    demand: { panel: "border-violet-300 bg-gradient-to-br from-violet-100 via-fuchsia-50 to-white", badge: "bg-violet-700", icon: "↗" },
    healthy: { panel: "border-teal-300 bg-gradient-to-br from-teal-100 via-cyan-50 to-white", badge: "bg-teal-700", icon: "●" },
    risk: { panel: "border-rose-300 bg-gradient-to-br from-rose-100 via-orange-50 to-white", badge: "bg-rose-700", icon: "!" },
  }[tone];
  return <article className={`relative overflow-hidden rounded-3xl border p-5 shadow-[0_1rem_3rem_rgba(17,17,17,0.08)] ${styles.panel}`}><div className={`absolute right-5 top-5 grid size-10 place-items-center rounded-2xl text-lg font-bold text-white shadow-lg ${styles.badge}`} aria-hidden="true">{styles.icon}</div><p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-black/50">{signal}</p><p className="mt-5 text-5xl font-semibold tracking-tight text-black">{value}</p><h3 className="mt-2 text-xl font-semibold">{label}</h3><p className="mt-3 pr-1 text-sm leading-6 text-black/65">{detail}</p></article>;
}

function ActionQueue({ priority, priorityOccupancy, lowOccupancyClasses, waitlistClasses, waitlistSeats, atRiskMembers }: { priority?: ClassPerformance; priorityOccupancy: number | null; lowOccupancyClasses: ClassPerformance[]; waitlistClasses: ClassPerformance[]; waitlistSeats: number; atRiskMembers: number }) {
  const actions = [
    priority && priorityOccupancy !== null ? { title: priorityOccupancy < 70 ? `Move ${classLabels[priority.class_type]} to a stronger time slot` : `Keep monitoring ${classLabels[priority.class_type]}`, detail: priorityOccupancy < 70 ? `${priorityOccupancy}% filled. Test a different time slot or targeted promotion next month.` : `${priorityOccupancy}% filled. It is the lowest-performing format, but still meeting the 70% target.`, tone: priorityOccupancy < 70 ? "warning" : "healthy", icon: priorityOccupancy < 70 ? "↗" : "✓" } : null,
    waitlistSeats > 0 ? { title: `Add capacity to ${classLabels[waitlistClasses.sort((a, b) => b.waitlisted - a.waitlisted)[0].class_type]}`, detail: `${waitlistSeats} members are waitlisted. Add seats or one extra session before creating a new format.`, tone: "demand", icon: "+" } : null,
    atRiskMembers > 0 ? { title: `Contact ${atRiskMembers} at-risk member${atRiskMembers === 1 ? "" : "s"}`, detail: "Schedule a personal follow-up before their next renewal window.", tone: "risk", icon: "!" } : null,
    lowOccupancyClasses.length > 1 ? { title: `${lowOccupancyClasses.length} formats below target`, detail: "Do not expand the schedule until these time slots improve.", tone: "warning", icon: "↓" } : null,
  ].filter(Boolean) as { title: string; detail: string; tone: "demand" | "risk" | "warning" | "healthy"; icon: string }[];
  const primary = actions[0];
  const supporting = actions.slice(1);
  const styles = { healthy: { panel: "border-teal-300 bg-teal-50/90", badge: "bg-teal-700", label: "On track" }, demand: { panel: "border-violet-300 bg-violet-50/90", badge: "bg-violet-700", label: "Demand" }, risk: { panel: "border-rose-300 bg-rose-50/90", badge: "bg-rose-700", label: "Retention" }, warning: { panel: "border-amber-300 bg-amber-50/90", badge: "bg-amber-700", label: "Attention" } };
  return <section className="mt-8 rounded-3xl border border-amber-300/70 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5 shadow-[0_1rem_3rem_rgba(17,17,17,0.06)] sm:p-7"><p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-amber-800">This month’s decision</p><h2 className="mt-2 text-2xl font-semibold">What should happen next?</h2>{primary ? <article className={`mt-5 rounded-3xl border p-5 shadow-[0_0.75rem_2rem_rgba(17,17,17,0.08)] ${styles[primary.tone].panel}`}><div className="flex items-start gap-4"><span className={`grid size-11 shrink-0 place-items-center rounded-2xl text-xl font-bold text-white ${styles[primary.tone].badge}`}>{primary.icon}</span><div><p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-black/50">{styles[primary.tone].label}</p><h3 className="mt-1 text-xl font-semibold">{primary.title}</h3><p className="mt-2 text-sm leading-6 text-black/65">{primary.detail}</p></div></div></article> : <p className="mt-4 rounded-2xl bg-white/80 p-5 text-sm text-black/65">No action needed this month.</p>}{supporting.length ? <div className="mt-5"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-black/45">Also watch</p><ul className="mt-3 grid gap-3 md:grid-cols-2">{supporting.map((action) => <li key={action.title} className={`rounded-2xl border p-4 shadow-sm ${styles[action.tone].panel}`}><div className="flex gap-3"><span className={`grid size-8 shrink-0 place-items-center rounded-xl text-sm font-bold text-white ${styles[action.tone].badge}`}>{action.icon}</span><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-black/50">{styles[action.tone].label}</p><h3 className="mt-1 font-semibold text-black">{action.title}</h3><p className="mt-1 text-sm leading-6 text-black/65">{action.detail}</p></div></div></li>)}</ul></div> : null}</section>;
}

function TeacherPerformanceTable({ teachers, previousTeachers, monthLabel }: { teachers: TeacherPerformance[]; previousTeachers: TeacherPerformance[]; monthLabel: string }) {
  const rankedTeachers = [...teachers].sort((a, b) => b.bookings / Math.max(1, b.capacity) - a.bookings / Math.max(1, a.capacity));
  const previousByName = new Map(previousTeachers.map((teacher) => [teacher.name, teacher]));
  return <section className="mt-8 rounded-3xl border border-white/70 bg-white/68 p-5 shadow-[0_1rem_3rem_rgba(17,17,17,0.06)] backdrop-blur-xl sm:p-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-black/45">Instructor session snapshot</p><h2 className="mt-2 text-2xl font-semibold">How are instructors doing?</h2><p className="mt-2 text-sm text-black/60">{monthLabel} · ranked by class occupancy and compared with the prior month.</p></div></div><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="border-b border-black/10 text-xs uppercase tracking-[0.1em] text-black/45"><tr><th className="pb-3 font-medium">Instructor</th><th className="pb-3 font-medium">Sessions</th><th className="pb-3 font-medium">Avg. occupancy</th><th className="pb-3 font-medium">Month change</th><th className="pb-3 font-medium">Attendance</th></tr></thead><tbody>{rankedTeachers.map((teacher) => { const occupancy = Math.round(teacher.bookings / Math.max(1, teacher.capacity) * 100); const previousTeacher = previousByName.get(teacher.name); const previousOccupancy = previousTeacher ? Math.round(previousTeacher.bookings / Math.max(1, previousTeacher.capacity) * 100) : null; const change = previousOccupancy === null ? null : occupancy - previousOccupancy; const changeStyle = change === null || change === 0 ? "bg-black/5 text-black/50" : change > 0 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"; const changeLabel = change === null ? "No comparison" : change === 0 ? "→ No change" : change > 0 ? `↑ ${change} pts` : `↓ ${Math.abs(change)} pts`; return <tr key={teacher.name} className="border-b border-black/5 last:border-0"><th className="py-4 font-semibold">{teacher.name}</th><td className="py-4">{teacher.classes_taught}</td><td className="py-4"><span className="font-semibold">{occupancy}%</span> <span className="text-black/45">({teacher.bookings}/{teacher.capacity})</span></td><td className="py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${changeStyle}`}>{changeLabel}</span></td><td className="py-4">{teacher.attendance_rate}%</td></tr>; })}</tbody></table></div></section>;
}

function CombinedClassTrend({ months }: { months: MonthlyClassPerformance[] }) {
  const classes: ClassType[] = ["yoga", "cycling", "hiit"];
  const colors = { yoga: "#7c3aed", cycling: "#0f766e", hiit: "#c72c25" };
  const values = classes.map((classType) => ({ classType, points: months.map((month) => month.classes.find((item) => item.class_type === classType) ?? { class_type: classType, booked: 0, capacity: 0, waitlisted: 0 }) }));
  const width = 760;
  const height = 350;
  const pad = { top: 38, right: 58, bottom: 34, left: 48 };
  const x = (index: number) => pad.left + index / Math.max(1, months.length - 1) * (width - pad.left - pad.right);
  const occupancy = (point: ClassPerformance) => point.capacity ? Math.round(point.booked / point.capacity * 100) : 0;
  const y = (value: number) => height - pad.bottom - value / 100 * (height - pad.top - pad.bottom);
  const smoothLine = (points: ClassPerformance[]) => {
    const coordinates = points.map((point, index) => ({ x: x(index), y: y(occupancy(point)) }));
    return coordinates.reduce((path, point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      const previous = coordinates[index - 1];
      const midpoint = (previous.x + point.x) / 2;
      return `${path} C ${midpoint} ${previous.y}, ${midpoint} ${point.y}, ${point.x} ${point.y}`;
    }, "");
  };

return <div className="mt-6"><svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Monthly occupancy trend for Yoga, Cycling, and HIIT."><rect x={pad.left} y={pad.top} width={width - pad.left - pad.right} height={height - pad.top - pad.bottom} rx="18" fill="rgba(248,248,248,.94)" stroke="rgba(17,17,17,.48)" strokeWidth="2.5" /><rect x={pad.left + 5} y={pad.top + 5} width={width - pad.left - pad.right - 10} height={height - pad.top - pad.bottom - 10} rx="13" fill="none" stroke="rgba(17,17,17,.14)" strokeWidth="1.25" />{[0, 50, 100].map((tick) => <g key={tick}><line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} stroke="rgba(0,0,0,.16)" strokeDasharray="4 6" strokeWidth="1.25" /><text x={pad.left - 8} y={y(tick) + 5} textAnchor="end" fontSize="13" fontWeight="600" fill="currentColor">{tick}%</text></g>)}{values.map((series) => <g key={series.classType}><path d={smoothLine(series.points)} fill="none" stroke={colors[series.classType]} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />{series.points.map((point, index) => <circle key={months[index].month} cx={x(index)} cy={y(occupancy(point))} r="4.5" fill={colors[series.classType]} stroke="white" strokeWidth="2.5"><title>{`${classLabels[series.classType]} · ${months[index].label}: ${occupancy(point)}% occupancy (${point.booked} of ${point.capacity} seats)`}</title></circle>)}{(() => { const last = series.points.at(-1)!; return <text x={x(series.points.length - 1) - 8} y={y(occupancy(last)) - 10} textAnchor="end" fontSize="13" fontWeight="700" fill={colors[series.classType]}>{`${classLabels[series.classType]} ${occupancy(last)}%`}</text>; })()}</g>)}{months.map((month, index) => <text key={month.month} x={x(index)} y={height - 10} textAnchor="middle" fontSize="13" fontWeight="600" fill="currentColor">{month.label.slice(0, 3)}</text>)}</svg><div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-black/70">{values.map((series) => { const last = occupancy(series.points.at(-1)!); const prior = occupancy(series.points.at(-2) ?? series.points.at(-1)!); const change = last - prior; return <span key={series.classType} className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 ${change > 0 ? "bg-emerald-100 text-emerald-800" : change < 0 ? "bg-rose-100 text-rose-800" : "bg-black/5 text-black/60"}`}><i className="inline-block size-3 rounded-full" style={{ backgroundColor: colors[series.classType] }} />{classLabels[series.classType]} <strong>{change > 0 ? `↑ ${change}` : change < 0 ? `↓ ${Math.abs(change)}` : "→ 0"} pts</strong></span>; })}</div><p className="mt-3 text-xs text-black/50">Green signals improvement; red signals a decline. Each point is booked seats divided by offered seats.</p></div>;
}
