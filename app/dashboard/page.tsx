"use client";
import React, { useEffect, useState } from "react";

type Stats = { total: number; flagged: number; expiringSoon: number };
type EmployeeSummary = { id: number; firstName?: string; lastName?: string; umbcEmail?: string; department?: string; visas?: { type?: string; endDate?: string }[] };

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [expiring, setExpiring] = useState<EmployeeSummary[]>([]);

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats).catch(console.error);
    // load some employees for the table (first page)
    fetch('/api/employees').then(r => r.json()).then((data) => setExpiring(data.slice(0,5))).catch(console.error);
  }, []);

  return (
    <div className="container">
      <h1 className="h1">Dashboard</h1>

      <div className="kpis">
        <div className="card kpi pad">
          <div className="label"># of live cases (not cumulative)</div>
          <div className="value">{stats ? stats.total : '—'}</div>
        </div>
        <div className="card kpi pad">
          <div className="label">Expiring ≤ window</div>
          <div className="value">{stats ? stats.expiringSoon : '—'}</div>
        </div>
        <div className="card kpi pad">
          <div className="label">Flagged</div>
          <div className="value">{stats ? stats.flagged : '—'}</div>
        </div>
        <div className="card kpi pad">
          <div className="label">Quick</div>
          <div className="value">Actions</div>
        </div>
      </div>

      <section className="card section">
        <div className="titlebar">
          <div className="title"># of upcoming cases (sample)</div>
          <div className="help">2 case(s)</div>
        </div>

        <table className="table">
          <thead>
            <tr><th>Name</th><th>Visa</th><th>End Date</th><th>Due</th></tr>
          </thead>
          <tbody>
            {expiring.map(e => (
              <tr key={e.id}>
                <td>{[e.firstName, e.lastName].filter(Boolean).join(' ') || e.umbcEmail}</td>
                <td>{e.visas?.[0]?.type ? <span className="chip">{e.visas?.[0]?.type}</span> : '—'}</td>
                <td>{e.visas?.[0]?.endDate ? new Date(e.visas[0].endDate).toLocaleDateString() : '—'}</td>
                <td className="due-neg">4d</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
