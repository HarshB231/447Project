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
    supabase?.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/");
    }).catch(() => router.replace("/"));
  }, [router]);

  // Load stats and employees
  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setStats).catch(console.error);
    fetch("/api/employees").then((r) => r.json()).then((data) => setExpiring(data.slice(0, 50))).catch(console.error);
  }, []);

  async function handleLogout() {
    try { await supabase?.auth.signOut(); } catch {}
    router.replace("/");
  }

  // Helper: map days-until-expiration -> background/text color.
  // Year-based color mapping:
  // - expired or same calendar year => red (too close)
  // - next year => orange (somewhat okay)
  // - 2 years => yellow (caution)
  // - 3+ years => green (safe)
  function expirationColors(days: number | null, exp: Date | null) {
    if (!exp) return { bg: "transparent", fg: "inherit" };
    if (days !== null && days < 0) return { bg: "#7f0000", fg: "#fff" }; // expired

    const now = new Date();
    const yearDiff = exp.getFullYear() - now.getFullYear();

    if (yearDiff <= 0) {
      // same year (or earlier but not marked expired) -> consider too close
      return { bg: "#ff4d4f", fg: "#fff" }; // red
    }
    if (yearDiff === 1) {
      return { bg: "#ff8a00", fg: "#fff" }; // orange
    }
    if (yearDiff === 2) {
      return { bg: "#ffd54f", fg: "#000" }; // yellow
    }
    // 3 or more years
    return { bg: "#66bb6a", fg: "#fff" }; // green
  }

  return (
    <div className="container container-wide">
      <h1 className="h1">Dashboard</h1>

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
          <div className="help highlight-counter">{stats ? `${stats.expiringSoon} case(s)` : '—'}</div>
        </div>

        <div className="table-wrap">
          <table className="table dash-table">
            <thead>
              <tr><th>Name</th><th>Visa Type</th><th>Expiration</th><th>Due</th><th>View</th></tr>
            </thead>
            <tbody>
              {expiring.map(e => {
                const name = [e.firstName, e.lastName].filter(Boolean).join(' ') || e.umbcEmail;
                const visa = e.currentVisa as any;
                const exp = visa?.endDate ? new Date(visa.endDate) : null;

                let due = '—';
                let daysLeft: number | null = null;
                if (exp) {
                  const now = new Date();
                  daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  due = daysLeft >= 0 ? `${daysLeft}d` : 'Expired';
                }

                const colors = expirationColors(daysLeft, exp);

                return (
                  <tr key={e.id}>
                    <td>{name}</td>
                    <td>{visa?.type ? <span className="chip">{visa.type}</span> : '—'}</td>
                    <td>{exp ? exp.toLocaleDateString() : '—'}</td>
                    <td style={{ backgroundColor: colors.bg, color: colors.fg, borderRadius: 6, padding: '6px 8px', fontWeight:500 }} className={exp && exp < new Date() ? 'due-neg' : ''}>
                      {due}
                    </td>
                    <td><button className="btn-soft" onClick={()=>router.push(`/employees/${e.id}`)}>View</button></td>
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
