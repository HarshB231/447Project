import { NextResponse } from 'next/server';
import Excel from 'exceljs';
import data from '../../../lib/data';
import { CANONICAL_HEADERS, normalizeHeader, validateHeaders } from '../../../lib/excelSchema';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const actor = formData.get('actor');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file missing' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const wb = new Excel.Workbook();
    await wb.xlsx.load(arrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) return NextResponse.json({ error: 'worksheet missing' }, { status: 400 });

    // Assume first row headers
    const headerRow = ws.getRow(1);
    const headersRaw: string[] = headerRow.cellCount === 0
      ? []
      : headerRow.values.slice(1).map((val: any, idx: number) => {
          const cell = headerRow.getCell(idx+1);
          let text = '';
          const v = cell.value as any;
          if (typeof v === 'string') text = v;
          else if (v && typeof v === 'object') {
            if ('richText' in v && Array.isArray(v.richText)) text = v.richText.map((t: any) => t.text).join('');
            else if ('text' in v) text = String(v.text);
            else if ('result' in v) text = String(v.result);
            else text = String(v);
          } else if (v != null) text = String(v);
          return text.trim();
        }).filter(Boolean);
    const headers = headersRaw.map(normalizeHeader);
    const { ok: headersOk, detected: headersDetected } = validateHeaders(headers);
    const newRawRows: any[] = [];
    for (let r = 2; r <= ws.rowCount; r++) {
      const rowVals = ws.getRow(r).values as any[];
      const obj: Record<string, any> = {};
      headers.forEach((h, idx) => {
        const cell = ws.getRow(r).getCell(idx+1);
        const v = cell.value as any;
        let val: any = null;
        if (v == null) val = null;
        else if (typeof v === 'object') {
          if ('text' in v) val = v.text;
          else if ('result' in v) val = v.result;
          else if ('richText' in v) val = (v.richText as any[]).map(t => t.text).join('');
          else val = String(v);
        } else {
          val = v;
        }
        obj[h] = val;
      });
      if (Object.values(obj).every(v => v === null || v === '')) continue;
      newRawRows.push(obj);
    }

    // REPLACE STRATEGY: Build a fresh employees array solely from the uploaded file
    let changedCount = 0;
    const employees: any[] = [];

    // Expect employeeId, firstName, lastName, department, title as leading columns if present
    // Attempt to detect if these columns exist in headers
    const idIdx = headers.findIndex(h => h.toLowerCase() === 'employeeid' || h.toLowerCase() === 'employee id' || h.toLowerCase() === "employee's umbc email");

    // Expected stakeholder headers for validation
    const expectedHeaders = CANONICAL_HEADERS;

    // Primary grouping: by Last name + First Name
    const lastKey = 'Last name';
    const firstKey = 'First Name';
    const groupedByName = new Map<string, any[]>();
    for (const r of newRawRows) {
      const ln = String(r[lastKey] || '').trim().toLowerCase();
      const fn = String(r[firstKey] || '').trim().toLowerCase();
      if (!ln || !fn) continue;
      const key = `${ln}|${fn}`;
      if (!groupedByName.has(key)) groupedByName.set(key, []);
      groupedByName.get(key)!.push(r);
    }
    let createdCount = 0;
    for (const [key, rows] of groupedByName.entries()) {
      const [ln, fn] = key.split('|');
      // Create a new employee record from the first row's fields
      const sample = rows[0] || {};
      const dep = sample['Department'] ?? null;
      const title = sample['Employee Title'] ?? null;
      // Attempt to infer current visa from the most recent row (Expiration Date / Case type)
      let currentVisa: any = null;
      try {
        // choose the row with latest Expiration Date
        const sorted = [...rows].sort((a,b) => {
          const da = new Date(String(a['Expiration Date']||'')).getTime();
          const db = new Date(String(b['Expiration Date']||'')).getTime();
          return (isNaN(db)?0:db) - (isNaN(da)?0:da);
        });
        const vr = sorted[0] || sample;
        currentVisa = {
          type: vr['Case type'] ?? undefined,
          startDate: vr['Start date'] ?? undefined,
          endDate: vr['Expiration Date'] ?? undefined,
        };
      } catch {}
      const newEmp = {
        id: Date.now() + Math.floor(Math.random()*1000),
        firstName: fn.charAt(0).toUpperCase()+fn.slice(1),
        lastName: ln.charAt(0).toUpperCase()+ln.slice(1),
        department: typeof dep === 'string' ? dep : undefined,
        title: typeof title === 'string' ? title : undefined,
        currentVisa,
        rawRows: rows,
      };
      employees.push(newEmp as any);
      createdCount++;
    }

    // Replace all employees with the newly built set
    data.writeEmployeesSync(employees);
    data.appendAudit({ type: 'IMPORT', changes: [
      { key: 'rowsReplaced', before: null, after: changedCount },
      { key: 'employeesCreated', before: null, after: createdCount }
    ], note: `Imported file ${file.name}`, actor: actor ? String(actor) : undefined });

    return NextResponse.json({ success: true, employeesUpdated: changedCount, employeesCreated: createdCount, headersOk, headersDetected });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
