import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

export async function GET() {
  const total = await prisma.employee.count();
  const flagged = await prisma.employee.count({ where: { flagged: true } });
  return NextResponse.json({ total, flagged });
}
