"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type Stats = { total: number; flagged: number; expiringSoon: number; f1: number; j1: number; h1: number; pr: number };
type EmployeeSummary = { id: number; firstName?: string; lastName?: string; umbcEmail?: string; department?: string; currentVisa?: { type?: string; startDate?: string | null; endDate?: string | null } };
type BreakdownRow = { key: string; count: number };

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [expiring, setExpiring] = useState<EmployeeSummary[]>([]);
  const [journeyRows, setJourneyRows] = useState<BreakdownRow[] | null>(null);
  const [expiringSoonCount, setExpiringSoonCount] = useState<number | null>(null);
  const [topDepartment, setTopDepartment] = useState<{ name: string; count: number } | null>(null);
  const [currentDataFile, setCurrentDataFile] = useState<string | null>(null);
  const router = useRouter();

  // Auth guard: if not logged in, go to login
  useEffect(() => {
    supabase?.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/");
    }).catch(() => router.replace("/"));
  }, [router]);

  // Load base employees for table, and compute KPIs from report endpoints
  useEffect(() => {
    fetch("/api/employees").then((r) => r.json()).then((data) => setExpiring(data.slice(0, 50))).catch(console.error);

    // Journey breakdown for KPI alignment
    fetch("/api/report?type=visa-journey-breakdown")
      .then(r => r.json())
      .then((json) => {
        setJourneyRows(json.rows || []);
        const total = json.total || 0;

        const get = (label: string) => (json.rows || []).find((x: BreakdownRow) => x.key === label)?.count || 0;
        const h1 = get('H-1B Initial') + get('H-1B Extension') + get('H-1B Extension (AC21)') + get('H-1B Port') + get('H-1B Amendment') + get('H-1B COS');
        const j1 = get('J-1');
        const f1 = get('F-1/OPT');
        // PR in-progress
        const pr = get('Permanent Residency') + get('I-140') + get('AOS');

        setStats({ total, flagged: 0, expiringSoon: 0, f1, j1, h1, pr });
      })
      .catch(console.error);

    // Expiring within next 180 days count
    fetch("/api/report?type=visa-expirations&range=next-180")
      .then(r => r.json())
      .then(json => setExpiringSoonCount((json.rows || []).length))
      .catch(console.error);

    // Top department by count
    fetch("/api/report?type=department-breakdown")
      .then(r => r.json())
      .then(json => {
        const rows: BreakdownRow[] = json.rows || [];
        if (rows.length > 0) setTopDepartment({ name: rows[0].key, count: rows[0].count });
      })
      .catch(console.error);

    // Latest imported file name from audit log
    fetch('/api/audit')
      .then(r=>r.json())
      .then((items)=>{
        const imp = (items as any[]).find(x => x.type === 'IMPORT' && typeof x.note === 'string');
        if (imp) {
          const m = /Imported file\s+(.+)/.exec(String(imp.note));
          setCurrentDataFile(m ? m[1] : null);
        }
      })
      .catch(console.error);
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
    <div className="container container-wide" style={{ fontSize: '1.5rem', paddingBottom: 32 }}>
      <h1 className="h1" style={{ fontSize: '3rem', marginBottom: 20 }}>Dashboard</h1>

      {/* KPIs and table */}
      <div className="kpis" style={{ gap: 20 }}>
        <div className="card kpi pad large-kpi" style={{ padding: 24 }}>
          <div className="label">Total Employees</div>
          <div className="value" style={{ fontSize: '2.25rem' }}>{stats ? stats.total : '—'}</div>
        </div>
        <div className="card kpi pad large-kpi" style={{ padding: 24 }}>
          <div className="label">On H‑1B Journey</div>
          <div className="value" style={{ fontSize: '2.25rem' }}>{stats ? stats.h1 : '—'}</div>
        </div>
        <div className="card kpi pad large-kpi" style={{ padding: 24 }}>
          <div className="label">On J‑1 Journey</div>
          <div className="value" style={{ fontSize: '2.25rem' }}>{stats ? stats.j1 : '—'}</div>
        </div>
        <div className="card kpi pad large-kpi" style={{ padding: 24 }}>
          <div className="label">On F‑1/OPT Journey</div>
          <div className="value" style={{ fontSize: '2.25rem' }}>{stats ? stats.f1 : '—'}</div>
        </div>
        <div className="card kpi pad large-kpi" style={{ padding: 24 }}>
          <div className="label">Working on PR (PR/I‑140/AOS)</div>
          <div className="value" style={{ fontSize: '2.25rem' }}>{stats ? stats.pr : '—'}</div>
        </div>
      </div>

      {/* Extra statistics */}
      <div className="kpis" style={{ gap: 20, marginTop: 18 }}>
        <div className="card kpi pad" style={{ padding: 24 }}>
          <div className="label">Expiring in 180 days</div>
          <div className="value" style={{ fontSize: '1.75rem' }}>{expiringSoonCount ?? '—'}</div>
        </div>
        <div className="card kpi pad" style={{ padding: 24 }}>
          <div className="label">Top Department (by count)</div>
          <div className="value" style={{ fontSize: '1.75rem' }}>{topDepartment ? `${topDepartment.name} (${topDepartment.count})` : '—'}</div>
        </div>
      </div>

      <section className="card section" style={{ padding: '16px 24px 24px' }}>
        <div className="titlebar">
          <div className="title" style={{ fontSize: '1.75rem' }}>Amount of current cases</div>
          <div className="help highlight-counter" style={{ fontSize: '1.25rem', color: '#000', fontWeight: 600 }}>{stats ? `${stats.total} case(s)` : '—'}</div>
          {currentDataFile && (
            <div className="help" style={{ marginTop: 6, fontSize: '1rem' }}>Data source: {currentDataFile}</div>
          )}
        </div>

        <div className="table-wrap" style={{ padding: '0 8px 8px' }}>
          <table className="table dash-table" style={{ width: '100%' }}>
            <thead>
              <tr><th style={{ fontSize:'1.25rem' }}>Name</th><th style={{ fontSize:'1.25rem' }}>Visa Type</th><th style={{ fontSize:'1.25rem' }}>Expiration</th><th style={{ fontSize:'1.25rem' }}>Due</th><th style={{ fontSize:'1.25rem' }}>View</th></tr>
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
                    <td style={{ fontSize:'1.25rem' }}>{name}</td>
                    <td style={{ fontSize:'1.25rem' }}>{visa?.type ? <span className="chip" style={{ fontSize:'1.05rem' }}>{visa.type}</span> : '—'}</td>
                    <td style={{ fontSize:'1.25rem' }}>{exp ? exp.toLocaleDateString() : '—'}</td>
                    <td style={{ backgroundColor: colors.bg, color: colors.fg, borderRadius: 6, padding: '10px 12px', fontWeight:600, fontSize:'1.25rem' }} className={exp && exp < new Date() ? 'due-neg' : ''}>
                      {due}
                    </td>
                    <td><button className="btn-soft" onClick={()=>router.push(`/employees/${e.id}`)} style={{ fontSize:'1.15rem', padding: '10px 14px' }}>View</button></td>
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
