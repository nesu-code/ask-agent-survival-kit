import { FormEvent, useState } from 'react';
import { ActionRequest, EvaluationResult, ScenarioKey } from '../types/domain';

interface SimulationPanelProps {
  onSimulate: (req: ActionRequest) => Promise<EvaluationResult>;
  onScenario: (scenario: ScenarioKey) => Promise<void>;
}

export function SimulationPanel({ onSimulate, onScenario }: SimulationPanelProps) {
  const [form, setForm] = useState<ActionRequest>({
    requestId: `req-${Date.now()}`,
    actionType: 'transfer',
    amount: 50,
    recipient: 'vault.safe',
    highRisk: true,
  });
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [running, setRunning] = useState(false);
  const [loadingScenario, setLoadingScenario] = useState<ScenarioKey | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next = { ...form, requestId: form.requestId || `req-${Date.now()}` };
    setRunning(true);
    try {
      const evaluation = await onSimulate(next);
      setResult(evaluation);
      setForm({ ...next, requestId: `req-${Date.now()}` });
    } finally {
      setRunning(false);
    }
  };

  const runScenario = async (scenario: ScenarioKey) => {
    setLoadingScenario(scenario);
    try {
      await onScenario(scenario);
      setResult(null);
    } finally {
      setLoadingScenario(null);
    }
  };

  return (
    <section className="card">
      <div className="card-head">
        <h3>Action Simulation</h3>
        <span className="badge neutral">Deterministic</span>
      </div>

      <div className="scenario-row">
        <span>Quick scenarios:</span>
        <button className="muted" disabled={!!loadingScenario} onClick={() => runScenario('normal')}>
          {loadingScenario === 'normal' ? 'Loading...' : 'Normal'}
        </button>
        <button className="muted" disabled={!!loadingScenario} onClick={() => runScenario('violation')}>
          {loadingScenario === 'violation' ? 'Loading...' : 'Violation'}
        </button>
        <button className="muted" disabled={!!loadingScenario} onClick={() => runScenario('panic')}>
          {loadingScenario === 'panic' ? 'Loading...' : 'Panic'}
        </button>
      </div>

      <form onSubmit={submit} className="grid two">
        <label>
          Request ID
          <input value={form.requestId} onChange={(e) => setForm({ ...form, requestId: e.target.value })} />
        </label>
        <label>
          Action Type
          <input value={form.actionType} onChange={(e) => setForm({ ...form, actionType: e.target.value })} />
        </label>
        <label>
          Amount
          <input type="number" value={form.amount ?? ''} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
        </label>
        <label>
          Recipient
          <input value={form.recipient ?? ''} onChange={(e) => setForm({ ...form, recipient: e.target.value })} />
        </label>
        <label className="checkbox span-2">
          <input type="checkbox" checked={form.highRisk !== false} onChange={(e) => setForm({ ...form, highRisk: e.target.checked })} />
          High Risk Action
        </label>

        <button type="submit" disabled={running}>{running ? 'Running Simulation...' : 'Run Simulation'}</button>
      </form>

      {result && (
        <div className={`result ${result.decision === 'ALLOW' ? 'allow' : 'block'}`}>
          <strong>{result.decision === 'ALLOW' ? 'ALLOW' : 'BLOCK'}</strong>
          <span>{result.reasonCode}</span>
          <span>Policy v{result.policyVersion ?? 'n/a'}</span>
        </div>
      )}
    </section>
  );
}
