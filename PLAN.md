# Synthesis Hackathon Plan (Nesu + Jar)

## Goal
Ship one tight MVP in 14 days with clear human+agent collaboration, public code, demo video, and docs.

## Recommended Theme
**Agents that pay** (highest execution speed + clear on-chain proof).

## Project Concept (v1)
**Scoped Agent Wallet**
- Human sets spending policy (allowlist recipient + max budget + expiry)
- Agent executes allowed payments only
- All actions are logged on-chain + in a readable activity feed

## MVP Scope (must ship)
1. Policy creation (amount, token, recipient, expiry)
2. Payment execution via agent
3. Policy enforcement (reject out-of-policy tx)
4. Simple dashboard / CLI logs
5. README + architecture + demo video

## Stretch (only if MVP done)
- Escrow/conditional release
- Attestation for completed task
- Multi-agent payment coordination

## Repo Structure
- /contracts (policy guard + wallet helper)
- /app (frontend or API)
- /agent (tool wrappers + orchestrator prompts)
- /docs (architecture, user flow, submission notes)
- /demo (video script + screenshots)

## 48-Hour Execution Sprint
### Day 0 (today)
- Finalize scope and architecture
- Set repo skeleton
- Define contracts/interfaces

### Day 1
- Implement policy contract + tests
- Implement executePayment flow
- Add basic agent tool calls

### Day 2
- Build minimal UI/log view
- End-to-end test
- Draft README + record rough demo

## Submission Checklist
- [ ] Public repo with clear setup
- [ ] Working demo (not slides only)
- [ ] On-chain tx links included
- [ ] Human-agent collaboration log included
- [ ] Short architecture explanation
- [ ] Tradeoffs + future roadmap

## Operating Rules
- Keep scope brutal.
- Ship working path first, polish later.
- Every day ends with a runnable demo.
