import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { join } from "path";
import { nextId } from "./id-generator.js";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url));
export const TICKETS_PATH = join(__dirname, "..", "..", "data", "tickets.json");

// ---------------------------------------------------------------------------
// Simple write lock to prevent concurrent write corruption
// ---------------------------------------------------------------------------
let _lockPromise = Promise.resolve();

function withLock(fn) {
  const next = _lockPromise.then(fn, fn);
  // Always resolve the chain so future callers aren't blocked by a rejection
  _lockPromise = next.catch(() => {});
  return next;
}

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------
async function readTickets() {
  try {
    const raw = await readFile(TICKETS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === "ENOENT") {
      await mkdir(dirname(TICKETS_PATH), { recursive: true });
      await writeFile(TICKETS_PATH, "[]", "utf-8");
      return [];
    }
    throw err;
  }
}

async function writeTickets(tickets) {
  await mkdir(dirname(TICKETS_PATH), { recursive: true });
  await writeFile(TICKETS_PATH, JSON.stringify(tickets, null, 2) + "\n", "utf-8");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a new ticket. Automatically assigns the next SUP-XXXX id and
 * timestamps.  `data` should include at minimum: slackMessageTs, slackChannel,
 * sender, message.  Returns the created ticket object.
 */
export function createTicket(data) {
  return withLock(async () => {
    const tickets = await readTickets();
    const id = await nextId();
    const now = new Date().toISOString();

    const ticket = {
      id,
      slackMessageTs: data.slackMessageTs ?? null,
      slackChannel: data.slackChannel ?? null,
      sender: data.sender ?? null,
      senderEmail: data.senderEmail ?? null,
      message: data.message ?? null,
      subject: data.subject ?? null,
      category: data.category ?? "general",
      priority: data.priority ?? "P3",
      status: data.status ?? "new",
      progress: data.progress ?? "processing",
      linearIssueId: data.linearIssueId ?? null,
      linearAssignee: data.linearAssignee ?? null,
      aiResponse: data.aiResponse ?? null,
      aiConfidence: data.aiConfidence ?? null,
      createdAt: now,
      updatedAt: now,
    };

    tickets.push(ticket);
    await writeTickets(tickets);
    return ticket;
  });
}

/**
 * Update an existing ticket by id.  Merges `updates` into the ticket and
 * bumps `updatedAt`.  Returns the updated ticket or null if not found.
 */
export function updateTicket(id, updates) {
  return withLock(async () => {
    const tickets = await readTickets();
    const idx = tickets.findIndex((t) => t.id === id);
    if (idx === -1) return null;

    const now = new Date().toISOString();
    tickets[idx] = { ...tickets[idx], ...updates, id, updatedAt: now };
    await writeTickets(tickets);
    return tickets[idx];
  });
}

/**
 * Get a single ticket by id. Returns the ticket or null.
 */
export async function getTicket(id) {
  const tickets = await readTickets();
  return tickets.find((t) => t.id === id) ?? null;
}

/**
 * Return all tickets.
 */
export async function getAllTickets() {
  return readTickets();
}

/**
 * Return tickets filtered by status.
 */
export async function getTicketsByStatus(status) {
  const tickets = await readTickets();
  return tickets.filter((t) => t.status === status);
}

/**
 * Return tickets filtered by category.
 */
export async function getTicketsByCategory(category) {
  const tickets = await readTickets();
  return tickets.filter((t) => t.category === category);
}

/**
 * Delete a ticket by id. Returns true if found and deleted, false otherwise.
 */
export function deleteTicket(id) {
  return withLock(async () => {
    const tickets = await readTickets();
    const idx = tickets.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    tickets.splice(idx, 1);
    await writeTickets(tickets);
    return true;
  });
}

/**
 * Delete multiple tickets by ids. Returns the count of deleted tickets.
 */
export function deleteTickets(ids) {
  return withLock(async () => {
    const tickets = await readTickets();
    const idSet = new Set(ids);
    const remaining = tickets.filter((t) => !idSet.has(t.id));
    const deletedCount = tickets.length - remaining.length;
    await writeTickets(remaining);
    return deletedCount;
  });
}
