# ASK Security Model (MVP)

## Scope

This document defines baseline controls for the ASK MVP scaffold.

## Trust Boundaries

1. **Policy Registry (on-chain)**: source of truth for agent policy.
2. **Runtime Enforcer (off-chain)**: deterministic decision gate before execution.
3. **Action Executor (off-chain)**: must execute only when enforcer returns `ALLOW`.
4. **Decision Logger (off-chain)**: captures allow/block outcomes for forensics.

## Core Invariants

- Owner-only policy mutations (`register/update/panic/rotateOwner` control path).
- Panic mode blocks high-risk actions immediately at runtime.
- High-risk requests fail closed if policy is unavailable.
- Deterministic evaluation order prevents ambiguous outcomes.
- Every critical request emits a structured `DecisionRecord`.
- On-chain critical intent authorization requires valid ERC-712 owner signature.
- Signed intent replay is blocked by requestId and nonce consumption.
- Signed intent freshness is enforced by `deadline` and `policyVersion` binding.

## Threats and Mitigations (MVP)

- **Prompt injection** -> policy checks on action class/recipient/spend.
- **Treasury drain burst** -> rate + total spend checks.
- **Policy backend outage** -> fail-closed code path with explicit reason.
- **Operator key compromise** -> TODO: multi-sig / role split in post-MVP.
- **Log tampering** -> TODO: append-only persistence + hash chaining.

## Deferred Hardening (TODO)

- Add property/fuzz checks for policy limits.
- Add request idempotency handling at executor level.
- Add signed policy snapshots from sync service.
- Add persistent audit storage and retention policy.
- Add incident runbook for panic activation and rollback.
