# Automated Support — Claude Code Instructions

## Challenge

Hackberry Day — Utmaning 3: Automatiserad Support.
Customer emails arrive in Slack. Build an AI-agent system that automates the full flow:
Slack message → triage → ticket number → categorize → confirm receipt → create Linear ticket → suggest/execute fix.

**Stack:** Node.js (ESM), @linear/sdk, @slack/web-api, EmailJS, dotenv

## Work Delegation Rules

**ALL work MUST be delegated to the appropriate agent. The main agent orchestrates — it does NOT write code directly.**

Each agent has a detailed spec in `.claude/agents/<name>.md`. Read the agent file before delegating.

### Code Team — builds the infrastructure

| Agent | File | Scope |
|-------|------|-------|
| `slack-engineer` | `.claude/agents/slack-engineer.md` | Slack polling, message parsing, threaded replies |
| `linear-engineer` | `.claude/agents/linear-engineer.md` | Linear issue CRUD, labels, workflow states |
| `dashboard-engineer` | `.claude/agents/dashboard-engineer.md` | SUP-XXXX ticket IDs, JSON store, state machine |

### Task Team — builds the automation logic

| Agent | File | Scope |
|-------|------|-------|
| `triage-agent` | `.claude/agents/triage-agent.md` | Categorize messages, assign priority, detect auto-answerable |
| `responder-agent` | `.claude/agents/responder-agent.md` | Confirmation + auto-reply messages in Slack threads |
| `planner-agent` | `.claude/agents/planner-agent.md` | Translate triaged tickets into detailed Linear issues |
| `email-agent` | `.claude/agents/email-agent.md` | EmailJS confirmations, summaries, escalation alerts |

### Flow

```
Slack message (customer support email)
  │
  ├─► slack-engineer: receives & parses message
  │
  ├─► dashboard-engineer: creates ticket SUP-XXXX (status: new)
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
  └─► dashboard-engineer: updates ticket status (new → triaged → in-handling)
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

## Linear — Hackberry Expo

- **Team ID:** `ed718270-d482-4a1d-b339-e3f1b1786606`
- **Key:** `HAC2`

### Workflow States

| State | ID | Type |
|-------|-----|------|
| New | `e7a9d144-5d41-4fe5-a96b-28d05810d774` | unstarted |
| Triaged | `c634ffc1-f9b0-4e78-8442-d5b1f589500b` | unstarted |
| Awaiting Response | `b3ffca59-ad5d-4dc1-93fc-3ca0cd275cb9` | started |
| In Handling | `a81da4f3-f259-4aea-a569-a868997485a4` | started |
| Escalated | `eded2803-3003-42b4-a8d0-6bcfb4158c46` | started |
| Resolved | `86d3cd3a-dcd9-487a-b568-0dd3fd00c25b` | completed |
| Closed | `ebffbfd8-9d50-4108-b805-7cac9207ebf8` | completed |
| Spam / Invalid | `eeca9ad2-3f70-49d8-8c11-9b755822f760` | canceled |

### Labels

| Label | ID |
|-------|-----|
| Support: Bug | `c313936f-fa39-48b9-841c-de743646fa61` |
| Support: Feature | `95ed94b6-c01b-42d6-8f20-46076f664df4` |
| Support: Question | `0450483f-2f58-422e-b658-5f7a9656594f` |
| Support: Urgent | `15a201f0-d0c0-4797-8751-bdbd0334af6e` |

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
