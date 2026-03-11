import "dotenv/config";

import http from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import linear from "./linear.js";
import slack from "./slack.js";

import * as store from "./tickets/store.js";
import { triage } from "./agents/triage.js";
import * as responder from "./agents/responder.js";
import * as planner from "./agents/planner.js";
import * as email from "./agents/email.js";
import { startListening } from "./listeners/slack-listener.js";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "..", "public");

// ---------------------------------------------------------------------------
// MIME types for static file serving
// ---------------------------------------------------------------------------
const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, statusCode, data) {
  setCors(res);
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { error: message });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString();
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

async function serveStatic(res, filePath) {
  try {
    const data = await readFile(filePath);
    const ext = extname(filePath);
    const mime = MIME_TYPES[ext] || "application/octet-stream";
    setCors(res);
    res.writeHead(200, { "Content-Type": mime });
    res.end(data);
  } catch {
    sendError(res, 404, "Not found");
  }
}

// ---------------------------------------------------------------------------
// API router
// ---------------------------------------------------------------------------

function parseUrl(rawUrl) {
  const url = new URL(rawUrl, "http://localhost");
  return { pathname: url.pathname, searchParams: url.searchParams };
}

function matchRoute(method, pathname, routeMethod, routePattern) {
  if (method !== routeMethod) return null;
  const routeParts = routePattern.split("/");
  const pathParts = pathname.split("/");
  if (routeParts.length !== pathParts.length) return null;

  const params = {};
  for (let i = 0; i < routeParts.length; i++) {
    if (routeParts[i].startsWith(":")) {
      params[routeParts[i].slice(1)] = pathParts[i];
    } else if (routeParts[i] !== pathParts[i]) {
      return null;
    }
  }
  return params;
}

async function handleApi(req, res, method, pathname, searchParams) {
  // GET /api/tickets
  if (matchRoute(method, pathname, "GET", "/api/tickets")) {
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort") || "createdAt";
    const order = searchParams.get("order") || "desc";

    let tickets = await store.getAllTickets();

    if (status) {
      tickets = tickets.filter((t) => t.status === status);
    }
    if (category) {
      tickets = tickets.filter((t) => t.category === category);
    }
    if (search) {
      const lower = search.toLowerCase();
      tickets = tickets.filter(
        (t) =>
          (t.message && t.message.toLowerCase().includes(lower)) ||
          (t.subject && t.subject.toLowerCase().includes(lower)) ||
          (t.id && t.id.toLowerCase().includes(lower)) ||
          (t.sender && t.sender.toLowerCase().includes(lower)),
      );
    }

    tickets.sort((a, b) => {
      const aVal = a[sort] ?? "";
      const bVal = b[sort] ?? "";
      if (aVal < bVal) return order === "asc" ? -1 : 1;
      if (aVal > bVal) return order === "asc" ? 1 : -1;
      return 0;
    });

    return sendJson(res, 200, tickets);
  }

  // GET /api/tickets/:id
  let params = matchRoute(method, pathname, "GET", "/api/tickets/:id");
  if (params) {
    const ticket = await store.getTicket(params.id);
    if (!ticket) return sendError(res, 404, "Ticket not found");
    return sendJson(res, 200, ticket);
  }

  // PATCH /api/tickets/:id
  params = matchRoute(method, pathname, "PATCH", "/api/tickets/:id");
  if (params) {
    const body = await parseBody(req);
    const updated = await store.updateTicket(params.id, body);
    if (!updated) return sendError(res, 404, "Ticket not found");
    return sendJson(res, 200, updated);
  }

  // POST /api/tickets/:id/reply
  params = matchRoute(method, pathname, "POST", "/api/tickets/:id/reply");
  if (params) {
    const body = await parseBody(req);
    if (!body.to || !body.message) {
      return sendError(res, 400, "Missing required fields: to, message");
    }

    const ticket = await store.getTicket(params.id);
    if (!ticket) return sendError(res, 404, "Ticket not found");

    const result = await email.sendConfirmationEmail({
      to: body.to,
      ticketId: ticket.id,
      category: ticket.category,
      priority: ticket.priority,
      summary: body.message,
    });

    return sendJson(res, 200, { ticketId: ticket.id, emailResult: result });
  }

  // DELETE /api/tickets/:id
  params = matchRoute(method, pathname, "DELETE", "/api/tickets/:id");
  if (params) {
    const deleted = await store.deleteTicket(params.id);
    if (!deleted) return sendError(res, 404, "Ticket not found");
    return sendJson(res, 200, { success: true, id: params.id });
  }

  // POST /api/tickets/bulk-delete
  if (matchRoute(method, pathname, "POST", "/api/tickets/bulk-delete")) {
    const body = await parseBody(req);
    if (!body.ids || !Array.isArray(body.ids)) {
      return sendError(res, 400, "Missing required field: ids (array)");
    }
    const count = await store.deleteTickets(body.ids);
    return sendJson(res, 200, { success: true, deletedCount: count });
  }

  return sendError(res, 404, "API route not found");
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const method = req.method.toUpperCase();
  const { pathname, searchParams } = parseUrl(req.url);

  setCors(res);

  // Handle CORS preflight
  if (method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  try {
    // API routes
    if (pathname.startsWith("/api/")) {
      return await handleApi(req, res, method, pathname, searchParams);
    }

    // Static files and root
    if (method === "GET") {
      const filePath =
        pathname === "/" ? join(PUBLIC_DIR, "index.html") : join(PUBLIC_DIR, pathname);

      // Security: prevent directory traversal
      if (!filePath.startsWith(PUBLIC_DIR)) {
        return sendError(res, 403, "Forbidden");
      }

      return await serveStatic(res, filePath);
    }

    sendError(res, 405, "Method not allowed");
  } catch (err) {
    console.error("[server] Unhandled request error:", err);
    sendError(res, 500, "Internal server error");
  }
});

// ---------------------------------------------------------------------------
// Slack message handler (orchestration pipeline)
// ---------------------------------------------------------------------------

async function onMessage(message) {
  const { sender, text, ts, channel } = message;

  // Step 1 — Create ticket
  console.log(`[pipeline] New message from ${sender}: "${text.slice(0, 80)}..."`);
  const ticket = await store.createTicket({
    slackMessageTs: ts,
    slackChannel: channel,
    sender,
    message: text,
  });
  console.log(`[pipeline] Created ticket ${ticket.id}`);

  // Step 2 — Triage
  const triageResult = triage(text);
  console.log(
    `[pipeline] Triage: category=${triageResult.category} priority=${triageResult.priority} autoAnswerable=${triageResult.autoAnswerable}`,
  );

  // Step 3 — Update ticket with triage results
  await store.updateTicket(ticket.id, {
    category: triageResult.category,
    priority: triageResult.priority,
    subject: triageResult.subject,
    status: "triaged",
    progress: triageResult.autoAnswerable ? "auto-responding" : "processing",
    aiResponse: triageResult.suggestedResponse,
  });
  console.log(`[pipeline] Ticket ${ticket.id} triaged and updated`);

  // Step 4 — Send Slack confirmation
  try {
    await responder.sendConfirmation({
      channel,
      threadTs: ts,
      ticketId: ticket.id,
      category: triageResult.category,
      priority: triageResult.priority,
    });
    console.log(`[pipeline] Confirmation sent for ${ticket.id}`);
  } catch (err) {
    console.error(`[pipeline] Failed to send confirmation for ${ticket.id}:`, err.message);
  }

  // Step 5 — Auto-reply if applicable
  if (triageResult.autoAnswerable) {
    try {
      await responder.sendAutoReply({
        channel,
        threadTs: ts,
        ticketId: ticket.id,
        suggestedResponse: triageResult.suggestedResponse,
        category: triageResult.category,
        priority: triageResult.priority,
      });
      console.log(`[pipeline] Auto-reply sent for ${ticket.id}`);

      await store.updateTicket(ticket.id, {
        progress: "ai-resolved",
        status: "resolved",
      });
      console.log(`[pipeline] Ticket ${ticket.id} marked as ai-resolved`);
    } catch (err) {
      console.error(`[pipeline] Failed to send auto-reply for ${ticket.id}:`, err.message);
    }
  }

  // Step 6 — Create Linear issue
  try {
    const issue = await planner.planAndCreateIssue(ticket, triageResult);
    await store.updateTicket(ticket.id, {
      linearIssueId: issue.identifier,
    });
    console.log(`[pipeline] Linear issue ${issue.identifier} created for ${ticket.id}`);
  } catch (err) {
    console.error(`[pipeline] Failed to create Linear issue for ${ticket.id}:`, err.message);
  }

  // Step 7 — If not auto-answerable, assign to dev
  if (!triageResult.autoAnswerable) {
    await store.updateTicket(ticket.id, {
      progress: "assigned-to-dev",
    });
    console.log(`[pipeline] Ticket ${ticket.id} assigned to dev`);
  }

  // Step 8 — Escalation email for urgent/P1
  if (triageResult.category === "urgent" || triageResult.priority === "P1") {
    try {
      await email.sendEscalationAlert({
        to: process.env.ESCALATION_EMAIL || "support-team@company.com",
        ticketId: ticket.id,
        category: triageResult.category,
        priority: triageResult.priority,
        message: text,
        summary: triageResult.summary,
      });
      console.log(`[pipeline] Escalation email sent for ${ticket.id}`);
    } catch (err) {
      console.error(`[pipeline] Failed to send escalation email for ${ticket.id}:`, err.message);
    }
  }

  console.log(`[pipeline] Processing complete for ${ticket.id}`);
}

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

async function main() {
  // Verify Linear connection
  const viewer = await linear.viewer;
  console.log(`Linear connected as: ${viewer.name}`);

  // Verify Slack connection
  const auth = await slack.auth.test();
  console.log(`Slack connected as: ${auth.user} in ${auth.team}`);

  // Start HTTP server
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log("");
    console.log("=".repeat(56));
    console.log("  Automated Support System");
    console.log("=".repeat(56));
    console.log(`  Dashboard:  http://localhost:${PORT}`);
    console.log(`  API:        http://localhost:${PORT}/api/tickets`);
    console.log("=".repeat(56));
    console.log("");
  });

  // Start Slack listener
  await startListening(onMessage);
}

main().catch((err) => {
  console.error("[startup] Fatal error:", err);
  process.exit(1);
});
