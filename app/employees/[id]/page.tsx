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

  if (loading) return <div className="container">Loading...</div>;
  if (!employee) return <div className="container">Employee not found</div>;

  return (
    <div className="container">
      <div className="card pad" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0 }}>{[employee.firstName, employee.lastName].filter(Boolean).join(' ')}</h1>
          <div className="help">{employee.umbcEmail}</div>
        </div>
        <div>
          <button onClick={toggleFlag} className="input">{employee.flagged ? 'Unflag' : 'Flag'}</button>
        </div>
      </div>

      <section className="card section">
        <div className="title">Visa & Employment History</div>
        <table className="table" style={{ marginTop: 10 }}>
          <thead>
            <tr><th>Start Date</th><th>End Date</th><th>Visa</th><th>Position</th><th>Status</th></tr>
          </thead>
          <tbody>
            {employee.visas && employee.visas.length > 0 ? (
              employee.visas.map((v: any) => (
                <tr key={v.id}>
                  <td>{v.startDate ? new Date(v.startDate).toLocaleDateString() : '—'}</td>
                  <td>{v.endDate ? new Date(v.endDate).toLocaleDateString() : 'Present'}</td>
                  <td>{v.type}</td>
                  <td>{v.employee?.title ?? v.position ?? '—'}</td>
                  <td>{v.maxHPeriod ?? '—'}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5}>No visas</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="card section">
        <div className="title">Notes</div>
        <div style={{ marginTop: 8 }}>
          <textarea value={newNote} onChange={(e)=>setNewNote(e.target.value)} className="input" placeholder="Add new note..."></textarea>
          <div style={{ marginTop: 8 }}>
            <button className="input" onClick={addNote}>Save note</button>
          </div>
        </div>

        <ul style={{ marginTop: 12 }}>
          {employee.notes && employee.notes.length > 0 ? (
            employee.notes.map((n: any)=> (
              <li key={n.id} style={{ padding: 8, borderBottom: '1px solid var(--line)' }}>
                <div className="help">{new Date(n.createdAt).toLocaleString()}</div>
                <div>{n.content}</div>
              </li>
            ))
          ) : (
            <li style={{ padding: 8 }}>No notes</li>
          )}
        </ul>
      </section>
    </div>
  );
}
