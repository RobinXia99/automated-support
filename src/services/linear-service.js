import linear from "../linear.js";
import {
  LINEAR_TEAM_ID,
  LINEAR_STATES,
  LINEAR_LABELS,
} from "../config.js";

// ---------------------------------------------------------------------------
// Issue CRUD
// ---------------------------------------------------------------------------

/**
 * Creates a Linear issue in the support team.
 * @param {object}   opts
 * @param {string}   opts.title
 * @param {string}   opts.description
 * @param {number}   [opts.priority]   – Linear priority (1‑4)
 * @param {string[]} [opts.labelIds]
 * @param {string}   [opts.stateId]
 * @returns {Promise<{id: string, url: string}>}
 */
export async function createIssue({
  title,
  description,
  priority,
  labelIds,
  stateId,
}) {
  const payload = {
    teamId: LINEAR_TEAM_ID,
    title,
    description,
  };

  if (priority !== undefined) payload.priority = priority;
  if (labelIds?.length) payload.labelIds = labelIds;
  if (stateId) payload.stateId = stateId;

  const response = await linear.createIssue(payload);
  const issue = await response.issue;

  return { id: issue.id, url: issue.url, identifier: issue.identifier };
}

/**
 * Updates the workflow state of an existing issue.
 * @param {string} issueId
 * @param {string} stateId
 */
export async function updateIssueState(issueId, stateId) {
  return linear.updateIssue(issueId, { stateId });
}

/**
 * Fetches a single issue by ID, including assignee info.
 * @param {string} issueId
 * @returns {Promise<object>}
 */
export async function getIssue(issueId) {
  const issue = await linear.issue(issueId);
  const assignee = await issue.assignee;

  return {
    id: issue.id,
    title: issue.title,
    description: issue.description,
    url: issue.url,
    priority: issue.priority,
    state: await issue.state,
    assignee: assignee
      ? { id: assignee.id, name: assignee.name, email: assignee.email }
      : null,
  };
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

const CATEGORY_TO_LABEL = {
  bug: LINEAR_LABELS.Bug,
  feature: LINEAR_LABELS.Feature,
  question: LINEAR_LABELS.Question,
  urgent: LINEAR_LABELS.Urgent,
  general: null,
};

/**
 * Maps a human-readable category string to its Linear label ID.
 * Returns null for unknown or "general" categories.
 * @param {string} category
 * @returns {string|null}
 */
export function mapCategoryToLabel(category) {
  return CATEGORY_TO_LABEL[category?.toLowerCase()] ?? null;
}

const PRIORITY_MAP = {
  P1: 1,
  P2: 2,
  P3: 3,
  P4: 4,
};

/**
 * Maps a priority string (P1–P4) to Linear's numeric priority.
 * @param {string} priority – e.g. "P1"
 * @returns {number|undefined}
 */
export function mapPriorityToLinear(priority) {
  return PRIORITY_MAP[priority] ?? undefined;
}

// ---------------------------------------------------------------------------
// Status checks
// ---------------------------------------------------------------------------

const RESOLVED_STATE_IDS = new Set([
  LINEAR_STATES.Resolved,
  LINEAR_STATES.Closed,
]);

/**
 * Checks whether an issue is in a terminal state (Resolved or Closed).
 * @param {string} issueId
 * @returns {Promise<boolean>}
 */
export async function checkIssueResolved(issueId) {
  const issue = await linear.issue(issueId);
  const state = await issue.state;
  return RESOLVED_STATE_IDS.has(state.id);
}
