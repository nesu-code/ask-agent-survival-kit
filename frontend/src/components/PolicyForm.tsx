import { FormEvent, useEffect, useMemo, useState } from 'react';
import { RuntimePolicy } from '../types/domain';

interface PolicyFormProps {
  policy: RuntimePolicy;
  onSave: (next: RuntimePolicy) => Promise<void>;
}

export function PolicyForm({ policy, onSave }: PolicyFormProps) {
  const [draft, setDraft] = useState(policy);
  const [saving, setSaving] = useState(false);

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
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="card" onSubmit={submit}>
      <div className="card-head">
        <h3>Policy Create / Update</h3>
        <span className="badge neutral">Editable</span>
      </div>
      <p className="subtle">Set deterministic limits for actions, recipients, and spend controls.</p>

      <div className="grid two">
        <label>
          Agent ID
          <input value={draft.agentId} onChange={(e) => setDraft({ ...draft, agentId: e.target.value })} required />
        </label>
        <label>
          Expires At
          <input
            type="datetime-local"
            value={expiresAtInput}
            onChange={(e) => setDraft({ ...draft, expiresAt: Math.floor(new Date(e.target.value).getTime() / 1000) })}
          />
        </label>
        <label>
          Spend Total Limit
          <input type="number" value={draft.spendLimitTotal} onChange={(e) => setDraft({ ...draft, spendLimitTotal: Number(e.target.value) })} />
        </label>
        <label>
          Rate Limit / Window
          <input type="number" value={draft.rateLimitPerWindow} onChange={(e) => setDraft({ ...draft, rateLimitPerWindow: Number(e.target.value) })} />
        </label>
        <label>
          Window Seconds
          <input type="number" value={draft.windowSizeSec} onChange={(e) => setDraft({ ...draft, windowSizeSec: Number(e.target.value) })} />
        </label>
        <label>
          Allowed Actions (comma)
          <input
            value={draft.allowedActions.join(', ')}
            onChange={(e) => setDraft({ ...draft, allowedActions: splitCsv(e.target.value) })}
          />
        </label>
        <label className="span-2">
          Allowed Recipients (comma)
          <input
            value={draft.allowedRecipients.join(', ')}
            onChange={(e) => setDraft({ ...draft, allowedRecipients: splitCsv(e.target.value) })}
          />
        </label>
      </div>

      <div className="actions-row">
        <button disabled={saving} type="submit">{saving ? 'Saving Policy...' : 'Save Policy'}</button>
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
