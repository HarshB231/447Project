"use client";
import React, { useRef, useState } from 'react';

// Simple placeholder report generation assistant page.
// Matches styling of dashboard/employees using container + cards.
export default function ReportAssistPage() {
  const [reportType, setReportType] = useState('visa-expirations');
  const [range, setRange] = useState('next-180');
  const [generated, setGenerated] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string,{ loading:boolean; error?:string; employees?:any[] }>>({});
  const lastToggleRef = useRef<number>(0);
  const [totalEmployees, setTotalEmployees] = useState<number | null>(null);

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
      setTotalEmployees(json.total ?? null);
      setExpanded({}); // reset expansions when regenerating
    } catch (err:any) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }

  async function toggleCategory(cat:string){
    if (!generated) return;
    const now = Date.now();
    // Stronger debounce to prevent flicker re-open
    if (now - lastToggleRef.current < 400) return;

    // Read current state for this category to decide action first
    const current = expanded[cat];
    const isOpen = !!(current && current.employees && !current.loading);

    if (isOpen) {
      // Collapse immediately and block re-open briefly
      lastToggleRef.current = now;
      setExpanded(prev => {
        const copy = { ...prev };
        delete copy[cat];
        return copy;
      });
      return;
    }

    // If already loading, ignore further toggles
    if (current && current.loading) return;

    lastToggleRef.current = now;
    // Set loading and fetch employees for this category
    setExpanded(prev => ({ ...prev, [cat]: { loading:true } }));
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
    <div className="container container-wide" style={{ fontSize: '1.5rem', paddingBottom: 32 }}>
      <h1 className="h1" style={{ fontSize: '3rem', letterSpacing: '.5px', marginBottom: 28 }}>Report Assist</h1>
      <div className="card pad" style={{ marginBottom: 24, fontSize: '1.5rem', padding: 24 }}>
        <div className="title" style={{ marginBottom: 12, fontSize: '1.75rem' }}>Build a quick report</div>
        <form onSubmit={generateReport} style={{ display: 'grid', gap: 18, maxWidth: 760 }}>
          <label style={{ display:'grid', gap:8, fontSize:'1.25rem' }}>
            <span style={{ fontWeight:600 }}>Report Type</span>
            <select className="input" style={{ fontSize:'1.25rem', height:52, padding: '10px 12px' }} value={reportType} onChange={e=>setReportType(e.target.value)}>
              <option value="visa-expirations">Visa Expirations (range applies)</option>
              <option value="flagged">Flagged Employees</option>
              <option value="permanent-residents">Permanent Residents</option>
              <option value="gender-breakdown">Gender Breakdown</option>
              <option value="department-breakdown">Department Breakdown</option>
              <option value="education-field-breakdown">Educational Field Breakdown</option>
              <option value="country-breakdown">Country of Birth Breakdown</option>
              <option value="visa-journey-breakdown">Visa Journey Breakdown</option>
            </select>
          </label>
          <div className="help" style={{ fontSize:'1.05rem', opacity:.85 }}>
            Select a report and click Generate. For breakdowns, click a category to see matching employees.
          </div>
          {reportType === 'visa-expirations' && (
            <label style={{ display:'grid', gap:8, fontSize:'1.25rem' }}>
              <span style={{ fontWeight:600 }}>Range</span>
              <select className="input" style={{ fontSize:'1.25rem', height:52, padding: '10px 12px' }} value={range} onChange={e=>setRange(e.target.value)}>
                <option value="next-90">Next 90 Days</option>
                <option value="next-180">Next 180 Days</option>
                <option value="all">All Future (10 yrs)</option>
              </select>
            </label>
          )}
          <div>
            <button type="submit" className="btn-soft" disabled={loading} style={{ fontSize:'1.25rem', height:52, minWidth:220, padding: '10px 14px' }}>{loading ? 'Generating...' : 'Generate'}</button>
          </div>
        </form>
        {error && <div className="help" style={{ color:'var(--danger)', marginTop:12 }}>{error}</div>}
      </div>

      {generated && reportType === 'visa-expirations' && (
        <div className="card section" style={{ fontSize:'1.5rem', padding: 24 }}>
          <div className="titlebar" style={{ marginBottom:12 }}>
            <div className="title" style={{ fontSize:'1.75rem' }}>Visa Expirations ({generated.length})</div>
          </div>
          <div className="table-wrap" style={{ fontSize:'1.25rem', padding:8 }}>
            <table className="table" style={{ minWidth:680, width: '100%' }}>
              <thead>
                <tr><th style={{ fontSize:'1.25rem' }}>Name</th><th style={{ fontSize:'1.25rem' }}>Visa</th><th style={{ fontSize:'1.25rem' }}>Expiration</th><th style={{ fontSize:'1.25rem' }}>Days Left</th><th style={{ fontSize:'1.25rem' }}>View</th></tr>
              </thead>
              <tbody>
                {generated.map((r:any) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight:600, fontSize:'1.25rem' }}>{r.name}</td>
                    <td style={{ fontSize:'1.25rem' }}><span className="chip" style={{ fontSize:'1.05rem' }}>{r.visa}</span></td>
                    <td style={{ fontSize:'1.25rem' }}>{r.endDate}</td>
                    <td style={{ fontSize:'1.25rem' }}>{r.daysLeft}</td>
                    <td><a href={`/employees/${r.id}`} className="btn-soft" style={{ fontSize:'1.15rem', padding:'10px 14px', textDecoration:'none' }}>View</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {generated && reportType.endsWith('breakdown') && (
        <div className="card section" style={{ fontSize:'1.5rem', padding: 24 }}>
          <div className="titlebar" style={{ marginBottom:16 }}>
            <div className="title" style={{ fontSize:'1.75rem', fontWeight:700 }}>Breakdown ({generated.length} categories)</div>
            {typeof totalEmployees === 'number' && (
              <div className="help" style={{ marginTop:8, fontSize:'1.05rem', opacity:.85 }}>
                Showing counts out of {totalEmployees} total employees.
              </div>
            )}
          </div>
          <div className="table-wrap" style={{ fontSize:'1.25rem', padding:8, maxHeight: '60vh', overflow: 'auto' }}>
            <table className="table" style={{ minWidth:640, width:'100%' }}>
              <thead style={{ position:'sticky', top:0, background:'white', zIndex:1 }}>
                <tr><th style={{ fontWeight:700, fontSize:'1.25rem' }}>Category</th><th style={{ fontWeight:700, width:220, fontSize:'1.25rem' }}>Count</th></tr>
              </thead>
              <tbody>
                {generated.map((r:any) => {
                  const state = expanded[r.key];
                  const isOpen = !!state && !!state.employees;
                  const barPct = Math.round((r.count / maxBreakdownCount) * 100);
                  const total = typeof totalEmployees === 'number' ? totalEmployees : null;
                  return (
                    <React.Fragment key={r.key}>
                      <tr
                        className="row-expandable"
                        style={{ background: isOpen? 'var(--wash)': undefined }}
                        onClick={(e)=> {
                          // Avoid row-level clicks toggling when interacting inside
                          // Only the dedicated toggle button should change state
                          e.stopPropagation();
                        }}
                      >
                        <td style={{ fontWeight:600, padding:'12px 16px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <button
                              type="button"
                              aria-label={isOpen ? 'Collapse category' : 'Expand category'}
                              onClick={(e)=> { e.stopPropagation(); toggleCategory(r.key); }}
                              className="btn-soft btn-mini"
                              style={{ width:34, height:34, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:20, padding:0 }}
                            >{isOpen? '▾':'▸'}</button>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:'1.25rem', fontWeight:600 }}>{r.key || '(blank)'}{total ? ` — ${r.count} of ${total}` : ''}</div>
                              <div style={{ marginTop:10, background:'var(--line)', height:14, borderRadius:6, position:'relative', overflow:'hidden' }}>
                                <div style={{ position:'absolute', top:0, left:0, bottom:0, width: barPct+'%', background:'linear-gradient(90deg,var(--gold),var(--accent))' }} />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight:700, fontSize:'1.25rem', textAlign:'center' }}>{r.count}{total ? ` / ${total}` : ''}</td>
                      </tr>
                      {state && (state.loading || state.error || state.employees) && (
                        <tr>
                          <td colSpan={2} style={{ padding:0, background:'var(--bg)', borderTop:'1px solid var(--line)' }}>
                            <div style={{ padding:'14px 30px 22px', fontSize:'1.25rem' }}>
                              {state.loading && <div style={{ fontWeight:600 }}>Loading employees…</div>}
                              {state.error && <div style={{ color:'var(--danger)', fontWeight:600 }}>{state.error}</div>}
                              {state.employees && state.employees.length === 0 && <div style={{ fontStyle:'italic' }}>No employees in this category.</div>}
                              {state.employees && state.employees.length > 0 && (
                                <div style={{ display:'grid', gap:10 }}>
                                  {state.employees.map((e:any) => (
                                    <div key={e.id} style={{ display:'flex', alignItems:'center', gap:14, border:'1px solid var(--line)', borderRadius:8, padding:'12px 16px', background:'white' }}>
                                      <div style={{ flex:1 }}>
                                        <div style={{ fontWeight:600, fontSize:'1.25rem' }}>{e.name}</div>
                                        <div style={{ fontSize:'1.05rem', opacity:.8 }}>{e.department}</div>
                                      </div>
                                      <a
                                        href={`/employees/${e.id}`}
                                        className="btn-soft btn-mini"
                                        style={{ fontSize:'1.15rem', fontWeight:600, padding:'10px 14px', textDecoration:'none' }}
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
        <div className="card section" style={{ fontSize:'1.5rem', padding: 24 }}>
          <div className="titlebar" style={{ marginBottom:12 }}>
            <div className="title" style={{ fontSize:'1.75rem' }}>Flagged Employees ({generated.length})</div>
          </div>
          <div className="table-wrap" style={{ fontSize:'1.25rem', padding:8 }}>
            <table className="table" style={{ minWidth:520, width:'100%' }}>
              <thead>
                <tr><th style={{ fontSize:'1.25rem' }}>Name</th><th style={{ fontSize:'1.25rem' }}>Department</th><th style={{ fontSize:'1.25rem' }}>View</th></tr>
              </thead>
              <tbody>
                {generated.map((r:any) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight:600, fontSize:'1.25rem' }}>{r.name}</td>
                    <td style={{ fontSize:'1.25rem' }}>{r.department}</td>
                    <td><a href={`/employees/${r.id}`} className="btn-soft" style={{ fontSize:'1.15rem', padding:'10px 14px', textDecoration:'none' }}>View</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {generated && reportType === 'permanent-residents' && (
        <div className="card section" style={{ fontSize:'1.5rem', padding: 24 }}>
          <div className="titlebar" style={{ marginBottom:12 }}>
            <div className="title" style={{ fontSize:'1.75rem' }}>Permanent Residents ({generated.length})</div>
          </div>
          <div className="table-wrap" style={{ fontSize:'1.25rem', padding:8 }}>
            <table className="table" style={{ minWidth:520, width:'100%' }}>
              <thead>
                <tr><th style={{ fontSize:'1.25rem' }}>Name</th><th style={{ fontSize:'1.25rem' }}>Visa Type</th><th style={{ fontSize:'1.25rem' }}>View</th></tr>
              </thead>
              <tbody>
                {generated.map((r:any) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight:600, fontSize:'1.25rem' }}>{r.name}</td>
                    <td style={{ fontSize:'1.25rem' }}>{r.visa}</td>
                    <td><a href={`/employees/${r.id}`} className="btn-soft" style={{ fontSize:'1.15rem', padding:'10px 14px', textDecoration:'none' }}>View</a></td>
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
