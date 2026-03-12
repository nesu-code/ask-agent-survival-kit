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
    <section className="card panic">
      <div className="card-head">
        <h3>Panic Mode</h3>
        <span className={`badge ${active ? 'danger' : 'success'}`}>{active ? 'Active' : 'Inactive'}</span>
      </div>
      <p>{active ? 'All high-risk actions are currently blocked.' : 'Normal enforcement mode is active.'}</p>
      <button className={active ? 'danger' : ''} onClick={toggle} disabled={busy}>
        {busy ? 'Updating...' : active ? 'Disable Panic Mode' : 'Enable Panic Mode'}
      </button>
    </section>
  );
}
