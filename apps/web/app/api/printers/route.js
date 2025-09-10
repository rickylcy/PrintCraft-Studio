// apps/web/app/api/printers/route.js
import { NextResponse } from "next/server";
export async function GET() {
  try {
    const res = await fetch(
      (process.env.AGENT_URL || "http://localhost:4747") + "/printers"
    );
    const data = await res.json();
    return NextResponse.json({ ok: true, printers: data.printers || [] });
  } catch (e) {
    return NextResponse.json(
      { ok: false, printers: [], error: String(e) },
      { status: 500 }
    );
  }
}
