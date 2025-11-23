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
  const [activeRowIndex, setActiveRowIndex] = useState(0);
  const [expandedCell, setExpandedCell] = useState<{ key: string; value: string } | null>(null);
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
    if (supabase) {
      await supabase.auth.signOut();
    }
    router.replace("/");
  }

  if (loading) return <div className="container">Loading...</div>;
  if (!employee) return <div className="container">Employee not found</div>;

  // Build unified headers for raw rows Excel-like grid
  const headers: string[] = employee ? Array.from(new Set([].concat(...(employee.rawRows || []).map((r: any) => Object.keys(r))))) : [];
  const activeRow = (employee.rawRows || [])[activeRowIndex] || {};
  function showVal(v: any) { return (v === null || v === undefined || v === '' ? '—' : String(v)); }
  function isLong(v: any) { const s = showVal(v); return s.length > 80 || s.includes('\n'); }
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
            <div style={{ display:'flex', alignItems:'center', gap:16, marginBottom:16 }}>
              <div className="title" style={{ margin:0 }}>Raw Row Viewer</div>
              <select
                value={activeRowIndex}
                onChange={(e)=> setActiveRowIndex(Number(e.target.value))}
                className="input"
                style={{ width:200 }}
              >
                {(employee.rawRows || []).map((r:any, idx:number) => {
                  const start = r['start date'] || r['initial h-1b start'] || r['expiration date'] || '';
                  const visa = r['case type'] || r['visa'] || '';
                  return <option key={idx} value={idx}>Row {idx+1} {start? '• '+ String(start).toString().slice(0,10): ''} {visa? '• '+ visa: ''}</option>;
                })}
              </select>
            </div>
            <div className="card" style={{ padding:12, overflowX:'auto' }}>
              <table className="table" style={{ minWidth: headers.length * 160 }}>
                <thead>
                  <tr>
                    {headers.map(h => <th key={h} style={{ whiteSpace:'normal' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {headers.map(h => {
                      const val = activeRow[h];
                      const display = showVal(val);
                      const truncated = isLong(val) ? display.slice(0,60) + '…' : display;
                      return (
                        <td
                          key={h}
                          style={{ cursor: isLong(val)? 'pointer':'default', maxWidth:160 }}
                          onClick={()=> { if (isLong(val)) setExpandedCell({ key: h, value: display }); }}
                          title={display}
                        >
                          {truncated}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
            {expandedCell && (
              <div style={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', background:'var(--card)', border:'1px solid var(--line)', borderRadius:12, padding:24, maxWidth:'60vw', maxHeight:'60vh', overflow:'auto', zIndex:1000, boxShadow:'0 12px 32px rgba(0,0,0,0.35)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                  <div style={{ fontWeight:700, fontSize:18 }}>{expandedCell.key}</div>
                  <button className="btn-soft" style={{ minWidth:80 }} onClick={()=> setExpandedCell(null)}>Close</button>
                </div>
                <div style={{ whiteSpace:'pre-wrap', lineHeight:1.4, fontSize:14 }}>{expandedCell.value}</div>
              </div>
            )}
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
