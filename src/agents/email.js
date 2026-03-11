// Email notification agent.
// Sends confirmation, escalation, and resolution emails via EmailJS.

import { sendEmail } from "../services/email-service.js";

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const SPAM_CATEGORIES = ["spam", "invalid"];

function isSpamOrInvalid(category) {
  return SPAM_CATEGORIES.includes(category?.toLowerCase());
}

function isUrgentOrP1(priority, category) {
  return (
    priority?.toUpperCase() === "P1" || category?.toLowerCase() === "urgent"
  );
}

// ---------------------------------------------------------------------------
// Confirmation email
// ---------------------------------------------------------------------------

/**
 * Sends a confirmation email when a support ticket is created.
 * Skipped for spam/invalid tickets.
 *
 * @param {object}  opts
 * @param {string}  opts.to       – recipient email
 * @param {string}  opts.ticketId – Linear issue ID or internal ticket ID
 * @param {string}  opts.category – ticket category (bug, feature, urgent, etc.)
 * @param {string}  opts.priority – priority level (P1–P4)
 * @param {string}  opts.summary  – short summary of the ticket
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendConfirmationEmail({
  to,
  ticketId,
  category,
  priority,
  summary,
}) {
  if (isSpamOrInvalid(category)) {
    console.log(`[email] Skipping confirmation for spam/invalid ticket ${ticketId}`);
    return { success: false, error: "Spam or invalid ticket" };
  }

  const subject = `Support Ticket ${ticketId} Received`;

  const body = [
    `Hello,`,
    ``,
    `We have received your support request and created ticket ${ticketId}.`,
    ``,
    `Here are the details:`,
    `  Category: ${category}`,
    `  Priority: ${priority}`,
    `  Summary:  ${summary}`,
    ``,
    `Our team will review your ticket and get back to you as soon as possible.`,
    `You can reference ticket ${ticketId} in any follow-up communication.`,
    ``,
    `Thank you for reaching out.`,
    `— Support Team`,
  ].join("\n");

  return sendEmail({ to, subject, body });
}

// ---------------------------------------------------------------------------
// Escalation alert
// ---------------------------------------------------------------------------

/**
 * Sends an escalation alert to the support team for urgent/P1 tickets.
 * Only fires for urgent category or P1 priority. Skipped for spam/invalid.
 *
 * @param {object}  opts
 * @param {string}  opts.to       – support team email
 * @param {string}  opts.ticketId – ticket ID
 * @param {string}  opts.category – ticket category
 * @param {string}  opts.priority – priority level
 * @param {string}  opts.message  – original customer message
 * @param {string}  opts.summary  – short summary
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendEscalationAlert({
  to,
  ticketId,
  category,
  priority,
  message,
  summary,
}) {
  if (isSpamOrInvalid(category)) {
    console.log(`[email] Skipping escalation for spam/invalid ticket ${ticketId}`);
    return { success: false, error: "Spam or invalid ticket" };
  }

  if (!isUrgentOrP1(priority, category)) {
    console.log(`[email] Skipping escalation for non-urgent ticket ${ticketId} (${priority}/${category})`);
    return { success: false, error: "Not urgent or P1" };
  }

  const subject = `🚨 URGENT: ${ticketId} requires immediate attention`;

  const body = [
    `ESCALATION ALERT`,
    `================`,
    ``,
    `Ticket:   ${ticketId}`,
    `Category: ${category}`,
    `Priority: ${priority}`,
    `Summary:  ${summary}`,
    ``,
    `Customer message:`,
    `-----------------`,
    message,
    ``,
    `This ticket has been flagged as urgent and requires immediate attention.`,
    `Please acknowledge and begin investigation immediately.`,
  ].join("\n");

  return sendEmail({ to, subject, body });
}

// ---------------------------------------------------------------------------
// Resolution email
// ---------------------------------------------------------------------------

/**
 * Sends a resolution notification to the customer.
 * Skipped for spam/invalid tickets.
 *
 * @param {object}  opts
 * @param {string}  opts.to         – recipient email
 * @param {string}  opts.ticketId   – ticket ID
 * @param {string}  opts.resolution – description of how the issue was resolved
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendResolutionEmail({ to, ticketId, resolution }) {
  const subject = `Your ticket ${ticketId} has been resolved`;

  const body = [
    `Hello,`,
    ``,
    `Good news — your support ticket ${ticketId} has been resolved.`,
    ``,
    `Resolution details:`,
    `-------------------`,
    resolution,
    ``,
    `If you have any further questions or the issue persists, please reply`,
    `to this email or open a new ticket referencing ${ticketId}.`,
    ``,
    `Thank you for your patience.`,
    `— Support Team`,
  ].join("\n");

  return sendEmail({ to, subject, body });
}
