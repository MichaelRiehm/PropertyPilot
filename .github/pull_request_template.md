<!--
Closes #<issue-number>

Before opening this PR, please make sure:
- The branch name matches the change type (feat/... fix/... refactor/... chore/... docs/...)
- CI is green locally (`npm run test`, `npm run build`)
- The change is scoped to one issue — no drive-by refactors
-->

## Summary

<!-- One or two sentences on what this PR does. -->

## What changed

<!-- Bulleted list. Focus on behavior, not implementation. -->

-
-

## Why

<!-- The user problem this solves, or the engineering rationale. -->

## Test evidence

<!-- How did you verify this works? Screenshots, terminal output, a manual test plan? -->

## Checklist

- [ ] Follows the [architecture rules in CLAUDE.md](../CLAUDE.md#non-negotiable-architecture-rules)
- [ ] Zod schemas updated in **both** `backend/src/schemas/` and `frontend/src/schemas/` (if validation changed)
- [ ] Domain class + mapper updated (if a Prisma field was added or changed)
- [ ] New tests added or updated; existing tests still pass
- [ ] No new dependencies (or a human approved the addition)
- [ ] Docs updated where relevant (README, CLAUDE.md)

## AI-agent transparency

<!-- If an AI agent (Claude, Cursor, Copilot, aider, etc.) drafted or heavily contributed to this PR, mention it here. It's not a demerit — it's how we build. Just be honest about what the agent did and what a human then verified. -->

- Agent used:
- What the agent did:
- What I (human) verified before opening the PR:
