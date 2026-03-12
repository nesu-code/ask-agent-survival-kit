import { useEffect, useMemo, useState } from 'react';
import './styles.css';
import { DecisionLogTable } from './components/DecisionLogTable';
import { PanicToggle } from './components/PanicToggle';
import { PolicyForm } from './components/PolicyForm';
import { SimulationPanel } from './components/SimulationPanel';
import { createAskClient } from './services/client';
import { ActionRequest, DecisionRecord, EvaluationResult, RuntimePolicy, ScenarioKey } from './types/domain';

const client = createAskClient();
type ViewKey = 'mission' | 'simulate' | 'audit';

export default function App() {
  const [policy, setPolicy] = useState<RuntimePolicy | null>(null);
  const [logs, setLogs] = useState<DecisionRecord[]>([]);
  const [booting, setBooting] = useState(true);
  const [activeView, setActiveView] = useState<ViewKey>('mission');
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [orbitBoost, setOrbitBoost] = useState(false);

  useEffect(() => {
    const boot = async () => {
      try {
        const [initialPolicy, initialLogs] = await Promise.all([client.getPolicy(), client.listDecisionLogs(50)]);
        setPolicy(initialPolicy);
        setLogs(initialLogs);
      } catch {
        setNotice({ tone: 'error', text: 'Failed to initialize ASK data. Refresh and try again.' });
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
      <main className="shell loading-shell">
        <section className="loading-card">
          <div className="pulse-ring" />
          <h1>Spinning up ASK mission control...</h1>
          <p>Synchronizing policy rules, panic control, and decision telemetry.</p>
        </section>
      </main>
    );
  }

  const refreshLogs = async () => setLogs(await client.listDecisionLogs(100));

  const handleSavePolicy = async (next: RuntimePolicy) => {
    try {
      const saved = await client.upsertPolicy(next);
      setPolicy(saved);
      setNotice({ tone: 'success', text: 'Policy updated and synced to runtime.' });
    } catch {
      setNotice({ tone: 'error', text: 'Policy update failed. Verify fields and retry.' });
      throw new Error('save-policy-failed');
    }
  };

  const handlePanicToggle = async (next: boolean) => {
    try {
      const updated = await client.setPanicMode(next);
      setPolicy(updated);
      setNotice({ tone: 'success', text: next ? 'Panic mode enabled. High-risk actions now blocked.' : 'Panic mode disabled. Back to normal enforcement.' });
    } catch {
      setNotice({ tone: 'error', text: 'Could not change panic mode right now.' });
      throw new Error('panic-toggle-failed');
    }
  };

  const handleSimulate = async (req: ActionRequest): Promise<EvaluationResult> => {
    try {
      const { result } = await client.simulateAction(req);
      await refreshLogs();
      const updatedPolicy = await client.getPolicy();
      setPolicy(updatedPolicy);
      setNotice({ tone: 'success', text: `Simulation complete: ${result.decision} (${result.reasonCode}).` });
      return result;
    } catch {
      setNotice({ tone: 'error', text: 'Simulation failed. Please check the request and retry.' });
      throw new Error('simulate-failed');
    }
  };

  const handleScenario = async (scenario: ScenarioKey) => {
    try {
      const loaded = await client.loadScenario(scenario);
      setPolicy(loaded.policy);
      setLogs(loaded.recent);
      setNotice({ tone: 'success', text: `Scenario loaded: ${scenario}.` });
    } catch {
      setNotice({ tone: 'error', text: 'Unable to load scenario.' });
      throw new Error('scenario-failed');
    }
  };

  return (
    <main className={`shell ${orbitBoost ? 'orbit-boost' : ''}`}>
      <section className="hero-zone panel">
        <div className="hero-copy">
          <p className="kicker">ASK // Agent Survival Kit</p>
          <h1>Neon Mission Deck</h1>
          <p>
            Manage live policy boundaries, trigger panic protocol, run deterministic simulations, and inspect explainable decisions in one playful control room.
          </p>
          <div className="hero-cta-row">
            <button className="ghost" onClick={() => setOrbitBoost((prev) => !prev)}>
              {orbitBoost ? 'Calm Orbit' : 'Boost Orbit'}
            </button>
            <span className={`status-chip ${policy.panicMode ? 'danger' : 'ok'}`}>
              {policy.panicMode ? 'PANIC MODE LIVE' : 'SYSTEM STEADY'}
            </span>
          </div>
        </div>
        <div className="hero-globe" aria-hidden>
          <div className="ring ring-a" />
          <div className="ring ring-b" />
          <div className="core" />
        </div>
      </section>

      {notice && <div className={`notice ${notice.tone}`}>{notice.text}</div>}

      <section className="overview-grid">
        <article className="metric-panel panel m-blue">
          <span>Policy Version</span>
          <strong>v{policy.policyVersion}</strong>
        </article>
        <article className="metric-panel panel m-green">
          <span>Allowed</span>
          <strong>{stats.allow}</strong>
        </article>
        <article className="metric-panel panel m-pink">
          <span>Blocked</span>
          <strong>{stats.blocked}</strong>
        </article>
        <article className="metric-panel panel m-purple">
          <span>Total Decisions</span>
          <strong>{stats.total}</strong>
        </article>
      </section>

      <section className="workspace-layout">
        <aside className="dock panel" aria-label="Navigation">
          <button className={activeView === 'mission' ? 'dock-btn active' : 'dock-btn'} onClick={() => setActiveView('mission')}>
            🛡️ Mission Control
            <small>Policy + panic protocol</small>
          </button>
          <button className={activeView === 'simulate' ? 'dock-btn active' : 'dock-btn'} onClick={() => setActiveView('simulate')}>
            ⚗️ Simulator Bay
            <small>Requests + quick scenarios</small>
          </button>
          <button className={activeView === 'audit' ? 'dock-btn active' : 'dock-btn'} onClick={() => setActiveView('audit')}>
            📜 Audit Stream
            <small>Decision telemetry logs</small>
          </button>
        </aside>

        <section className="content-stack">
          {activeView === 'mission' && (
            <>
              <div className="panel context-head">
                <h2>Mission Control</h2>
                <p>Define who can do what, how much can be spent, and where emergency brakes apply.</p>
              </div>
              <PolicyForm policy={policy} onSave={handleSavePolicy} />
              <PanicToggle active={policy.panicMode} onToggle={handlePanicToggle} />
            </>
          )}

          {activeView === 'simulate' && (
            <>
              <div className="panel context-head">
                <h2>Simulator Bay</h2>
                <p>Run predictable tests before real execution. Each run writes auditable evidence to logs.</p>
              </div>
              <SimulationPanel onSimulate={handleSimulate} onScenario={handleScenario} />
            </>
          )}

          {activeView === 'audit' && (
            <>
              <div className="panel context-head">
                <h2>Audit Stream</h2>
                <p>Track outcomes, reason codes, and policy versions for every evaluated action request.</p>
              </div>
              <DecisionLogTable records={logs} />
            </>
          )}
        </section>
      </section>
    </main>
  );
}
