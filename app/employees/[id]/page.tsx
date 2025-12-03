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
  const [editMode, setEditMode] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string,string>>({});
  const [saving, setSaving] = useState(false);
  const [actorEmail, setActorEmail] = useState<string|undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [editingCell, setEditingCell] = useState<{ key: string; original: string } | null>(null);

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
    // fetch session for actor email
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        const em = data?.session?.user?.email;
        if (em) setActorEmail(em);
      }).catch(()=>{});
    }
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
    const rowIdx = (selectedRows[0] ?? activeRowIndex) || 0;
    const row = rowsAll[rowIdx] || {};
    const start = row['start date'] || row['initial h-1b start'] || row['initial h-1b start date'] || row['initial h1b start'] || row['h1b start'] || row['expiration date'] || row['end date'] || '';
    await fetch('/api/notes', {
      method: 'POST',
      body: JSON.stringify({ employeeId: id, content: newNote, rowIndex: rowIdx, startDate: start }),
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

  function beginEdit(rowIdx:number){
    setActiveRowIndex(rowIdx);
    const row = rowsAll[rowIdx] || {};
    const initial: Record<string,string> = {};
    for (const h of headers) initial[h] = showVal(row[h]) === '—' ? '' : String(row[h]);
    setEditedValues(initial);
    setEditMode(true);
  }

  function beginEditRowCell(rowIdx:number, key:string){
    const row = rowsAll[rowIdx] || {};
    const initial: Record<string,string> = {};
    for (const h of headers) initial[h] = showVal(row[h]) === '—' ? '' : String(row[h]);
    setActiveRowIndex(rowIdx);
    setEditedValues(initial);
    setEditMode(true);
    setEditingCell({ key, original: initial[key] ?? '' });
  }

  function cancelEdit(){
    setEditMode(false);
    setEditedValues({});
  }

  async function saveEdit(){
    if (!editMode) return;
    setSaving(true);
    try {
      const rowOriginal = rowsAll[activeRowIndex] || {};
      const updates: Record<string, any> = {};
      for (const [k,v] of Object.entries(editedValues)) {
        const orig = showVal(rowOriginal[k]) === '—' ? '' : String(rowOriginal[k] ?? '');
        if (orig !== v) updates[k] = v === '' ? null : v; // allow clearing
      }
      if (Object.keys(updates).length === 0) {
        setEditMode(false);
        return;
      }
      await fetch(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor: actorEmail,
          editRawRow: { rowIndex: activeRowIndex, updates, actor: actorEmail },
        })
      });
      const r = await fetch(`/api/employees/${id}`);
      setEmployee(await r.json());
      setEditMode(false);
      setEditedValues({});
    } catch (e) {
      console.error(e);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="employee-detail-wide">
      <div style={{ display:'flex', alignItems:'center', gap:24, marginBottom:12 }}>
        <button onClick={()=> router.push('/employees')} className="btn-soft return-btn" style={{ fontSize: '1.15rem', padding: '12px 16px' }}>← Return</button>
        <h1 className="h1" style={{ margin:'0 0 4px', fontSize:'2.25rem' }}>Employee Details</h1>
      </div>
      <div className="card" style={{ borderRadius:20, marginBottom:32 }}>
          <div style={{ padding:'32px 28px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:28 }}>
          <div style={{ minWidth:260 }}>
            <h2 style={{ margin:'0 0 10px', fontSize:'1.9rem' }}>{[employee.firstName, employee.lastName].filter(Boolean).join(' ')}</h2>
            <div className="detail-meta" style={{ fontSize:'1.15rem' }}>{employee.umbcEmail} • {employee.department || ''} {employee.title ? '• ' + employee.title : ''}</div>
          </div>
          <div style={{ display:'flex', gap:12, flexDirection:'column' }}>
            <button onClick={toggleFlag} className={`btn ${employee.flagged ? 'btn-unflag' : 'btn-flag'}`} style={{ minWidth:180, fontSize:'1.15rem', padding:'12px 16px' }}>
              {employee.flagged ? 'UNFLAG' : 'FLAG'}
            </button>
            {!editMode ? (
              <button className="btn-soft" onClick={()=> beginEdit((selectedRows[0] ?? activeRowIndex))} style={{ minWidth:180, fontSize:'1.15rem', padding:'12px 16px' }}>Enter Edit Mode</button>
            ) : (
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-flag" disabled={saving} onClick={saveEdit} style={{ minWidth:160, fontSize:'1.1rem', padding:'12px 16px' }}>{saving? 'Saving…':'Save Changes'}</button>
                <button className="btn-soft" disabled={saving} onClick={cancelEdit} style={{ minWidth:120, fontSize:'1.1rem', padding:'12px 16px' }}>Cancel</button>
              </div>
            )}
          </div>
        </div>
        <div style={{ padding:'0 28px 36px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:18, margin:'4px 0 22px', flexWrap:'wrap' }}>
            <div className="rows-chooser">
              <button className="btn btn-lg" onClick={()=> setRowsMenuOpen(v=>!v)} style={{ fontSize:'1.1rem', padding:'12px 16px' }}>Rows • {selectedRows.length} selected</button>
              {rowsMenuOpen && (
                <div className="rows-panel" role="menu">
                  <div className="panel-actions">
                    <button className="btn-soft btn-mini" onClick={()=> setSelectedRows(rowsAll.map((_,i)=>i))} style={{ fontSize:'1rem', padding:'8px 12px' }}>Select All</button>
                    <button className="btn-soft btn-mini" onClick={()=> setSelectedRows([])} style={{ fontSize:'1rem', padding:'8px 12px' }}>Clear</button>
                    <button className="btn-soft btn-mini" onClick={()=> sortSelected(true)} style={{ fontSize:'1rem', padding:'8px 12px' }}>Newest first</button>
                    <button className="btn-soft btn-mini" onClick={()=> sortSelected(false)} style={{ fontSize:'1rem', padding:'8px 12px' }}>Oldest first</button>
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
          <div className="card" style={{ padding:20, overflowX:'auto' }}>
            <table className="table detail-table" style={{ minWidth: headers.length * 220, fontSize:'1.05rem' }}>
              <thead>
                <tr>
                  {headers.map(h => <th key={h} style={{ whiteSpace:'normal', fontSize:'1.05rem' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {(selectedRows.length? selectedRows : [activeRowIndex]).map((rowIdx)=> (
                  <tr key={rowIdx}>
                    {headers.map(h => {
                      const val = (rowsAll[rowIdx]||{})[h];
                      const display = showVal(val);
                      const long = isLong(val) || /\S{35,}/.test(display);
                      if (editMode && rowIdx === activeRowIndex) {
                        const currentVal = editedValues[h] ?? '';
                        const InputTag = long ? 'textarea' : 'input';
                        return (
                          <td key={h+rowIdx} style={{ maxWidth:300, fontSize:'1.05rem' }}>
                            <InputTag
                              value={currentVal}
                              onChange={(e:any)=> setEditedValues(ev=> ({ ...ev, [h]: e.target.value }))}
                              className="input"
                              style={{ width:'100%', fontSize:'1.05rem', minHeight: long? 80: undefined, resize: long? 'vertical': 'none' }}
                              placeholder={h}
                            />
                            <div style={{ marginTop:6, display:'flex', justifyContent:'flex-end' }}>
                              <button
                                type="button"
                                className="btn-soft btn-mini"
                                onClick={()=> setEditingCell({ key: h, original: currentVal })}
                                style={{ fontSize:'0.9rem', padding:'8px 10px' }}
                              >Edit</button>
                            </div>
                          </td>
                        );
                      }
                      if (editMode && rowIdx !== activeRowIndex) {
                        const displayForEdit = display;
                        let truncatedForEdit = displayForEdit;
                        if (long && displayForEdit !== '?') {
                          const limit = 70;
                          if (displayForEdit.length > limit) {
                            const cut = displayForEdit.slice(0, limit);
                            const lastSpace = cut.lastIndexOf(' ');
                            truncatedForEdit = (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim() + '…';
                          }
                        }
                        return (
                          <td key={h+rowIdx} style={{ maxWidth:300, fontSize:'1.05rem' }}>
                            <div className="cell-long" style={{ gap:10 }}>
                              <span>{long ? truncatedForEdit : displayForEdit}</span>
                              {long && (
                                <button type="button" className="btn-soft btn-view" onClick={()=> setExpandedCell({ key: h, value: display })} style={{ fontSize:'1rem', padding:'8px 12px' }}>View</button>
                              )}
                              <button
                                type="button"
                                className="btn-soft btn-mini"
                                onClick={()=> beginEditRowCell(rowIdx, h)}
                                style={{ fontSize:'0.9rem', padding:'8px 10px' }}
                              >Edit</button>
                            </div>
                          </td>
                        );
                      }
                      let truncated = display;
                      if (long && display !== '?') {
                        const limit = 70;
                        if (display.length > limit) {
                          const cut = display.slice(0, limit);
                          const lastSpace = cut.lastIndexOf(' ');
                          truncated = (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim() + '…';
                        }
                      }
                      return (
                        <td key={h+rowIdx} style={{ maxWidth:300, fontSize:'1.05rem' }}>
                          {long ? (
                            <div className="cell-long" style={{ gap:10 }}>
                              <span>{truncated}</span>
                              <button type="button" className="btn-soft btn-view" onClick={()=> setExpandedCell({ key: h, value: display })} style={{ fontSize:'1rem', padding:'8px 12px' }}>View</button>
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
          {/* Save/Cancel controls moved next to FLAG/Enter Edit to keep header tidy */}
        </div>
      </div>

      <div className="card" style={{ borderRadius:20, padding:'24px 24px 26px' }}>
        <div className="title" style={{ marginBottom:12, fontSize:20 }}>Notes</div>
        <textarea
          value={newNote}
          onChange={(e)=>setNewNote(e.target.value)}
          className="input"
          placeholder="Add new note..."
          rows={6}
          style={{ width: '100%', resize: 'vertical', fontSize: '1.05rem' }}
        ></textarea>
        <div style={{ marginTop: 12 }}>
          <button className="btn btn-flag" onClick={addNote} style={{ width: 'auto', minWidth: 180, fontSize:'1.1rem', padding:'12px 16px' }}>
            SAVE NOTE
          </button>
        </div>
        <ul className="notes-list" style={{ marginTop: 16 }}>
          {employee.notes && employee.notes.length > 0 ? (
            employee.notes.map((n: any)=> (
              <li key={n.id} style={{ padding: 18, borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', gap: 18 }}>
                <div style={{ flex: 1 }}>
                  <div className="help" style={{ fontWeight: 600 }}>
                    {new Date(n.createdAt).toLocaleString()}
                    {typeof n.rowIndex === 'number' && (
                      <span> • Row {Number(n.rowIndex)+1}</span>
                    )}
                    {n.startDate && (
                      <span> • Start: {String(n.startDate).toString().slice(0,10)}</span>
                    )}
                  </div>
                  <div style={{ marginTop: 8, lineHeight: 1.5 }}>{n.content}</div>
                </div>
                <div style={{ width: 120, textAlign: 'right' }}>
                  <button className="btn btn-flag" onClick={()=>deleteNote(n.id)} style={{ width: 'auto', minWidth: 110, fontSize: '1rem', padding:'10px 14px' }}>
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
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" style={{ width:'80vw', maxWidth:1200, maxHeight:'80vh', overflow:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <h2 id="modal-title" className="modal-title" style={{ fontSize:'1.5rem' }}>{expandedCell.key}</h2>
              <button className="btn-soft btn-mini" onClick={()=> setExpandedCell(null)} style={{ fontSize:'1rem', padding:'8px 12px' }}>Close</button>
            </div>
            <div style={{ whiteSpace:'pre-wrap', lineHeight:1.7, fontSize:'1.05rem' }}>{expandedCell.value}</div>
          </div>
        </>
      )}
      {editingCell && editMode && (
        <>
          <div className="modal-backdrop" onClick={()=> setEditingCell(null)} />
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-edit-title" style={{ width:'80vw', maxWidth:1200, maxHeight:'80vh', overflow:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <h2 id="modal-edit-title" className="modal-title">Edit: {editingCell.key}</h2>
              <button className="btn-soft btn-mini" onClick={()=> {
                // revert changes if user cancels
                setEditedValues(ev => ({ ...ev, [editingCell.key]: editingCell.original }));
                setEditingCell(null);
              }} style={{ fontSize:'1rem', padding:'8px 12px' }}>Cancel</button>
            </div>
            <textarea
              value={editedValues[editingCell.key] ?? ''}
              onChange={(e)=> setEditedValues(ev=> ({ ...ev, [editingCell.key]: e.target.value }))}
              className="input"
              rows={18}
              style={{ width:'100%', resize:'vertical', fontSize:'1.05rem', lineHeight:1.6 }}
              placeholder={editingCell.key}
            />
            <div style={{ marginTop:12, display:'flex', justifyContent:'flex-end', gap:8 }}>
              <button
                type="button"
                className="btn btn-flag"
                onClick={()=> setEditingCell(null)}
                style={{ minWidth:140, fontSize:'1.05rem', padding:'12px 16px' }}
              >Done</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
