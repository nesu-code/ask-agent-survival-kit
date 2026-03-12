# ASK Frontend (Neon Mission Deck Redesign)

This frontend keeps all ASK core behavior intact while introducing a full architecture + visual redesign.

## What stayed functional

- Policy create/update
- Panic mode toggle
- Action simulation + scenario loading
- Decision logs with reason codes and policy version

## Changelog (full redesign highlights)

- Rebuilt page architecture into a **hero + segmented workspace** model
  - New hero zone with interactive orbit animation toggle
  - Distinct navigation dock with 3 focused views:
    - **Mission Control** (policy + panic)
    - **Simulator Bay** (scenario + action simulation)
    - **Audit Stream** (decision logs)
- Completely reworked component composition and spacing
  - New panel/module system, context headers, and responsive layout behavior
- New FUN/COOL/MODERN visual system
  - Bold multi-layer gradients + neon accents
  - Animated hero rings, hover transitions, and smooth micro-interactions
  - Clear status chips/badges and stronger visual hierarchy
- UX clarity improvements
  - Better labels/help text and task framing
  - Empty-state guidance in logs and simulation
  - Success/error notices for runtime operations
  - Mobile + laptop responsive refinements
- Lightweight implementation
  - CSS-first redesign (no heavy UI dependency additions)

## Run locally

```bash
cd /root/.openclaw/workspace/agent-survival-kit/frontend && npm install && npm run dev
```

## Build verification

```bash
npm run build
```
