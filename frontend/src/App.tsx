import { useEffect, useMemo, useState } from 'react';
import './styles.css';
import { DecisionLogTable } from './components/DecisionLogTable';
import { PanicToggle } from './components/PanicToggle';
import { PolicyForm } from './components/PolicyForm';
import { SimulationPanel } from './components/SimulationPanel';
import { createAskClient } from './services/client';
import { ActionRequest, DecisionRecord, EvaluationResult, RuntimePolicy, ScenarioKey } from './types/domain';

const client = createAskClient();

export default function App() {
  const [policy, setPolicy] = useState<RuntimePolicy | null>(null);
  const [logs, setLogs] = useState<DecisionRecord[]>([]);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const boot = async () => {
      try {
        const [initialPolicy, initialLogs] = await Promise.all([
          client.getPolicy(),
          client.listDecisionLogs(50),
        ]);
        setPolicy(initialPolicy);
        setLogs(initialLogs);
      } finally {
        setBooting(false);
      }
    };

    void boot();
  }, []);

  const stats = useMemo(() => {
    const allow = logs.filter((entry) => entry.decision === 'ALLOW').length;
    const blocked = logs.length - allow;
    return { allow, blocked, total: logs.length };
  }, [logs]);

  if (booting || !policy) {
    return (
      <main className="app">
        <section className="hero card loading-state">
          <div className="loading-dot" />
          <h1>Initializing ASK dashboard</h1>
          <p>Loading policy, controls, and decision telemetry...</p>
        </section>
      </main>
    );
  }

  const refreshLogs = async () => setLogs(await client.listDecisionLogs(100));

  const handleSavePolicy = async (next: RuntimePolicy) => {
    const saved = await client.upsertPolicy(next);
    setPolicy(saved);
  };

  const handlePanicToggle = async (next: boolean) => {
    const updated = await client.setPanicMode(next);
    setPolicy(updated);
  };

  const handleSimulate = async (req: ActionRequest): Promise<EvaluationResult> => {
    const { result } = await client.simulateAction(req);
    await refreshLogs();
    const updatedPolicy = await client.getPolicy();
    setPolicy(updatedPolicy);
    return result;
  };

  const handleScenario = async (scenario: ScenarioKey) => {
    const loaded = await client.loadScenario(scenario);
    setPolicy(loaded.policy);
    setLogs(loaded.recent);
  };

  return (
    <main className="app">
      <header className="hero card">
        <div>
          <p className="eyebrow">Agent Survival Kit</p>
          <h1>Runtime Safety Command Center</h1>
          <p className="hero-copy">
            Live policy governance, panic controls, deterministic simulations, and audit-ready reason codes.
          </p>
        </div>
        <span className={`badge ${policy.panicMode ? 'danger' : 'success'}`}>
          {policy.panicMode ? 'Panic Mode Active' : 'Healthy'}
        </span>
      </header>

      <section className="stats" aria-label="Overview">
        <article className="stat-card card accent-blue">
          <span>Policy Version</span>
          <strong>v{policy.policyVersion}</strong>
        </article>
        <article className="stat-card card accent-green">
          <span>Allowed Decisions</span>
          <strong>{stats.allow}</strong>
        </article>
        <article className="stat-card card accent-red">
          <span>Blocked Decisions</span>
          <strong>{stats.blocked}</strong>
        </article>
        <article className="stat-card card accent-purple">
          <span>Total Evaluations</span>
          <strong>{stats.total}</strong>
        </article>
      </section>

      <div className="layout">
        <section className="left-col" aria-label="Controls">
          <div className="section-title">
            <h2>Controls</h2>
            <p>Manage policy boundaries and emergency response settings.</p>
          </div>
          <PolicyForm policy={policy} onSave={handleSavePolicy} />
          <PanicToggle active={policy.panicMode} onToggle={handlePanicToggle} />
        </section>

        <section className="right-col" aria-label="Simulation and logs">
          <div className="section-title">
            <h2>Simulation & Logs</h2>
            <p>Test decisions under policy constraints and review generated audit events.</p>
          </div>
          <SimulationPanel onSimulate={handleSimulate} onScenario={handleScenario} />
          <DecisionLogTable records={logs} />
        </section>
      </div>
    </main>
  );
}
