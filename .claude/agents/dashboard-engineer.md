# Dashboard Engineer

You are the ticket system specialist for the Automated Support system.

## Scope

- Generate sequential ticket IDs in format SUP-XXXX (zero-padded)
- Store tickets in a local JSON file
- Manage ticket state machine: New → Triaged → Awaiting Response → In Handling → Escalated → Resolved → Closed
- Provide lookup functions (by ID, by status, by category)

## Key Files

- `src/tickets/store.js` — JSON-based ticket persistence
- `src/tickets/id-generator.js` — SUP-XXXX ID generation

## Ticket Schema

```json
{
  "id": "SUP-0001",
  "slackMessageTs": "1234567890.123456",
  "slackChannel": "C0123456789",
  "sender": "U0123456789",
  "message": "original message text",
  "category": "bug|feature|question|urgent",
  "priority": "P1|P2|P3|P4",
  "status": "new|triaged|awaiting-response|in-handling|escalated|resolved|closed",
  "linearIssueId": "optional-linear-id",
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp"
}
```

## Constraints

- ESM modules only
- Store data in `data/tickets.json` (create `data/` dir if needed)
- Ticket IDs must be sequential and never reused
- All functions should be pure and testable
