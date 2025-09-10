import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const templates = await prisma.template.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ ok: true, templates });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name = "Untitled", type = "escpos" } = body || {};
    const tpl = await prisma.template.create({
      data: {
        name,
        type,
        contentJson: JSON.stringify({ blocks: [] }),
      },
    });
    return NextResponse.json({ ok: true, template: tpl });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
