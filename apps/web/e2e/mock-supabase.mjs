import http from "node:http";

const server = http.createServer((request, response) => {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info");
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
