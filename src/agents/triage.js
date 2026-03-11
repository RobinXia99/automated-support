// Keyword-based ticket categorization engine.
// Uses knowledge base from hackberry.se for auto-answering.

import { findAnswer } from '../knowledge-base.js';

const URGENT_KEYWORDS = ['asap', 'critical', 'urgent', 'production down', 'emergency'];
const BUG_KEYWORDS = ['crash', 'error', 'broken', 'not working', '500', 'down'];
const FEATURE_KEYWORDS = ['would be nice', 'can you add', 'request', 'idea', 'suggest'];
const QUESTION_STARTS = ['how', 'what', 'why', 'where', 'can i', 'is there'];
const BILLING_KEYWORDS = ['billing', 'invoice', 'payment', 'charge', 'subscription'];
const HIGH_SEVERITY_BUG_KEYWORDS = ['production', 'all users', 'blocking'];

function lowered(msg) {
  return msg.toLowerCase().trim();
}

function containsAny(text, keywords) {
  return keywords.some((kw) => text.includes(kw));
}

function classifyCategory(msg) {
  const lower = lowered(msg);

  if (containsAny(lower, URGENT_KEYWORDS)) return 'urgent';
  if (containsAny(lower, BUG_KEYWORDS)) return 'bug';
  if (containsAny(lower, FEATURE_KEYWORDS)) return 'feature';

  // Question detection: ends with "?" or starts with question words
  if (msg.trim().endsWith('?')) return 'question';
  if (QUESTION_STARTS.some((start) => lower.startsWith(start))) return 'question';

  if (containsAny(lower, BILLING_KEYWORDS)) return 'general';

  return 'general';
}

function classifyPriority(category, msg) {
  const lower = lowered(msg);

  if (category === 'urgent') return 'P1';
  if (category === 'bug') {
    return containsAny(lower, HIGH_SEVERITY_BUG_KEYWORDS) ? 'P2' : 'P3';
  }
  if (category === 'feature') return 'P4';
  if (category === 'question') return 'P4';
  return 'P3';
}

function isAutoAnswerable(category, msg) {
  // If knowledge base has an answer, it's auto-answerable regardless of category
  if (findAnswer(msg)) return true;
  if (category === 'urgent') return false;
  if (category === 'bug') return false;
  if (category === 'feature') return true;
  if (category === 'question') return true;
  // general — billing or misc
  return false;
}

function generateSubject(msg) {
  // Strip excess whitespace, cap at 60 chars
  const cleaned = msg.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 60) return cleaned;
  return cleaned.slice(0, 57) + '...';
}

function generateSummary(category, msg) {
  const cleaned = msg.replace(/\s+/g, ' ').trim();
  const prefix = {
    urgent: 'URGENT: ',
    bug: 'Bug report: ',
    feature: 'Feature request: ',
    question: 'Question: ',
    general: 'Support request: ',
  }[category];

  const maxContent = 100 - prefix.length;
  const body = cleaned.length <= maxContent
    ? cleaned
    : cleaned.slice(0, maxContent - 3) + '...';
  return prefix + body;
}

function generateSuggestedResponse(category, msg) {
  // First, check knowledge base for a specific answer
  const kbAnswer = findAnswer(msg);
  if (kbAnswer) return kbAnswer;

  if (!isAutoAnswerable(category, msg)) return null;

  if (category === 'feature') {
    return (
      "Thanks for the suggestion! We've logged your feature request and our product team will review it. " +
      "We'll keep you posted on any updates."
    );
  }

  if (category === 'question') {
    return (
      "Thanks for reaching out! We've received your question and will get back to you shortly. " +
      "In the meantime, check our help center for quick answers."
    );
  }

  return null;
}

function generateActionPlan(category, msg) {
  const lower = lowered(msg);

  if (category === 'urgent') {
    return [
      '1. Page on-call engineer immediately',
      '2. Acknowledge receipt to the customer within 15 minutes',
      '3. Investigate root cause and provide status update within 1 hour',
      '4. Resolve or escalate with a detailed incident report',
    ].join('\n');
  }

  if (category === 'bug') {
    return [
      '1. Reproduce the reported issue',
      '2. Check logs and error tracking for related events',
      '3. Implement and test a fix',
      '4. Notify the customer once resolved',
    ].join('\n');
  }

  if (category === 'feature') {
    return [
      '1. Acknowledge the request and thank the customer',
      '2. Log the feature request in the product backlog',
      '3. Evaluate feasibility and prioritize accordingly',
    ].join('\n');
  }

  if (category === 'question') {
    return [
      '1. Review knowledge base for existing answers',
      '2. Draft a clear, helpful response',
      '3. Follow up to confirm the question is resolved',
    ].join('\n');
  }

  // general (billing, etc.)
  if (containsAny(lower, BILLING_KEYWORDS)) {
    return [
      '1. Pull up the customer billing record',
      '2. Investigate the billing concern',
      '3. Respond with a clear explanation or resolution',
    ].join('\n');
  }

  return [
    '1. Review the customer message for details',
    '2. Route to the appropriate team',
    '3. Respond to the customer with next steps',
  ].join('\n');
}

export function triage(message) {
  if (typeof message !== 'string' || message.trim().length === 0) {
    throw new Error('triage() requires a non-empty string message');
  }

  const category = classifyCategory(message);
  const priority = classifyPriority(category, message);
  const autoAnswerable = isAutoAnswerable(category, message);
  const suggestedResponse = generateSuggestedResponse(category, message);
  const summary = generateSummary(category, message);
  const subject = generateSubject(message);
  const actionPlan = generateActionPlan(category, message);

  return {
    category,
    priority,
    autoAnswerable,
    suggestedResponse,
    summary,
    subject,
    actionPlan,
  };
}
