import {
  ActionRequest,
  DecisionRecord,
  EvaluationResult,
  RuntimePolicy,
  ScenarioKey,
} from '../types/domain';

export interface AskFrontendAdapter {
  getPolicy(): Promise<RuntimePolicy>;
  upsertPolicy(next: RuntimePolicy): Promise<RuntimePolicy>;
  setPanicMode(active: boolean): Promise<RuntimePolicy>;
  simulateAction(req: ActionRequest): Promise<{ result: EvaluationResult; record: DecisionRecord }>;
  listDecisionLogs(limit?: number): Promise<DecisionRecord[]>;
  loadScenario(key: ScenarioKey): Promise<{ policy: RuntimePolicy; recent: DecisionRecord[] }>;
}
