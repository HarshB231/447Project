import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const EMP_FILE = path.join(DATA_DIR, 'employees.json');
const AUDIT_FILE = path.join(DATA_DIR, 'audit-log.json');

export const runtime = 'nodejs';

export async function POST() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(EMP_FILE, '[]', 'utf8');
    fs.writeFileSync(AUDIT_FILE, '[]', 'utf8');
    return NextResponse.json({ success: true, employeesReset: true, auditReset: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
