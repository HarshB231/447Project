import { NextResponse } from 'next/server';
import data from '../../../../lib/data';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const flagged = body.flagged !== undefined ? !!body.flagged : undefined;
    const editRawRow: { rowIndex: number; updates: Record<string, any>; actor?: string; note?: string } | undefined = body.editRawRow;

    const items = data.readEmployeesSync();
    const idx = items.findIndex((e: any) => String(e.id) === String(id));
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const emp: any = items[idx];
    const auditChanges: any[] = [];

    if (flagged !== undefined) {
      const before = !!emp.flagged;
      emp.flagged = flagged;
      auditChanges.push({ key: 'flagged', before, after: flagged });
    }

    if (editRawRow) {
      const { rowIndex, updates } = editRawRow;
      emp.rawRows = emp.rawRows || [];
      if (rowIndex < 0 || rowIndex >= emp.rawRows.length) {
        return NextResponse.json({ error: 'rowIndex out of range' }, { status: 400 });
      }
      const target = emp.rawRows[rowIndex];
      for (const [k, v] of Object.entries(updates || {})) {
        const before = Object.prototype.hasOwnProperty.call(target, k) ? target[k] : undefined;
        if (before !== v) {
          target[k] = v;
          auditChanges.push({ key: k, before, after: v, rowIndex });
        }
      }
    }

    items[idx] = emp;
    data.writeEmployeesSync(items);

    if (auditChanges.length) {
      data.appendAudit({
        type: 'EDIT_CELL',
        actor: (editRawRow && editRawRow.actor) || body.actor,
        employeeId: Number(id),
        changes: auditChanges,
        note: (editRawRow && editRawRow.note) || body.note,
      });
    }

    // Optional note creation appended to employee notes
    if (body.newNote && String(body.newNote).trim()) {
      emp.notes = emp.notes || [];
      emp.notes.push({ id: Date.now(), content: String(body.newNote).trim(), createdAt: new Date().toISOString() });
      data.writeEmployeesSync(items);
    }

    return NextResponse.json(emp);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const items = data.readEmployeesSync();
    const it = items.find((e: any) => String(e.id) === String(id));
    if (!it) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Build visas/history from rawRows if present
    const raw = it.rawRows || [];
    const visas = raw.map((r: any, idx: number) => ({
      id: idx + 1,
      startDate: r['start date'] || r['initial h-1b start'] || r['start'] || null,
      endDate: r['expiration date'] || r['end date'] || r['expiry date'] || null,
      type: r['case type'] || r['visa'] || r['case'] || null,
      position: r['title'] || r['position'] || r['job title'] || null,
      raw: r,
    }));

    const notes = (it as any).notes || [];

    return NextResponse.json({ ...it, visas, notes, rawRows: raw });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
