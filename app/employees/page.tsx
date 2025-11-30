// Top-level imports (must be first)
"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

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
  // hooks must be inside the component
  const [q, setQ] = useState("");
  const [searchType, setSearchType] = useState<'name'|'visa'|'department'>('name');
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [processing, setProcessing] = useState<number[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeSummary[]>([]);
  const router = useRouter();

  // redirect to login if no session
  useEffect(() => {
    supabase?.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/");
    }).catch(() => router.replace("/"));
  }, [router]);

  async function load() {
    // Backend still returns all; filtering client-side by searchType
    const res = await fetch(`/api/employees`);
    const data = await res.json();
    setEmployees(data);
  }

  async function toggleFlag(id: number, current: boolean) {
    try {
      setProcessing((p) => [...p, id]);
      await fetch(`/api/employees/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flagged: !current }),
      });
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing((p) => p.filter((x) => x !== id));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleLogout() {
    try { await supabase?.auth.signOut(); } catch {}
    router.replace("/");
  }

  function computeFiltered(list: EmployeeSummary[], query: string, mode: 'name'|'visa'|'department') {
    const norm = (s?: string) => (s || '').toLowerCase();
    const qn = norm(query);
    return list.filter((e) => {
      if (!qn) return true;
      if (mode === 'name') {
        const name = norm([e.firstName, e.lastName].filter(Boolean).join(' '));
        const email = norm(e.umbcEmail);
        return name.includes(qn) || email.includes(qn);
      }
      if (mode === 'visa') {
        const visaType = norm(((e as any).currentVisa?.type) || (e.visas && e.visas[0]?.type) || '');
        return visaType.includes(qn);
      }
      if (mode === 'department') {
        return norm(e.department).includes(qn);
      }
      return true;
    });
  }

  useEffect(() => {
    setFilteredEmployees(computeFiltered(employees, q, searchType));
  }, [employees, q, searchType]);

  return (
    <div className="container container-wide">
      <h1 className="h1">Employees & Scholars</h1>

      {/* Search row: make Search a soft, popping button */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <select
          value={searchType}
          onChange={(e)=> setSearchType(e.target.value as any)}
          className="input big-search-input"
          style={{ width: 180 }}
        >
          <option value="name">Name</option>
          <option value="visa">Visa</option>
          <option value="department">Department</option>
        </select>
        <input
          className="input big-search-input"
          placeholder={`Search ${searchType}...`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ flex: 1 }}
        />
        <button className="btn-soft big-search-btn" onClick={load}>Refresh</button>
      </div>

      {/* Table section */}
      <div className="card section">
        <div className="titlebar">
          <div className="title">Employees & Scholars</div>
          <div className="help highlight-counter">{filteredEmployees.length} shown</div>
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
              {filteredEmployees.map((e) => (
                <tr key={e.id}>
                  <td>{[e.firstName, e.lastName].filter(Boolean).join(' ') || e.umbcEmail}</td>
                  <td>{(e as any).currentVisa?.type ? <span className="chip">{(e as any).currentVisa.type}</span> : (e.visas && e.visas[0]?.type ? <span className="chip">{e.visas[0].type}</span> : '—')}</td>
                  <td>{e.department}</td>
                  <td>{e.title}</td>
                  <td>{e.flagged ? <span className="flag-chip yes">Yes</span> : <span className="flag-chip no">No</span>}</td>
                  <td style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      className={`btn ${e.flagged ? 'btn-unflag' : 'btn-flag'}`}
                      onClick={() => toggleFlag(e.id, !!e.flagged)}
                      disabled={processing.includes(e.id)}
                    >
                      {e.flagged ? 'UNFLAG' : 'FLAG'}
                    </button>
                    <Link className="btn-soft" href={`/employees/${e.id}`}>View</Link>
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
