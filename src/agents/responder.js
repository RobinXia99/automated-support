import { sendReply } from "../listeners/slack-listener.js";

// ---------------------------------------------------------------------------
// Display-name mappings
// ---------------------------------------------------------------------------

const CATEGORY_MAP = {
  bug: "Bug Report",
  feature: "Feature Request",
  question: "Question",
  urgent: "\ud83d\udea8 Urgent",
  general: "General Inquiry",
};

const PRIORITY_MAP = {
  P1: "P1 - Critical",
  P2: "P2 - High",
  P3: "P3 - Medium",
  P4: "P4 - Low",
};

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

/**
 * Map a category key to its display name.
 *
 * @param {string} category
 * @returns {string}
 */
export function formatCategory(category) {
  return CATEGORY_MAP[category] ?? category;
}

/**
 * Map a priority key to its display name.
 *
 * @param {string} priority
 * @returns {string}
 */
export function formatPriority(priority) {
  return PRIORITY_MAP[priority] ?? priority;
}

// ---------------------------------------------------------------------------
// Reply helpers
// ---------------------------------------------------------------------------

/**
 * Send a confirmation message acknowledging ticket receipt.
 * Always sent for every ticket.
 *
 * @param {{ channel: string, threadTs: string, ticketId: string, category: string, priority: string }} params
 */
export async function sendConfirmation({
  channel,
  threadTs,
  ticketId,
  category,
  priority,
}) {
  const text = [
    `\u2705 Ticket \`${ticketId}\` received`,
    `\ud83d\udccb Category: *${formatCategory(category)}* | Priority: *${formatPriority(priority)}*`,
    `We're looking into this and will get back to you shortly.`,
  ].join("\n");

  return sendReply(channel, threadTs, text);
}

/**
 * Send an AI-generated auto-reply.
 * Skipped for `urgent` category or `P1` priority tickets.
 *
 * @param {{ channel: string, threadTs: string, ticketId: string, suggestedResponse: string, category?: string, priority?: string }} params
 */
export async function sendAutoReply({
  channel,
  threadTs,
  ticketId,
  suggestedResponse,
  category,
  priority,
}) {
  // Never send auto-replies for urgent or P1 tickets
  if (category === "urgent" || priority === "P1") {
    return null;
  }

  const text = [
    `\ud83d\udca1 *Automated Response for ${ticketId}:*`,
    suggestedResponse,
    "",
    `_If this doesn't resolve your issue, a team member will follow up._`,
  ].join("\n");

  return sendReply(channel, threadTs, text);
}

/**
 * Send a resolution notice when a Linear ticket is resolved.
 *
 * @param {{ channel: string, threadTs: string, ticketId: string, resolution: string }} params
 */
export async function sendResolutionReply({
  channel,
  threadTs,
  ticketId,
  resolution,
}) {
  const text = [
    `\u2705 *${ticketId} has been resolved*`,
    resolution,
    "",
    `_This ticket is now closed. Reply here if you need further help._`,
  ].join("\n");

  return sendReply(channel, threadTs, text);
}
