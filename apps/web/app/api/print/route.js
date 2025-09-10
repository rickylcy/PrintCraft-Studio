import { NextResponse } from "next/server";
import { prisma } from "@/lib/db"; // ok if you’re already using Prisma
import { escpos } from "@printcraft/encoders"; // your shared package (OK to keep)
// (we won’t import canvas or native deps)

// --- helpers ----------------------------------------------------------------

function fallbackWidthDots(type) {
  // Safe defaults:
  // ESC/POS 80mm @203dpi ≈ 576dots; ZPL typical 4" @203dpi ≈ 812.. but a lot of profiles
  // use 600; keep 600 default unless your profiles say otherwise.
  return type === "zpl" ? 600 : 576;
}

function escapeZpl(s = "") {
  return String(s).replace(/([\\^])/g, "\\$1");
}

// Minimal block -> ZPL (text only for now)
function blocksToZpl(
  blocks,
  { widthDots = 600, margins = { left: 0, top: 0 } }
) {
  let out = `^XA\n^PW${widthDots}\n`;
  for (const b of blocks || []) {
    if (b.type !== "text") continue;
    const x = Math.max(0, Math.round((b.x || 0) + (margins.left || 0)));
    const y = Math.max(0, Math.round((b.y || 0) + (margins.top || 0)));
    const fs = Math.max(12, Math.round(b.fontSize || 24)); // dots
    out += `^FO${x},${y}^A0N,${fs},${fs}^FD${escapeZpl(b.text || "")}^FS\n`;
  }
  out += "^XZ";
  return Buffer.from(out, "ascii");
}

// Minimal block -> ESC/POS (lines only; sorted by Y)
function blocksToEscposBytes(blocks, { size = { w: 1, h: 1 } }) {
  const lines = (blocks || [])
    .filter((b) => b.type === "text")
    .sort((a, b) => (a.y || 0) - (b.y || 0))
    .map((b) => b.text || "");
  // Use the helper you already have; falls back to a raster note for 1.5×
  return escpos.buildReceipt({ title: "Preview", lines, size });
}

// Load a printer profile if you have that table; otherwise return null.
// Shape we expect: { widthDots, marginLeftDots, marginTopDots, ... }
async function getProfile(profileId) {
  if (!profileId || !prisma?.printerProfile) return null;
  try {
    const p = await prisma.printerProfile.findUnique({
      where: { id: profileId },
    });
    return p || null;
  } catch {
    return null;
  }
}

// --- route ------------------------------------------------------------------

export async function POST(req) {
  try {
    const body = await req.json();
    const {
      type = "escpos", // "escpos" | "zpl"
      blocks = [], // editor blocks
      dry = true, // preview if true
      profileId = null, // pick width/margins if present
      printer = "", // Agent target (optional)
      // optional extras you might be sending; ignored here:
      templateId,
      data,
    } = body || {};

    // derive width/margins
    const profile = await getProfile(profileId);
    const widthDots = Number(profile?.widthDots) || fallbackWidthDots(type);
    const margins = {
      left: Number(profile?.marginLeftDots || 0),
      right: Number(profile?.marginRightDots || 0),
      top: Number(profile?.marginTopDots || 0),
      bottom: Number(profile?.marginBottomDots || 0),
    };

    // build payload
    let payload;
    if (type === "zpl") {
      payload = blocksToZpl(blocks, { widthDots, margins });
    } else {
      // ESC/POS — use 1.5× as a nice preview size; tweak if you have a size per block
      payload = blocksToEscposBytes(blocks, { size: { w: 1, h: 1 } });
    }

    if (dry) {
      // preview only
      return NextResponse.json({ ok: true, bytes: payload.length });
    }

    // send to Agent
    const agentUrl = process.env.AGENT_URL || "http://localhost:4747";
    const res = await fetch(`${agentUrl}/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bytes: payload.toString("base64"),
        type,
        ...(printer ? { printer } : {}),
      }),
    });

    const agent = await res
      .json()
      .catch(() => ({ ok: false, error: "Agent parse error" }));
    if (!res.ok || !agent.ok) {
      const errMsg = agent?.error || `Agent error (${res.status})`;
      return NextResponse.json({ ok: false, error: errMsg }, { status: 502 });
    }

    return NextResponse.json({ ok: true, bytes: payload.length, agent });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e.message || e) },
      { status: 500 }
    );
  }
}
