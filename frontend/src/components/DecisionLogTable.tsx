import { DecisionRecord } from '../types/domain';

interface DecisionLogTableProps {
  records: DecisionRecord[];
}

export function DecisionLogTable({ records }: DecisionLogTableProps) {
  return (
    <section className="card">
      <h2>Decision Log</h2>
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
                <td colSpan={7}>No decisions yet.</td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id}>
                  <td>{new Date(record.createdAt).toLocaleTimeString()}</td>
                  <td>{record.requestId}</td>
                  <td>{record.actionType}{record.amount ? ` (${record.amount})` : ''}</td>
                  <td>{record.recipient ?? '-'}</td>
                  <td>{record.decision}</td>
                  <td><code>{record.reasonCode}</code></td>
                  <td>{record.policyVersion ?? '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
