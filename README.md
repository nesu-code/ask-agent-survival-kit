# Agent Survival Kit (ASK) — MVP

ASK is a safety layer for autonomous agents: **human-owned policy on-chain**, deterministic **runtime enforcement**, and auditable **decision logs**.

This repo is now runnable locally as an MVP.

## What ships in this MVP

- **On-chain policy contract** (`contracts/src/PolicyRegistry.sol`)
  - owner-only policy mutation paths
  - panic mode kill switch
  - explicit policy versioning
- **Runtime enforcer** (`runtime/src/enforcer.ts`)
  - deterministic allow/block decisions with reason codes
- **Decision logger** (`api/src/logger.ts`)
  - in-memory structured records for allow/block outcomes
- **Local end-to-end demo** (`demo/run-local-demo.js`)
  - policy create/update/panic lifecycle + runtime decisions + logged records

## Architecture and specs

- Product context: [`ASK-PRD.md`](./ASK-PRD.md)
- Architecture: [`ARCHITECTURE.md`](./ARCHITECTURE.md)
- Security model: [`docs/SECURITY_MODEL.md`](./docs/SECURITY_MODEL.md)
- Deployment tracking template: [`docs/DEPLOYMENTS.md`](./docs/DEPLOYMENTS.md)
- Demo steps: [`demo/DEMO_SCRIPT.md`](./demo/DEMO_SCRIPT.md)

## Contract update semantics (important)

`PolicyRegistry.updatePolicy` is **full-replace**:
- all mutable scalar fields are overwritten
- `allowedActions` and `allowedRecipients` are fully replaced (empty array clears values)
- owner change is rejected in `updatePolicy`; use `rotateOwner`
- `policyVersion` is internal-only and increments on update/panic/owner-rotation

## Quick start

```bash
cd /root/.openclaw/workspace/agent-survival-kit
npm install
npm run build
```

## Run tests

```bash
npm test
```

- Runtime tests always run.
- Solidity tests run when Foundry (`forge`) is installed; otherwise they are skipped with a clear message.

## Run the local MVP demo

```bash
npm run demo
```

Demo output shows:
1. policy create (v1)
2. allowed request (`ALLOW_WITHIN_POLICY`)
3. policy update (v2, full-replace allowlist)
4. blocked request (`BLOCK_RECIPIENT_NOT_ALLOWED`)
5. panic mode enabled (v3)
6. blocked request (`BLOCK_PANIC_MODE_ACTIVE`)
7. final decision log records

## Solidity tests (Foundry)

Files:
- `contracts/test/PolicyRegistry.t.sol`

Coverage includes:
- owner-only behavior
- register/update semantics
- version increments
- panic mode behavior

Run directly:

```bash
cd contracts
forge test -vv
```

## Known limitations (pre-submission video)

- No deployment script in this repo yet (deployment template only).
- Decision logger is in-memory (no persistence/tamper-evident chain yet).
- No live on-chain->runtime sync daemon yet; demo uses deterministic local policy object updates.
- Solidity tests require local Foundry installation.
