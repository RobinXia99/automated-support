# Automated Support — Claude Code Instructions

## Challenge

Hackberry Day — Utmaning 3: Automatiserad Support.
Customer emails arrive in Slack. Build an AI-agent system that automates the full flow:
Slack message → triage → ticket number → categorize → confirm receipt → create Linear ticket → suggest/execute fix.

**Stack:** Node.js (ESM), @linear/sdk, @slack/web-api, EmailJS, dotenv

## Work Delegation Rules

**ALL work MUST be delegated to the appropriate agent. The main agent orchestrates — it does NOT write code directly.**

### Code Team — builds the infrastructure

| Agent | Scope | Key files |
|-------|-------|-----------|
| `slack-engineer` | Slack integration — poll/listen for messages, parse content, send replies, thread management | `src/slack.js`, `src/listeners/` |
| `linear-engineer` | Linear integration — create issues with labels/priority/description, update status, assign team | `src/linear.js`, `src/services/linear-service.js` |
| `dashboard-engineer` | Ticket system — SUP-XXXX ID generation, JSON store, ticket state machine (open→triaged→in-progress→resolved), lookup | `src/tickets/` |

### Task Team — builds the automation logic

| Agent | Scope | Key files |
|-------|-------|-----------|
| `triage-agent` | Categorization engine — analyze Slack message content, assign category (bug/feature/question/urgent), set priority (P1-P4), decide if auto-answerable | `src/agents/triage.js` |
| `responder-agent` | Auto-reply — generate confirmation message with ticket ID, draft answer if auto-answerable, send back to Slack thread | `src/agents/responder.js` |
| `planner-agent` | Linear ticket creation — translate triaged ticket into detailed Linear issue with title, description, labels, priority, and action plan | `src/agents/planner.js` |
| `email-agent` | EmailJS notifications — send receipt confirmation email, ticket summary, escalation alerts to support team | `src/agents/email.js`, `src/services/email-service.js` |

### Flow

```
Slack message (customer support email)
  │
  ├─► slack-engineer: receives & parses message
  │
  ├─► dashboard-engineer: creates ticket SUP-XXXX (status: open)
  │
  ├─► triage-agent: categorizes (bug/feature/question/urgent), sets priority
  │     │
  │     ├─► if auto-answerable:
  │     │     └─► responder-agent: drafts & sends answer in Slack thread
  │     │
  │     └─► always:
  │           ├─► responder-agent: sends confirmation with ticket ID
  │           ├─► planner-agent: creates Linear ticket with action plan
  │           └─► email-agent: sends confirmation email to customer
  │
  └─► dashboard-engineer: updates ticket status (triaged → in-progress)
```

### Delegation rules

- **Single-domain task** → delegate to the matching agent
- **Cross-domain task** → delegate to each affected agent in parallel
- **Slack message flow** → `slack-engineer` receives → `triage-agent` categorizes → `responder-agent` replies
- **Ticket creation flow** → `dashboard-engineer` creates local ticket → `planner-agent` creates Linear issue
- **Notification flow** → `email-agent` sends confirmations → `responder-agent` posts Slack reply
- **Never write code directly** — always delegate to the right agent
- **Quick lookup** → use Glob/Grep directly, don't spawn an agent

### How to delegate

```
Agent(subagent_type="general-purpose", description="<agent-name>: <3-5 word summary>", prompt="<specific task with file paths and constraints>")
```

## Architecture

```
src/
  index.js                — entry point, orchestrates the flow
  linear.js               — Linear client (shared)
  slack.js                — Slack WebClient (shared)
  config.js               — env vars, constants
  listeners/
    slack-listener.js     — poll Slack for new messages
  agents/
    triage.js             — categorization logic
    responder.js          — auto-reply generation
    planner.js            — Linear ticket planning
    email.js              — email notification logic
  services/
    linear-service.js     — Linear API helpers (create issue, add labels)
    email-service.js      — EmailJS send helpers
  tickets/
    store.js              — JSON-based ticket store
    id-generator.js       — SUP-XXXX sequential IDs
```

## Constraints

- ESM modules (`"type": "module"`)
- No frameworks — plain Node.js
- No design/UI yet — foundation only
- All secrets in `.env` (gitignored)
- Ticket IDs format: `SUP-XXXX` (auto-incrementing, zero-padded)
- Every Slack message in monitored channel = 1 support ticket
- Categories: `bug`, `feature`, `question`, `urgent`
- Priorities: `P1` (critical), `P2` (high), `P3` (medium), `P4` (low)
