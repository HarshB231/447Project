import { NextResponse } from "next/server";
import data from "../../../lib/data";

export async function POST(req: Request) {
  const body = await req.json();
  const employeeId = Number(body.employeeId);
  const content = String(body.content || '').trim();
  if (!employeeId || !content) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const items = data.readEmployeesSync();
  const idx = items.findIndex(e => Number(e.id) === employeeId);
  if (idx === -1) return NextResponse.json({ error: 'employee not found' }, { status: 404 });

  const note = { id: Date.now(), content, createdAt: new Date().toISOString() };
  (items[idx] as any).notes = (items[idx] as any).notes || [];
  (items[idx] as any).notes.push(note);
  data.writeEmployeesSync(items);

  return NextResponse.json(note);
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const employeeId = Number(body.employeeId);
    const noteId = body.noteId;
    if (!employeeId || !noteId) return NextResponse.json({ error: 'invalid' }, { status: 400 });

    const items = data.readEmployeesSync();
    const idx = items.findIndex(e => Number(e.id) === employeeId);
    if (idx === -1) return NextResponse.json({ error: 'employee not found' }, { status: 404 });

    (items[idx] as any).notes = (items[idx] as any).notes || [];
    const before = (items[idx] as any).notes.length;
    (items[idx] as any).notes = (items[idx] as any).notes.filter((n: any) => String(n.id) !== String(noteId));
    const after = (items[idx] as any).notes.length;
    if (before === after) return NextResponse.json({ error: 'note not found' }, { status: 404 });

    data.writeEmployeesSync(items);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
