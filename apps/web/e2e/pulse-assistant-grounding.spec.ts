import { expect, test } from "@playwright/test";

import {
  answerGroundedPulseQuestion,
  cleanAssistantText,
  resolvePulseFollowUpQuestion,
  type PulseMemberContext,
  type PulsePolicy,
} from "../src/lib/pulse-assistant-grounding";

const policies: PulsePolicy[] = [
  {
    policy_key: "late-cancellation",
    category: "cancellations",
    question: "What is the cancellation policy?",
    answer: "Cancel at least 12 hours before class to have an eligible credit returned.",
  },
  {
    policy_key: "yoga-preparation",
    category: "classes",
    question: "What should I wear and how should I prepare for yoga?",
    answer: "Wear comfortable, flexible athletic clothing that lets you move freely. Arrive a few minutes early so you can settle in before yoga begins.",
  },
];

const context: PulseMemberContext = {
  member_summary: {
    member_name: "Lena Ortiz",
    membership_status: "active",
    plan_name: "Studio Eight",
    classes_per_month: 8,
    agreed_monthly_price: 159,
    classes_used: 3,
    classes_remaining: 3,
    classes_reserved: 2,
    billing_cycle_end_at: "2026-09-01T04:00:00.000Z",
  },
  upcoming_reservations: [
    {
      class_type_label: "Yoga",
      instructor_name: "Maya Chen",
      starts_at: "2026-08-26T22:00:00.000Z",
      reservation_status: "confirmed",
    },
  ],
  activity_stats: { total_check_ins: 42, classes_this_month: 6 },
  recent_activity: [
    {
      attendance_status: "attended",
      class_type_label: "Cycling",
      instructor_name: "Andre Lewis",
      starts_at: "2026-08-22T13:00:00.000Z",
    },
  ],
  schedule: [
    {
      class_session_id: "SESSION-TEST-YOGA",
      class_type: "yoga",
      class_type_label: "Yoga",
      instructor_name: "Maya Chen",
      starts_at: "2026-08-26T22:00:00.000Z",
      ends_at: "2026-08-26T22:50:00.000Z",
      available_spots: 4,
      is_full: false,
    },
  ],
  availability: { membership: true, activity: true, schedule: true },
};

test("answers credit questions from member context", () => {
  expect(answerGroundedPulseQuestion("How many credits do I have left?", policies, context)).toBe(
    "You have 3 classes available and 2 currently reserved in your present billing cycle.",
  );
});

test("answers attendance questions with lifetime and current-month totals", () => {
  expect(answerGroundedPulseQuestion("How many classes have I attended this month?", policies, context)).toBe(
    "You have 42 total check-ins, including 6 classes attended this month.",
  );
});

test("answers recent activity questions with the latest attended class", () => {
  const answer = answerGroundedPulseQuestion("What was my last class?", policies, context);
  expect(answer).toContain("Cycling with Andre Lewis");
  expect(answer).toContain("Saturday, August 22");
});

test("answers upcoming reservation questions from member context", () => {
  const answer = answerGroundedPulseQuestion("What is my next class?", policies, context);
  expect(answer).toContain("next reserved class is Yoga with Maya Chen");
  expect(answer).toContain("Wednesday, August 26");
});

test("combines credits and the next reservation for compound questions", () => {
  const answer = answerGroundedPulseQuestion(
    "How many classes do I have available, and what is my next reserved class?",
    policies,
    context,
  );
  expect(answer).toContain("3 classes available and 2 currently reserved");
  expect(answer).toContain("next reserved class is Yoga with Maya Chen");
  expect(answer).toContain("Wednesday, August 26");
});

test("answers membership questions from member context", () => {
  const answer = answerGroundedPulseQuestion("What is my membership status?", policies, context);
  expect(answer).toContain("Studio Eight membership is active");
  expect(answer).toContain("September 1");
});

test("answers agreed-price questions from private deterministic context", () => {
  expect(answerGroundedPulseQuestion("What is my membership price?", policies, context))
    .toBe("Your agreed monthly price for Studio Eight is $159.00.");
});

test("answers used-credit questions without confusing them with attendance", () => {
  expect(answerGroundedPulseQuestion("How many credits have I used?", policies, context))
    .toBe("You have used 3 credits in your current billing cycle.");
});

test("answers schedule questions with live class and capacity facts", () => {
  const answer = answerGroundedPulseQuestion("Is there a yoga class with available spots?", policies, context);
  expect(answer).toContain("Yoga with Maya Chen");
  expect(answer).toContain("4 spots available");
  expect(answer).not.toContain("classes available and");
});

test("resolves a schedule follow-up from the prior member question", () => {
  const resolved = resolvePulseFollowUpQuestion("What about tomorrow?", [
    { role: "member", text: "Are there any yoga classes today?" },
    { role: "assistant", text: "I found one yoga class today." },
  ]);
  expect(resolved).toBe("What about tomorrow? Follow-up topic: Are there any yoga classes today?");
  expect(answerGroundedPulseQuestion(resolved, policies, context)).toContain("YOGA");
});

test("does not attach stale context to a standalone question", () => {
  expect(resolvePulseFollowUpQuestion("Can I be late for class?", [
    { role: "member", text: "What should I wear for yoga?" },
  ])).toBe("Can I be late for class?");
});

test("uses approved policy answers for policy questions", () => {
  expect(answerGroundedPulseQuestion("Can you explain cancellations?", policies, context)).toBe(policies[0].answer);
});

test("answers yoga attire questions from approved preparation guidance", () => {
  expect(answerGroundedPulseQuestion("What should I wear for yoga class?", policies, context))
    .toBe(policies[1].answer);
});

test("does not invent unavailable membership data", () => {
  const unavailable = { ...context, member_summary: undefined, availability: { membership: false, activity: true } };
  expect(answerGroundedPulseQuestion("How many credits do I have?", policies, unavailable)).toContain("I won’t guess");
});

test("does not invent unavailable activity data", () => {
  const unavailable = { ...context, activity_stats: null, availability: { membership: true, activity: false } };
  expect(answerGroundedPulseQuestion("How many check-ins do I have?", policies, unavailable)).toContain("I won’t guess");
});

test("uses a bounded fallback for unsupported questions", () => {
  expect(answerGroundedPulseQuestion("What is the weather in Paris?", policies, context)).toContain(
    "I don’t have an approved answer",
  );
});

test("removes model formatting markers from member-facing answers", () => {
  expect(cleanAssistantText("You have **5 classes available** and `2 reserved`."))
    .toBe("You have 5 classes available and 2 reserved.");
});
