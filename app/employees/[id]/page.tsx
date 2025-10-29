"use client";
import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

export default function EmployeeDetail() {
  const pathname = usePathname();
  const router = useRouter();
  const idStr = pathname.split('/').pop() || '';
  const id = Number(idStr);
  const [employee, setEmployee] = useState<any>(null);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/employees/${id}`)
      .then((r) => r.json())
      .then((data) => setEmployee(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  async function toggleFlag() {
    if (!employee) return;
    await fetch(`/api/employees/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ flagged: !employee.flagged }),
      headers: { 'Content-Type': 'application/json' },
    });
    const r = await fetch(`/api/employees/${id}`);
    setEmployee(await r.json());
  }

  async function addNote() {
    if (!newNote.trim()) return;
    await fetch('/api/notes', {
      method: 'POST',
      body: JSON.stringify({ employeeId: id, content: newNote }),
      headers: { 'Content-Type': 'application/json' },
    });
    setNewNote('');
    const r = await fetch(`/api/employees/${id}`);
    setEmployee(await r.json());
  }

  async function deleteNote(noteId: string | number) {
    if (!confirm('Delete this note?')) return;
    await fetch('/api/notes', {
      method: 'DELETE',
      body: JSON.stringify({ employeeId: id, noteId }),
      headers: { 'Content-Type': 'application/json' },
    });
    const r = await fetch(`/api/employees/${id}`);
    setEmployee(await r.json());
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) return <div className="container">Loading...</div>;
  if (!employee) return <div className="container">Employee not found</div>;
  return (
    <div className="container">
      <h1 className="h1">Employee Details</h1>

      {/* Segmented navigation */}
      <div className="segmented-wrap">
        <div className="segmented">
          <button className="segmented-item" onClick={handleLogout}>Back to Login</button>
          <a className="segmented-item" href="/dashboard">Dashboard</a>
          <a className="segmented-item" href="/employees">Employees</a>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
        <div className="card employee-detail-card" style={{ borderRadius: 12, maxWidth: '95vw', width: '100%' }}>
          <div style={{ padding: 18, borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0 }}>{[employee.firstName, employee.lastName].filter(Boolean).join(' ')}</h2>
              <div className="help">{employee.umbcEmail} • {employee.department || ''} {employee.title ? '• ' + employee.title : ''}</div>
            </div>
            <div>
              <button onClick={toggleFlag} className={`btn ${employee.flagged ? 'btn-unflag' : 'btn-flag'}`}>
                {employee.flagged ? 'UNFLAG' : 'FLAG'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 24, padding: 24 }}>
            <div style={{ flex: 1.5, minWidth: 0 }}>
              <div className="title">Visa & Employment History</div>
              <div className="detail-middle card" style={{ marginTop: 10 }}>
                {/* Render processed visas */}
                <table className="table" style={{ width: '100%' }}>
                  <thead>
                    <tr><th>Start Date</th><th>End Date</th><th>Visa</th><th>Position</th><th>Notes</th></tr>
                  </thead>
                  <tbody>
                    {employee.visas && employee.visas.length > 0 ? (
                      employee.visas.map((v: any) => (
                        <tr key={v.id}>
                          <td>{v.startDate ? new Date(v.startDate).toLocaleDateString() : '—'}</td>
                          <td>{v.endDate ? new Date(v.endDate).toLocaleDateString() : 'Present'}</td>
                          <td>{String(v.type ?? '—')}</td>
                          <td>{String(v.position ?? '—')}</td>
                          <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.raw ? Object.values(v.raw).map((x:any)=> (x===null||x===undefined||x=== '')? '—' : String(x)).join(' | ') : '—'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan={5}>No visas</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes column stays within the white card */}
            <div className="notes-column" style={{ flex: 1, minWidth: 0 }}>
              <div className="title">Notes</div>
              <div style={{ marginTop: 8 }}>
                <div className="notes-panel">
                  <textarea
                    value={newNote}
                    onChange={(e)=>setNewNote(e.target.value)}
                    className="input"
                    placeholder="Add new note..."
                    rows={6}
                    style={{ width: '100%', resize: 'vertical' }}
                  ></textarea>
                </div>
                <div style={{ marginTop: 8 }}>
                  <button className="btn btn-flag" onClick={addNote} style={{ width: 'auto', minWidth: 120 }}>
                    SAVE NOTE
                  </button>
                </div>
              </div>

              <ul className="notes-list" style={{ marginTop: 12 }}>
                {employee.notes && employee.notes.length > 0 ? (
                  employee.notes.map((n: any)=> (
                    <li key={n.id} style={{ padding: 12, borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div className="help">{new Date(n.createdAt).toLocaleString()}</div>
                        <div style={{ marginTop: 4 }}>{n.content}</div>
                      </div>
                      <div style={{ width: 100, textAlign: 'right' }}>
                        <button className="btn btn-flag" onClick={()=>deleteNote(n.id)} style={{ width: 'auto', minWidth: 80, fontSize: '12px' }}>
                          DELETE
                        </button>
                      </div>
                    </li>
                  ))
                ) : (
                  <li style={{ padding: 12 }}>No notes</li>
                )}
              </ul>
            </div>
          </div>

          {/* Rework “All imported columns” to a vertical key/value view */}
          <section className="card section" style={{ margin: 24 }}>
            <div className="title">All imported columns (raw rows)</div>
            <div className="detail-raw card" style={{ marginTop: 10 }}>
              <div className="list-wrap">
                {(() => {
                  const headers = Array.from(
                    new Set([].concat(...(employee.rawRows || []).map((r: any) => Object.keys(r))))
                  );
                  const showVal = (v: any) => (v === null || v === undefined || v === '' ? '—' : String(v));
                  return (employee.rawRows || []).map((r: any, idx: number) => (
                    <div className="kv-card" key={idx}>
                      <div className="help">Row {idx + 1}</div>
                      <div className="kv-grid">
                        {headers.map((h: any) => (
                          <React.Fragment key={h}>
                            <div className="kv-key">{h}</div>
                            <div className="kv-val">{showVal(r[h])}</div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
