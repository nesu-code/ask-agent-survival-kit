# PRD — Agent Survival Kit (ASK)

## 1. Product Overview
Agent Survival Kit (ASK) is a safety layer for autonomous AI agents.
It combines **on-chain policy control** with **runtime enforcement** so agents can operate autonomously without gaining unrestricted treasury or tool authority.

ASK is designed for OpenClaw-like runtimes but aims to be portable across agent frameworks.

**One-line positioning:**
> Cloudflare for AI agents: policy-enforced autonomy with emergency controls and auditability.

---

## 2. Problem Statement
As AI agents become more autonomous, operators face critical risks:

1. **Prompt injection / instruction hijacking** causing unintended actions
2. **Unbounded spending authority** that can drain funds quickly
3. **Unsafe tool execution** (e.g., shell/tool misuse)
4. **No universal panic mechanism** to instantly reduce risk
5. **Poor forensic visibility** into why an action was allowed or blocked

Current setups rely too heavily on off-chain, ad-hoc controls and trust in runtime behavior.

---

## 3. Goals
ASK should:

1. Enforce human-defined risk boundaries for agent actions
2. Preserve useful autonomy within those boundaries
3. Provide an owner-triggered emergency mode (panic switch)
4. Generate verifiable audit trails for critical decisions
5. Fail safely under degraded conditions

---

## 4. Non-Goals (MVP)
- Full enterprise multi-tenant policy admin system
- Advanced semantic prompt firewalling
- Full decentralized identity standard implementation
- End-to-end zero-knowledge privacy pipeline

---

## 5. Target Users
- Web3 builders deploying autonomous agents for ops/treasury
- Small teams needing immediate guardrails without heavy infra
- Agent operators coordinating agent-to-agent workflows

---

## 6. Core Value Proposition
**Autonomy without custody-level risk.**

ASK separates:
- **Policy sovereignty** (human owner)
- **Execution autonomy** (agent runtime)

The agent can execute fast, but cannot exceed on-chain risk boundaries.

---

## 7. User Stories
1. As an owner, I want to set spend and action limits so my agent cannot drain treasury.
2. As an owner, I want to trigger panic mode instantly if suspicious behavior appears.
3. As an auditor, I want to inspect decision logs (allow/block + reason) for incident analysis.
4. As an operator, I want fail-closed behavior for high-risk actions if policy sync fails.

---

## 8. MVP Scope

### 8.1 On-Chain Policy Registry
Store policy per `agentId`:
- `owner`
- `spendLimitTotal`
- `spendRateLimit` (per time window)
- `allowedActions` (enum/hash list)
- `allowedRecipients` (optional)
- `riskLevel` (low/medium/high)
- `expiresAt`
- `panicMode`

Core functions:
- `registerPolicy(...)`
- `updatePolicy(...)`
- `setPanicMode(agentId, bool)`
- `rotateOwner(...)`

### 8.2 Runtime Policy Enforcer
A middleware layer in agent runtime that checks policy before critical actions.

Decision outputs:
- `ALLOW`
- `BLOCK_POLICY_VIOLATION`
- `BLOCK_PANIC_MODE`
- `BLOCK_POLICY_UNAVAILABLE` (for high-risk fail-closed path)

### 8.3 Incident & Decision Logging
For each critical action:
- `requestId`
- `actionType`
- `decision`
- `reasonCode`
- `policyVersion`
- `evidenceHash` (Walrus/IPFS/fallback hash)
- `timestamp`

### 8.4 Emergency Controls
When panic mode is enabled:
- Spending actions are blocked
- High-risk tool classes are blocked
- Read-only / low-risk operations remain available (configurable)

---

## 9. Functional Requirements
- **FR1**: System must support policy create/update/read on-chain.
- **FR2**: Runtime must evaluate policy before every critical action.
- **FR3**: Panic mode must override normal allow logic for restricted action classes.
- **FR4**: Spending must enforce both rate limit and total limit.
- **FR5**: Every critical decision must produce structured logs.
- **FR6**: Runtime must support cached policy with TTL and deterministic fallback behavior.

---

## 10. Non-Functional Requirements
- Decision latency (cache hit): **<150ms** target
- High-risk action path: **fail-closed** if policy state is uncertain
- Idempotent action execution via `requestId`
- Audit log completeness for all critical actions
- Demo reliability target during judging window: **>99% successful flow execution**

---

## 11. Security Model
### Principles
- Least privilege by default
- Time-bounded authority
- Explicit emergency override
- Deterministic policy checks
- Tamper-evident logging references

### Threats & Mitigations
1. **Prompt injection** → policy gate blocks disallowed actions
2. **Burst drain attempt** → rate + total caps
3. **Replay / duplicate processing** → requestId + intent state handling
4. **Policy endpoint outage** → cache + fail-closed for high risk
5. **Unauthorized operator changes** → owner-only policy mutation

---

## 12. Data Model (MVP)

### On-chain
- `AgentPolicy`
  - `agentId: bytes32`
  - `owner: address`
  - `spendLimitTotal: uint256`
  - `spentTotal: uint256`
  - `rateLimitPerWindow: uint256`
  - `windowSizeSec: uint64`
  - `windowSpent: uint256`
  - `windowStart: uint64`
  - `expiresAt: uint64`
  - `panicMode: bool`
  - `policyVersion: uint64`

### Off-chain (runtime log)
- `DecisionRecord`
  - `requestId: string`
  - `agentId: string`
  - `actionType: string`
  - `decision: enum`
  - `reasonCode: string`
  - `evidenceHash: string`
  - `policyVersion: number`
  - `createdAt: timestamp`

---

## 13. UX / Operator Flow
1. Owner registers policy for an agent
2. Agent runs normally within allowed scope
3. Runtime checks policy on each critical action
4. Action is executed or blocked with reason code
5. If incident occurs, owner activates panic mode
6. Runtime immediately enforces panic restrictions
7. Operator reviews structured logs for postmortem

---

## 14. Demo Scenario (2–3 minutes)
1. Create policy (`maxTotal`, `rateLimit`, `allowedRecipients`)
2. Execute a valid payment (allowed)
3. Attempt out-of-policy spend (blocked)
4. Trigger panic mode on-chain
5. Attempt another spend (blocked due to panic)
6. Show logs + on-chain event evidence

---

## 15. Success Metrics (Hackathon)
- 100% of malicious spend attempts blocked under defined policy
- Panic activation to effective block: near-immediate (chain confirmation + runtime check)
- 100% critical actions produce decision records
- End-to-end demo completed in <3 minutes

---

## 16. Tech Stack (Suggested)
- Smart contracts: Solidity on Base Sepolia (or Sui Move if capability-native path chosen)
- Runtime integration: OpenClaw middleware/plugin
- Log API: Node.js + lightweight storage
- Evidence references: Walrus/IPFS + fallback hash marker

---

## 17. Milestones (72-hour MVP)

### Day 1
- Policy contract + tests
- Basic policy CRUD and panic toggle

### Day 2
- Runtime enforcer middleware
- Decision reason codes and logging pipeline

### Day 3
- End-to-end demo wiring
- Documentation, architecture diagram, and demo script

---

## 18. Open Questions
1. Final chain choice for MVP: Base Sepolia vs Sui testnet?
2. Which critical action classes are in v1 (spend, exec, external messaging)?
3. Should recipient allowlist be strict by default or optional?
4. How long should policy cache TTL be for safe operations?
5. Do we include lightweight Ethereum anchoring if Sui is selected?

---

## 19. Appendix — Draft Reason Codes
- `ALLOW_WITHIN_POLICY`
- `BLOCK_ACTION_NOT_ALLOWED`
- `BLOCK_RECIPIENT_NOT_ALLOWED`
- `BLOCK_SPEND_RATE_EXCEEDED`
- `BLOCK_SPEND_TOTAL_EXCEEDED`
- `BLOCK_POLICY_EXPIRED`
- `BLOCK_PANIC_MODE_ACTIVE`
- `BLOCK_POLICY_UNAVAILABLE_FAIL_CLOSED`
