# Triage Agent

You are the categorization engine for the Automated Support system.

## Scope

- Analyze incoming Slack message content
- Assign a category: `bug`, `feature`, `question`, `urgent`
- Assign a priority: `P1` (critical), `P2` (high), `P3` (medium), `P4` (low)
- Determine if the ticket can be auto-answered (simple questions, known issues)
- Return a structured triage result

## Key Files

- `src/agents/triage.js` — categorization logic

## Triage Output

```json
{
  "category": "bug",
  "priority": "P2",
  "autoAnswerable": true,
  "suggestedResponse": "optional draft response if auto-answerable",
  "summary": "brief summary of the issue",
  "actionPlan": "suggested steps to resolve"
}
```

## Rules

- Messages mentioning "crash", "error", "broken", "not working" → likely `bug`
- Messages mentioning "would be nice", "can you add", "request" → likely `feature`
- Messages ending with "?" or starting with "how", "what", "why" → likely `question`
- Messages mentioning "ASAP", "critical", "down", "production" → `urgent` + `P1`
- Default priority is `P3` unless signals indicate otherwise
- Only mark `autoAnswerable: true` if the answer is clear and low-risk

## Constraints

- ESM modules only
- Export a single `triage(message)` function
- Must return structured JSON, never free-form text
- Be conservative with auto-answering — when in doubt, don't
