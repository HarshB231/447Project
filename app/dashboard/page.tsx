"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type Stats = { total: number; flagged: number; expiringSoon: number; f1: number; j1: number; h1: number; pr: number };
type EmployeeSummary = { id: number; firstName?: string; lastName?: string; umbcEmail?: string; department?: string; currentVisa?: { type?: string; startDate?: string | null; endDate?: string | null } };

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [expiring, setExpiring] = useState<EmployeeSummary[]>([]);
  const router = useRouter();

  // Auth guard: if not logged in, go to login
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/");
    });
  }, [router]);

  // Load stats and employees
  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats).catch(console.error);
    fetch("/api/employees").then((r) => r.json()).then((data) => setExpiring(data.slice(0, 50))).catch(console.error);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <div className="container">
      <h1 className="h1">Dashboard</h1>

      <div className="segmented-wrap">
        <div className="segmented">
          <button className="segmented-item" onClick={handleLogout}>Back to Login</button>
          <a className="segmented-item active" href="/dashboard">Dashboard</a>
          <a className="segmented-item" href="/employees">Employees</a>
        </div>
      </div>

      {/* KPIs and table */}
      <div className="kpis">
        <div className="card kpi pad large-kpi">
          <div className="label"># of live records</div>
          <div className="value">{stats ? stats.total : '—'}</div>
        </div>
        <div className="card kpi pad large-kpi">
          <div className="label">F-1 cases</div>
          <div className="value">{stats ? stats.f1 : '—'}</div>
        </div>
        <div className="card kpi pad large-kpi">
          <div className="label">J-1 cases</div>
          <div className="value">{stats ? stats.j1 : '—'}</div>
        </div>
          <div className="card kpi pad large-kpi">
            <div className="label">H-1B cases</div>
            <div className="value">{stats ? stats.h1 : '—'}</div>
          </div>
          <div className="card kpi pad large-kpi">
            <div className="label">Permanent Residents</div>
            <div className="value">{stats ? stats.pr : '—'}</div>
          </div>
      </div>

      <section className="card section">
        <div className="titlebar">
          <div className="title">Amount of current cases</div>
          <div className="help">{stats ? `${stats.expiringSoon} case(s)` : '—'}</div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Visa Type</th><th>Expiration</th><th>Due</th></tr>
            </thead>
            <tbody>
              {expiring.map(e => {
                const name = [e.firstName, e.lastName].filter(Boolean).join(' ') || e.umbcEmail;
                const visa = e.currentVisa as any;
                const exp = visa?.endDate ? new Date(visa.endDate) : null;
                let due = '—';
                if (exp) {
                  const now = new Date();
                  const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  due = diff >= 0 ? `${diff}d` : 'Expired';
                }
                return (
                  <tr key={e.id}>
                    <td>{name}</td>
                    <td>{visa?.type ? <span className="chip">{visa.type}</span> : '—'}</td>
                    <td>{exp ? exp.toLocaleDateString() : '—'}</td>
                    <td className={exp && exp < new Date() ? 'due-neg' : ''}>{due}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
