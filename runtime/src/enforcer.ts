import {
  ActionRequest,
  EvaluationResult,
  RuntimePolicy,
} from "./types";

export interface EnforcerOptions {
  failClosedForHighRisk?: boolean;
}

/**
 * Deterministic policy evaluator for ASK MVP.
 * Evaluation order MUST remain stable for auditability.
 */
export function evaluateAction(
  policy: RuntimePolicy | null,
  req: ActionRequest,
  opts: EnforcerOptions = {}
): EvaluationResult {
  const failClosed = opts.failClosedForHighRisk ?? true;
  const nowSec = req.nowSec ?? Math.floor(Date.now() / 1000);

  // 1) Policy available?
  if (!policy) {
    if (failClosed && req.highRisk !== false) {
      return blocked("BLOCK_POLICY_UNAVAILABLE_FAIL_CLOSED", null);
    }
    return blocked("BLOCK_POLICY_UNAVAILABLE_FAIL_CLOSED", null);
  }

  // 2) Panic mode active?
  if (policy.panicMode && req.highRisk !== false) {
    return blocked("BLOCK_PANIC_MODE_ACTIVE", policy.policyVersion);
  }

  // 3) Policy expired?
  if (policy.expiresAt > 0 && nowSec >= policy.expiresAt) {
    return blocked("BLOCK_POLICY_EXPIRED", policy.policyVersion);
  }

  // 4) Action class allowed?
  if (!includesNormalized(policy.allowedActions, req.actionType)) {
    return blocked("BLOCK_ACTION_NOT_ALLOWED", policy.policyVersion);
  }

  // 5) Recipient allowed?
  if (req.recipient && policy.allowedRecipients?.length) {
    if (!includesNormalized(policy.allowedRecipients, req.recipient)) {
      return blocked("BLOCK_RECIPIENT_NOT_ALLOWED", policy.policyVersion);
    }
  }

  // 6) Rate limit check
  if (typeof req.amount === "number") {
    const inWindow =
      policy.windowStart > 0 && nowSec - policy.windowStart < policy.windowSizeSec;
    const projectedWindowSpent = (inWindow ? policy.windowSpent : 0) + req.amount;
    if (projectedWindowSpent > policy.rateLimitPerWindow) {
      return blocked("BLOCK_SPEND_RATE_EXCEEDED", policy.policyVersion);
    }
  }

  // 7) Total limit check
  if (typeof req.amount === "number") {
    const projectedTotal = policy.spentTotal + req.amount;
    if (projectedTotal > policy.spendLimitTotal) {
      return blocked("BLOCK_SPEND_TOTAL_EXCEEDED", policy.policyVersion);
    }
  }

  // 8) Allow
  return {
    decision: "ALLOW",
    reasonCode: "ALLOW_WITHIN_POLICY",
    policyVersion: policy.policyVersion,
  };
}

function blocked(
  reasonCode: EvaluationResult["reasonCode"],
  policyVersion: number | null
): EvaluationResult {
  if (reasonCode === "BLOCK_PANIC_MODE_ACTIVE") {
    return { decision: "BLOCK_PANIC_MODE", reasonCode, policyVersion };
  }

  if (reasonCode === "BLOCK_POLICY_UNAVAILABLE_FAIL_CLOSED") {
    return { decision: "BLOCK_POLICY_UNAVAILABLE", reasonCode, policyVersion };
  }

  return { decision: "BLOCK_POLICY_VIOLATION", reasonCode, policyVersion };
}

function includesNormalized(values: string[], value: string): boolean {
  const needle = value.trim().toLowerCase();
  return values.some((v) => v.trim().toLowerCase() === needle);
}
