import Excel from 'exceljs';
import fs from 'fs';
import path from 'path';
import data from '../lib/data.ts';

const DEFAULT_PATH = path.resolve(process.cwd(), 'Case tracking for CS class.xlsx');
const EXCEL_PATH = process.env.EXCEL_PATH || DEFAULT_PATH;

function normalizeKey(k: string) {
  return String(k || '').trim().toLowerCase();
}

function sanitizeCell(v: any) {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return v.toISOString();
  const t = typeof v;
  if (t === 'string' || t === 'number' || t === 'boolean') return v;
  // exceljs cell objects may have .result, .text, .formula, or .richText
  if (t === 'object') {
    if ('result' in v && v.result !== undefined) return v.result;
    if ('text' in v && v.text !== undefined) return v.text;
    if ('richText' in v && Array.isArray(v.richText)) return v.richText.map((p:any)=>p.text||String(p)).join('');
    // fallback to string coercion
    try { return String(v); } catch (err) { return null; }
  }
  return String(v);
}

function parseDateMaybe(v: any): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString();
  const s = String(v).trim();
  // try common formats
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString();
  return null;
}

async function readRows(pathToFile: string) {
  const wb = new Excel.Workbook();
  await wb.xlsx.readFile(pathToFile);
  const sheet = wb.getWorksheet('Current H-1B cases') || wb.worksheets[0];
  const headerRow = sheet.getRow(1).values as any[];
  const rows: Record<string, any>[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r).values as any[];
    const obj: Record<string, any> = {};
    for (let c = 1; c < headerRow.length; c++) {
      const key = String(headerRow[c] ?? '').trim();
      if (!key) continue;
      obj[normalizeKey(key)] = sanitizeCell(row[c]);
    }
    // skip empty rows
    if (Object.values(obj).every(v => v === null || v === '')) continue;
    rows.push(obj);
  }
  return rows;
}

async function main() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error('Excel not found at', EXCEL_PATH);
    process.exit(1);
  }
  console.log('Reading', EXCEL_PATH);
  const rows = await readRows(EXCEL_PATH);
  console.log('Read rows:', rows.length);

  // group by umbc email if present, otherwise by name
  const groups = new Map<string, any[]>();
  for (const r of rows) {
    const email = (r['employee\'s umbc email'] || r['employee s umbc email'] || r['employee umbc email'] || r['email'] || '').toString().trim();
    const key = email || ((r['last name'] || '') + '|' + (r['first name'] || '')).toString().trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  const out: any[] = [];
  let id = 1;
  for (const [k, bucket] of groups.entries()) {
    // The stakeholder indicated: the lowest (last) row for an individual is the most recent.
    // So pick the last row in the bucket as the current record.
    const best = bucket[bucket.length - 1];

    const firstName = (best && (best['first name'] || best['first']) ) || '';
    const lastName = (best && (best['last name'] || best['last']) ) || '';
    const umbcEmail = (best && (best['employee\'s umbc email'] || best['employee umbc email'] || best['email'])) || '';
    const department = (best && (best['department'] || best['academic dept.'] || best['college'])) || '';
    // Helper: find the last non-empty value in the bucket for a set of potential column keys
    function pickLast(bucketRows: any[], keys: string[]) {
      for (let i = bucketRows.length - 1; i >= 0; i--) {
        const row = bucketRows[i];
        for (const k of keys) {
          const v = row[k];
          if (v !== null && v !== undefined && String(v).trim() !== '') return v;
        }
      }
      return undefined;
    }

    const visaTypeVal = pickLast(bucket, ['case type', 'visa', 'case']);
    const startVal = pickLast(bucket, ['start date', 'initial h-1b start', 'start']);
    const endVal = pickLast(bucket, ['expiration date', 'end date', 'expiry date']);

    const currentVisa = {
      type: visaTypeVal,
      startDate: parseDateMaybe(startVal),
      endDate: parseDateMaybe(endVal),
    };

    // If the visa type indicates Permanent Residency, force endDate to null
    // The Excel sometimes contains the literal "Permanent Residency" (case-insensitive).
    const typeLower = (currentVisa.type || '').toString().toLowerCase();
    if (typeLower.includes('permanent') && (typeLower.includes('resid') || typeLower.includes('residency'))) {
      currentVisa.endDate = null;
    }

    // Also scan all rows in the bucket for any mention of permanent residency or green card
    // (some files store PR info in a separate notes column). If any row mentions PR,
    // treat the person as a Permanent Resident (clear endDate and label type).
    let bucketText = '';
    for (const r of bucket) {
      for (const v of Object.values(r)) {
        if (v) bucketText += ' ' + String(v).toLowerCase();
      }
    }
    const mentionsPR = bucketText.includes('permanent residency') || bucketText.includes('permanent resid') || (bucketText.includes('permanent') && bucketText.includes('resid')) || bucketText.includes('green card') || bucketText.includes('permanent residence');
    if (mentionsPR) {
      currentVisa.endDate = null;
      const curType = (currentVisa.type || '').toString();
      // Prefer a clear, user-friendly label for PRs
      currentVisa.type = 'Permanent Resident';
    }

    const titleVal = pickLast(bucket, ['title', 'position', 'job title']);

    out.push({
      id: id++,
      firstName: firstName ? String(firstName).trim() : undefined,
      lastName: lastName ? String(lastName).trim() : undefined,
      umbcEmail: umbcEmail ? String(umbcEmail).trim() : undefined,
      department: department ? String(department).trim() : undefined,
      title: titleVal ? String(titleVal).trim() : undefined,
      flagged: false,
      currentVisa,
      rawRows: bucket,
    });
  }

  data.writeEmployeesSync(out as any);
  console.log('Wrote', out.length, 'employees to data/employees.json');
}

main().catch(err => { console.error(err); process.exit(1); });
