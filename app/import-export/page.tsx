"use client";
import React, { useState } from 'react';

export default function ImportExportPage() {
  const [uploading,setUploading] = useState(false);
  const [result,setResult] = useState<any>(null);

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

  return (
    <div className="container container-wide">
      <h1 className="h1">Import / Export</h1>
      <div className="card" style={{ padding:24, marginBottom:32 }}>
        <div className="title" style={{ marginBottom:12 }}>Export Current Data</div>
        <p className="help" style={{ marginTop:0 }}>Generates an Excel file from in-memory employees + raw rows.</p>
        <button className="btn btn-flag" onClick={handleExport} style={{ minWidth:180 }}>Download Excel</button>
      </div>
      <div className="card" style={{ padding:24 }}>
        <div className="title" style={{ marginBottom:12 }}>Import Updated Excel</div>
        <form onSubmit={handleImport} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <input type="file" name="file" accept=".xlsx" className="input" />
          <button type="submit" disabled={uploading} className="btn btn-flag" style={{ minWidth:160 }}>{uploading? 'Uploading…':'Import File'}</button>
        </form>
        {result && (
          <div style={{ marginTop:18, fontSize:14 }}>
            <strong>Result:</strong> {JSON.stringify(result)}
          </div>
        )}
      </div>
    </div>
  );
}
