import { NextResponse } from "next/server";
import { debateEvents } from "@/data/events";

export const dynamic = "force-static";

export async function GET() {
  const sorted = [...debateEvents].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
  );

  return NextResponse.json(sorted);
}
