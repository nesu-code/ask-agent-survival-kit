import { DecisionRecord } from '../types/domain';

interface DecisionLogTableProps {
  records: DecisionRecord[];
}

export function DecisionLogTable({ records }: DecisionLogTableProps) {
  return (
    <section className="panel module">
      <div className="module-head">
        <h3>Decision Feed</h3>
        <span className="badge neutral">{records.length} events</span>
      </div>
      <p className="hint">Every simulation entry includes reason code + policy version for auditability.</p>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Request</th>
              <th>Action</th>
              <th>Recipient</th>
              <th>Decision</th>
              <th>Reason code</th>
              <th>Policy</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <strong>No decisions captured yet</strong>
                    <span>Jump to Simulator Bay and run an action to generate your first log.</span>
                  </div>
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id}>
                  <td>{new Date(record.createdAt).toLocaleTimeString()}</td>
                  <td>{record.requestId}</td>
                  <td>{record.actionType}{record.amount ? ` (${record.amount})` : ''}</td>
                  <td>{record.recipient ?? '-'}</td>
                  <td>
                    <span className={`badge ${record.decision === 'ALLOW' ? 'success' : 'danger'}`}>
                      {record.decision}
                    </span>
                  </td>
                  <td><code>{record.reasonCode}</code></td>
                  <td>v{record.policyVersion ?? '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
