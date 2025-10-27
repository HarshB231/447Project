"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";

type EmployeeSummary = {
  id: number;
  firstName?: string;
  lastName?: string;
  umbcEmail?: string;
  department?: string;
  title?: string;
  flagged?: boolean;
  visas?: { type?: string }[];
};

export default function Page() {
  const [q, setQ] = useState("");
  const [visaFilter, setVisaFilter] = useState("");
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [processing, setProcessing] = useState<number[]>([]);

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (visaFilter) params.set('visa', visaFilter);
    const res = await fetch(`/api/employees?${params.toString()}`);
    const data = await res.json();
    setEmployees(data);
  }

  async function toggleFlag(id: number, current: boolean) {
    try {
      setProcessing(p => [...p, id]);
      await fetch(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flagged: !current }),
      });
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(p => p.filter(x => x !== id));
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="container">
      <h1 className="h1">Employees & Scholars</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <input className="input" placeholder="Search name..." value={q} onChange={(e)=>setQ(e.target.value)} />
        <input className="input" placeholder="Visa type" value={visaFilter} onChange={(e)=>setVisaFilter(e.target.value)} />
        <button className="input" onClick={load}>Search</button>
      </div>

      <div className="card section">
        <div className="titlebar">
          <div className="title">Employees & Scholars</div>
          <div className="help">{employees.length} shown</div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Visa</th>
                <th>Department</th>
                <th>Title</th>
                <th>Flagged</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id}>
                  <td>{[e.firstName, e.lastName].filter(Boolean).join(' ') || e.umbcEmail}</td>
                  <td>{(e as any).currentVisa?.type ? <span className="chip">{(e as any).currentVisa.type}</span> : (e.visas && e.visas[0]?.type ? <span className="chip">{e.visas[0].type}</span> : '—')}</td>
                  <td>{e.department}</td>
                  <td>{e.title}</td>
                  <td>{e.flagged ? <span className="due-neg">Yes</span> : 'No'}</td>
                  <td style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button className="input" onClick={() => toggleFlag(e.id, !!e.flagged)} disabled={processing.includes(e.id)}>
                      {e.flagged ? 'Unflag' : 'Flag'}
                    </button>
                    <Link href={`/employees/${e.id}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
