// apps/web/app/api/templates/[id]/download/route.js
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { renderEscpos, renderZpl } from "@/lib/renderers";

export async function GET(req, { params }) {
  try {
    const url = new URL(req.url);
    const type = (url.searchParams.get("type") || "").toLowerCase() || "escpos";
    const mode =
      (url.searchParams.get("mode") || "").toLowerCase() ||
      (type === "escpos" ? "mnemonic" : "raw");
    const tplId = params.id;

    const tpl = await prisma.template.findUnique({ where: { id: tplId } });
    if (!tpl)
      return NextResponse.json(
        { ok: false, error: "Template not found" },
        { status: 404 }
      );

    const content = JSON.parse(tpl.contentJson || '{"blocks":[]}');
    const blocks = Array.isArray(content.blocks) ? content.blocks : [];
    const widthDots = type === "zpl" ? 600 : 576;

    if (type === "zpl") {
      const body = renderZpl({ blocks, data: {}, widthDots });
      const filename = `${(tpl.name || "label")
        .replace(/\s+/g, "-")
        .toLowerCase()}.txt`; // <- .txt
      const headers = new Headers({
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      });
      return new NextResponse(body, { status: 200, headers });
    }

    // ESC/POS
    const mnemonic = mode === "mnemonic";
    const out = renderEscpos({ blocks, data: {}, widthDots, mnemonic });

    if (mnemonic) {
      const filename = `${(tpl.name || "receipt")
        .replace(/\s+/g, "-")
        .toLowerCase()}-escpos.txt`;
      const headers = new Headers({
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      });
      return new NextResponse(out, { status: 200, headers });
    }

    // raw bytes
    const filename = `${(tpl.name || "receipt")
      .replace(/\s+/g, "-")
      .toLowerCase()}-escpos.bin`;
    const headers = new Headers({
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    });
    return new NextResponse(out, { status: 200, headers });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e.message || e) },
      { status: 500 }
    );
  }
}
