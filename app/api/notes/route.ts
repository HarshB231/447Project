import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";

export async function POST(req: Request) {
  const body = await req.json();
  const note = await prisma.note.create({ data: { employeeId: Number(body.employeeId), content: String(body.content) } });
  return NextResponse.json(note);
}
