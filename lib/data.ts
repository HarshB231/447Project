import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const EMP_FILE = path.join(DATA_DIR, 'employees.json');

export type Visa = {
  type?: string;
  startDate?: string | null;
  endDate?: string | null;
  [k: string]: any;
}

export type Employee = {
  id: number;
  firstName?: string;
  lastName?: string;
  umbcEmail?: string;
  department?: string;
  title?: string;
  currentVisa?: Visa | null;
  rawRows?: any[];
}

export function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function readEmployeesSync(): Employee[] {
  try {
    if (!fs.existsSync(EMP_FILE)) return [];
    const txt = fs.readFileSync(EMP_FILE, { encoding: 'utf8' });
    return JSON.parse(txt) as Employee[];
  } catch (err) {
    console.error('readEmployeesSync failed', err);
    return [];
  }
}

export async function readEmployees(): Promise<Employee[]> {
  return readEmployeesSync();
}

export function writeEmployeesSync(items: Employee[]) {
  ensureDataDir();
  fs.writeFileSync(EMP_FILE, JSON.stringify(items, null, 2), { encoding: 'utf8' });
}

export function computeStats(items: Employee[]) {
  const ALERT_DAYS = parseInt(process.env.ALERT_DAYS || '213', 10);
  const now = new Date();
  const target = new Date();
  target.setDate(now.getDate() + ALERT_DAYS);

  let total = 0;
  let flagged = 0; // placeholder, file doesn't contain flagged by default
  let f1 = 0;
  let j1 = 0;
  let h1 = 0;
  let pr = 0;
  let expiringSoon = 0;

  for (const e of items) {
    const v = e.currentVisa;
    if (v) total++;
    const t = (v?.type || '') as string;
    const tl = t.toLowerCase();
  if (tl.includes('f-1') || tl.includes('f1')) f1++;
  if (tl.includes('j-1') || tl.includes('j1')) j1++;
  if (tl.includes('h-1') || tl.includes('h1') || tl.includes('h1b')) h1++;
  // permanent residency detections
  if (tl.includes('permanent') || tl.includes('permanent resid') || tl.includes('pr') || tl.includes('green') || tl.includes('adjust') || tl.includes('aos')) pr++;

    if (v?.endDate) {
      const d = new Date(v.endDate);
      if (!isNaN(d.getTime()) && d >= now && d <= target) expiringSoon++;
    }
  }

  return { total, flagged, f1, j1, h1, pr, expiringSoon };
}

export default {
  readEmployeesSync,
  readEmployees,
  writeEmployeesSync,
  computeStats,
};
