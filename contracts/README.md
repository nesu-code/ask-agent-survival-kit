# Contracts (MVP)

## PolicyRegistry

`src/PolicyRegistry.sol` is the on-chain source of truth for per-agent policy.

### Update semantics (enforced)

- `registerPolicy`: one-time registration for `agentId`; caller must equal `policy.owner`.
- `updatePolicy`: **full-replace** semantics for policy fields and arrays (`allowedActions`, `allowedRecipients`).
- `updatePolicy` cannot rotate owner; use `rotateOwner` for explicit ownership transfer.
- `policyVersion` is managed internally:
  - starts at `1` on register
  - increments on update / panic toggle / owner rotation

### Tests

Foundry tests are in `contracts/test/PolicyRegistry.t.sol` and cover:
- owner-only mutation paths
- register/update semantics
- version increments
- panic mode behavior

Run (if Foundry is installed):

```bash
cd contracts
forge test -vv
```
