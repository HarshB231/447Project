"use client";
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function ImportExportPage() {
  const [uploading,setUploading] = useState(false);
  const [result,setResult] = useState<any>(null);
  const [clearing,setClearing] = useState(false);
  const [resetting,setResetting] = useState(false);
  const [actorEmail, setActorEmail] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  useEffect(() => {
    supabase?.auth.getSession().then(({ data }) => {
      setActorEmail(data.session?.user?.email || null);
    }).catch(() => setActorEmail(null));
  }, []);

  async function handleExport(){
    const res = await fetch('/api/export');
    if (!res.ok) { alert('Export failed'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'employees-export.xlsx'; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: React.FormEvent){
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fileInput = form.querySelector('input[type=file]') as HTMLInputElement;
    if (!fileInput.files || fileInput.files.length === 0) { alert('Choose file'); return; }
    const fd = new FormData();
    fd.append('file', fileInput.files[0]);
    if (actorEmail) fd.append('actor', actorEmail);
    setUploading(true); setResult(null);
    try {
      const res = await fetch('/api/import', { method:'POST', body: fd });
      const json = await res.json();
      setResult(json);
      setSelectedFileName(null);
    } catch (err) {
      setResult({ error: String(err) });
    } finally { setUploading(false); }
  }

  async function handleClear(){
    if (!confirm('Clear current data (all imported raw rows) for all employees?')) return;
    setClearing(true); setResult(null);
    try {
      const res = await fetch('/api/import/clear', { method:'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actor: actorEmail || undefined }) });
      const json = await res.json();
      setResult(json);
    } catch (err) {
      setResult({ error: String(err) });
    } finally { setClearing(false); }
  }

  async function handleReset(){
    if (!confirm('RESET ALL DATA: This deletes all employees and audit entries. Proceed?')) return;
    setResetting(true); setResult(null);
    try {
      const res = await fetch('/api/import/reset', { method:'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actor: actorEmail || undefined }) });
      const json = await res.json();
      setResult(json);
    } catch (err) {
      setResult({ error: String(err) });
    } finally { setResetting(false); }
  }

  return (
    <div className="container container-wide" style={{ fontSize: '1.5rem' }}>
      <h1 className="h1" style={{ fontSize: '3rem', marginBottom: 24 }}>Import / Export</h1>
      <div className="card" style={{ padding:48, marginBottom:32, width: '100%' }}>
        <div className="title" style={{ marginBottom:16, fontSize: '2rem' }}>Export Current Data</div>
        <p className="help" style={{ marginTop:0, fontSize: '1.25rem' }}>Generates an Excel file from current employees and raw rows.</p>
        <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
          <button className="btn btn-flag" onClick={handleExport} style={{ minWidth:240, fontSize:'1.5rem', padding: '14px 18px' }}>Download Excel</button>
          <button className="btn btn-soft" onClick={handleClear} disabled={clearing} style={{ minWidth:240, fontSize:'1.5rem', padding: '14px 18px' }}>{clearing? 'Clearing…':'Clear Current Data'}</button>
          <button className="btn btn-danger" onClick={handleReset} disabled={resetting} style={{ minWidth:260, fontSize:'1.5rem', padding: '14px 18px' }}>{resetting? 'Resetting…':'Reset All Data'}</button>
        </div>
      </div>
      <div className="card" style={{ padding:48, width: '100%' }}>
        <div className="title" style={{ marginBottom:16, fontSize: '2rem' }}>Import Updated Excel</div>
        <form onSubmit={handleImport} style={{ display:'flex', flexDirection:'column', gap:24 }}>
          <input
            type="file"
            name="file"
            accept=".xlsx"
            className="input"
            style={{ fontSize:'1.5rem', padding: '12px 14px', height: 56 }}
            onChange={(ev)=> {
              const f = (ev.target as HTMLInputElement).files?.[0];
              setSelectedFileName(f ? f.name : null);
            }}
          />
          {selectedFileName && (
            <div className="help" style={{ fontSize:'1.25rem' }}>Selected file: {selectedFileName}</div>
          )}
          <button type="submit" disabled={uploading} className="btn btn-flag" style={{ minWidth:240, fontSize:'1.5rem', padding: '14px 18px' }}>{uploading? 'Uploading…':'Import File'}</button>
        </form>
        {result && (
          <div style={{ marginTop:24, fontSize:'1.25rem' }}>
            {result.error && (
              <div className="alert alert-error">{String(result.error)}</div>
            )}
            {result.success && (
              <div className="alert alert-success" style={{ fontSize:'1.25rem' }}>
                <div>
                  {typeof result.employeesUpdated === 'number' && (<span>Import completed. Employees updated: {result.employeesUpdated}</span>)}
                  {typeof result.employeesCreated === 'number' && (<span> • Employees created: {result.employeesCreated}</span>)}
                  {typeof result.employeesCleared === 'number' && (<span> Cleared employees: {result.employeesCleared}</span>)}
                  {result.employeesReset && (<span> All employees deleted.</span>)}
                  {result.auditReset && (<span> Audit log cleared.</span>)}
                </div>
                {typeof result.headersOk === 'boolean' && (
                  <div>Header validation: {result.headersOk ? 'OK' : 'Mismatch'}{!result.headersOk && result.headersDetected ? ` (Detected: ${result.headersDetected.join(', ')})` : ''}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
