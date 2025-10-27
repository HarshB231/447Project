import { NextResponse } from "next/server";
import data from "../../../lib/data";

function isPRType(type?: string) {
  if (!type) return false;
  const t = type.toLowerCase();
  return t.includes('permanent') || t.includes('permanent resid') || t.includes('pr') || t.includes('green') || t.includes('adjust') || t.includes('aos');
}

export async function GET(req: Request) {
  const items = await data.readEmployees();
  // compute sortable key: days until expiration (PR or missing -> large number to push bottom)
  const now = new Date();
  const enriched = items.map(it => {
    const end = it.currentVisa?.endDate ? new Date(it.currentVisa.endDate) : null;
    const isPr = isPRType(it.currentVisa?.type);
    let days = Number.MAX_SAFE_INTEGER;
    if (end && !isNaN(end.getTime())) {
      days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }
    // expose a visas array for the employees page and preserve department/title/flagged
    const visas = it.currentVisa ? [{ type: it.currentVisa.type }] : [];
    return { ...it, visas, currentVisa: it.currentVisa, __daysLeft: days, __isPr: isPr };
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
