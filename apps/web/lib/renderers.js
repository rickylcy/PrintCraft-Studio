// apps/web/lib/renderers.js
// Render editor blocks to ESC/POS (raw bytes or mnemonic text) and ZPL (raw text)

const ESC = "\x1b";
const GS = "\x1d";

// --- helpers ---
const bBin = (s) => Buffer.from(s, "binary");
const bAscii = (s) => Buffer.from(s, "ascii");
const line = (s = "") => s + "\n";

function n16(val) {
  const n = Math.max(0, Math.floor(val || 0));
  return [n & 0xff, (n >> 8) & 0xff]; // [nL, nH]
}

function hex2(n) {
  return "0x" + (n & 0xff).toString(16).padStart(2, "0");
}

function get(obj, path) {
  return path.split(".").reduce((a, k) => (a && a[k] != null ? a[k] : ""), obj);
}

function resolveBindings(text = "", data = {}) {
  return String(text).replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, p) =>
    String(get(data, p.trim()) ?? "")
  );
}

function sortBlocks(blocks = []) {
  return [...(blocks || [])].sort(
    (a, b) => (a.y ?? 0) - (b.y ?? 0) || (a.x ?? 0) - (b.x ?? 0)
  );
}

// rough mapping font px → ESC/POS size multiplier
function sizeFromFont(px = 16) {
  const m = Math.max(1, Math.min(8, Math.round(px / 16)));
  return { w: m, h: m };
}

// ==============================
// ESC/POS (mnemonic or raw bytes)
// ==============================
export function renderEscpos({
  blocks = [],
  data = {},
  widthDots = 576,
  mnemonic = true,
}) {
  const ordered = sortBlocks(blocks).filter(
    (b) => b.type === "text" && (b.text ?? "").length
  );

  if (mnemonic) {
    let out = "";
    out += line("# ESC/POS (mnemonic export for review)");
    out += line("ESC @                  ; Initialize");

    let lastAlign = null;
    let lastSizeKey = null;

    for (const t of ordered) {
      const txt = resolveBindings(t.text, data);
      const align = t.align || "left";
      const size = sizeFromFont(t.fontSize || 16);
      const sizeKey = `${size.w}x${size.h}`;

      // Align
      if (align !== lastAlign) {
        const m = align === "center" ? 1 : align === "right" ? 2 : 0;
        out += line(`ESC a ${m}  ; Align ${align}`);
        lastAlign = align;
      }

      // Size (GS ! n)
      if (sizeKey !== lastSizeKey) {
        const n = ((size.w - 1) << 4) | (size.h - 1);
        out += line(`GS ! ${hex2(n)}           ; Size ${size.w}x`);
        lastSizeKey = sizeKey;
      }

      // Left indent via GS L / print area via GS W (then reset)
      const leftMargin = Math.max(0, Math.round(t.x || 0)); // indent from block.x
      const areaWidth = Math.max(0, widthDots - leftMargin);

      out += line(
        `GS L ${leftMargin}             ; Left margin = ${leftMargin} dots`
      );
      out += line(
        `GS W ${areaWidth}            ; Print area width = ${areaWidth} dots`
      );
      out += line(`TXT "${txt.replace(/"/g, '\\"')}"`);
      out += line("LF");
      out += line(`GS L 0              ; Reset margin`);
      out += line(`GS W ${widthDots}            ; Reset area width`);
    }

    out += line("ESC d 2             ; Feed 2 lines");
    out += line("GS V 0              ; Cut");
    return out; // string
  }

  // RAW bytes
  const chunks = [];
  chunks.push(bBin(ESC + "@")); // init

  let lastAlign = null;
  let lastSizeKey = null;

  for (const t of ordered) {
    const txt = resolveBindings(t.text, data);
    const align = t.align || "left";
    const size = sizeFromFont(t.fontSize || 16);
    const sizeKey = `${size.w}x${size.h}`;

    // Align
    if (align !== lastAlign) {
      const m = align === "center" ? 1 : align === "right" ? 2 : 0;
      chunks.push(bBin(ESC + "a" + String.fromCharCode(m)));
      lastAlign = align;
    }

    // Size
    if (sizeKey !== lastSizeKey) {
      const n = ((size.w - 1) << 4) | (size.h - 1);
      chunks.push(bBin(GS + "!" + String.fromCharCode(n)));
      lastSizeKey = sizeKey;
    }

    // Per-line left margin & print area width
    const leftMargin = Math.max(0, Math.round(t.x || 0));
    const areaWidth = Math.max(0, widthDots - leftMargin);
    const [lmL, lmH] = n16(leftMargin);
    const [awL, awH] = n16(areaWidth);
    chunks.push(
      bBin(GS + "L" + String.fromCharCode(lmL) + String.fromCharCode(lmH))
    ); // GS L nL nH
    chunks.push(
      bBin(GS + "W" + String.fromCharCode(awL) + String.fromCharCode(awH))
    ); // GS W nL nH

    // Content + LF
    chunks.push(bAscii(txt));
    chunks.push(bBin("\n"));

    // Reset margin/area
    const [wL, wH] = n16(widthDots);
    chunks.push(bBin(GS + "L" + "\x00" + "\x00")); // GS L 0
    chunks.push(
      bBin(GS + "W" + String.fromCharCode(wL) + String.fromCharCode(wH))
    ); // GS W width
  }

  // feed & cut
  chunks.push(bBin(ESC + "d" + "\x02"));
  chunks.push(bBin(GS + "V" + "\x00"));

  return Buffer.concat(chunks);
}

// =====
//  ZPL
// =====
export function renderZpl({ blocks = [], data = {}, widthDots = 600 }) {
  const ordered = sortBlocks(blocks);
  let z = "^XA\n";
  z += `^PW${Math.max(0, Math.round(widthDots))}\n`;

  for (const b of ordered) {
    if (b.type !== "text" || !(b.text ?? "").length) continue;
    const txt = resolveBindings(b.text, data);
    const x = Math.max(0, Math.round(b.x || 0));
    const y = Math.max(0, Math.round(b.y || 0));
    const h = Math.max(10, Math.round(b.fontSize || 16));
    const w = h;
    z += `^FO${x},${y}^A0N,${h},${w}^FD${txt.replace(/\^/g, " ")}^FS\n`;
  }

  z += "^XZ";
  return z; // string
}
