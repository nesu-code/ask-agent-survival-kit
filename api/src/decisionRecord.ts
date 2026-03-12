export type Decision =
  | "ALLOW"
  | "BLOCK_POLICY_VIOLATION"
  | "BLOCK_PANIC_MODE"
  | "BLOCK_POLICY_UNAVAILABLE";

export interface DecisionRecord {
  requestId: string;
  agentId: string;
  actionType: string;
  decision: Decision;
  reasonCode: string;
  evidenceHash: string;
  policyVersion: number | null;
  createdAt: string; // ISO timestamp
}

export function createDecisionRecord(
  partial: Omit<DecisionRecord, "createdAt"> & { createdAt?: string }
): DecisionRecord {
  return {
    ...partial,
    createdAt: partial.createdAt ?? new Date().toISOString(),
  };
}
