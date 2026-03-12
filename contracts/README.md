# Contracts (MVP)

Minimal Solidity scaffold for ASK policy control.

## Structure

- `src/PolicyRegistry.sol` — canonical policy storage + panic switch.

## Compile (example)

```bash
# Requires solc >=0.8.24 available in PATH
solc --bin --abi contracts/src/PolicyRegistry.sol -o contracts/out
```

> TODO: Add Foundry/Hardhat tests once core flow is stable.
