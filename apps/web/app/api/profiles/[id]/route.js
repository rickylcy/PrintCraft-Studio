import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(req, { params }) {
  try {
    const body = await req.json();
    const data = {};
    for (const k of [
      "name",
      "type",
      "device",
      "widthDots",
      "codepage",
      "marginLeftDots",
      "marginRightDots",
      "marginTopDots",
      "marginBottomDots",
    ])
      if (k in body) data[k] = body[k];

    const p = await prisma.printerProfile.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json({ ok: true, profile: p });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
