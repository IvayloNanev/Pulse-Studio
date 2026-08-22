import { PublicPage } from "@/components/public-page";

const classes = [
  ["07:00", "Morning Flow", "Yoga", "45 min"],
  ["09:30", "Pulse Ride", "Cycling", "50 min"],
  ["12:15", "Core Interval", "HIIT", "40 min"],
  ["18:00", "Evening Reset", "Yoga", "60 min"],
];

export default function ClassesPage() {
  return (
    <PublicPage eyebrow="Weekly schedule" title="Move through the city." introduction="A preview of the Pulse Studio schedule. Live availability and reservation actions will come from the shared Supabase backend.">
      <section className="px-6 py-16 sm:px-10 lg:px-16 lg:py-24">
        <p className="mb-5 font-mono text-xs uppercase tracking-[0.2em] text-black/45">Monday · New York</p>
        <div className="border-t border-black/20">
          {classes.map(([time, name, type, duration]) => (
            <div key={`${time}-${name}`} className="grid gap-3 border-b border-black/20 py-7 md:grid-cols-[8rem_1.5fr_1fr_1fr] md:items-center">
              <span className="font-mono text-sm">{time}</span>
              <span className="text-2xl font-semibold tracking-[-0.035em]">{name}</span>
              <span className="text-sm text-black/55">{type}</span>
              <span className="text-sm text-black/55 md:text-right">{duration}</span>
            </div>
          ))}
        </div>
      </section>
    </PublicPage>
  );
}
