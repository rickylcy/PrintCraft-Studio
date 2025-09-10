const ESC = "\x1b"; // 27
const GS = "\x1d"; // 29

function bytes(str) {
  return Buffer.from(str, "binary");
}

// Native ESC/POS size supports only integer multipliers (1..8). For decimals like 1.5
// we fall back to a simple raster text approach: render text lines as bit images
// at a scaled width/height using GS v 0. Here we stub a minimal approach you can
// later replace with a proper canvas renderer.
function sizeCmd(w = 1, h = 1) {
  if (Number.isInteger(w) && Number.isInteger(h)) {
    const n = ((w - 1) << 4) | (h - 1);
    return bytes(GS + "!" + String.fromCharCode(n));
  }
  // decimal path (e.g., 1.5): mark mode for raster text
  return bytes("__RASTER_SIZE:" + w + "," + h + "__");
}

function align(mode = "left") {
  const m = mode === "center" ? 1 : mode === "right" ? 2 : 0;
  return bytes(ESC + "a" + String.fromCharCode(m));
}

function textLine(s) {
  return Buffer.concat([bytes(s), bytes("\n")]);
}

function feed(n = 1) {
  return bytes(ESC + "d" + String.fromCharCode(n));
}
function cut() {
  return bytes(GS + "V" + "\x00");
}

// Minimal raster text emulation: detect our marker and instead emit GS v 0 image command
// with a crude 1.5x wide scaling by duplicating columns every other pixel.
function renderWithFallback(lines, w = 1, h = 1) {
  // TODO: replace with proper rasterization. For now, just prepend a note.
  const header = bytes(`(raster ${w}x${h})\n`);
  return Buffer.concat([header, ...lines.map((l) => textLine(l))]);
}

export function buildReceipt({
  title = "TEST",
  lines = [],
  size = { w: 1, h: 1 },
}) {
  const chunks = [];
  chunks.push(bytes(ESC + "@")); // init
  const sz = sizeCmd(size.w, size.h).toString("binary");
  if (sz.startsWith("__RASTER_SIZE:")) {
    chunks.push(align("center"));
    chunks.push(renderWithFallback([title], size.w, size.h));
  } else {
    chunks.push(sizeCmd(size.w, size.h));
    chunks.push(align("center"));
    chunks.push(textLine(title));
  }
  chunks.push(align("left"));
  lines.forEach((l) => chunks.push(textLine(l)));
  chunks.push(feed(2));
  chunks.push(cut());
  return Buffer.concat(chunks);
}

export function center(s) {
  return Buffer.concat([align("center"), textLine(s)]);
}
export { sizeCmd, align, textLine, feed, cut };

import { bindText } from "./bind.js";

// Map font px → ESC/POS size (tweak later via printer profiles)
function scaleFromFont(px = 16) {
  if (px <= 16) return { w: 1, h: 1 };
  if (px <= 20) return { w: 1.5, h: 1.5 };
  if (px <= 24) return { w: 2, h: 2 };
  if (px <= 32) return { w: 3, h: 3 };
  return { w: 4, h: 4 };
}

// Real ESC/POS QR (GS ( k) — Epson compatible)
export function qr(data, { size = 6, ec = "M" } = {}) {
  const dbuf = Buffer.from(String(data), "utf8");
  const ecMap = { L: 48, M: 49, Q: 50, H: 51 }; // '0'..'3'
  const ecByte = ecMap[ec] ?? 49; // default M

  const model2 = Buffer.from([
    0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00,
  ]); // model 2
  const module = Buffer.from([
    0x1d,
    0x28,
    0x6b,
    0x03,
    0x00,
    0x31,
    0x43,
    Math.max(1, Math.min(16, size)),
  ]);
  const level = Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, ecByte]);
  const pL = (dbuf.length + 3) & 0xff;
  const pH = ((dbuf.length + 3) >> 8) & 0xff;
  const store = Buffer.concat([
    Buffer.from([0x1d, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30]),
    dbuf,
  ]);
  const print = Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30]);

  return Buffer.concat([model2, module, level, store, print]);
}

// Real ESC/POS Code128 (GS k)
export function barcode128(data, { height = 80, width = 2, hri = 0 } = {}) {
  const d = Buffer.from(String(data), "ascii");
  const setH = Buffer.from([0x1d, 0x68, Math.max(1, Math.min(255, height))]);
  const setW = Buffer.from([0x1d, 0x77, Math.max(2, Math.min(6, width))]); // module width
  const setHRI = Buffer.from([0x1d, 0x48, Math.max(0, Math.min(3, hri))]); // 0=none,1=above,2=below,3=both
  const k = Buffer.concat([Buffer.from([0x1d, 0x6b, 73, d.length]), d]); // m=73 (CODE128), n=length
  return Buffer.concat([setH, setW, setHRI, k, Buffer.from("\n")]);
}

// Render blocks → ESC/POS bytes (text/divider real, barcode/qr real)
export function renderFromBlocks({
  blocks = [],
  data = {},
  profile = { widthDots: 576 },
}) {
  const chunks = [];
  chunks.push(Buffer.from("\x1b@", "binary")); // init

  const sorted = [...blocks].sort((a, b) => a.y - b.y || a.x - b.x);
  for (const b of sorted) {
    const t = b.type;
    if (t === "text") {
      const s = scaleFromFont(b.fontSize || 16);
      const marker = sizeCmd(s.w, s.h).toString("binary");
      chunks.push(align(b.align || "left"));
      if (marker.startsWith("__RASTER_SIZE:")) {
        chunks.push(renderWithFallback([bindText(b.text, data)], s.w, s.h));
      } else {
        chunks.push(sizeCmd(s.w, s.h));
        chunks.push(textLine(bindText(b.text, data)));
      }
    } else if (t === "divider") {
      chunks.push(align("left"));
      const cols = Math.max(
        24,
        Math.min(64, Math.floor((profile.widthDots || 576) / 8))
      );
      chunks.push(textLine("-".repeat(cols)));
    } else if (t === "barcode") {
      const val = bindText(b.value || "", data);
      chunks.push(align(b.align || "left"));
      chunks.push(
        barcode128(val, {
          height: b.height || 80,
          width: b.width || 2,
          hri: b.hri ?? 0,
        })
      );
    } else if (t === "qr") {
      const val = bindText(b.value || "", data);
      chunks.push(align(b.align || "left"));
      chunks.push(qr(val, { size: b.size || 6, ec: b.ec || "M" }));
      chunks.push(feed(1));
    }
  }
  chunks.push(feed(2));
  chunks.push(cut());
  return Buffer.concat(chunks);
}
