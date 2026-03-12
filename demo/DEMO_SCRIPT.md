# ASK MVP Demo Script (Local, deterministic)

## Setup

```bash
cd /root/.openclaw/workspace/agent-survival-kit
npm install
npm run build
```

## Run end-to-end local demo

```bash
npm run demo
```

This runs a deterministic local flow that demonstrates:
- policy create (v1)
- signed intent authorization path (local deterministic relay)
- replay rejection (`requestId`/`nonce` behavior)
- policy update (v2)
- panic mode activation (v3)
- runtime enforcer decisions
- decision logger records

For Solidity-side cryptographic ERC-712 verification (`ecrecover`), run Foundry tests (below).

## Run checks

```bash
npm test
```

If Foundry (`forge`) is installed, Solidity tests run too. If not installed, contract tests are skipped with a message.
