export type Decision =
  | "ALLOW"
  | "BLOCK_POLICY_VIOLATION"
  | "BLOCK_PANIC_MODE"
  | "BLOCK_POLICY_UNAVAILABLE";

export type ReasonCode =
  | "ALLOW_WITHIN_POLICY"
  | "BLOCK_ACTION_NOT_ALLOWED"
  | "BLOCK_RECIPIENT_NOT_ALLOWED"
  | "BLOCK_SPEND_RATE_EXCEEDED"
  | "BLOCK_SPEND_TOTAL_EXCEEDED"
  | "BLOCK_POLICY_EXPIRED"
  | "BLOCK_PANIC_MODE_ACTIVE"
  | "BLOCK_POLICY_UNAVAILABLE_FAIL_CLOSED";

export interface RuntimePolicy {
  agentId: string;
  policyVersion: number;
  panicMode: boolean;
  expiresAt: number; // unix seconds
  spendLimitTotal: number;
  spentTotal: number;
  rateLimitPerWindow: number;
  windowSizeSec: number;
  windowSpent: number;
  windowStart: number; // unix seconds
  allowedActions: string[];
  allowedRecipients?: string[];
}

export interface ActionRequest {
  requestId: string;
  actionType: string;
  amount?: number;
  recipient?: string;
  highRisk?: boolean;
  nowSec?: number;
}

export interface EvaluationResult {
  decision: Decision;
  reasonCode: ReasonCode;
  policyVersion: number | null;
}
