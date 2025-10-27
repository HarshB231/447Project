import { NextResponse } from "next/server";
import data from "../../../lib/data";

export async function GET() {
  const items = await data.readEmployees();
  const stats = data.computeStats(items);
  return NextResponse.json(stats);
}
