import { basePolicy } from '../data/seed';
import {
  ActionRequest,
  DecisionRecord,
  EvaluationResult,
  ReasonCode,
  RuntimePolicy,
  ScenarioKey,
} from '../types/domain';
import { AskFrontendAdapter } from './adapter';

class MockAskAdapter implements AskFrontendAdapter {
  private policy: RuntimePolicy = { ...basePolicy };
  private records: DecisionRecord[] = [];

  async getPolicy(): Promise<RuntimePolicy> {
    return structuredClone(this.policy);
  }

  async upsertPolicy(next: RuntimePolicy): Promise<RuntimePolicy> {
    const bumpedVersion = next.policyVersion <= this.policy.policyVersion
      ? this.policy.policyVersion + 1
      : next.policyVersion;

    this.policy = { ...next, policyVersion: bumpedVersion };
    return structuredClone(this.policy);
  }

  async setPanicMode(active: boolean): Promise<RuntimePolicy> {
    this.policy = {
      ...this.policy,
      panicMode: active,
      policyVersion: this.policy.policyVersion + 1,
    };
    return structuredClone(this.policy);
  }

  async simulateAction(req: ActionRequest): Promise<{ result: EvaluationResult; record: DecisionRecord }> {
    const result = evaluateAction(this.policy, req);
    if (result.decision === 'ALLOW' && typeof req.amount === 'number') {
      this.policy = {
        ...this.policy,
        spentTotal: this.policy.spentTotal + req.amount,
        windowSpent: this.policy.windowSpent + req.amount,
      };
    }

    const record: DecisionRecord = {
      id: crypto.randomUUID(),
      requestId: req.requestId,
      agentId: this.policy.agentId,
      actionType: req.actionType,
      amount: req.amount,
      recipient: req.recipient,
      decision: result.decision,
      reasonCode: result.reasonCode,
      policyVersion: result.policyVersion,
      createdAt: new Date().toISOString(),
    };

    this.records.unshift(record);
    return { result, record };
  }

  async listDecisionLogs(limit = 50): Promise<DecisionRecord[]> {
    return this.records.slice(0, limit).map((item) => ({ ...item }));
  }

  async loadScenario(key: ScenarioKey): Promise<{ policy: RuntimePolicy; recent: DecisionRecord[] }> {
    this.records = [];

    if (key === 'normal') {
      this.policy = { ...basePolicy, policyVersion: this.policy.policyVersion + 1, panicMode: false };
      await this.simulateAction({ requestId: `seed-${Date.now()}-ok`, actionType: 'transfer', recipient: 'vault.safe', amount: 10, highRisk: true });
    }

    if (key === 'violation') {
      this.policy = { ...basePolicy, policyVersion: this.policy.policyVersion + 1, panicMode: false };
      await this.simulateAction({ requestId: `seed-${Date.now()}-bad`, actionType: 'transfer', recipient: 'unknown.wallet', amount: 10, highRisk: true });
    }

    if (key === 'panic') {
      this.policy = { ...basePolicy, panicMode: true, policyVersion: this.policy.policyVersion + 1 };
      await this.simulateAction({ requestId: `seed-${Date.now()}-panic`, actionType: 'transfer', recipient: 'vault.safe', amount: 10, highRisk: true });
    }

    return {
      policy: structuredClone(this.policy),
      recent: await this.listDecisionLogs(20),
    };
  }
}

function evaluateAction(policy: RuntimePolicy | null, req: ActionRequest): EvaluationResult {
  const nowSec = req.nowSec ?? Math.floor(Date.now() / 1000);

  if (!policy) {
    return blocked('BLOCK_POLICY_UNAVAILABLE_FAIL_CLOSED', null);
  }
  if (policy.panicMode && req.highRisk !== false) {
    return blocked('BLOCK_PANIC_MODE_ACTIVE', policy.policyVersion);
  }
  if (policy.expiresAt > 0 && nowSec >= policy.expiresAt) {
    return blocked('BLOCK_POLICY_EXPIRED', policy.policyVersion);
  }
  if (!includesNormalized(policy.allowedActions, req.actionType)) {
    return blocked('BLOCK_ACTION_NOT_ALLOWED', policy.policyVersion);
  }
  if (req.recipient && policy.allowedRecipients.length > 0 && !includesNormalized(policy.allowedRecipients, req.recipient)) {
    return blocked('BLOCK_RECIPIENT_NOT_ALLOWED', policy.policyVersion);
  }
  if (typeof req.amount === 'number') {
    const inWindow = policy.windowStart > 0 && nowSec - policy.windowStart < policy.windowSizeSec;
    const projectedWindowSpent = (inWindow ? policy.windowSpent : 0) + req.amount;
    if (projectedWindowSpent > policy.rateLimitPerWindow) {
      return blocked('BLOCK_SPEND_RATE_EXCEEDED', policy.policyVersion);
    }

    const projectedTotal = policy.spentTotal + req.amount;
    if (projectedTotal > policy.spendLimitTotal) {
      return blocked('BLOCK_SPEND_TOTAL_EXCEEDED', policy.policyVersion);
    }
  }

  return {
    decision: 'ALLOW',
    reasonCode: 'ALLOW_WITHIN_POLICY',
    policyVersion: policy.policyVersion,
  };
}

function blocked(reasonCode: ReasonCode, policyVersion: number | null): EvaluationResult {
  if (reasonCode === 'BLOCK_PANIC_MODE_ACTIVE') {
    return { decision: 'BLOCK_PANIC_MODE', reasonCode, policyVersion };
  }
  if (reasonCode === 'BLOCK_POLICY_UNAVAILABLE_FAIL_CLOSED') {
    return { decision: 'BLOCK_POLICY_UNAVAILABLE', reasonCode, policyVersion };
  }

  return { decision: 'BLOCK_POLICY_VIOLATION', reasonCode, policyVersion };
}

function includesNormalized(values: string[], value: string): boolean {
  const needle = value.trim().toLowerCase();
  return values.some((v) => v.trim().toLowerCase() === needle);
}

export const mockAdapter = new MockAskAdapter();
