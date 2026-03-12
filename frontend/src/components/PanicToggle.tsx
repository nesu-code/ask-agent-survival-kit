import { useState } from 'react';

interface PanicToggleProps {
  active: boolean;
  onToggle: (next: boolean) => Promise<void>;
}

export function PanicToggle({ active, onToggle }: PanicToggleProps) {
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    setBusy(true);
    try {
      await onToggle(!active);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel module panic-module">
      <div className="module-head">
        <h3>Emergency Brake</h3>
        <span className={`badge ${active ? 'danger' : 'success'}`}>{active ? 'Engaged' : 'Standby'}</span>
      </div>
      <p className="hint">
        {active
          ? 'Panic mode is ON: high-risk actions are blocked until disabled.'
          : 'Panic mode is OFF: normal policy checks apply.'}
      </p>
      <button className={active ? 'danger' : ''} onClick={toggle} disabled={busy}>
        {busy ? 'Switching...' : active ? 'Disable panic mode' : 'Enable panic mode'}
      </button>
    </section>
  );
}
