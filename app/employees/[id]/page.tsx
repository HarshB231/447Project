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
  const [activeRowIndex, setActiveRowIndex] = useState(0); // kept for compatibility
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [sortNewestFirst, setSortNewestFirst] = useState(true);
  const [rowsMenuOpen, setRowsMenuOpen] = useState(false);
  const [expandedCell, setExpandedCell] = useState<{ key: string; value: string } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/employees/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setEmployee(data);
        const rows: any[] = (data.rawRows || []);
        const sortedIdx = rows
          .map((r, i) => ({ i, d: getRowDate(r) }))
          .sort((a,b)=> (b.d||0)-(a.d||0))
          .map(x=>x.i);
        setSelectedRows(sortedIdx); // default all rows visible, newest first
      })
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
  const rowsAll: any[] = employee.rawRows || [];
  const activeRow = rowsAll[activeRowIndex] || {};
  function showVal(v: any) { return (v === null || v === undefined || v === '' ? '—' : String(v)); }
  function isLong(v: any) { const s = showVal(v); return s.length > 80 || s.includes('\n'); }
  function getRowDate(r:any){
    const tryKeys = ['start date','initial h-1b start','initial h-1b start date','initial h1b start','h1b start','expiration date','end date'];
    for (const k of tryKeys){
      const v = r[k];
      if (v) {
        const d = Date.parse(String(v));
        if (!isNaN(d)) return d;
      }
    }
    return 0;
  }
  function sortSelected(newest:boolean){
    const sorted = [...selectedRows].sort((a,b)=>{
      const da = getRowDate(rowsAll[a]);
      const db = getRowDate(rowsAll[b]);
      return newest ? (db-da) : (da-db);
    });
    setSortNewestFirst(newest);
    setSelectedRows(sorted);
  }
  return (
    <div className="employee-detail-wide">
      <div style={{ display:'flex', alignItems:'center', gap:20, marginBottom:8 }}>
        <button onClick={()=> router.push('/employees')} className="btn-soft return-btn">← Return</button>
        <h1 className="h1" style={{ margin:'0 0 4px' }}>Employee Details</h1>
      </div>
      <div className="card" style={{ borderRadius:20, marginBottom:32 }}>
          <div style={{ padding:24, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:24 }}>
          <div style={{ minWidth:260 }}>
            <h2 style={{ margin:'0 0 8px' }}>{[employee.firstName, employee.lastName].filter(Boolean).join(' ')}</h2>
            <div className="detail-meta">{employee.umbcEmail} • {employee.department || ''} {employee.title ? '• ' + employee.title : ''}</div>
          </div>
          <div style={{ display:'flex', gap:12 }}>
            <button onClick={toggleFlag} className={`btn ${employee.flagged ? 'btn-unflag' : 'btn-flag'}`} style={{ minWidth:140 }}>
              {employee.flagged ? 'UNFLAG' : 'FLAG'}
            </button>
          </div>
        </div>
        <div style={{ padding:'0 24px 32px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:18, margin:'4px 0 20px', flexWrap:'wrap' }}>
            <div className="rows-chooser">
              <button className="btn btn-lg" onClick={()=> setRowsMenuOpen(v=>!v)}>Rows • {selectedRows.length} selected</button>
              {rowsMenuOpen && (
                <div className="rows-panel" role="menu">
                  <div className="panel-actions">
                    <button className="btn-soft btn-mini" onClick={()=> setSelectedRows(rowsAll.map((_,i)=>i))}>Select All</button>
                    <button className="btn-soft btn-mini" onClick={()=> setSelectedRows([])}>Clear</button>
                    <button className="btn-soft btn-mini" onClick={()=> sortSelected(true)}>Newest first</button>
                    <button className="btn-soft btn-mini" onClick={()=> sortSelected(false)}>Oldest first</button>
                  </div>
                  {rowsAll
                    .map((r, i)=> ({ i, d: getRowDate(r), label: (()=>{
                      const start = r['start date'] || r['initial h-1b start'] || r['expiration date'] || '';
                      const visa = r['case type'] || r['visa'] || '';
                      const ds = start? String(start).toString().slice(0,10): '';
                      return `Row ${i+1} ${ds? '• '+ds: ''} ${visa? '• '+visa: ''}`;
                    })()}))
                    .sort((a,b)=> (sortNewestFirst? (b.d-a.d) : (a.d-b.d)))
                    .map(({i,label})=> (
                      <label key={i} className="row-item">
                        <input type="checkbox" checked={selectedRows.includes(i)} onChange={(e)=>{
                          setSelectedRows((cur)=> e.target.checked ? [...new Set([...cur, i])] : cur.filter(x=>x!==i));
                        }} />
                        <span>{label}</span>
                      </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="card" style={{ padding:16, overflowX:'auto' }}>
            <table className="table detail-table" style={{ minWidth: headers.length * 200 }}>
              <thead>
                <tr>
                  {headers.map(h => <th key={h} style={{ whiteSpace:'normal' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {(selectedRows.length? selectedRows : [activeRowIndex]).map((rowIdx)=> (
                  <tr key={rowIdx}>
                    {headers.map(h => {
                      const val = (rowsAll[rowIdx]||{})[h];
                      const display = showVal(val);
                      const long = display === '?' || isLong(val) || /\S{35,}/.test(display); // treat '?' as expandable placeholder
                      const truncated = long ? (display === '?' ? '?' : display.slice(0, 100) + '…') : display;
                      return (
                        <td key={h+rowIdx} style={{ maxWidth:260 }}>
                          {long ? (
                            <div className="cell-long">
                              <span>{truncated}</span>
                              <button type="button" className="btn-soft btn-mini" onClick={()=> setExpandedCell({ key: h, value: display })}>View</button>
                            </div>
                          ) : (
                            display
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card" style={{ borderRadius:20, padding:'24px 24px 26px' }}>
        <div className="title" style={{ marginBottom:12, fontSize:18 }}>Notes</div>
        <textarea
          value={newNote}
          onChange={(e)=>setNewNote(e.target.value)}
          className="input"
          placeholder="Add new note..."
          rows={6}
          style={{ width: '100%', resize: 'vertical', fontSize: '15px' }}
        ></textarea>
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-flag" onClick={addNote} style={{ width: 'auto', minWidth: 160 }}>
            SAVE NOTE
          </button>
        </div>
        <ul className="notes-list" style={{ marginTop: 16 }}>
          {employee.notes && employee.notes.length > 0 ? (
            employee.notes.map((n: any)=> (
              <li key={n.id} style={{ padding: 18, borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', gap: 18 }}>
                <div style={{ flex: 1 }}>
                  <div className="help" style={{ fontWeight: 600 }}>{new Date(n.createdAt).toLocaleString()}</div>
                  <div style={{ marginTop: 8, lineHeight: 1.5 }}>{n.content}</div>
                </div>
                <div style={{ width: 120, textAlign: 'right' }}>
                  <button className="btn btn-flag" onClick={()=>deleteNote(n.id)} style={{ width: 'auto', minWidth: 90, fontSize: '12px' }}>
                    DELETE
                  </button>
                </div>
              </li>
            ))
          ) : (
            <li style={{ padding: 18 }}>No notes</li>
          )}
        </ul>
      </div>

      {expandedCell && (
        <>
          <div className="modal-backdrop" onClick={()=> setExpandedCell(null)} />
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
              <h2 id="modal-title" className="modal-title">{expandedCell.key}</h2>
              <button className="btn-soft btn-mini" onClick={()=> setExpandedCell(null)}>Close</button>
            </div>
            <div style={{ whiteSpace:'pre-wrap', lineHeight:1.5, fontSize:15 }}>{expandedCell.value}</div>
          </div>
        </>
      )}
    </div>
  );
}
