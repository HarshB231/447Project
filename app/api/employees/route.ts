import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

export async function GET(req: Request) {
  const items = await prisma.employee.findMany({ take: 50 });
  return NextResponse.json(items);
}
