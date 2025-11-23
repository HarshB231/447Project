"use client";
import React, { useState } from 'react';

type LogEntry = { id: number; ts: string; user: string; action: string; details: string };

export default function AuditLogPage() {
  // Placeholder static log entries; in future fetch from /api/audit
  const [logs] = useState<LogEntry[]>([
    { id: 1, ts: new Date().toISOString(), user: 'admin@example.com', action: 'LOGIN', details: 'Successful login' },
    { id: 2, ts: new Date(Date.now()-3600_000).toISOString(), user: 'diane@example.com', action: 'FLAG', details: 'Flagged employee #17' },
    { id: 3, ts: new Date(Date.now()-7200_000).toISOString(), user: 'admin@example.com', action: 'UNFLAG', details: 'Removed flag employee #17' },
  ]);
  const [filter, setFilter] = useState('');

  const filtered = logs.filter(l => !filter || l.action.toLowerCase().includes(filter.toLowerCase()) || l.user.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="container container-wide">
      <h1 className="h1">Audit Log</h1>
      <div style={{ display:'flex', gap:16, marginBottom:16 }}>
        <input className="input" placeholder="Filter by user or action" value={filter} onChange={e=>setFilter(e.target.value)} style={{ flex:1 }} />
        <div className="help" style={{ alignSelf:'center' }}>{filtered.length} shown</div>
      </div>
      <div className="card section">
        <div className="titlebar">
          <div className="title">Events</div>
          <div className="help">Static demonstration data</div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Time (UTC)</th><th>User</th><th>Action</th><th>Details</th></tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id}>
                  <td>{new Date(e.ts).toLocaleString()}</td>
                  <td>{e.user}</td>
                  <td><span className="chip">{e.action}</span></td>
                  <td style={{ maxWidth:360 }}>{e.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
