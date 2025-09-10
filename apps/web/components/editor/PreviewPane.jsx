"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { bind } from "@printcraft/encoders";

/**
 * Lightweight on-screen preview for ESC/POS/ZPL templates.
 * Draws text, divider lines, and placeholder barcode/QR (visual only).
 * Also calls /api/print?dry=true to show byte length (+ base64 head).
 */
export default function PreviewPane({
  type = "escpos",
  blocks = [],
  data = {},
  widthDots = 576,
  margins = { left: 16, right: 16, top: 16, bottom: 16 },
  templateId,
  profileId,
}) {
  const canvasRef = useRef(null);
  const [dryInfo, setDryInfo] = useState(null);

  // Apply {{bindings}} using shared encoders/bind
  const resolved = useMemo(
    () =>
      blocks.map((b) => ({
        ...b,
        text: b.text ? bind.bindText(b.text, data) : b.text,
        value: b.value ? bind.bindText(b.value, data) : b.value,
      })),
    [blocks, data]
  );

  const height = useMemo(() => {
    const max = resolved.reduce(
      (m, b) => Math.max(m, (b.y || 0) + (b.h || 24) + 16),
      0
    );
    return Math.max(300, max + 40);
  }, [resolved]);

  // Draw
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    c.width = widthDots || 576;
    c.height = height;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    // Paper edge
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#111";
    ctx.strokeRect(1, 1, c.width - 2, c.height - 2);

    // Safe margins
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#bdbdbd";
    ctx.strokeRect(
      margins.left,
      margins.top,
      c.width - (margins.left + margins.right),
      c.height - (margins.top + margins.bottom)
    );
    ctx.setLineDash([]);

    ctx.lineWidth = 1;
    ctx.strokeStyle = "#000";

    ctx.fillStyle = "#000";
    ctx.strokeStyle = "#000";

    const sorted = [...resolved].sort((a, b) => a.y - b.y || a.x - b.x);
    sorted.forEach((b) => {
      if (b.type === "text") {
        const fs = b.fontSize || 16;
        ctx.font = `${fs}px ui-monospace, SFMono-Regular, Menlo, monospace`;
        ctx.textBaseline = "top";
        let x = b.x || 0;
        const y = b.y || 0;
        const w = b.w || c.width - (b.x || 0) - 10;
        const a = b.align || "left";
        if (a === "center") {
          ctx.textAlign = "center";
          x = (b.x || 0) + w / 2;
        } else if (a === "right") {
          ctx.textAlign = "right";
          x = (b.x || 0) + w;
        } else ctx.textAlign = "left";
        ctx.fillText(b.text || "Text", x, y);
      } else if (b.type === "divider") {
        const x = b.x || 0,
          y = b.y || 0,
          w = b.w || c.width - x - 10;
        ctx.beginPath();
        ctx.moveTo(x, y + (b.h || 1) / 2);
        ctx.lineTo(x + w, y + (b.h || 1) / 2);
        ctx.stroke();
      } else if (b.type === "barcode") {
        // Simple visual stripes based on value chars (NOT a real barcode)
        const val = (b.value || "12345678") + "";
        const x0 = b.x || 0,
          y0 = b.y || 0,
          h = b.height || 60;
        let x = x0;
        for (let i = 0; i < val.length; i++) {
          const code = val.charCodeAt(i);
          const w = 1 + (code % 3); // bar width 1..3
          if (code % 2 === 0) ctx.fillRect(x, y0, w, h);
          x += w;
          if (x > x0 + (b.w || c.width)) break;
        }
        ctx.font = "12px ui-monospace";
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillText(val, x0, y0 + h + 2);
      } else if (b.type === "qr") {
        // Blocky placeholder grid (NOT a real QR encoder)
        const val = (b.value || "https://example") + "";
        const modules = Math.min(29, Math.max(21, Math.ceil(val.length / 2)));
        const scale = Math.max(2, Math.floor((b.size ? b.size * 3 : 18) / 2));
        const x0 = b.x || 0,
          y0 = b.y || 0;
        for (let r = 0; r < modules; r++) {
          for (let c2 = 0; c2 < modules; c2++) {
            const on = (r * c2 + r + c2 + val.length) % 7 < 3;
            if (on) ctx.fillRect(x0 + c2 * scale, y0 + r * scale, scale, scale);
          }
        }
      }
    });
  }, [resolved, widthDots, height]);

  // Ask server for bytes (dry)
  async function refreshBytes() {
    const r = await fetch("/api/print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        blocks,
        data,
        dry: true,
        templateId,
        profileId,
      }),
    });
    const d = await r.json();
    setDryInfo(d);
  }

  useEffect(() => {
    refreshBytes().catch(() => {});
  }, [blocks, data, type, profileId, templateId]);

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">On-screen Preview</div>
      <canvas ref={canvasRef} className="border bg-white" />
      <div className="text-xs opacity-70">
        {dryInfo?.ok ? (
          <>
            Bytes: {dryInfo.bytes}
            {dryInfo.base64 ? ` | base64: ${dryInfo.base64.slice(0, 48)}…` : ""}
          </>
        ) : (
          "Rendering…"
        )}
      </div>
      <button className="px-2 py-1 border text-xs" onClick={refreshBytes}>
        Refresh bytes
      </button>
      <a
        href={`/api/templates/${templateId}/download?format=txt`}
        className="w-full px-3 py-2 border text-center block"
      >
        Download .txt (plain commands)
      </a>
    </div>
  );
}
