import { bindText } from "./bind.js";

function z(s) {
  return Buffer.from(s, "ascii");
}

export function simpleLabel({ title = "LABEL", subtitle = "" }) {
  const body = `^XA
^PW600
^FO50,40^A0N,40,40^FD${title}^FS
^FO50,100^A0N,28,28^FD${subtitle}^FS
^FO50,160^BCN,80,Y,N,N
^FD1234567890^FS
^XZ`;
  return z(body);
}

export function fromBlocks({ blocks = [], data = {}, width = 600 }) {
  const lines = ["^XA", `^PW${width}`];
  const sorted = [...blocks].sort((a, b) => a.y - b.y || a.x - b.x);
  for (const b of sorted) {
    if (b.type === "text") {
      const fs = Math.max(
        18,
        Math.min(80, Math.round((b.fontSize || 16) * 1.6))
      );
      lines.push(
        `^FO${Math.round(b.x)},${Math.round(b.y)}^A0N,${fs},${fs}^FD${bindText(
          b.text,
          data
        )}^FS`
      );
    } else if (b.type === "divider") {
      lines.push(
        `^FO${Math.round(b.x)},${Math.round(b.y)}^GB${Math.round(
          b.w || 500
        )},1,1^FS`
      );
    } else if (b.type === "barcode") {
      lines.push(
        `^FO${Math.round(b.x)},${Math.round(b.y)}^BCN,80,Y,N,N^FD${bindText(
          b.value || "",
          data
        )}^FS`
      );
    } else if (b.type === "qr") {
      const val = bindText(b.value || "", data);
      lines.push(
        `^FO${Math.round(b.x)},${Math.round(b.y)}^BQN,2,6^FDLA,${val}^FS`
      );
    }
  }
  lines.push("^XZ");
  return Buffer.from(lines.join("\n"), "ascii");
}
