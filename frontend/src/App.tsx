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

  useEffect(() => {
    const boot = async () => {
      const initialPolicy = await client.getPolicy();
      const initialLogs = await client.listDecisionLogs(50);
      setPolicy(initialPolicy);
      setLogs(initialLogs);
    };

    void boot();
  }, []);

  const stats = useMemo(() => {
    const allow = logs.filter((entry) => entry.decision === 'ALLOW').length;
    const blocked = logs.length - allow;
    return { allow, blocked, total: logs.length };
  }, [logs]);

  if (!policy) {
    return <div className="app"><p>Loading ASK frontend...</p></div>;
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
      <header>
        <h1>Agent Survival Kit — Frontend Demo</h1>
        <p>Live policy editing, panic switch, deterministic simulation, and audit-friendly reason codes.</p>
      </header>

      <section className="stats">
        <div><strong>{policy.policyVersion}</strong><span>Policy Version</span></div>
        <div><strong>{stats.allow}</strong><span>Allowed</span></div>
        <div><strong>{stats.blocked}</strong><span>Blocked</span></div>
        <div><strong>{policy.panicMode ? 'ON' : 'OFF'}</strong><span>Panic Mode</span></div>
      </section>

      <div className="layout">
        <div className="left-col">
          <PolicyForm policy={policy} onSave={handleSavePolicy} />
          <PanicToggle active={policy.panicMode} onToggle={handlePanicToggle} />
        </div>
        <div className="right-col">
          <SimulationPanel onSimulate={handleSimulate} onScenario={handleScenario} />
          <DecisionLogTable records={logs} />
        </div>
      </div>
    </main>
  );
}
