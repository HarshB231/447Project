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
  const filePath = "/mnt/data/Case tracking for CS class.xlsx";
  if (!fs.existsSync(filePath)) {
    console.error("Excel not found", filePath);
    process.exit(1);
  }
  const rows = await readRows(filePath);
  // ...use rows similarly to previous importer logic...
  console.log("Read", rows.length, "rows");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
