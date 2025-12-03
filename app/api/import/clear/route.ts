import { NextResponse } from 'next/server';
import data from '../../../../lib/data';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    let actor: string | undefined = undefined;
    try { const body = await req.json(); actor = body?.actor ? String(body.actor) : undefined; } catch {}
    const employees = data.readEmployeesSync();
    let affected = 0;
    for (const e of employees) {
      if (e.rawRows && e.rawRows.length > 0) {
        e.rawRows = [];
        affected++;
      }
    }
    data.writeEmployeesSync(employees);
    data.appendAudit({ type: 'IMPORT_CLEAR', changes: [{ key: 'rawRowsClearedEmployees', before: null, after: affected }], note: 'Cleared imported raw rows', actor });
    return NextResponse.json({ success: true, employeesCleared: affected });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
