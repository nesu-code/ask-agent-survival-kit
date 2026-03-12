# ASK MVP Tasks (72 Hours)

## Build Strategy
- Keep v1 focused on one end-to-end path.
- Prioritize deterministic security behavior over feature breadth.
- Every day must end with a runnable demo checkpoint.

---

## Day 1 — Policy Layer + Contract Foundation

### Goal
Have an on-chain policy contract that can register, update, and panic-toggle policies.

### Tasks

#### 1. Repo setup
- [ ] Create folders: `contracts/`, `runtime/`, `api/`, `docs/`, `demo/`
- [ ] Add `.env.example` and network config
- [ ] Add lint + test scripts

#### 2. Contract implementation (`PolicyRegistry`)
- [ ] Define `AgentPolicy` struct
- [ ] Implement `registerPolicy(agentId, policy)`
- [ ] Implement `updatePolicy(agentId, policyPatch/full)`
- [ ] Implement `setPanicMode(agentId, enabled)`
- [ ] Implement `rotateOwner(agentId, newOwner)`
- [ ] Emit events (`PolicyRegistered`, `PolicyUpdated`, `PanicModeChanged`)

#### 3. Contract tests
- [ ] Owner-only mutation checks
- [ ] Panic mode toggling checks
- [ ] Policy version increments
- [ ] Expiry behavior sanity checks

#### 4. Deliverable checkpoint
- [ ] Deploy to testnet
- [ ] Save deployed address in `docs/DEPLOYMENTS.md`
- [ ] Record 1–2 tx links proving create/update/panic

---

## Day 2 — Runtime Enforcer + Decision Logging

### Goal
Enforce policy before critical actions with reason-coded outcomes.

### Tasks

#### 1. Policy sync module
- [ ] Build `policyClient` to read contract state
- [ ] Add cache with TTL + `policyVersion`
- [ ] Add retry/backoff behavior

#### 2. Runtime enforcer middleware
- [ ] Implement evaluation pipeline:
  1) policy available
  2) panic mode
  3) expiry
  4) action allowlist
  5) recipient allowlist
  6) rate limit
  7) total limit
- [ ] Return decision enum + reason code

#### 3. Action executor integration
- [ ] Wrap one critical action path (e.g., payment execution)
- [ ] Add idempotency key (`requestId`) handling
- [ ] Ensure blocked actions never execute downstream

#### 4. Decision logging
- [ ] Define `DecisionRecord` schema
- [ ] Log allow/block with reason codes
- [ ] Include policy version and evidence hash field

#### 5. Deliverable checkpoint
- [ ] Demo script: one allowed action + one blocked action
- [ ] Export sample logs showing reason codes

---

## Day 3 — E2E Demo + Docs + Submission Assets

### Goal
Ship a polished end-to-end demo under 3 minutes with clear security story.

### Tasks

#### 1. Panic flow end-to-end
- [ ] Trigger panic mode from operator CLI/script
- [ ] Verify subsequent critical action is blocked
- [ ] Log and present `BLOCK_PANIC_MODE_ACTIVE`

#### 2. Evidence path
- [ ] Integrate Walrus/IPFS upload for reasoning artifact
- [ ] Add fallback marker path (`fallback:<sha256>`) if upload fails
- [ ] Ensure evidence reference appears in decision log

#### 3. Minimal operator UX
- [ ] CLI commands:
  - `policy:create`
  - `policy:update`
  - `policy:panic:on|off`
  - `actions:run`
  - `logs:tail`
- [ ] Optional tiny status page (if time allows)

#### 4. Documentation
- [ ] Finalize `README.md` (problem, architecture, setup, demo)
- [ ] Add `ARCHITECTURE.md` + diagrams
- [ ] Add `SECURITY_MODEL.md`
- [ ] Add `DEMO_SCRIPT.md` (2–3 min narrative)

#### 5. Submission assets
- [ ] Record demo video
- [ ] Include testnet tx links
- [ ] Include collaboration/process notes
- [ ] Include known limitations + next steps

#### 6. Deliverable checkpoint
- [ ] Full dry run from clean environment
- [ ] Confirm all checklist items pass

---

## Must-Have Acceptance Criteria (MVP)
- [ ] Policy can be created and updated on-chain
- [ ] Panic mode can be toggled by owner and enforced in runtime
- [ ] At least one critical action is policy-gated end-to-end
- [ ] Out-of-policy action is blocked with deterministic reason code
- [ ] Every critical action produces a structured decision record
- [ ] Demo completes in <3 minutes without manual patching

---

## Nice-to-Have (Only if MVP complete)
- [ ] Additional action classes (`exec`, `external_send`)
- [ ] Multi-agent policy templates
- [ ] Risk scoring dashboard
- [ ] Optional Ethereum anchoring of log root if non-EVM chain is used

---

## Risk Register (Execution)
1. **Over-scoping**
   - Mitigation: hard freeze MVP scope after Day 1.
2. **Chain/tooling instability**
   - Mitigation: lock versions early, avoid migrations after Day 2 start.
3. **Demo fragility**
   - Mitigation: pre-baked scripts + deterministic fixtures.
4. **Policy sync edge cases**
   - Mitigation: strict fallback and explicit reason codes.

---

## Suggested Owners (if 2-person team)
- **Jar (Human):** contracts, deployment, submission packaging
- **Nesu (Agent):** runtime enforcer logic, docs, demo flow, QA scripts

---

## Final Submission Checklist
- [ ] Public repository
- [ ] Clear setup instructions
- [ ] Working demo video
- [ ] Testnet evidence links
- [ ] Problem-solution clarity in README
- [ ] Explicit security model and trade-offs
