import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_, { params }) {
  try {
    const tpl = await prisma.template.findUnique({ where: { id: params.id } });
    if (!tpl)
      return NextResponse.json(
        { ok: false, error: "Not found" },
        { status: 404 }
      );
    return NextResponse.json({ ok: true, template: tpl });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const body = await req.json();
    const { name, contentJson, profileId } = body;

    const tpl = await prisma.template.update({
      where: { id: params.id },
      data: {
        ...(name ? { name } : {}),
        ...(contentJson ? { contentJson } : {}),
        ...(profileId !== undefined ? { profileId } : {}),
        version: { increment: 1 },
      },
      include: { profile: true },
    });

    return NextResponse.json({ ok: true, template: tpl });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
