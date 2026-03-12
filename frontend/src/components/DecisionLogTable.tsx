import { DecisionRecord } from '../types/domain';

interface DecisionLogTableProps {
  records: DecisionRecord[];
}

export function DecisionLogTable({ records }: DecisionLogTableProps) {
  return (
    <section className="card">
      <div className="card-head">
        <h3>Decision Log</h3>
        <span className="badge neutral">{records.length} Records</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Request</th>
              <th>Action</th>
              <th>Recipient</th>
              <th>Decision</th>
              <th>Reason Code</th>
              <th>Policy</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <strong>No decisions yet</strong>
                    <span>Run a simulation to generate the first decision record.</span>
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
                      {record.decision === 'ALLOW' ? 'ALLOW' : 'BLOCK'}
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
