import { FormEvent, useEffect, useMemo, useState } from 'react';
import { RuntimePolicy } from '../types/domain';

interface PolicyFormProps {
  policy: RuntimePolicy;
  onSave: (next: RuntimePolicy) => Promise<void>;
}

export function PolicyForm({ policy, onSave }: PolicyFormProps) {
  const [draft, setDraft] = useState(policy);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    setDraft(policy);
  }, [policy]);

  const expiresAtInput = useMemo(
    () => new Date(draft.expiresAt * 1000).toISOString().slice(0, 16),
    [draft.expiresAt],
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(draft);
      setSavedAt(new Date().toLocaleTimeString());
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="panel module" onSubmit={submit}>
      <div className="module-head">
        <h3>Policy Composer</h3>
        <span className="badge neutral">Live editable</span>
      </div>
      <p className="hint">Use comma-separated lists for actions/recipients. Changes apply immediately when saved.</p>

      <div className="form-grid">
        <label>
          Agent ID
          <input value={draft.agentId} onChange={(e) => setDraft({ ...draft, agentId: e.target.value })} required />
        </label>
        <label>
          Expiry (UTC)
          <input
            type="datetime-local"
            value={expiresAtInput}
            onChange={(e) => setDraft({ ...draft, expiresAt: Math.floor(new Date(e.target.value).getTime() / 1000) })}
          />
        </label>
        <label>
          Spend limit total
          <input type="number" value={draft.spendLimitTotal} onChange={(e) => setDraft({ ...draft, spendLimitTotal: Number(e.target.value) })} />
        </label>
        <label>
          Rate limit / window
          <input type="number" value={draft.rateLimitPerWindow} onChange={(e) => setDraft({ ...draft, rateLimitPerWindow: Number(e.target.value) })} />
        </label>
        <label>
          Window size (seconds)
          <input type="number" value={draft.windowSizeSec} onChange={(e) => setDraft({ ...draft, windowSizeSec: Number(e.target.value) })} />
        </label>
        <label>
          Allowed actions
          <input value={draft.allowedActions.join(', ')} onChange={(e) => setDraft({ ...draft, allowedActions: splitCsv(e.target.value) })} />
        </label>
        <label className="wide">
          Allowed recipients
          <input
            value={draft.allowedRecipients.join(', ')}
            onChange={(e) => setDraft({ ...draft, allowedRecipients: splitCsv(e.target.value) })}
          />
        </label>
      </div>

      <div className="action-line">
        <button disabled={saving} type="submit">{saving ? 'Saving policy...' : 'Save policy to runtime'}</button>
        {savedAt && <span className="micro-feedback">Last saved at {savedAt}</span>}
      </div>
    </form>
  );
}

function splitCsv(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
