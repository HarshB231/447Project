"use client";
import React, { useState } from 'react';

// Simple placeholder report generation assistant page.
// Matches styling of dashboard/employees using container + cards.
export default function ReportAssistPage() {
  const [reportType, setReportType] = useState('visa-expirations');
  const [range, setRange] = useState('next-180');
  const [generated, setGenerated] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function generateReport(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Placeholder: client-side only mock, in future fetch /api/report?type=...&range=...
    setTimeout(() => {
      const sample = [
        { id: 101, name: 'Demo User', visa: 'H-1B', endDate: '2026-08-14', daysLeft: 500 },
        { id: 202, name: 'Sample Scholar', visa: 'J-1', endDate: '2025-12-01', daysLeft: 370 },
      ];
      setGenerated(sample);
      setLoading(false);
    }, 650);
  }

  return (
    <div className="container container-wide">
      <h1 className="h1">Report Assist</h1>
      <div className="card pad" style={{ marginBottom: 24 }}>
        <div className="title" style={{ marginBottom: 12 }}>Build a quick report</div>
        <form onSubmit={generateReport} style={{ display: 'grid', gap: 14, maxWidth: 680 }}>
          <label style={{ display:'grid', gap:6 }}>
            <span className="help">Report Type</span>
            <select className="input" value={reportType} onChange={e=>setReportType(e.target.value)}>
              <option value="visa-expirations">Visa Expirations</option>
              <option value="flagged">Flagged Employees</option>
              <option value="permanent-residents">Permanent Residents</option>
            </select>
          </label>
          <label style={{ display:'grid', gap:6 }}>
            <span className="help">Range</span>
            <select className="input" value={range} onChange={e=>setRange(e.target.value)}>
              <option value="next-90">Next 90 Days</option>
              <option value="next-180">Next 180 Days</option>
              <option value="all">All Future</option>
            </select>
          </label>
          <div>
            <button type="submit" className="btn-soft" disabled={loading}>{loading ? 'Generating...' : 'Generate'}</button>
          </div>
        </form>
      </div>

      {generated && (
        <div className="card section">
          <div className="titlebar">
            <div className="title">Preview ({generated.length} rows)</div>
            <div className="help">Mock data for demonstration</div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Name</th><th>Visa</th><th>Expiration</th><th>Days Left</th></tr>
              </thead>
              <tbody>
                {generated.map(r => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td><span className="chip">{r.visa}</span></td>
                    <td>{r.endDate}</td>
                    <td>{r.daysLeft}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
