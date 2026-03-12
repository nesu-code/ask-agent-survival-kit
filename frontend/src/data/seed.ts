import { RuntimePolicy } from '../types/domain';

const now = Math.floor(Date.now() / 1000);

export const basePolicy: RuntimePolicy = {
  agentId: 'agent-ask-001',
  policyVersion: 1,
  panicMode: false,
  expiresAt: now + 60 * 60 * 24,
  spendLimitTotal: 1000,
  spentTotal: 120,
  rateLimitPerWindow: 250,
  windowSizeSec: 60,
  windowSpent: 20,
  windowStart: now,
  allowedActions: ['transfer', 'swap', 'message'],
  allowedRecipients: ['vault.safe', 'ops.safe', 'vendor.whitelist']
};
