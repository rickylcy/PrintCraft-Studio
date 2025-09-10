// helpers
const ESC = "\x1b";
const GS = "\x1d";
const latin1 = (s) => Buffer.from(s, "latin1");
const ch = (n) => String.fromCharCode(n & 0xff);
const lo = (n) => n & 0xff;
const hi = (n) => (n >> 8) & 0xff;

function readBlockText(b) {
  return String(b?.value ?? b?.text ?? b?.content ?? "");
}
function sizeCmdWH(w = 1, h = 1) {
  const n = ((w - 1) << 4) | (h - 1);
  return latin1(GS + "!" + ch(n));
}
function gsL(indentDots) {
  // set left margin
  return latin1(GS + "L" + ch(lo(indentDots)) + ch(hi(indentDots)));
}
function gsW(widthDots) {
  // set print area width
  return latin1(GS + "W" + ch(lo(widthDots)) + ch(hi(widthDots)));
}
function escDollar(posDots) {
  // absolute position (alternative)
  return latin1(ESC + "$" + ch(lo(posDots)) + ch(hi(posDots)));
}

/* ------------------------------------------------------------------ */
/* 1) MNEMONIC (readable .txt) now shows the indent                    */
/* ------------------------------------------------------------------ */
export function escposMnemonicFromBlocks({
  blocks = [],
  widthDots = 576,
  margins = { left: 0, right: 0 },
}) {
  const lines = [];
  lines.push("# ESC/POS (mnemonic export for review)");
  lines.push("ESC @                  ; Initialize");

  let lastAlign = "left";
  let lastSize = 1;

  (blocks || [])
    .filter((b) => b.type === "text")
    .sort((a, b) => (a.y || 0) - (b.y || 0))
    .forEach((b) => {
      const align = b.align || "left";
      if (align !== lastAlign) {
        lines.push(
          `ESC a ${
            align === "center" ? "1" : align === "right" ? "2" : "0"
          }  ; Align ${align}`
        );
        lastAlign = align;
      }

      const size = Math.max(
        1,
        Math.min(8, Math.round((b.fontSize || 16) / 16))
      );
      if (size !== lastSize) {
        const n = ((size - 1) << 4) | (size - 1);
        lines.push(
          `GS ! 0x${n.toString(16).padStart(2, "0")}           ; Size ${size}x`
        );
        lastSize = size;
      }

      const indentDots = Math.max(
        0,
        Math.round((b.x || 0) + (margins.left || 0))
      );
      if (indentDots > 0) {
        lines.push(
          `GS L ${indentDots}             ; Left margin = ${indentDots} dots`
        );
        const area = Math.max(
          48,
          Math.round(widthDots - indentDots - (margins.right || 0))
        );
        lines.push(
          `GS W ${area}                 ; Print area width = ${area} dots`
        );
      }

      const txt = readBlockText(b).replace(/\r?\n/g, " ");
      lines.push(`TXT "${txt}"`);
      lines.push("LF");

      if (indentDots > 0) {
        lines.push(`GS L 0                      ; Reset margin`);
        lines.push(`GS W ${widthDots}           ; Reset area width`);
      }
    });

  lines.push("ESC d 2               ; Feed 2 lines");
  lines.push("GS V 0                ; Cut");
  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/* 2) RAW BYTES (used when actually printing) with real indent         */
/* ------------------------------------------------------------------ */
export function escposBytesFromBlocks({
  blocks = [],
  widthDots = 576,
  margins = { left: 0, right: 0 },
}) {
  const out = [];
  out.push(latin1(ESC + "@")); // init

  let lastAlign = "left";
  let lastSize = 1;

  (blocks || [])
    .filter((b) => b.type === "text")
    .sort((a, b) => (a.y || 0) - (b.y || 0))
    .forEach((b) => {
      // alignment (keep left when using margin indent)
      const align = b.align || "left";
      if (align !== lastAlign) {
        const m = align === "center" ? 1 : align === "right" ? 2 : 0;
        out.push(latin1(ESC + "a" + ch(m)));
        lastAlign = align;
      }

      // size
      const size = Math.max(
        1,
        Math.min(8, Math.round((b.fontSize || 16) / 16))
      );
      if (size !== lastSize) {
        out.push(sizeCmdWH(size, size));
        lastSize = size;
      }

      // indent in dots → left margin for this one line
      const indentDots = Math.max(
        0,
        Math.round((b.x || 0) + (margins.left || 0))
      );
      if (indentDots > 0) {
        const area = Math.max(
          48,
          Math.round(widthDots - indentDots - (margins.right || 0))
        );
        out.push(gsL(indentDots));
        out.push(gsW(area));
      }

      // text + LF
      const txt = readBlockText(b).replace(/\r?\n/g, " ");
      out.push(latin1(txt));
      out.push(latin1("\n"));

      // reset margins if we changed them
      if (indentDots > 0) {
        out.push(gsL(0));
        out.push(gsW(widthDots));
      }
    });

  // feed + cut
  out.push(latin1(ESC + "d" + ch(2)));
  out.push(latin1(GS + "V" + "\x00"));

  return Buffer.concat(out);
}
