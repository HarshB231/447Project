import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "../../../lib/supabaseServer";

function isPRType(type?: string) {
  if (!type) return false;
  const t = type.toLowerCase();
  return t.includes('permanent') || t.includes('permanent resid') || t.includes('pr') || t.includes('green') || t.includes('adjust') || t.includes('aos');
}

export async function GET(req: Request) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return NextResponse.json([], { status: 200 });
  const { data: employees, error: empErr } = await supabase
    .from("employees")
    .select("id, first_name, last_name, umbc_email, department, title, flagged")
    .limit(1000);
  if (empErr) return NextResponse.json({ error: empErr.message }, { status: 500 });

  // join latest visa per employee
  const { data: visas, error: visaErr } = await supabase
    .from("visas")
    .select("employee_id, type, end_date")
    .order("end_date", { ascending: false })
    .limit(5000);
  if (visaErr) return NextResponse.json({ error: visaErr.message }, { status: 500 });

  const latestVisaByEmp = new Map<number, any>();
  for (const v of visas || []) {
    const id = (v as any).employee_id as number;
    if (!latestVisaByEmp.has(id)) latestVisaByEmp.set(id, v);
  }
  // compute sortable key: days until expiration (PR or missing -> large number to push bottom)
  const now = new Date();
  const enriched = (employees || []).map((e: any) => {
    const visa = latestVisaByEmp.get(e.id) || null;
    const end = visa?.end_date ? new Date(visa.end_date) : null;
    const isPr = isPRType(visa?.type);
    let days = Number.MAX_SAFE_INTEGER;
    if (end && !isNaN(end.getTime())) {
      days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }
    const visasArr = visa?.type ? [{ type: visa.type }] : [];
    return {
      id: e.id,
      firstName: e.first_name,
      lastName: e.last_name,
      umbcEmail: e.umbc_email,
      department: e.department,
      title: e.title,
      flagged: e.flagged,
      currentVisa: visa ? { type: visa.type, endDate: visa.end_date } : null,
      visas: visasArr,
      __daysLeft: days,
      __isPr: isPr,
    };
  });

  // sort so flagged employees appear first, then by days left ascending
  enriched.sort((a, b) => {
    const fa = (a as any).flagged ? 0 : 1;
    const fb = (b as any).flagged ? 0 : 1;
    if (fa !== fb) return fa - fb;
    return a.__daysLeft - b.__daysLeft;
  });

  return NextResponse.json(enriched.slice(0, 200));
}
