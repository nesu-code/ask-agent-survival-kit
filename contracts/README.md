# Contracts (MVP)

## PolicyRegistry

`src/PolicyRegistry.sol` is the on-chain source of truth for per-agent policy.
It includes an ERC-712 signed intent authorization primitive for deterministic execution gating.

### Update semantics (enforced)

- `registerPolicy`: one-time registration per `agentId`; caller must equal `policy.owner`.
- `updatePolicy`: **full-replace** semantics for mutable policy fields and arrays (`allowedActions`, `allowedRecipients`).
- `updatePolicy` cannot rotate owner; use `rotateOwner`.
- `policyVersion` is managed internally:
  - starts at `1` on register
  - increments on update / panic toggle / owner rotation

### ERC-712 intent model

- EIP-712 domain:
  - name: `ASK PolicyRegistry`
  - version: `1`
  - chainId: `block.chainid`
  - verifyingContract: `address(this)`
- Typed struct:
  - `ActionIntent(bytes32 requestId,uint256 nonce,bytes32 agentId,bytes32 actionType,address recipient,uint256 amount,uint64 deadline,uint64 policyVersion)`
- `authorizeIntent(intent, signature)` checks:
  - policy exists, panic mode off
  - deadline not expired
  - intent policyVersion matches current policyVersion
  - `requestId` unused
  - nonce unused for current owner
  - action/recipient/spend limits pass
  - recovered signer equals current policy owner
- Replay protection:
  - `usedRequestIds[agentId][requestId]`
  - `usedNonces[agentId][owner][nonce]`

### Tests

Foundry tests in `contracts/test/PolicyRegistry.t.sol` cover:
- owner-only mutation paths
- register/update semantics
- version increments
- panic mode behavior
- valid ERC-712 signature
- invalid signer rejection
- expired deadline rejection
- replay attack rejection

Run (if Foundry is installed):

```bash
cd contracts
forge test -vv
```
