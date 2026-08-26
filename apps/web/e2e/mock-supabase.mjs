import http from "node:http";

const staffUser = {
  id: "40000000-0000-4000-8000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "owner@pulse.example",
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};
let productBDecisions = [];
let productBDecisionSequence = 0;
const productBStartsAt = new Date(Date.now() - 21 * 60 * 1000).toISOString();
const productBEndsAt = new Date(Date.now() + 39 * 60 * 1000).toISOString();
const productBStage3StartsAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
const productBStage3EndsAt = new Date(Date.now() + 49 * 60 * 60 * 1000).toISOString();
const productBCalendarYogaStartsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const productBCalendarYogaEndsAt = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();
const productBCalendarHiitStartsAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
const productBCalendarHiitEndsAt = new Date(Date.now() + 49 * 60 * 60 * 1000).toISOString();
const productBCalendarCyclingStartsAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
const productBCalendarCyclingEndsAt = new Date(Date.now() + 73 * 60 * 60 * 1000).toISOString();
const productBCalendarPriorStartsAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
const productBCalendarPriorEndsAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString();
let productBStage3Cancelled = false;
let productBStage3Actions = [];
const productBStage3Roster = [
  { reservation_id: "RSV-E2E-PB3-1", member_id: "MEM-E2E-PB3-1", member_name: "Alex Future", reservation_status: "confirmed", attendance_record_id: null, attendance_status: null, recorded_at: null, recorded_by_staff_name: "Recorder unavailable", correction_history: [], can_record_attended: false, can_record_no_show: false },
  { reservation_id: "RSV-E2E-PB3-WAIT", member_id: "MEM-E2E-PB3-2", member_name: "Sam Waitlisted", reservation_status: "waitlisted", attendance_record_id: null, attendance_status: null, recorded_at: null, recorded_by_staff_name: "Recorder unavailable", correction_history: [], can_record_attended: false, can_record_no_show: false },
];
let productBRoster = [
  { reservation_id: "RSV-E2E-PB-1", member_id: "MEM-E2E-PB-1", member_name: "Avery Stone", reservation_status: "confirmed", attendance_record_id: null, attendance_status: null, recorded_at: null, recorded_by_staff_name: "Recorder unavailable", correction_history: [], can_record_attended: false, can_record_no_show: true },
  { reservation_id: "RSV-E2E-PB-2", member_id: "MEM-E2E-PB-2", member_name: "Blake Rivera", reservation_status: "confirmed", attendance_record_id: null, attendance_status: null, recorded_at: null, recorded_by_staff_name: "Recorder unavailable", correction_history: [], can_record_attended: false, can_record_no_show: true },
  { reservation_id: "RSV-E2E-PB-HIST", member_id: "MEM-E2E-PB-4", member_name: "Devon Historical", reservation_status: "confirmed", attendance_record_id: "ATT-E2E-PB-HIST", attendance_status: "attended", recorded_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(), recorded_by_staff_name: "Recorder unavailable", correction_history: [], can_record_attended: false, can_record_no_show: false },
  { reservation_id: "RSV-E2E-PB-WAIT", member_id: "MEM-E2E-PB-3", member_name: "Casey Morgan", reservation_status: "waitlisted", attendance_record_id: null, attendance_status: null, recorded_at: null, recorded_by_staff_name: "Recorder unavailable", correction_history: [], can_record_attended: false, can_record_no_show: false },
];

function readBody(request) {
  return new Promise((resolve) => {
    let body = "";
    request.on("data", (chunk) => { body += chunk; });
    request.on("end", () => resolve(body ? JSON.parse(body) : {}));
  });
}

const server = http.createServer(async (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info, x-supabase-api-version, accept-profile, content-profile, prefer, range");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  response.setHeader("Content-Type", "application/json");

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.url === "/health") {
    response.writeHead(200);
    response.end(JSON.stringify({ status: "ready" }));
    return;
  }

  if (request.url?.startsWith("/auth/v1/token") && request.method === "POST") {
    response.writeHead(200);
    response.end(JSON.stringify({
      access_token: "pulse-owner-test-token",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: "pulse-owner-refresh-token",
      user: staffUser,
    }));
    return;
  }

  if (request.url === "/auth/v1/user" && request.headers.authorization?.includes("pulse-owner-test-token")) {
    response.writeHead(200);
    response.end(JSON.stringify(staffUser));
    return;
  }

  if (request.url?.startsWith("/rest/v1/rpc/current_staff_id")) {
    response.writeHead(200);
    response.end(JSON.stringify("STF-0001"));
    return;
  }

  if (request.url?.startsWith("/rest/v1/rpc/product_d_risk_queue")) {
    response.writeHead(200);
    response.end(JSON.stringify([{
      risk_assessment_id: "RISK-E2E-PD",
      member_name: "Evelyn Rivera",
      risk_level: "high",
      risk_priority: 1,
      review_status: "pending",
      evaluated_at: new Date().toISOString(),
      previous_visits: 8,
      current_visits: 2,
      decline_percentage: 75,
      risk_reason: "Visits fell from 8 to 2: 75% decline",
      last_attended_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      active_note_count: 1,
      outreach_status: "draft",
      outreach_blocked_reason: "An outreach attempt is already being prepared",
    }]));
    return;
  }

  if (request.url?.startsWith("/rest/v1/rpc/product_d_evaluation_member_options")) {
    response.writeHead(200);
    response.end(JSON.stringify([{ member_id: "MEM-E2E-PD", first_name: "Evelyn", last_name: "Rivera", email: "evelyn@pulse.example" }]));
    return;
  }

  if (request.url?.startsWith("/rest/v1/rpc/product_d_case_history")) {
    response.writeHead(200);
    response.end(JSON.stringify([{
      risk_assessment_id: "RISK-E2E-PD",
      member_name: "Evelyn Rivera",
      risk_level: "high",
      review_status: "pending",
      evaluated_at: new Date().toISOString(),
      resolved_at: null,
      resolution_reason: null,
      previous_visits: 8,
      current_visits: 2,
      decline_percentage: 75,
      outreach_attempts: [{ response_outcome: null }],
    }]));
    return;
  }

  if (request.url?.startsWith("/rest/v1/rpc/product_d_member_detail")) {
    const priorAttendance = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
    const currentAttendance = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    response.writeHead(200);
    response.end(JSON.stringify([{
      risk_assessment_id: "RISK-E2E-PD",
      member_name: "Evelyn Rivera",
      email: "evelyn@pulse.example",
      phone: "+1-212-555-0175",
      preferred_channel: "email",
      do_not_contact: false,
      risk_level: "high",
      review_status: "pending",
      risk_reason: "Visits fell from 8 to 2: 75% decline",
      evaluated_at: new Date().toISOString(),
      previous_visits: 8,
      current_visits: 2,
      decline_percentage: 75,
      resolved_at: null,
      resolution_reason: null,
      previous_period_start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      previous_period_end: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      current_period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      current_period_end: new Date().toISOString(),
      attendance_evidence: [
        { attendance_record_id: "ATT-E2E-PD-1", class_type: "yoga", starts_at: priorAttendance },
        { attendance_record_id: "ATT-E2E-PD-2", class_type: "cycling", starts_at: currentAttendance },
      ],
      active_notes: [{ note_id: "NOTE-E2E-PD", body: "Member preferred evening classes last month.", author_name: "Jordan Lee", created_at: currentAttendance }],
      outreach_attempts: [{ outreach_id: "OUT-E2E-PD", attempt_number: 1, channel: "email", original_message: "We would love to help you return.", final_message: "We would love to help you return.", status: "draft", response_outcome: null, sent_at: null, cooldown_until: null }],
      recommended_class_type_label: "Yoga",
      recommended_starts_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      recommended_instructor_name: "Morgan Chen",
      recommended_available_spots: 4,
      can_start_outreach: false,
      outreach_blocked_reason: "An outreach attempt is already being prepared",
    }]));
    return;
  }

  if (request.url?.startsWith("/rest/v1/rpc/start_risk_review")) {
    response.writeHead(400);
    response.end(JSON.stringify({ code: "P0001", message: "active staff account required in function public.start_risk_review" }));
    return;
  }

  if (request.url?.startsWith("/rest/v1/rpc/create_product_b_underbooking_decision")) {
    const body = await readBody(request);
    productBDecisionSequence += 1;
    const productBDecision = {
      decision_id: `PBD-E2E-${String(productBDecisionSequence).padStart(3, "0")}`,
      class_session_id: body.p_class_session_id,
      action: body.p_action,
      note: body.p_note,
      state: "open",
      created_at: new Date().toISOString(),
    };
    productBDecisions.unshift(productBDecision);
    response.writeHead(200);
    response.end(JSON.stringify(productBDecision));
    return;
  }

  if (request.url?.startsWith("/rest/v1/rpc/resolve_product_b_underbooking_decision")) {
    const body = await readBody(request);
    const decisionIndex = productBDecisions.findIndex((decision) => decision.decision_id === body.p_decision_id);
    if (decisionIndex >= 0) productBDecisions[decisionIndex] = { ...productBDecisions[decisionIndex], state: "resolved" };
    const productBDecision = decisionIndex >= 0 ? productBDecisions[decisionIndex] : null;
    response.writeHead(200);
    response.end(JSON.stringify(productBDecision));
    return;
  }

  if (request.url?.startsWith("/rest/v1/rpc/record_session_attendance_bulk")) {
    const body = await readBody(request);
    for (const reservationId of body.p_reservation_ids ?? []) {
      productBRoster = productBRoster.map((member) => member.reservation_id === reservationId ? { ...member, attendance_record_id: `ATT-${reservationId}`, attendance_status: body.p_attendance_status, recorded_at: new Date().toISOString(), recorded_by_staff_name: "Jordan Lee", can_record_attended: false, can_record_no_show: false } : member);
    }
    response.writeHead(200);
    response.end(JSON.stringify([{ class_session_id: body.p_class_session_id, attendance_status: body.p_attendance_status, recorded_count: body.p_reservation_ids?.length ?? 0 }]));
    return;
  }

  if (request.url?.startsWith("/rest/v1/rpc/correct_attendance")) {
    const body = await readBody(request);
    productBRoster = productBRoster.map((member) => member.attendance_record_id === body.p_attendance_record_id ? { ...member, attendance_status: body.p_new_status, correction_history: [...member.correction_history, { correction_id: "CORR-E2E-PB", previous_status: member.attendance_status, new_status: body.p_new_status, reason: body.p_reason, corrected_at: new Date().toISOString(), corrected_by_staff_name: "Jordan Lee" }] } : member);
    response.writeHead(200);
    response.end(JSON.stringify([{ correction_id: "CORR-E2E-PB" }]));
    return;
  }

  if (request.url?.startsWith("/rest/v1/rpc/cancel_class_session")) {
    const body = await readBody(request);
    if (body.p_class_session_id !== "SESSION-E2E-PB3-CANCEL") {
      response.writeHead(400);
      response.end(JSON.stringify({ code: "P0001", message: "session cancellation conflicts with recorded attendance in function public.cancel_class_session" }));
      return;
    }
    productBStage3Cancelled = true;
    productBStage3Actions = [{ action_id: "ACT-E2E-PB3", reason: body.p_reason, performed_at: new Date().toISOString(), performed_by_staff_id: "STF-0001" }];
    response.writeHead(200);
    response.end(JSON.stringify(null));
    return;
  }

  if (request.url?.startsWith("/rest/v1/")) {
    response.setHeader("Content-Range", "*/0");
    response.writeHead(200);
    if (request.url.startsWith("/rest/v1/membership_plans")) {
      response.end(JSON.stringify([
        { plan_id: "PLAN-004", plan_name: "4 Classes Monthly", classes_per_month: 4, monthly_price: 99 },
        { plan_id: "PLAN-008", plan_name: "8 Classes Monthly", classes_per_month: 8, monthly_price: 179 },
        { plan_id: "PLAN-012", plan_name: "12 Classes Monthly", classes_per_month: 12, monthly_price: 249 },
      ]));
      return;
    }
    if (request.url.startsWith("/rest/v1/staff_accounts")) {
      response.end(JSON.stringify({ role: "owner_admin" }));
      return;
    }
    if (request.url.startsWith("/rest/v1/staff_product_b_sessions")) {
      if (request.url.includes("SESSION-E2E-PB3-CANCEL")) {
        response.end(JSON.stringify([{ class_session_id: "SESSION-E2E-PB3-CANCEL", class_type: "yoga", class_type_label: "Yoga", instructor_name: "Jordan Lee", starts_at: productBStage3StartsAt, ends_at: productBStage3EndsAt, capacity: 12, is_cancelled: productBStage3Cancelled, confirmed_reservations: productBStage3Cancelled ? 0 : 1, waitlisted_reservations: productBStage3Cancelled ? 0 : 1, available_spots: productBStage3Cancelled ? 12 : 11, attended_count: 0, no_show_count: 0, marked_count: 0 }]));
        return;
      }
      if (request.url.includes("SESSION-E2E-PB3-CONFLICT")) {
        response.end(JSON.stringify([{ class_session_id: "SESSION-E2E-PB3-CONFLICT", class_type: "hiit", class_type_label: "HIIT", instructor_name: "Jordan Lee", starts_at: productBStage3StartsAt, ends_at: productBStage3EndsAt, capacity: 10, is_cancelled: false, confirmed_reservations: 1, waitlisted_reservations: 0, available_spots: 9, attended_count: 1, no_show_count: 0, marked_count: 1 }]));
        return;
      }
      if (request.url.includes("SESSION-E2E-PB3-ZERO")) {
        response.end(JSON.stringify([{ class_session_id: "SESSION-E2E-PB3-ZERO", class_type: "cycling", class_type_label: "Cycling", instructor_name: "Jordan Lee", starts_at: productBStage3StartsAt, ends_at: productBStage3EndsAt, capacity: 20, is_cancelled: false, confirmed_reservations: 0, waitlisted_reservations: 0, available_spots: 20, attended_count: 0, no_show_count: 0, marked_count: 0 }]));
        return;
      }
      const marked = productBRoster.filter((member) => member.reservation_status === "confirmed" && member.attendance_status).length;
      const stage2Session = {
        class_session_id: "SESSION-E2E-PB",
        class_type: "cycling",
        class_type_label: "Cycling",
        instructor_staff_id: "STF-0001",
        instructor_name: "Jordan Lee",
        starts_at: productBStartsAt,
        ends_at: productBEndsAt,
        capacity: 20,
        is_cancelled: false,
        confirmed_reservations: 8,
        waitlisted_reservations: 10,
        available_spots: 12,
        attended_count: productBRoster.filter((member) => member.attendance_status === "attended").length,
        no_show_count: productBRoster.filter((member) => member.attendance_status === "no_show").length,
        marked_count: marked,
      };
      if (request.url.includes("class_session_id=eq.SESSION-E2E-PB")) {
        response.end(JSON.stringify([stage2Session]));
        return;
      }
      const calendarSessions = [stage2Session, {
        class_session_id: "SESSION-E2E-CALENDAR-YOGA",
        class_type: "yoga",
        class_type_label: "Yoga",
        instructor_staff_id: "STF-0001",
        instructor_name: "Jordan Lee",
        starts_at: productBCalendarYogaStartsAt,
        ends_at: productBCalendarYogaEndsAt,
        capacity: 12,
        is_cancelled: false,
        confirmed_reservations: 9,
        waitlisted_reservations: 0,
        available_spots: 3,
        attended_count: 0,
        no_show_count: 0,
        marked_count: 0,
      }, {
        class_session_id: "SESSION-E2E-CALENDAR-HIIT",
        class_type: "hiit",
        class_type_label: "HIIT",
        instructor_staff_id: "STF-0001",
        instructor_name: "Jordan Lee",
        starts_at: productBCalendarHiitStartsAt,
        ends_at: productBCalendarHiitEndsAt,
        capacity: 10,
        is_cancelled: true,
        confirmed_reservations: 0,
        waitlisted_reservations: 0,
        available_spots: 10,
        attended_count: 0,
        no_show_count: 0,
        marked_count: 0,
      }, {
        class_session_id: "SESSION-E2E-CALENDAR-CYCLING",
        class_type: "cycling",
        class_type_label: "Cycling",
        instructor_staff_id: "STF-0002",
        instructor_name: "Morgan Chen",
        starts_at: productBCalendarCyclingStartsAt,
        ends_at: productBCalendarCyclingEndsAt,
        capacity: 20,
        is_cancelled: false,
        confirmed_reservations: 16,
        waitlisted_reservations: 1,
        available_spots: 4,
        attended_count: 0,
        no_show_count: 0,
        marked_count: 0,
      }, {
        class_session_id: "SESSION-E2E-CALENDAR-PRIOR",
        class_type: "yoga",
        class_type_label: "Yoga",
        instructor_staff_id: "STF-0001",
        instructor_name: "Jordan Lee",
        starts_at: productBCalendarPriorStartsAt,
        ends_at: productBCalendarPriorEndsAt,
        capacity: 12,
        is_cancelled: false,
        confirmed_reservations: 8,
        waitlisted_reservations: 0,
        available_spots: 4,
        attended_count: 8,
        no_show_count: 0,
        marked_count: 8,
      }];
      const scheduleFilters = new URL(request.url, "http://127.0.0.1").searchParams.getAll("starts_at");
      const lowerBound = scheduleFilters.find((value) => value.startsWith("gte."))?.slice(4);
      const upperBound = scheduleFilters.find((value) => value.startsWith("lt."))?.slice(3);
      response.end(JSON.stringify(calendarSessions.filter((session) => (!lowerBound || session.starts_at >= lowerBound) && (!upperBound || session.starts_at < upperBound))));
      return;
    }
    if (request.url.startsWith("/rest/v1/staff_session_roster")) {
      if (request.url.includes("SESSION-E2E-PB3-CANCEL")) {
        const roster = productBStage3Cancelled ? [] : productBStage3Roster;
        response.end(JSON.stringify(roster.map((member) => ({ ...member, class_session_id: "SESSION-E2E-PB3-CANCEL", class_type_label: "Yoga", starts_at: productBStage3StartsAt, check_in_opens_at: new Date(new Date(productBStage3StartsAt).getTime() - 15 * 60 * 1000).toISOString(), check_in_closes_at: new Date(new Date(productBStage3StartsAt).getTime() + 20 * 60 * 1000).toISOString() }))));
        return;
      }
      if (request.url.includes("SESSION-E2E-PB3-CONFLICT")) {
        response.end(JSON.stringify([{ ...productBStage3Roster[0], class_session_id: "SESSION-E2E-PB3-CONFLICT", class_type_label: "HIIT", starts_at: productBStage3StartsAt, attendance_record_id: "ATT-E2E-PB3", attendance_status: "attended", recorded_at: new Date().toISOString(), recorded_by_staff_name: "Jordan Lee", check_in_opens_at: productBStage3StartsAt, check_in_closes_at: productBStage3EndsAt }]));
        return;
      }
      if (request.url.includes("SESSION-E2E-PB3-ZERO")) {
        response.end(JSON.stringify([]));
        return;
      }
      response.end(JSON.stringify(productBRoster.map((member) => ({ ...member, class_session_id: "SESSION-E2E-PB", class_type_label: "Cycling", starts_at: productBStartsAt, check_in_opens_at: new Date(new Date(productBStartsAt).getTime() - 15 * 60 * 1000).toISOString(), check_in_closes_at: new Date(new Date(productBStartsAt).getTime() + 20 * 60 * 1000).toISOString() }))));
      return;
    }
    if (request.url.startsWith("/rest/v1/class_session_actions")) {
      response.end(JSON.stringify(request.url.includes("SESSION-E2E-PB3-CANCEL") ? productBStage3Actions : []));
      return;
    }
    if (request.url.startsWith("/rest/v1/product_b_underbooking_decisions")) {
      response.end(JSON.stringify(productBDecisions));
      return;
    }
    response.end("[]");
    return;
  }

  if (request.url?.startsWith("/auth/v1/")) {
    response.writeHead(401);
    response.end(JSON.stringify({ code: "missing_session", message: "No test session" }));
    return;
  }

  response.writeHead(404);
  response.end(JSON.stringify({ message: "Unknown test endpoint" }));
});

server.listen(Number(process.env.PULSE_MOCK_SUPABASE_PORT ?? 54329), "127.0.0.1");
