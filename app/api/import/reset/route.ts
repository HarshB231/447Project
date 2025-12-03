import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const EMP_FILE = path.join(DATA_DIR, 'employees.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit-log.json');

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    let actor: string | undefined = undefined;
    try { const body = await req.json(); actor = body?.actor ? String(body.actor) : undefined; } catch {}
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(EMP_FILE, '[]', 'utf8');
    fs.writeFileSync(AUDIT_FILE, '[]', 'utf8');
    // After reset, record the action in brand-new audit file (which was cleared)
    // This will be the first entry post-reset
    try {
      const appendAudit = require('../../../lib/data').default.appendAudit;
      appendAudit({ type: 'RESET', actor, changes: [{ key: 'employeesReset', before: null, after: true }, { key: 'auditReset', before: null, after: true }], note: 'Reset all data' });
    } catch {}
    return NextResponse.json({ success: true, employeesReset: true, auditReset: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
