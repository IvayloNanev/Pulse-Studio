export type PulsePolicy = {
  policy_key: string;
  category: string;
  question: string;
  answer: string;
};

export type PulseConversationTurn = {
  role: "member" | "assistant";
  text: string;
};

export type PulseMemberContext = {
  member_summary?: {
    member_name?: string;
    membership_status?: string;
    plan_name?: string;
    classes_per_month?: number;
    agreed_monthly_price?: number;
    classes_used?: number;
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
  schedule?: Array<{
    class_session_id?: string;
    class_type?: "yoga" | "cycling" | "hiit";
    class_type_label?: string;
    instructor_name?: string;
    starts_at?: string;
    ends_at?: string;
    available_spots?: number;
    is_full?: boolean;
  }>;
  availability?: {
    membership?: boolean;
    activity?: boolean;
    schedule?: boolean;
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
const studioDayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function studioDayKey(value: Date) {
  const parts = Object.fromEntries(studioDayFormatter.formatToParts(value).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

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

export function cleanAssistantText(value: string) {
  return value
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .trim();
}

export function isDeterministicMemberFactQuestion(question: string) {
  return /check[ -]?in|attendance|attended|last (class|workout)|most recent (class|workout)|credit|classes (left|available|used)|remaining|reservation|upcoming|next class|reserved class|booked|membership|my plan|plan status|account status|what do i pay|monthly price|membership price|schedule|today|tomorrow|available spots?|class.*full|who teaches|instructor/.test(question.toLowerCase());
}

export function resolvePulseFollowUpQuestion(question: string, conversation: PulseConversationTurn[]) {
  const normalized = question.trim();
  const needsPriorTopic = /^(what|how) about\b|^(and|then)\b|\b(it|that|those|them)\b/i.test(normalized);
  if (!needsPriorTopic) return normalized;
  const previousMemberQuestion = [...conversation]
    .reverse()
    .find((turn) => turn.role === "member" && turn.text.trim() && turn.text.trim() !== normalized)
    ?.text.trim();
  return previousMemberQuestion ? `${normalized} Follow-up topic: ${previousMemberQuestion}` : normalized;
}

export function answerGroundedPulseQuestion(question: string, policies: PulsePolicy[], context: PulseMemberContext | null) {
  const normalized = question.toLowerCase();
  const summary = context?.member_summary;
  const upcoming = context?.upcoming_reservations ?? [];
  const activity = context?.recent_activity ?? [];
  const stats = context?.activity_stats;
  const answers: string[] = [];
  const asksAboutAttendance = /check[ -]?ins?|attendance|classes (have i|i have) (done|attended)|classes? this month|workouts? this month/.test(normalized);
  const asksAboutRecentActivity = /last (class|workout)|most recent (class|workout)|when did i last/.test(normalized);
  const asksAboutCredits = /credit|classes left|classes available|classes .*available|remaining/.test(normalized)
    || (/how many classes/.test(normalized) && !asksAboutAttendance);
  const asksAboutReservations = /reservation|upcoming|next class|reserved class|booked/.test(normalized);
  const asksAboutMembership = /membership|my plan|plan status|account status/.test(normalized);
  const asksAboutPrice = /what do i pay|how much.*pay|monthly price|membership price|plan price|membership cost/.test(normalized);
  const asksAboutUsedCredits = /credits?.*(used|spent)|(?:used|spent).*credits?|classes used/.test(normalized);
  const asksAboutSchedule = /schedule|today|tomorrow|available spots?|class.*full|who teaches|instructor|what time/.test(normalized)
    && /class|schedule|yoga|cycling|hiit|spot|instructor/.test(normalized);

  if (asksAboutAttendance) {
    if (context?.availability?.activity === false) return unavailable("activity");
    const total = Number(stats?.total_check_ins ?? 0);
    const monthly = Number(stats?.classes_this_month ?? 0);
    answers.push(`You have ${total} total ${total === 1 ? "check-in" : "check-ins"}, including ${monthly} ${monthly === 1 ? "class" : "classes"} attended this month.`);
  }

  if (asksAboutRecentActivity) {
    if (context?.availability?.activity === false) return unavailable("activity");
    const latest = activity.find((entry) => entry.attendance_status === "attended" && entry.starts_at);
    answers.push(latest?.starts_at
      ? `Your most recent attended class this month was ${latest.class_type_label ?? "a class"}${latest.instructor_name ? ` with ${latest.instructor_name}` : ""} on ${studioDateFormatter.format(new Date(latest.starts_at))}.`
      : "I don’t see an attended class for you in the current month.");
  }

  if (asksAboutPrice) {
    if (context?.availability?.membership === false || !summary || summary.agreed_monthly_price === undefined) return unavailable("membership");
    answers.push(`Your agreed monthly price for ${summary.plan_name ?? "your Pulse Studio membership"} is $${summary.agreed_monthly_price.toFixed(2)}.`);
  }

  if (asksAboutUsedCredits) {
    if (context?.availability?.membership === false || !summary || summary.classes_used === undefined) return unavailable("membership");
    answers.push(`You have used ${summary.classes_used} ${summary.classes_used === 1 ? "credit" : "credits"} in your current billing cycle.`);
  }

  if (asksAboutCredits && !asksAboutUsedCredits && !asksAboutSchedule) {
    if (context?.availability?.membership === false || !summary) return unavailable("membership");
    answers.push(`You have ${summary.classes_remaining ?? 0} classes available and ${summary.classes_reserved ?? 0} currently reserved in your present billing cycle.`);
  }

  if (asksAboutReservations) {
    if (context?.availability?.membership === false) return unavailable("membership");
    const next = upcoming[0];
    answers.push(next?.starts_at
      ? `Your next ${next.reservation_status === "waitlisted" ? "waitlisted" : "reserved"} class is ${next.class_type_label ?? "class"}${next.instructor_name ? ` with ${next.instructor_name}` : ""} on ${studioDateFormatter.format(new Date(next.starts_at))}.`
      : "You do not currently have an upcoming reservation or waitlist entry.");
  }

  if (asksAboutMembership && !asksAboutCredits && !asksAboutPrice) {
    if (context?.availability?.membership === false || !summary) return unavailable("membership");
    answers.push(`Your ${summary.plan_name ?? "Pulse Studio"} membership is ${summary.membership_status ?? "available"}.${summary.billing_cycle_end_at ? ` Your current billing cycle ends ${studioDateFormatter.format(new Date(summary.billing_cycle_end_at))}.` : ""}`);
  }

  if (asksAboutSchedule) {
    if (context?.availability?.schedule === false) return "I can’t verify the current class schedule right now. Please open Classes and refresh; I won’t guess about live availability.";
    const now = new Date();
    const requestedDay = normalized.includes("tomorrow")
      ? studioDayKey(new Date(now.getTime() + 24 * 60 * 60 * 1000))
      : normalized.includes("today")
        ? studioDayKey(now)
        : undefined;
    const requestedClass = (["yoga", "cycling", "hiit"] as const).find((classType) => normalized.includes(classType));
    const matches = (context?.schedule ?? []).filter((session) => {
      if (!session.starts_at) return false;
      if (requestedDay && studioDayKey(new Date(session.starts_at)) !== requestedDay) return false;
      if (requestedClass && session.class_type !== requestedClass) return false;
      return true;
    });
    if (!matches.length) {
      answers.push(`I don’t see a matching ${requestedClass ? `${requestedClass.toUpperCase()} ` : ""}class in the current 14-day schedule${requestedDay ? ` for ${normalized.includes("tomorrow") ? "tomorrow" : "today"}` : ""}.`);
    } else {
      const descriptions = matches.slice(0, 3).map((session) => {
        const availability = session.is_full ? "full" : `${session.available_spots ?? 0} ${session.available_spots === 1 ? "spot" : "spots"} available`;
        return `${session.class_type_label ?? "Class"}${session.instructor_name ? ` with ${session.instructor_name}` : ""} on ${studioDateFormatter.format(new Date(session.starts_at!))} (${availability})`;
      });
      answers.push(`${descriptions.join("; ")}.`);
    }
  }

  if (answers.length > 0) return answers.join(" ");

  const queryWords = significantWords(question);
  const ranked = policies
    .map((policy) => ({ policy, score: [...queryWords].filter((word) => `${policy.question} ${policy.category}`.toLowerCase().includes(word)).length }))
    .sort((a, b) => b.score - a.score);
  return ranked[0]?.score > 0
    ? ranked[0].policy.answer
    : "I don’t have an approved answer for that yet. Try asking about your activity, classes, preparation, booking, cancellations, or membership policies.";
}
