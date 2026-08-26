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
      const startsAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      const endsAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      response.end(JSON.stringify([{
        class_session_id: "SESSION-E2E-PB",
        class_type: "cycling",
        class_type_label: "Cycling",
        instructor_name: "Jordan Lee",
        starts_at: startsAt,
        ends_at: endsAt,
        capacity: 20,
        is_cancelled: false,
        confirmed_reservations: 8,
        waitlisted_reservations: 10,
        available_spots: 12,
      }]));
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
