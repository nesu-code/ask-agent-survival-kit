interface PanicToggleProps {
  active: boolean;
  onToggle: (next: boolean) => Promise<void>;
}

export function PanicToggle({ active, onToggle }: PanicToggleProps) {
  return (
    <section className="card panic">
      <h2>Panic Mode</h2>
      <p>{active ? 'All high-risk actions are currently blocked.' : 'Normal enforcement mode.'}</p>
      <button className={active ? 'danger' : ''} onClick={() => onToggle(!active)}>
        {active ? 'Disable Panic Mode' : 'Enable Panic Mode'}
      </button>
    </section>
  );
}
