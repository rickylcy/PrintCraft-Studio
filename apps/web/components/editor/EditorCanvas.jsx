"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { useEditorStore } from "./store";

const NEAR = 6; // px threshold to snap/show a guide
const MIN_W = 40,
  MIN_H = 16;

export default function EditorCanvas({
  widthDots = 576,
  height = 800,
  margins = { left: 16, right: 16, top: 16, bottom: 16 },
  showGrid = true,
  gridStep = 8,
  snap = true,
  snapStep = 8,
}) {
  const blocks = useEditorStore((s) => s.blocks);
  const update = useEditorStore((s) => s.updateBlock);
  const remove = useEditorStore((s) => s.removeBlock);
  const select = useEditorStore((s) => s.select);
  const selectedId = useEditorStore((s) => s.selectedId);

  const bgRef = useRef(null);
  const paperRef = useRef(null);

  const { left, right, top, bottom } = margins;

  // auto height to fit content (respect top/bottom margins)
  const autoHeight = useMemo(() => {
    const max = blocks.reduce(
      (m, b) => Math.max(m, (b.y || 0) + (b.h || 24) + 24),
      0
    );
    return Math.max(height, max + top + bottom);
  }, [blocks, height, top, bottom]);

  // draw paper + grid at device pixel ratio
  useEffect(() => {
    const c = bgRef.current;
    if (!c) return;
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    c.style.width = `${widthDots}px`;
    c.style.height = `${autoHeight}px`;
    c.width = Math.floor(widthDots * dpr);
    c.height = Math.floor(autoHeight * dpr);
    const ctx = c.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // paper
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, widthDots, autoHeight);

    // paper edge
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#111";
    ctx.strokeRect(1, 1, widthDots - 2, autoHeight - 2);

    // safe margins
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#bdbdbd";
    ctx.strokeRect(
      left,
      top,
      widthDots - (left + right),
      autoHeight - (top + bottom)
    );
    ctx.setLineDash([]);

    // grid dots inside safe area
    if (showGrid && gridStep > 0) {
      ctx.fillStyle = "#e0e0e0";
      const xStart = left,
        xEnd = widthDots - right;
      const yStart = top,
        yEnd = autoHeight - bottom;
      for (let x = xStart; x <= xEnd; x += gridStep) {
        for (let y = yStart; y <= yEnd; y += gridStep) ctx.fillRect(x, y, 1, 1);
      }
    }

    // size badge
    ctx.font = "10px ui-monospace, Menlo, monospace";
    const mm = (widthDots / 8).toFixed(1);
    const label = `${mm} mm · ${widthDots} dots`;
    const pad = 3;
    const w = ctx.measureText(label).width;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.strokeStyle = "#ddd";
    ctx.lineWidth = 1;
    ctx.fillRect(6, 6, w + pad * 2, 16);
    ctx.strokeRect(6, 6, w + pad * 2, 16);
    ctx.fillStyle = "#000";
    ctx.fillText(label, 6 + pad, 6 + 12);
  }, [widthDots, autoHeight, left, right, top, bottom, showGrid, gridStep]);

  // ---------- snapping & guides ----------
  function snapTo(v) {
    if (!snap || snapStep <= 0) return v;
    const snapped = Math.round(v / snapStep) * snapStep;
    return Math.abs(snapped - v) <= NEAR ? snapped : v;
  }

  function otherRects(skipId) {
    return blocks
      .filter((b) => b.id !== skipId)
      .map((b) => ({
        id: b.id,
        x: b.x || 0,
        y: b.y || 0,
        w: b.w || 0,
        h: b.h || 0,
        cx: (b.x || 0) + (b.w || 0) / 2,
        cy: (b.y || 0) + (b.h || 0) / 2,
        r: (b.x || 0) + (b.w || 0),
        btm: (b.y || 0) + (b.h || 0),
      }));
  }

  const [guides, setGuides] = useState([]); // [{type:'v'|'h', pos, from, to}]
  function alignSnap(x, y, w, h, skipId) {
    // safe-area edges & center
    const paper = {
      left,
      right: widthDots - right,
      top,
      bottom: autoHeight - bottom,
    };
    paper.cx = (paper.left + paper.right) / 2;
    paper.cy = (paper.top + paper.bottom) / 2;

    let nx = snapTo(x),
      ny = snapTo(y);
    const g = [];

    const maybe = (cur, target) =>
      Math.abs(cur - target) <= NEAR ? target : null;

    // paper guides (left/right/center, top/bottom/middle)
    if (maybe(nx, paper.left) !== null) {
      nx = paper.left;
      g.push({
        type: "v",
        pos: paper.left,
        from: top,
        to: autoHeight - bottom,
      });
    }
    if (maybe(nx + w, paper.right) !== null) {
      nx = paper.right - w;
      g.push({
        type: "v",
        pos: paper.right,
        from: top,
        to: autoHeight - bottom,
      });
    }
    if (maybe(nx + w / 2, paper.cx) !== null) {
      nx = paper.cx - w / 2;
      g.push({ type: "v", pos: paper.cx, from: top, to: autoHeight - bottom });
    }

    if (maybe(ny, paper.top) !== null) {
      ny = paper.top;
      g.push({ type: "h", pos: paper.top, from: left, to: widthDots - right });
    }
    if (maybe(ny + h, paper.bottom) !== null) {
      ny = paper.bottom - h;
      g.push({
        type: "h",
        pos: paper.bottom,
        from: left,
        to: widthDots - right,
      });
    }
    if (maybe(ny + h / 2, paper.cy) !== null) {
      ny = paper.cy - h / 2;
      g.push({ type: "h", pos: paper.cy, from: left, to: widthDots - right });
    }

    // other blocks
    for (const o of otherRects(skipId)) {
      if (maybe(nx, o.x) !== null) {
        nx = o.x;
        g.push({
          type: "v",
          pos: o.x,
          from: Math.min(o.y, ny),
          to: Math.max(o.btm, ny + h),
        });
      }
      if (maybe(nx + w, o.r) !== null) {
        nx = o.r - w;
        g.push({
          type: "v",
          pos: o.r,
          from: Math.min(o.y, ny),
          to: Math.max(o.btm, ny + h),
        });
      }
      if (maybe(nx + w / 2, o.cx) !== null) {
        nx = o.cx - w / 2;
        g.push({
          type: "v",
          pos: o.cx,
          from: Math.min(o.y, ny),
          to: Math.max(o.btm, ny + h),
        });
      }

      if (maybe(ny, o.y) !== null) {
        ny = o.y;
        g.push({
          type: "h",
          pos: o.y,
          from: Math.min(o.x, nx),
          to: Math.max(o.r, nx + w),
        });
      }
      if (maybe(ny + h, o.btm) !== null) {
        ny = o.btm - h;
        g.push({
          type: "h",
          pos: o.btm,
          from: Math.min(o.x, nx),
          to: Math.max(o.r, nx + w),
        });
      }
      if (maybe(ny + h / 2, o.cy) !== null) {
        ny = o.cy - h / 2;
        g.push({
          type: "h",
          pos: o.cy,
          from: Math.min(o.x, nx),
          to: Math.max(o.r, nx + w),
        });
      }
    }

    // clamp to paper (full page, not just safe area)
    nx = Math.max(0, Math.min(widthDots - w, nx));
    ny = Math.max(0, Math.min(autoHeight - h, ny));

    setGuides(g);
    return { x: nx, y: ny };
  }

  // ---------- mouse interactions (drag + resize) ----------
  const [drag, setDrag] = useState(null); // { id, offsetX, offsetY, start:{x,y,w,h}, mode:'move'|'resize', edge:'e'|'s'|'se' }
  function startDragMove(e, b) {
    e.stopPropagation();
    const rect = paperRef.current.getBoundingClientRect();
    setDrag({
      id: b.id,
      mode: "move",
      offsetX: e.clientX - rect.left - (b.x || 0),
      offsetY: e.clientY - rect.top - (b.y || 0),
      start: { x: b.x || 0, y: b.y || 0, w: b.w || 0, h: b.h || 0 },
    });
    select(b.id);
  }
  function startResize(e, b, edge) {
    e.stopPropagation();
    setDrag({
      id: b.id,
      mode: "resize",
      edge,
      start: { x: b.x || 0, y: b.y || 0, w: b.w || 0, h: b.h || 0 },
    });
    select(b.id);
  }

  useEffect(() => {
    function onMove(e) {
      if (!drag) return;
      const rect = paperRef.current.getBoundingClientRect();
      if (drag.mode === "move") {
        const x = Math.round(e.clientX - rect.left - drag.offsetX);
        const y = Math.round(e.clientY - rect.top - drag.offsetY);
        const { x: nx, y: ny } = alignSnap(
          x,
          y,
          drag.start.w,
          drag.start.h,
          drag.id
        );
        update(drag.id, { x: nx, y: ny });
      } else {
        const dx = Math.round(e.clientX - rect.left) - drag.start.x;
        const dy = Math.round(e.clientY - rec木t.top) - drag.start.y;
        let w = drag.start.w,
          h = drag.start.h;
        const x = drag.start.x,
          y = drag.start.y;
        if (drag.edge.includes("e")) w = Math.max(MIN_W, dx);
        if (drag.edge.includes("s")) h = Math.max(MIN_H, dy);
        w = snap ? Math.max(MIN_W, Math.round(w / snapStep) * snapStep) : w;
        h = snap ? Math.max(MIN_H, Math.round(h / snapStep) * snapStep) : h;
        const { x: nx, y: ny } = alignSnap(x, y, w, h, drag.id);
        update(drag.id, { x: nx, y: ny, w, h });
      }
    }
    function onUp() {
      setDrag(null);
      setGuides([]);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag, update, snap, snapStep]);

  // keyboard nudge / delete
  useEffect(() => {
    function onKey(e) {
      if (!selectedId) return;
      const b = blocks.find((x) => x.id === selectedId);
      if (!b) return;
      const step = e.shiftKey ? 10 : 1;
      if (
        [
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "Delete",
          "Backspace",
        ].includes(e.key)
      )
        e.preventDefault();
      if (e.key === "ArrowLeft")
        update(b.id, { x: Math.max(0, (b.x || 0) - step) });
      if (e.key === "ArrowRight")
        update(b.id, {
          x: Math.min(widthDots - (b.w || 0), (b.x || 0) + step),
        });
      if (e.key === "ArrowUp")
        update(b.id, { y: Math.max(0, (b.y || 0) - step) });
      if (e.key === "ArrowDown")
        update(b.id, {
          y: Math.min(autoHeight - (b.h || 0), (b.y || 0) + step),
        });
      if (e.key === "Delete" || e.key === "Backspace") remove(b.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, blocks, update, remove, widthDots, autoHeight]);

  // render
  return (
    <div className="bg-neutral-100 p-4 rounded">
      <div
        ref={paperRef}
        className="relative mx-auto"
        style={{ width: widthDots, height: autoHeight }}
        onClick={() => select(null)}
      >
        {/* background */}
        <canvas ref={bgRef} className="absolute inset-0 pointer-events-none" />

        {/* alignment guides */}
        {guides.map((g, i) =>
          g.type === "v" ? (
            <div
              key={i}
              className="absolute bg-pink-600/70"
              style={{
                left: g.pos,
                top: g.from,
                width: 1,
                height: g.to - g.from,
                pointerEvents: "none",
              }}
            />
          ) : (
            <div
              key={i}
              className="absolute bg-pink-600/70"
              style={{
                top: g.pos,
                left: g.from,
                height: 1,
                width: g.to - g.from,
                pointerEvents: "none",
              }}
            />
          )
        )}

        {/* blocks layer */}
        <div className="absolute inset-0">
          {blocks.map((b) => (
            <div
              key={b.id}
              onMouseDown={(e) => startDragMove(e, b)}
              onClick={(e) => {
                e.stopPropagation();
                select(b.id);
              }}
              style={{
                position: "absolute",
                left: b.x,
                top: b.y,
                width: b.w,
                height: b.h,
                border:
                  b.id === selectedId ? "1.5px solid #111" : "1px dashed #bbb",
                background: "#fff",
                cursor: "move",
                userSelect: "none",
                padding: 4,
                boxShadow:
                  b.id === selectedId ? "0 0 0 2px rgba(0,0,0,0.05)" : "none",
              }}
            >
              {b.type === "text" && (
                <div
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={(e) =>
                    update(b.id, { text: e.currentTarget.textContent || "" })
                  }
                  style={{ fontSize: b.fontSize }}
                >
                  {b.text || "Text"}
                </div>
              )}
              {b.type === "divider" && (
                <div
                  style={{
                    borderTop: "1px solid #333",
                    width: "100%",
                    height: "100%",
                  }}
                />
              )}
              {b.type === "barcode" && (
                <div className="text-xs opacity-70">
                  BARCODE: {b.value || "1234567890"}
                </div>
              )}
              {b.type === "qr" && (
                <div className="text-xs opacity-70">
                  QR: {b.value || "https://example"}
                </div>
              )}

              {/* delete button */}
              <button
                onClick={() => remove(b.id)}
                style={{
                  position: "absolute",
                  right: -8,
                  top: -8,
                  background: "#000",
                  color: "#fff",
                  borderRadius: 12,
                  width: 24,
                  height: 24,
                  lineHeight: "24px",
                  textAlign: "center",
                }}
              >
                ×
              </button>

              {/* resize handles (east, south, southeast) */}
              <Handle dir="e" onMouseDown={(e) => startResize(e, b, "e")} />
              <Handle dir="s" onMouseDown={(e) => startResize(e, b, "s")} />
              <Handle dir="se" onMouseDown={(e) => startResize(e, b, "se")} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Handle({ dir, onMouseDown }) {
  const base = {
    position: "absolute",
    width: 10,
    height: 10,
    background: "#111",
    borderRadius: 2,
    cursor: "nwse-resize",
  };
  const style =
    dir === "e"
      ? { ...base, right: -5, top: "50%", marginTop: -5, cursor: "ew-resize" }
      : dir === "s"
      ? {
          ...base,
          bottom: -5,
          left: "50%",
          marginLeft: -5,
          cursor: "ns-resize",
        }
      : { ...base, right: -5, bottom: -5, cursor: "nwse-resize" };
  return <div style={style} onMouseDown={onMouseDown} />;
}
