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
    if (t==='gender-breakdown') return (e:any)=> firstNonEmpty(e.rawRows||[], ['gender']);
    if (t==='department-breakdown') return (e:any)=> e.department || firstNonEmpty(e.rawRows||[], ['department']);
    if (t==='education-field-breakdown') return (e:any)=> firstNonEmpty(e.rawRows||[], ['employee educational field']);
    if (t==='country-breakdown') return (e:any)=> firstNonEmpty(e.rawRows||[], ['country of birth']);
    return (_:any)=> null;
  }

  if (type.endsWith('breakdown') && categoryFilter) {
    const extract = extractorForType(type);
    const employeesMatched = employees.filter(e => extract(e) === categoryFilter).map(e => ({
      id: e.id,
      name: [e.firstName, e.lastName].filter(Boolean).join(' '),
      department: e.department || firstNonEmpty(e.rawRows||[], ['department']) || '',
      visa: e.currentVisa?.type || '',
    }));
    return NextResponse.json({ type, category: categoryFilter, employees: employeesMatched });
  }

  if (type === 'gender-breakdown' || type === 'department-breakdown' || type === 'education-field-breakdown' || type === 'country-breakdown') {
    const extract = extractorForType(type);
    return NextResponse.json({ type, rows: breakdown(extract) });
  }

  return NextResponse.json({ type: 'unknown', rows: [] }, { status: 400 });
}
