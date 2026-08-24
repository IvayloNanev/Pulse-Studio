export type PulsePolicy = {
  policy_key: string;
  category: string;
  question: string;
  answer: string;
};

export type PulseMemberContext = {
  member_summary?: {
    member_name?: string;
    membership_status?: string;
    plan_name?: string;
    classes_remaining?: number;
    classes_reserved?: number;
    billing_cycle_end_at?: string;
  };
  upcoming_reservations?: Array<{
    class_type_label?: string;
    instructor_name?: string;
    starts_at?: string;
    reservation_status?: string;
  }>;
  activity_stats?: {
    total_check_ins?: number;
    classes_this_month?: number;
  } | null;
  recent_activity?: Array<{
    attendance_status?: "attended" | "no_show" | null;
    class_type_label?: string;
    instructor_name?: string;
    starts_at?: string;
  }>;
  availability?: {
    membership?: boolean;
    activity?: boolean;
  };
};

const studioDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  weekday: "long",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const policyStopWords = new Set([
  "about",
  "are",
  "can",
  "could",
  "does",
  "how",
  "please",
  "tell",
  "that",
  "the",
  "this",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
  "you",
  "your",
]);

function significantWords(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 2 && !policyStopWords.has(word)),
  );
}

function unavailable(subject: "membership" | "activity") {
  return `I can’t verify your ${subject} information right now. Please refresh and try again; I won’t guess when your live data is unavailable.`;
}

export function answerGroundedPulseQuestion(question: string, policies: PulsePolicy[], context: PulseMemberContext | null) {
  const normalized = question.toLowerCase();
  const summary = context?.member_summary;
  const upcoming = context?.upcoming_reservations ?? [];
  const activity = context?.recent_activity ?? [];
  const stats = context?.activity_stats;

  if (/check[ -]?ins?|attendance|classes (have i|i have) (done|attended)|classes? this month|workouts? this month/.test(normalized)) {
    if (context?.availability?.activity === false) return unavailable("activity");
    const total = Number(stats?.total_check_ins ?? 0);
    const monthly = Number(stats?.classes_this_month ?? 0);
    return `You have ${total} total ${total === 1 ? "check-in" : "check-ins"}, including ${monthly} ${monthly === 1 ? "class" : "classes"} attended this month.`;
  }

  if (/last (class|workout)|most recent (class|workout)|when did i last/.test(normalized)) {
    if (context?.availability?.activity === false) return unavailable("activity");
    const latest = activity.find((entry) => entry.attendance_status === "attended" && entry.starts_at);
    return latest?.starts_at
      ? `Your most recent attended class this month was ${latest.class_type_label ?? "a class"}${latest.instructor_name ? ` with ${latest.instructor_name}` : ""} on ${studioDateFormatter.format(new Date(latest.starts_at))}.`
      : "I don’t see an attended class for you in the current month.";
  }

  if (/credit|classes left|remaining/.test(normalized)) {
    if (context?.availability?.membership === false || !summary) return unavailable("membership");
    return `You have ${summary.classes_remaining ?? 0} classes available and ${summary.classes_reserved ?? 0} currently reserved in your present billing cycle.`;
  }

  if (/reservation|upcoming|next class|booked/.test(normalized)) {
    if (context?.availability?.membership === false) return unavailable("membership");
    const next = upcoming[0];
    return next?.starts_at
      ? `Your next ${next.reservation_status === "waitlisted" ? "waitlisted" : "reserved"} class is ${next.class_type_label ?? "class"}${next.instructor_name ? ` with ${next.instructor_name}` : ""} on ${studioDateFormatter.format(new Date(next.starts_at))}.`
      : "You do not currently have an upcoming reservation or waitlist entry.";
  }

  if (/membership|my plan|plan status|account status/.test(normalized)) {
    if (context?.availability?.membership === false || !summary) return unavailable("membership");
    return `Your ${summary.plan_name ?? "Pulse Studio"} membership is ${summary.membership_status ?? "available"}.${summary.billing_cycle_end_at ? ` Your current billing cycle ends ${studioDateFormatter.format(new Date(summary.billing_cycle_end_at))}.` : ""}`;
  }

  const queryWords = significantWords(question);
  const ranked = policies
    .map((policy) => ({ policy, score: [...queryWords].filter((word) => `${policy.question} ${policy.category}`.toLowerCase().includes(word)).length }))
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.score > 0
    ? ranked[0].policy.answer
    : "I don’t have an approved answer for that yet. Try asking about your activity, classes, preparation, booking, cancellations, or membership policies.";
}
