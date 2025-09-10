import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  return NextResponse.json({
    ok: true,
    profiles: [
      {
        id: "escpos-80mm",
        name: "80mm 203dpi",
        type: "escpos",
        widthDots: 576,
        marginLeftDots: 0,
        marginTopDots: 0,
      },
      {
        id: "zpl-4in",
        name: "Zebra 4in 203dpi",
        type: "zpl",
        widthDots: 600,
        marginLeftDots: 0,
        marginTopDots: 0,
      },
    ],
  });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      name,
      type = "escpos",
      device = null,
      widthDots = 576,
      codepage = "cp437",
      marginLeftDots = 0,
      marginRightDots = 0,
      marginTopDots = 0,
      marginBottomDots = 0,
    } = body || {};
    const p = await prisma.printerProfile.create({
      data: {
        name,
        type,
        device,
        widthDots,
        codepage,
        marginLeftDots,
        marginRightDots,
        marginTopDots,
        marginBottomDots,
      },
    });
    return NextResponse.json({ ok: true, profile: p });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
