"use client";
import React, { useState } from 'react';

// Simple placeholder report generation assistant page.
// Matches styling of dashboard/employees using container + cards.
export default function ReportAssistPage() {
  const [reportType, setReportType] = useState('visa-expirations');
  const [range, setRange] = useState('next-180');
  const [generated, setGenerated] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string,{ loading:boolean; error?:string; employees?:any[] }>>({});

  async function generateReport(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setGenerated(null);
    try {
      const r = await fetch(`/api/report?type=${encodeURIComponent(reportType)}&range=${encodeURIComponent(range)}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json?.message || 'Failed');
      setGenerated(json.rows || []);
      setExpanded({}); // reset expansions when regenerating
    } catch (err:any) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }

  async function toggleCategory(cat:string){
    if (!generated) return;
    setExpanded(prev => {
      const cur = prev[cat];
      // collapse if already loaded and open
      if (cur && !cur.loading && cur.employees) {
        const copy = { ...prev };
        delete copy[cat];
        return copy;
      }
      return { ...prev, [cat]: { loading:true } };
    });
    try {
      const r = await fetch(`/api/report?type=${encodeURIComponent(reportType)}&category=${encodeURIComponent(cat)}`);
      const json = await r.json();
      if (!r.ok) throw new Error(json?.message || 'Failed');
      setExpanded(prev => ({ ...prev, [cat]: { loading:false, employees: json.employees || [] } }));
    } catch (e:any) {
      setExpanded(prev => ({ ...prev, [cat]: { loading:false, error: e.message || 'Error' } }));
    }
  }

  // Helper for simple bar visualization sizing
  const maxBreakdownCount = (generated && reportType.endsWith('breakdown'))
    ? Math.max(1, ...generated.map((r:any)=> r.count || 0))
    : 1;

  return (
    <div className="container container-wide" style={{ fontSize: '15px' }}>
      <h1 className="h1" style={{ fontSize: '40px', letterSpacing: '.5px', marginBottom: 28 }}>Report Assist</h1>
      <div className="card pad" style={{ marginBottom: 24, fontSize: '16px' }}>
        <div className="title" style={{ marginBottom: 12, fontSize: '20px' }}>Build a quick report</div>
        <form onSubmit={generateReport} style={{ display: 'grid', gap: 18, maxWidth: 760 }}>
          <label style={{ display:'grid', gap:8, fontSize:'15px' }}>
            <span style={{ fontWeight:600 }}>Report Type</span>
            <select className="input" style={{ fontSize:'15px', height:44 }} value={reportType} onChange={e=>setReportType(e.target.value)}>
              <option value="visa-expirations">Visa Expirations (range applies)</option>
              <option value="flagged">Flagged Employees</option>
              <option value="permanent-residents">Permanent Residents</option>
              <option value="gender-breakdown">Gender Breakdown</option>
              <option value="department-breakdown">Department Breakdown</option>
              <option value="education-field-breakdown">Educational Field Breakdown</option>
              <option value="country-breakdown">Country of Birth Breakdown</option>
            </select>
          </label>
          {reportType === 'visa-expirations' && (
            <label style={{ display:'grid', gap:8, fontSize:'15px' }}>
              <span style={{ fontWeight:600 }}>Range</span>
              <select className="input" style={{ fontSize:'15px', height:44 }} value={range} onChange={e=>setRange(e.target.value)}>
                <option value="next-90">Next 90 Days</option>
                <option value="next-180">Next 180 Days</option>
                <option value="all">All Future (10 yrs)</option>
              </select>
            </label>
          )}
          <div>
            <button type="submit" className="btn-soft" disabled={loading} style={{ fontSize:'15px', height:46, minWidth:170 }}>{loading ? 'Generating...' : 'Generate'}</button>
          </div>
        </form>
        {error && <div className="help" style={{ color:'var(--danger)', marginTop:12 }}>{error}</div>}
      </div>

      {generated && reportType === 'visa-expirations' && (
        <div className="card section" style={{ fontSize:'15px' }}>
          <div className="titlebar" style={{ marginBottom:12 }}>
            <div className="title" style={{ fontSize:'20px' }}>Visa Expirations ({generated.length})</div>
          </div>
          <div className="table-wrap" style={{ fontSize:'14px' }}>
            <table className="table" style={{ minWidth:680 }}>
              <thead>
                <tr><th>Name</th><th>Visa</th><th>Expiration</th><th>Days Left</th></tr>
              </thead>
              <tbody>
                {generated.map((r:any) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight:500 }}>{r.name}</td>
                    <td><span className="chip" style={{ fontSize:12 }}>{r.visa}</span></td>
                    <td>{r.endDate}</td>
                    <td>{r.daysLeft}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {generated && reportType.endsWith('breakdown') && (
        <div className="card section" style={{ fontSize:'16px' }}>
          <div className="titlebar" style={{ marginBottom:16 }}>
            <div className="title" style={{ fontSize:'24px', fontWeight:700 }}>Breakdown ({generated.length} categories)</div>
          </div>
          <div className="table-wrap" style={{ fontSize:'15px' }}>
            <table className="table" style={{ minWidth:640 }}>
              <thead>
                <tr style={{ fontSize:'15px' }}><th style={{ fontWeight:700 }}>Category</th><th style={{ fontWeight:700, width:140 }}>Count</th></tr>
              </thead>
              <tbody>
                {generated.map((r:any) => {
                  const state = expanded[r.key];
                  const isOpen = !!state && !!state.employees;
                  const barPct = Math.round((r.count / maxBreakdownCount) * 100);
                  return (
                    <React.Fragment key={r.key}>
                      <tr
                        className="row-expandable"
                        style={{ cursor:'pointer', background: isOpen? 'var(--wash)': undefined }}
                        onClick={()=> toggleCategory(r.key)}
                      >
                        <td style={{ fontWeight:600, padding:'10px 12px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <span style={{ width:16, display:'inline-block', textAlign:'center', fontSize:18 }}>{isOpen? '▾':'▸'}</span>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:15, fontWeight:600 }}>{r.key || '(blank)'}</div>
                              <div style={{ marginTop:6, background:'var(--line)', height:10, borderRadius:5, position:'relative', overflow:'hidden' }}>
                                <div style={{ position:'absolute', top:0, left:0, bottom:0, width: barPct+'%', background:'linear-gradient(90deg,var(--gold),var(--accent))' }} />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight:700, fontSize:16, textAlign:'center' }}>{r.count}</td>
                      </tr>
                      {state && (state.loading || state.error || state.employees) && (
                        <tr>
                          <td colSpan={2} style={{ padding:0, background:'var(--bg)', borderTop:'1px solid var(--line)' }}>
                            <div style={{ padding:'10px 30px 18px', fontSize:14 }}>
                              {state.loading && <div style={{ fontWeight:600 }}>Loading employees…</div>}
                              {state.error && <div style={{ color:'var(--danger)', fontWeight:600 }}>{state.error}</div>}
                              {state.employees && state.employees.length === 0 && <div style={{ fontStyle:'italic' }}>No employees in this category.</div>}
                              {state.employees && state.employees.length > 0 && (
                                <div style={{ display:'grid', gap:8 }}>
                                  {state.employees.map((e:any) => (
                                    <div key={e.id} style={{ display:'flex', alignItems:'center', gap:14, border:'1px solid var(--line)', borderRadius:8, padding:'8px 14px', background:'white' }}>
                                      <div style={{ flex:1 }}>
                                        <div style={{ fontWeight:600, fontSize:15 }}>{e.name}</div>
                                        <div style={{ fontSize:12, opacity:.8 }}>{e.department}</div>
                                      </div>
                                      <a
                                        href={`/employees/${e.id}`}
                                        className="btn-soft btn-mini"
                                        style={{ fontSize:12, fontWeight:600, padding:'6px 10px', textDecoration:'none' }}
                                      >View</a>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {generated && reportType === 'flagged' && (
        <div className="card section" style={{ fontSize:'15px' }}>
          <div className="titlebar" style={{ marginBottom:12 }}>
            <div className="title" style={{ fontSize:'20px' }}>Flagged Employees ({generated.length})</div>
          </div>
          <div className="table-wrap" style={{ fontSize:'14px' }}>
            <table className="table" style={{ minWidth:520 }}>
              <thead>
                <tr><th>Name</th><th>Department</th></tr>
              </thead>
              <tbody>
                {generated.map((r:any) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight:500 }}>{r.name}</td>
                    <td>{r.department}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {generated && reportType === 'permanent-residents' && (
        <div className="card section" style={{ fontSize:'15px' }}>
          <div className="titlebar" style={{ marginBottom:12 }}>
            <div className="title" style={{ fontSize:'20px' }}>Permanent Residents ({generated.length})</div>
          </div>
          <div className="table-wrap" style={{ fontSize:'14px' }}>
            <table className="table" style={{ minWidth:520 }}>
              <thead>
                <tr><th>Name</th><th>Visa Type</th></tr>
              </thead>
              <tbody>
                {generated.map((r:any) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight:500 }}>{r.name}</td>
                    <td>{r.visa}</td>
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
