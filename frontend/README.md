# ASK Frontend (Premium Dashboard Refresh)

This frontend keeps ASK demo functionality intact while upgrading the UI to a premium, modern dashboard aesthetic:

- Policy create/update controls
- Panic mode toggle with semantic status badge
- Action simulation with one-click scenarios
- Decision log table with empty state and decision badges

## Visual/UX upgrades

- Strong section hierarchy: **Overview**, **Controls**, **Simulation & Logs**
- Glassmorphism cards, gradient accents, soft shadows
- Improved spacing/typography and consistent component styling
- Better loading and empty states
- Responsive behavior for laptop + mobile widths

## Run locally

```bash
cd /root/.openclaw/workspace/agent-survival-kit/frontend
npm install
npm run dev
```

Or from repo root:

```bash
cd /root/.openclaw/workspace/agent-survival-kit
npm run frontend:dev
```
