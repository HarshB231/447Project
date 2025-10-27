"use client";
import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function EmployeeDetail() {
  const pathname = usePathname();
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

  if (loading) return <div className="container">Loading...</div>;
  if (!employee) return <div className="container">Employee not found</div>;
  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
  <div className="card employee-detail-card" style={{ borderRadius: 12 }}>
          <div style={{ padding: 18, borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0 }}>{[employee.firstName, employee.lastName].filter(Boolean).join(' ')}</h2>
              <div className="help">{employee.umbcEmail} • {employee.department || ''} {employee.title ? '• ' + employee.title : ''}</div>
            </div>
            <div>
              <button onClick={toggleFlag} className="input">{employee.flagged ? 'Unflag' : 'Flag'}</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 16, padding: 18 }}>
            <div style={{ flex: 2 }}>
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

            <div style={{ width: 420 }}>
              <div className="title">Notes</div>
              <div style={{ marginTop: 8 }}>
                <div className="notes-panel">
                  <textarea value={newNote} onChange={(e)=>setNewNote(e.target.value)} className="input" placeholder="Add new note..." rows={6}></textarea>
                </div>
                <div style={{ marginTop: 8 }}>
                  <button className="input" onClick={addNote}>Save note</button>
                </div>
              </div>

              <ul className="notes-list" style={{ marginTop: 12 }}>
                {employee.notes && employee.notes.length > 0 ? (
                  employee.notes.map((n: any)=> (
                    <li key={n.id} style={{ padding: 8, borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div className="help">{new Date(n.createdAt).toLocaleString()}</div>
                        <div>{n.content}</div>
                      </div>
                      <div style={{ width: 90, textAlign: 'right' }}>
                        <button className="input" onClick={()=>deleteNote(n.id)}>Delete</button>
                      </div>
                    </li>
                  ))
                ) : (
                  <li style={{ padding: 8 }}>No notes</li>
                )}
              </ul>
            </div>
          </div>

          <section className="card section" style={{ margin: 18 }}>
            <div className="title">All imported columns (raw rows)</div>
            <div style={{ marginTop: 10 }} className="detail-raw card">
              <div style={{ overflow: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr>
                      {Array.from(new Set([].concat(...(employee.rawRows || []).map((r: any)=> Object.keys(r)))))
                        .map((h: any)=> <th key={h}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {(employee.rawRows || []).map((r: any, idx: number)=> (
                      <tr key={idx}>
                        {Array.from(new Set([].concat(...(employee.rawRows || []).map((rr: any)=> Object.keys(rr)))))
                          .map((h: any)=> <td key={h}>{(() => { const v = r[h]; return (v===null||v===undefined||v==='') ? '—' : String(v); })()}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
