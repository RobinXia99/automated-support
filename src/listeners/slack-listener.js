import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import slack from "../slack.js";
import { SLACK_CHANNEL_ID } from "../config.js";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..", "..");
const LAST_SEEN_PATH = resolve(PROJECT_ROOT, "data", "last-seen-ts.txt");

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
let lastSeenTs = null;
let pollTimer = null;

// ---------------------------------------------------------------------------
// Persistence — last-seen timestamp
// ---------------------------------------------------------------------------
async function loadLastSeenTs() {
  try {
    const raw = await readFile(LAST_SEEN_PATH, "utf-8");
    const ts = raw.trim();
    if (ts) lastSeenTs = ts;
  } catch {
    // File doesn't exist yet — that's fine, we'll create it on first save.
  }
}

async function saveLastSeenTs(ts) {
  await mkdir(dirname(LAST_SEEN_PATH), { recursive: true });
  await writeFile(LAST_SEEN_PATH, ts, "utf-8");
}

// ---------------------------------------------------------------------------
// Rate-limit / backoff helpers
// ---------------------------------------------------------------------------
const BASE_DELAY_MS = 1_000;
const MAX_DELAY_MS = 60_000;
let consecutiveErrors = 0;

function backoffDelay() {
  const delay = Math.min(BASE_DELAY_MS * 2 ** consecutiveErrors, MAX_DELAY_MS);
  // Add jitter (0–25 % of delay)
  return delay + Math.random() * delay * 0.25;
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Slack helpers
// ---------------------------------------------------------------------------

/**
 * Fetch new messages from the monitored channel since `lastSeenTs`.
 * Returns messages sorted oldest-first.
 */
async function fetchNewMessages() {
  const params = {
    channel: SLACK_CHANNEL_ID,
    limit: 100,
  };

  if (lastSeenTs) {
    params.oldest = lastSeenTs;
    // `oldest` is exclusive when combined with `inclusive: false` (the default)
  }

  const result = await slack.conversations.history(params);
  const messages = result.messages || [];

  // Sort oldest → newest (API returns newest first)
  messages.sort((a, b) => parseFloat(a.ts) - parseFloat(b.ts));

  return messages;
}

/**
 * Determine whether a message should be processed.
 * Filters out bot messages, system (subtype) messages, and the exact
 * lastSeenTs message (since `oldest` is exclusive by default, this is
 * mainly a safety guard).
 */
function isUserMessage(msg) {
  // Bot messages carry `bot_id` or subtype "bot_message"
  if (msg.bot_id) return false;
  if (msg.subtype) return false; // system events (channel_join, etc.)
  if (!msg.text) return false;
  // Guard against re-processing the exact last-seen message
  if (msg.ts === lastSeenTs) return false;
  return true;
}

/**
 * Parse a raw Slack message into our canonical shape.
 */
function parseMessage(msg) {
  return {
    sender: msg.user,
    text: msg.text,
    ts: msg.ts,
    channel: SLACK_CHANNEL_ID,
    threadTs: msg.thread_ts || null,
  };
}

// ---------------------------------------------------------------------------
// Polling loop
// ---------------------------------------------------------------------------

/**
 * Single poll tick — fetch, filter, parse, and hand off to the callback.
 */
async function tick(onMessage) {
  try {
    const messages = await fetchNewMessages();
    const userMessages = messages.filter(isUserMessage);

    for (const msg of userMessages) {
      const parsed = parseMessage(msg);
      try {
        await onMessage(parsed);
      } catch (err) {
        console.error("[slack-listener] onMessage callback error:", err);
      }
    }

    // Update last-seen ts to the newest message we received (even non-user
    // ones) so we don't re-fetch the same window next time.
    if (messages.length > 0) {
      const newestTs = messages[messages.length - 1].ts;
      lastSeenTs = newestTs;
      await saveLastSeenTs(newestTs);
    }

    // Reset backoff on success
    consecutiveErrors = 0;
  } catch (err) {
    consecutiveErrors++;

    // Slack rate-limit responses include a `retryAfter` (seconds).
    const retryAfter = err?.data?.retryAfter ?? err?.retryAfter;
    if (retryAfter) {
      const waitMs = retryAfter * 1_000;
      console.warn(
        `[slack-listener] Rate limited. Retrying after ${retryAfter}s`,
      );
      await sleep(waitMs);
    } else {
      const waitMs = backoffDelay();
      console.error(
        `[slack-listener] Poll error (attempt ${consecutiveErrors}). ` +
          `Backing off ${Math.round(waitMs / 1000)}s:`,
        err.message || err,
      );
      await sleep(waitMs);
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start polling the configured Slack channel for new messages.
 *
 * @param {(msg: {sender:string, text:string, ts:string, channel:string, threadTs:string|null}) => Promise<void>} onMessage
 * @param {{ intervalMs?: number }} [options]
 */
export async function startListening(onMessage, { intervalMs = 10_000 } = {}) {
  if (pollTimer) {
    throw new Error("[slack-listener] Already listening — call stop first.");
  }

  await loadLastSeenTs();
  console.log(
    `[slack-listener] Listening on channel ${SLACK_CHANNEL_ID} every ${intervalMs / 1000}s` +
      (lastSeenTs ? ` (resuming from ts ${lastSeenTs})` : ""),
  );

  // Run first tick immediately, then schedule recurring ticks
  await tick(onMessage);

  pollTimer = setInterval(() => tick(onMessage), intervalMs);
}

/**
 * Stop the polling loop.
 */
export function stopListening() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    console.log("[slack-listener] Stopped listening.");
  }
}

/**
 * Send a threaded reply to a Slack message.
 *
 * @param {string} channel  Channel ID
 * @param {string} threadTs Timestamp of the parent message
 * @param {string} text     Reply text (supports mrkdwn)
 */
export async function sendReply(channel, threadTs, text) {
  return slack.chat.postMessage({
    channel,
    thread_ts: threadTs,
    text,
  });
}

/**
 * Get the permalink URL for a specific message.
 *
 * @param {string} channel Channel ID
 * @param {string} ts      Message timestamp
 * @returns {Promise<string>} Permalink URL
 */
export async function getMessagePermalink(channel, ts) {
  const result = await slack.chat.getPermalink({
    channel,
    message_ts: ts,
  });
  return result.permalink;
}
