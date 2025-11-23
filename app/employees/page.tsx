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
  const [visaFilter, setVisaFilter] = useState("");
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);
  const [processing, setProcessing] = useState<number[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<EmployeeSummary[]>([]);
  const router = useRouter();

  // redirect to login if no session
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/");
    });
  }, [router]);

  async function load() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (visaFilter) params.set("visa", visaFilter);
    const res = await fetch(`/api/employees?${params.toString()}`);
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
    await supabase.auth.signOut();
    router.replace("/");
  }

  function computeFiltered(list: EmployeeSummary[], query: string, visa: string) {
    const norm = (s?: string) => (s || '').toLowerCase();
    const qn = norm(query);
    const vn = norm(visa);
    return list.filter((e) => {
      const name = norm([e.firstName, e.lastName].filter(Boolean).join(' '));
      const email = norm(e.umbcEmail);
      const matchesQ = !qn || name.includes(qn) || email.includes(qn);

      const visaType = norm(((e as any).currentVisa?.type) || (e.visas && e.visas[0]?.type) || '');
      const matchesVisa = !vn || visaType.includes(vn);

      return matchesQ && matchesVisa;
    });
  }

  useEffect(() => {
    setFilteredEmployees(computeFiltered(employees, q, visaFilter));
  }, [employees, q, visaFilter]);

  return (
    <div className="container container-wide">
      <h1 className="h1">Employees & Scholars</h1>

      {/* Search row: make Search a soft, popping button */}
      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <input className="input big-search-input" placeholder="Search name..." value={q} onChange={(e) => setQ(e.target.value)} />
        <input className="input big-search-input" placeholder="Visa type" value={visaFilter} onChange={(e) => setVisaFilter(e.target.value)} />
        <button className="btn-soft big-search-btn" onClick={load}>Search</button>
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
