"use client";
import React, { useState } from 'react';

export default function ImportExportPage() {
  const [uploading,setUploading] = useState(false);
  const [result,setResult] = useState<any>(null);
  const [clearing,setClearing] = useState(false);
  const [resetting,setResetting] = useState(false);

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
    setUploading(true); setResult(null);
    try {
      const res = await fetch('/api/import', { method:'POST', body: fd });
      const json = await res.json();
      setResult(json);
    } catch (err) {
      setResult({ error: String(err) });
    } finally { setUploading(false); }
  }

  async function handleClear(){
    if (!confirm('Clear current data (all imported raw rows) for all employees?')) return;
    setClearing(true); setResult(null);
    try {
      const res = await fetch('/api/import/clear', { method:'POST' });
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
      const res = await fetch('/api/import/reset', { method:'POST' });
      const json = await res.json();
      setResult(json);
    } catch (err) {
      setResult({ error: String(err) });
    } finally { setResetting(false); }
  }

  return (
    <div className="container container-wide">
      <h1 className="h1" style={{ fontSize: '2.25rem' }}>Import / Export</h1>
      <div className="card" style={{ padding:32, marginBottom:32, maxWidth: '100%' }}>
        <div className="title" style={{ marginBottom:16, fontSize: '1.25rem' }}>Export Current Data</div>
        <p className="help" style={{ marginTop:0, fontSize: '1rem' }}>Generates an Excel file from current employees and raw rows.</p>
        <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
          <button className="btn btn-flag" onClick={handleExport} style={{ minWidth:200, fontSize:'1rem' }}>Download Excel</button>
          <button className="btn btn-soft" onClick={handleClear} disabled={clearing} style={{ minWidth:200, fontSize:'1rem' }}>{clearing? 'Clearing…':'Clear Current Data'}</button>
          <button className="btn btn-danger" onClick={handleReset} disabled={resetting} style={{ minWidth:220, fontSize:'1rem' }}>{resetting? 'Resetting…':'Reset All Data'}</button>
        </div>
      </div>
      <div className="card" style={{ padding:32, maxWidth: '100%' }}>
        <div className="title" style={{ marginBottom:16, fontSize: '1.25rem' }}>Import Updated Excel</div>
        <form onSubmit={handleImport} style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <input type="file" name="file" accept=".xlsx" className="input" style={{ fontSize:'1rem' }} />
          <button type="submit" disabled={uploading} className="btn btn-flag" style={{ minWidth:200, fontSize:'1rem' }}>{uploading? 'Uploading…':'Import File'}</button>
        </form>
        {result && (
          <div style={{ marginTop:20 }}>
            {result.error && (
              <div className="alert alert-error">{String(result.error)}</div>
            )}
            {result.success && (
              <div className="alert alert-success">
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
