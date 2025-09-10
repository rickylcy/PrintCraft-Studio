import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { escpos, zpl } from "@printcraft/encoders";
// If you already have a server-side encoder for blocks, import it here.
// import { encodeBlocks } from "@/app/lib/encode"; // your function

export async function POST(req) {
  try {
    const { templateId, profileId, data = {}, dry = true } = await req.json();

    const tpl = await prisma.template.findUnique({ where: { id: templateId } });
    if (!tpl)
      return NextResponse.json(
        { ok: false, error: "Template not found" },
        { status: 404 }
      );

    const profile = profileId
      ? await prisma.printerProfile.findUnique({ where: { id: profileId } })
      : null;

    // Parse blocks
    const content = JSON.parse(tpl.contentJson || '{"blocks": []}');
    const blocks = content.blocks || [];

    // TODO: replace this stub with your real encoder for blocks → bytes
    let payload;
    if (tpl.type === "zpl") {
      // Example: simple ZPL with title only (replace with real block rendering)
      payload = zpl.simpleLabel({ title: tpl.name, subtitle: "Preview" });
      return NextResponse.json({
        ok: true,
        type: "zpl",
        bytesBase64: payload.toString("base64"),
        zpl: payload.toString("ascii"),
        bytes: payload.length,
      });
    } else {
      // ESC/POS stub: use encoders to build something; replace with real block mapping
      payload = escpos.buildReceipt({
        title: tpl.name,
        lines: ["(preview)", "replace with block renderer"],
        size: { w: 1, h: 1 },
      });
      return NextResponse.json({
        ok: true,
        type: "escpos",
        bytesBase64: payload.toString("base64"),
        bytes: payload.length,
      });
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
