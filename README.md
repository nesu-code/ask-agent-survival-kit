# Agent Survival Kit (ASK) — MVP

ASK is a safety layer for autonomous agents: **human-owned policy on-chain**, deterministic **runtime enforcement**, and auditable **decision logs**.

This repo is runnable locally and includes an ERC-712 authorization path on the Solidity side.

## What ships in this MVP

- **On-chain policy contract** (`contracts/src/PolicyRegistry.sol`)
  - owner-only policy mutation paths
  - panic mode kill switch
  - explicit policy versioning
  - ERC-712 typed intent authorization (`authorizeIntent`)
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

## Contract update semantics

`PolicyRegistry.updatePolicy` is **full-replace**:
- all mutable scalar fields are overwritten
- `allowedActions` and `allowedRecipients` are fully replaced (empty array clears values)
- owner change is rejected in `updatePolicy`; use `rotateOwner`
- `policyVersion` is internal-only and increments on update/panic/owner-rotation

## ERC-712 signing flow (MVP)

`authorizeIntent(ActionIntent intent, bytes signature)` verifies an owner-signed typed intent.

Typed fields:
- `requestId`
- `nonce`
- `agentId`
- `actionType`
- `recipient`
- `amount`
- `deadline`
- `policyVersion`

Validation sequence:
1. policy exists and panic mode is off
2. `deadline` not expired
3. `intent.policyVersion == current policyVersion`
4. replay guards:
   - `usedRequestIds[agentId][requestId] == false`
   - `usedNonces[agentId][owner][nonce] == false`
5. policy constraints pass (action/recipient/limits)
6. EIP-712 signature recovers to current policy owner
7. requestId + nonce are consumed and `IntentAuthorized` is emitted

Threat-model impact:
- mitigates unauthorized execution (must be owner-signed)
- mitigates replay attacks (requestId + nonce guards)
- mitigates stale-signature use (deadline + policyVersion binding)

## Run commands

```bash
cd /root/.openclaw/workspace/agent-survival-kit
npm install
npm run build
npm test
npm run demo
```

Notes:
- Runtime tests always run.
- Solidity tests run when Foundry (`forge`) is installed; otherwise skipped with a clear message.

## Frontend demo app (Vite + React + TypeScript)

A demo-ready UI lives in `frontend/` with:
- policy create/update form
- panic mode toggle
- action simulation panel (allowed vs blocked outcomes)
- decision log table with reason codes
- local/mock adapter designed for future live API integration

Install frontend dependencies once:

```bash
cd /root/.openclaw/workspace/agent-survival-kit/frontend
npm install
```

From repo root:

```bash
npm run frontend:dev
npm run frontend:build
```

Direct Solidity tests:

```bash
cd /root/.openclaw/workspace/agent-survival-kit/contracts
forge test -vv
```

## Known limitations (pre-submission video)

- No deployment script in this repo yet (deployment template only).
- Decision logger is in-memory (no persistence/tamper-evident chain yet).
- No live on-chain->runtime sync daemon yet; demo uses deterministic local policy object updates.
- Solidity tests require local Foundry installation.
