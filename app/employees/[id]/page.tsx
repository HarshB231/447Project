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

          <div style={{ padding: 24 }}>
            <div className="title" style={{ marginBottom: 10 }}>Visa & Employment History</div>
            <div className="detail-middle card" style={{ marginTop: 0 }}>
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

            {/* Raw imported rows below history */}
            <div style={{ marginTop: 28 }}>
              <div className="title" style={{ marginBottom: 10 }}>All imported columns (raw rows)</div>
              <div className="detail-raw card" style={{ marginTop: 0 }}>
                <div className="list-wrap">
                  {(() => {
                    const headers = Array.from(new Set([].concat(...(employee.rawRows || []).map((r: any) => Object.keys(r)))));
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
            </div>
          </div>
        </div>
      </div>

      {/* Notes moved to its own full-width card beneath history */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
        <div className="card employee-detail-card" style={{ borderRadius: 12, maxWidth: '95vw', width: '100%' }}>
          <div style={{ padding: 24 }}>
            <div className="title" style={{ marginBottom: 12 }}>Notes</div>
            <textarea
              value={newNote}
              onChange={(e)=>setNewNote(e.target.value)}
              className="input"
              placeholder="Add new note..."
              rows={8}
              style={{ width: '100%', resize: 'vertical', fontSize: '15px' }}
            ></textarea>
            <div style={{ marginTop: 12 }}>
              <button className="btn btn-flag" onClick={addNote} style={{ width: 'auto', minWidth: 140 }}>
                SAVE NOTE
              </button>
            </div>
            <ul className="notes-list" style={{ marginTop: 18 }}>
              {employee.notes && employee.notes.length > 0 ? (
                employee.notes.map((n: any)=> (
                  <li key={n.id} style={{ padding: 14, borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', gap: 14 }}>
                    <div style={{ flex: 1 }}>
                      <div className="help" style={{ fontWeight: 600 }}>{new Date(n.createdAt).toLocaleString()}</div>
                      <div style={{ marginTop: 6, lineHeight: 1.4 }}>{n.content}</div>
                    </div>
                    <div style={{ width: 110, textAlign: 'right' }}>
                      <button className="btn btn-flag" onClick={()=>deleteNote(n.id)} style={{ width: 'auto', minWidth: 90, fontSize: '12px' }}>
                        DELETE
                      </button>
                    </div>
                  </li>
                ))
              ) : (
                <li style={{ padding: 14 }}>No notes</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
