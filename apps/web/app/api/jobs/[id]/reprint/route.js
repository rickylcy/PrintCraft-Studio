import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(_req, { params }) {
  try {
    const job = await prisma.job.findUnique({ where: { id: params.id } });
    if (!job)
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 }
      );
    const payload = JSON.parse(job.payloadJson || "{}");
    const agent = await fetch(process.env.AGENT_URL + "/print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bytes: payload.base64,
        type: payload.type,
        printer: job.device || null,
      }),
    }).then((r) => r.json());
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: agent?.ok ? "ok" : "error",
        error: agent?.ok ? null : agent?.error || "unknown",
      },
    });
    return NextResponse.json({ ok: !!agent?.ok, agent });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
