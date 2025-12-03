"use client";
import React, { useState } from 'react';

type Change = { key: string; before: any; after: any; rowIndex?: number };
type LogEntry = { id?: number; ts: string; user?: string; action?: string; details?: string; type?: string; actor?: string; note?: string; employeeId?: number; changes?: Change[] };

export default function AuditLogPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/audit');
      const json = await res.json();
      // Normalize to display fields
      const normalized: LogEntry[] = (json || []).map((e: any) => ({
        id: e.id,
        ts: e.ts,
        user: e.actor || e.user,
        action: e.type || e.action,
        details: e.note || e.details || '',
        employeeId: e.employeeId,
        changes: Array.isArray(e.changes) ? e.changes : undefined,
      }));
      setLogs(normalized);
    } catch (err) {
      console.error('Failed to load audit log', err);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { load(); }, []);

  const filtered = logs.filter(l => {
    const f = filter.trim().toLowerCase();
    if (!f) return true;
    const action = (l.action || '').toLowerCase();
    const user = (l.user || '').toLowerCase();
    const details = (l.details || '').toLowerCase();
    return action.includes(f) || user.includes(f) || details.includes(f);
  });

  const [selected, setSelected] = useState<LogEntry | null>(null);

  return (
    <div className="container container-wide" style={{ fontSize: '1.25rem', paddingBottom: 32 }}>
      <h1 className="h1" style={{ fontSize: '3rem', marginBottom: 20 }}>Audit Log</h1>
      <div style={{ display:'flex', gap:24, marginBottom:24 }}>
        <input className="input" placeholder="Filter by user or action" value={filter} onChange={e=>setFilter(e.target.value)} style={{ flex:1, fontSize:'1.25rem', padding: '14px 16px' }} />
        <button className="btn-soft" onClick={load} disabled={loading} style={{ fontSize:'1.25rem', padding: '12px 18px' }}>{loading ? 'Refreshing…' : 'Refresh'}</button>
        <div className="help" style={{ alignSelf:'center', fontSize:'1.25rem', color:'#000', fontWeight:600 }}>{filtered.length} shown</div>
      </div>
      <div className="card section" style={{ padding: 24 }}>
        <div className="titlebar" style={{ marginBottom: 12 }}>
          <div className="title" style={{ fontSize: '1.75rem' }}>Events</div>
          <div className="help" style={{ fontSize:'1.25rem', color:'#000', fontWeight:600 }}>Latest events from audit API</div>
        </div>
        <div className="table-wrap" style={{ padding: 8 }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr><th style={{ fontSize:'1.15rem' }}>Time (UTC)</th><th style={{ fontSize:'1.15rem' }}>User</th><th style={{ fontSize:'1.15rem' }}>Action</th><th style={{ fontSize:'1.15rem' }}>Details</th><th style={{ fontSize:'1.15rem' }}>View</th></tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id}>
                  <td style={{ fontSize:'1.15rem' }}>{new Date(e.ts).toLocaleString()}</td>
                  <td style={{ fontSize:'1.15rem' }}>{e.user || '—'}</td>
                  <td style={{ fontSize:'1.15rem' }}><span className="chip" style={{ fontSize:'1.05rem' }}>{e.action || '—'}</span></td>
                  <td style={{ maxWidth:520, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', fontSize:'1.15rem' }}>{e.details || '—'}</td>
                  <td>
                    {e.changes && e.changes.length > 0 ? (
                      <button className="btn-soft" onClick={()=>setSelected(e)} style={{ fontSize:'1.15rem', padding: '10px 14px' }}>View</button>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', display:'flex', alignItems:'center', justifyContent:'center' }} onClick={()=>setSelected(null)}>
          <div className="card" style={{ width: 'min(1100px, 92vw)', maxHeight: '85vh', overflow:'auto', padding:36, fontSize:'1.5rem' }} onClick={(e)=>e.stopPropagation()}>
            <div className="titlebar" style={{ marginBottom:16 }}>
              <div className="title" style={{ fontSize:'2rem' }}>Change Details</div>
              <button className="btn-soft" onClick={()=>setSelected(null)} style={{ fontSize:'1.25rem', padding: '12px 16px' }}>Close</button>
            </div>
            <div className="help" style={{ marginBottom:12, fontSize:'1.25rem' }}>
              {selected.user || '—'} • {selected.action || '—'} • {new Date(selected.ts).toLocaleString()} {selected.employeeId ? `• Employee #${selected.employeeId}` : ''}
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th style={{ fontSize:'1.25rem' }}>Field</th><th style={{ fontSize:'1.25rem' }}>Before</th><th style={{ fontSize:'1.25rem' }}>After</th><th style={{ fontSize:'1.25rem' }}>Row</th></tr>
                </thead>
                <tbody>
                  {(selected.changes || []).map((c, i) => (
                    <tr key={i}>
                      <td><span className="chip" style={{ fontSize:'1.15rem' }}>{c.key}</span></td>
                      <td style={{ maxWidth:480, overflowWrap:'anywhere' }}>{String(c.before ?? '—')}</td>
                      <td style={{ maxWidth:480, overflowWrap:'anywhere' }}>{String(c.after ?? '—')}</td>
                      <td>{c.rowIndex !== undefined ? c.rowIndex : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
