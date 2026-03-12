import { DecisionRecord } from "./decisionRecord";

export class InMemoryDecisionLogger {
  private readonly records: DecisionRecord[] = [];

  log(record: DecisionRecord): DecisionRecord {
    this.records.push(record);
    return record;
  }

  list(limit = 100): DecisionRecord[] {
    return this.records.slice(-limit);
  }

  findByRequestId(requestId: string): DecisionRecord | undefined {
    return this.records.find((r) => r.requestId === requestId);
  }

  clear(): void {
    this.records.length = 0;
  }
}
