import { NextRequest, NextResponse } from 'next/server';
import data from '../../../lib/data';

function firstNonEmpty(rows: any[], keys: string[]): string | null {
  for (const r of rows) {
    for (const k of keys) {
      const v = r[k];
      if (v !== null && v !== undefined && String(v).trim() !== '' && String(v) !== '—') {
        return String(v).trim();
      }
    }
  }
  return null;
}

function lastNonEmpty(rows: any[], keys: string[]): string | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const r = rows[i];
    for (const k of keys) {
      const v = r[k];
      if (v !== null && v !== undefined && String(v).trim() !== '' && String(v) !== '—') {
        return String(v).trim();
      }
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'visa-expirations';
  const range = searchParams.get('range') || 'next-180';
  const categoryFilter = searchParams.get('category');

  const employees = await data.readEmployees();
  const now = new Date();

  function parseEndDate(v: any): Date | null {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  if (type === 'visa-expirations') {
    let days = 180;
    if (range === 'next-90') days = 90; else if (range === 'next-180') days = 180; else if (range === 'all') days = 3650;
    const limit = new Date();
    limit.setDate(limit.getDate() + days);
    const rows = employees.flatMap(e => {
      const v = e.currentVisa;
      if (!v) return [] as any[];
      const end = parseEndDate(v.endDate);
      if (!end) return [] as any[];
      if (end < now || end > limit) return [] as any[];
      const diffDays = Math.round((end.getTime() - now.getTime()) / (1000*60*60*24));
      return [{ id: e.id, name: [e.firstName,e.lastName].filter(Boolean).join(' '), visa: v.type || '', endDate: end.toISOString().slice(0,10), daysLeft: diffDays }];
    });
    return NextResponse.json({ type, range, rows });
  }

  if (type === 'flagged') {
    const rows = employees.filter(e => (e as any).flagged).map(e => ({ id: e.id, name: [e.firstName,e.lastName].filter(Boolean).join(' '), department: e.department || '' }));
    return NextResponse.json({ type, rows });
  }

  if (type === 'permanent-residents') {
    const rows = employees.filter(e => {
      const t = (e.currentVisa?.type || '').toLowerCase();
      return t.includes('permanent') || t.includes('green') || t.includes('adjust') || t.includes('aos');
    }).map(e => ({ id: e.id, name: [e.firstName,e.lastName].filter(Boolean).join(' '), visa: e.currentVisa?.type || '' }));
    return NextResponse.json({ type, rows });
  }

  function breakdown(extractor: (e: any) => string | null) {
    const map: Record<string, number> = {};
    for (const e of employees) {
      const v = extractor(e);
      if (!v) continue;
      map[v] = (map[v] || 0) + 1;
    }
    return Object.entries(map).map(([key,count]) => ({ key, count })).sort((a,b)=> b.count - a.count);
  }

  function extractorForType(t:string){
    // NOTE: keys in rawRows are Title Case in the JSON (e.g., "Country of Birth", "Employee Educational Field").
    // Prefer explicit Title Case keys; fall back to lowercase variants if needed.
    if (t==='gender-breakdown') return (e:any)=> firstNonEmpty(e.rawRows||[], ['Gender','gender']);
    if (t==='department-breakdown') return (e:any)=> e.department || firstNonEmpty(e.rawRows||[], ['Department','department']);
    if (t==='education-field-breakdown') return (e:any)=> firstNonEmpty(e.rawRows||[], ['Employee Educational Field','employee educational field']);
    if (t==='country-breakdown') return (e:any)=> firstNonEmpty(e.rawRows||[], ['Country of Birth','country of birth']);
    if (t==='visa-journey-breakdown') {
      return (e:any)=> {
        // Determine most recent Case type from the LAST non-empty raw row
        const ct = lastNonEmpty(e.rawRows||[], ['Case type','case type']);
        if (!ct) return null;
        const s = ct.toLowerCase();
        if (s.includes('h-1b')) {
          if (s.includes('initial')) return 'H-1B Initial';
          if (s.includes('extension') && s.includes('ac 21')) return 'H-1B Extension (AC21)';
          if (s.includes('extension')) return 'H-1B Extension';
          if (s.includes('port')) return 'H-1B Port';
          if (s.includes('transfer')) return 'H-1B Port';
          if (s.includes('amendment')) return 'H-1B Amendment';
          if (s.includes('cos')) return 'H-1B COS';
          return 'H-1B Other';
        }
        if (s.startsWith('j-1')) return 'J-1';
        if (s.includes('f-1')) return 'F-1/OPT';
        if (s.startsWith('o-1') || s.includes('o-1')) return 'O-1';
        if (s.includes('tn')) return 'TN';
        if (s.includes('permanent residency') || s.startsWith('permanent') || s.includes('permanent resident')) return 'Permanent Residency';
        if (s.includes('i-140')) return 'I-140';
        if (s.includes('aos') || s.includes('adjust') || s.includes('i-485') || s.includes('i485')) return 'AOS';
        return ct; // fallback to raw case type
      };
    }
    return (_:any)=> null;
  }

  if (type.endsWith('breakdown') && categoryFilter) {
    const extract = extractorForType(type);
    const employeesMatched = employees.filter(e => extract(e) === categoryFilter).map(e => ({
      id: e.id,
      name: [e.firstName, e.lastName].filter(Boolean).join(' '),
      department: e.department || firstNonEmpty(e.rawRows||[], ['Department','department']) || '',
      visa: e.currentVisa?.type || '',
    }));
    return NextResponse.json({ type, category: categoryFilter, employees: employeesMatched });
  }

  if (type === 'gender-breakdown' || type === 'department-breakdown' || type === 'education-field-breakdown' || type === 'country-breakdown' || type === 'visa-journey-breakdown') {
    const extract = extractorForType(type);
    const rows = breakdown(extract);
    return NextResponse.json({ type, total: employees.length, rows });
  }

  return NextResponse.json({ type: 'unknown', rows: [] }, { status: 400 });
}
