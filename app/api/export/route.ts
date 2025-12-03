import { NextResponse } from 'next/server';
import Excel from 'exceljs';
import data from '../../../lib/data';
import { CANONICAL_HEADERS } from '../../../lib/excelSchema';

export async function GET() {
  try {
    const employees = data.readEmployeesSync();
    const wb = new Excel.Workbook();
    const ws = wb.addWorksheet('Employees');

    // Use canonical stakeholder header order strictly
    const headers = CANONICAL_HEADERS;
    // Write only stakeholder headers (no metadata columns)
    const headerRow = ws.addRow(headers);
    // Apply simple styling to resemble stakeholder header look
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FF1F4E00' } }; // dark text
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9F2D9' } // light greenish background
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFBBBBBB' } },
        left: { style: 'thin', color: { argb: 'FFBBBBBB' } },
        bottom: { style: 'thin', color: { argb: 'FFBBBBBB' } },
        right: { style: 'thin', color: { argb: 'FFBBBBBB' } },
      };
    });
    // Optional column widths for readability
    ws.columns = headers.map(h => ({ header: h, key: h, width: Math.max(14, Math.min(28, h.length + 6)) }));

    let shadeToggle = false; // alternate per individual
    for (const e of employees) {
      if (!e.rawRows || e.rawRows.length === 0) continue; // no data rows for this employee
      // flip shading per person
      shadeToggle = !shadeToggle;
      const fill = shadeToggle ? {
        type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' }
      } : undefined;
      for (const r of e.rawRows) {
        const row = ws.addRow(headers.map(h => r[h] ?? null));
        // Fill and border the entire row, including empty cells
        row.eachCell(cell => {
          if (fill) cell.fill = fill;
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
            left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
            bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
            right: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          };
        });
      }
    }

    const buf = await wb.xlsx.writeBuffer();
    // Filename with export date MM-DD-YYYY
    const now = new Date();
    const mm = String(now.getMonth()+1).padStart(2,'0');
    const dd = String(now.getDate()).padStart(2,'0');
    const yyyy = String(now.getFullYear());
    const fname = `employees-export-${mm}-${dd}-${yyyy}.xlsx`;
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fname}"`
      }
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
