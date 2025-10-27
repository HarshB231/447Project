import { NextResponse } from 'next/server';
import data from '../../../../lib/data';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const flagged = !!body.flagged;

    const items = data.readEmployeesSync();
    const idx = items.findIndex((e: any) => String(e.id) === String(id));
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  (items[idx] as any).flagged = flagged;
  data.writeEmployeesSync(items);

  return NextResponse.json(items[idx] as any);
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
