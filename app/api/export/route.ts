import { NextResponse } from 'next/server';
import Excel from 'exceljs';
import data from '../../../lib/data';

export async function GET() {
  try {
    const employees = data.readEmployeesSync();
    const wb = new Excel.Workbook();
    const ws = wb.addWorksheet('Employees');

    // Collect headers from union of rawRows keys
    const headerSet = new Set<string>();
    for (const e of employees) {
      (e.rawRows || []).forEach((r: any) => Object.keys(r).forEach(k => headerSet.add(k)));
    }
    const headers = Array.from(headerSet);
    ws.addRow(['employeeId','firstName','lastName','department','title',...headers]);

    for (const e of employees) {
      if (!e.rawRows || e.rawRows.length === 0) {
        ws.addRow([e.id, e.firstName, e.lastName, e.department, e.title]);
        continue;
      }
      for (const r of e.rawRows) {
        ws.addRow([
          e.id,
          e.firstName,
          e.lastName,
          e.department,
          e.title,
          ...headers.map(h => r[h] ?? null)
        ]);
      }
    }

    const buf = await wb.xlsx.writeBuffer();
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="employees-export.xlsx"'
      }
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
