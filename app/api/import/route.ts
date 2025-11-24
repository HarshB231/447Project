import { NextResponse } from 'next/server';
import Excel from 'exceljs';
import data from '../../../lib/data';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file missing' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const wb = new Excel.Workbook();
    await wb.xlsx.load(arrayBuffer);
    const ws = wb.worksheets[0];
    if (!ws) return NextResponse.json({ error: 'worksheet missing' }, { status: 400 });

    // Assume first row headers
    const headerRow = ws.getRow(1).values as any[];
    const headers: string[] = headerRow.slice(1).map(h => String(h||'').trim()).filter(Boolean);
    const newRawRows: any[] = [];
    for (let r = 2; r <= ws.rowCount; r++) {
      const rowVals = ws.getRow(r).values as any[];
      const obj: Record<string, any> = {};
      headers.forEach((h, idx) => {
        obj[h] = rowVals[idx+1] ?? null;
      });
      if (Object.values(obj).every(v => v === null || v === '')) continue;
      newRawRows.push(obj);
    }

    // Simple merge strategy: replace existing rawRows for matching employeeId, else create new employee
    const employees = data.readEmployeesSync();
    let changedCount = 0;
    const byId = new Map<number, any>();
    employees.forEach(e => byId.set(e.id, e));

    // Expect employeeId, firstName, lastName, department, title as leading columns if present
    // Attempt to detect if these columns exist in headers
    const idIdx = headers.findIndex(h => h.toLowerCase() === 'employeeid' || h.toLowerCase() === 'employee id');

    if (idIdx !== -1) {
      // Group rows by employeeId field value
      const grouped = new Map<number, any[]>();
      for (const r of newRawRows) {
        const idRaw = r[headers[idIdx]];
        const idNum = Number(idRaw);
        if (!idNum) continue;
        if (!grouped.has(idNum)) grouped.set(idNum, []);
        grouped.get(idNum)!.push(r);
      }
      for (const [empId, rows] of grouped.entries()) {
        if (byId.has(empId)) {
          const emp = byId.get(empId);
          emp.rawRows = rows;
          changedCount++;
        }
      }
    }

    data.writeEmployeesSync(employees);
    data.appendAudit({ type: 'IMPORT', changes: [{ key: 'rowsReplaced', before: null, after: changedCount }], note: `Imported file ${file.name}`, actor: undefined });

    return NextResponse.json({ success: true, employeesUpdated: changedCount });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
