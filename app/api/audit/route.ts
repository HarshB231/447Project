import { NextResponse } from 'next/server';
import data from '../../../lib/data';

export async function GET() {
  const items = data.readAuditLogSync();
  // Return latest first
  const sorted = [...items].sort((a,b)=> b.ts.localeCompare(a.ts));
  return NextResponse.json(sorted.slice(0, 500));
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const entry = data.appendAudit({
      type: String(body.type || 'UNKNOWN'),
      actor: body.actor ? String(body.actor) : undefined,
      employeeId: body.employeeId !== undefined ? Number(body.employeeId) : undefined,
      changes: Array.isArray(body.changes) ? body.changes : undefined,
      note: body.note ? String(body.note) : undefined,
    });
    return NextResponse.json(entry);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
