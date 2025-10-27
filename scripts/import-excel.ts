import Excel from "exceljs";
import prisma from "../lib/prisma.js";
import fs from "fs";

async function readRows(path: string) {
  const wb = new Excel.Workbook();
  await wb.xlsx.readFile(path);
  const sheet = wb.getWorksheet("Current H-1B cases") || wb.worksheets[0];
  const rows = [];
  const headerRow = sheet.getRow(1).values as any[];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r).values as any[];
    const obj: Record<string, any> = {};
    for (let c = 1; c < headerRow.length; c++) {
      const key = String(headerRow[c] ?? "").trim();
      if (!key) continue;
      obj[key] = row[c] ?? null;
    }
    rows.push(obj);
  }
  return rows;
}

async function main() {
  const filePath = process.env.EXCEL_PATH || "/mnt/data/Case tracking for CS class.xlsx";
  if (!fs.existsSync(filePath)) {
    console.error("Excel not found", filePath);
    process.exit(1);
  }
  const rows = await readRows(filePath);
  console.log("Read", rows.length, "rows");

  const ALERT_DAYS = parseInt(process.env.ALERT_DAYS || "213", 10);
  const now = new Date();
  const target = new Date();
  target.setDate(now.getDate() + ALERT_DAYS);

  let createdEmployees = 0;
  let createdVisas = 0;

  for (const row of rows) {
    // flexible key lookup (case-insensitive)
    const keys = Object.keys(row);
    const find = (variants: string[]) => {
      const v = keys.find(k => variants.some(alt => k.trim().toLowerCase() === alt.toLowerCase()));
      return v ? row[v] : null;
    };

    const firstName = find(["First Name", "First", "Given Name"]) || find(["first name"]);
    const lastName = find(["Last Name", "Last", "Surname"]) || find(["last name"]);
    const umbcEmail = find(["UMBC Email", "UMB C Email", "umbc email", "Email"]);
    const personalEmail = find(["Personal Email", "Personal Email"]);
    const position = find(["Position", "Job Title"]);
    const college = find(["College", "College/Unit"]);
    const department = find(["Academic Dept.", "Department", "Dept"]);
    const visaType = find(["Visa", "Visa Type", "Type"]);
    const start = find(["Start", "Start Date", "Begin Date"]);
    const end = find(["End", "End Date", "Expiration Date"]);

    const parseDate = (v: any) => {
      if (!v) return null;
      if (v instanceof Date) return v;
      const asNum = Number(v);
      if (!Number.isNaN(asNum)) {
        // excel serial? exceljs returns Date or string; as fallback try Date
        const d = new Date(asNum);
        if (!isNaN(d.getTime())) return d;
      }
      const d2 = new Date(String(v));
      if (!isNaN(d2.getTime())) return d2;
      return null;
    };

    const employeeData: any = {
      firstName: firstName ? String(firstName).trim() : undefined,
      lastName: lastName ? String(lastName).trim() : undefined,
      umbcEmail: umbcEmail ? String(umbcEmail).trim() : undefined,
      personalEmail: personalEmail ? String(personalEmail).trim() : undefined,
      title: position ? String(position).trim() : undefined,
      department: department ? String(department).trim() : undefined,
    };

    // upsert employee by UMBC email when available, otherwise create new
    let employee;
    try {
      if (employeeData.umbcEmail) {
        employee = await prisma.employee.upsert({
          where: { umbcEmail: employeeData.umbcEmail },
          update: { ...employeeData },
          create: { ...employeeData },
        });
      } else {
        employee = await prisma.employee.create({ data: employeeData });
      }
      createdEmployees++;
    } catch (err) {
      console.error('Employee upsert/create failed', err, employeeData);
      continue;
    }

    // create visa record
    const visa = {
      type: visaType ? String(visaType).trim() : undefined,
      startDate: parseDate(start),
      endDate: parseDate(end),
      employeeId: employee.id,
    };

    try {
      await prisma.visa.create({ data: visa });
      createdVisas++;
    } catch (err) {
      console.error('Visa create failed', err, visa);
    }

    // set flagged if endDate within alert window
    const endDate = parseDate(end);
    if (endDate && endDate >= now && endDate <= target) {
      try { await prisma.employee.update({ where: { id: employee.id }, data: { flagged: true } }); } catch (e) { }
    }
  }

  console.log(`Imported: ${createdEmployees} employees, ${createdVisas} visas`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
