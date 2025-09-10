"use client";
import { useEditorStore } from "./store";

export default function BlockInspector() {
  const blocks = useEditorStore((s) => s.blocks);
  const selectedId = useEditorStore((s) => s.selectedId);
  const update = useEditorStore((s) => s.updateBlock);
  const b = blocks.find((x) => x.id === selectedId);

  if (!b)
    return (
      <div className="text-sm opacity-60">
        Select a block to edit its properties.
      </div>
    );

  return (
    <div className="space-y-2 text-sm">
      <div className="font-medium">Block: {b.type}</div>

      {b.type === "text" && (
        <>
          <label className="block">
            Font size
            <input
              type="number"
              value={b.fontSize || 16}
              onChange={(e) =>
                update(b.id, { fontSize: Number(e.target.value) })
              }
              className="w-full border p-1"
            />
          </label>
          <label className="block">
            Align
            <select
              value={b.align || "left"}
              onChange={(e) => update(b.id, { align: e.target.value })}
              className="w-full border p-1"
            >
              <option>left</option>
              <option>center</option>
              <option>right</option>
            </select>
          </label>
          <div className="text-xs opacity-60">
            Use <code>{"{{path.to.value}}"}</code> to bind sample data.
          </div>
        </>
      )}

      {b.type === "barcode" && (
        <>
          <label className="block">
            Value
            <input
              value={b.value || ""}
              onChange={(e) => update(b.id, { value: e.target.value })}
              className="w-full border p-1"
            />
          </label>
          <label className="block">
            HRI (0 none, 1 above, 2 below, 3 both)
            <input
              type="number"
              value={b.hri ?? 0}
              onChange={(e) => update(b.id, { hri: Number(e.target.value) })}
              className="w-full border p-1"
            />
          </label>
          <label className="block">
            Height
            <input
              type="number"
              value={b.height || 80}
              onChange={(e) => update(b.id, { height: Number(e.target.value) })}
              className="w-full border p-1"
            />
          </label>
          <label className="block">
            Width (2..6)
            <input
              type="number"
              value={b.width || 2}
              onChange={(e) => update(b.id, { width: Number(e.target.value) })}
              className="w-full border p-1"
            />
          </label>
          <label className="block">
            Align
            <select
              value={b.align || "left"}
              onChange={(e) => update(b.id, { align: e.target.value })}
              className="w-full border p-1"
            >
              <option>left</option>
              <option>center</option>
              <option>right</option>
            </select>
          </label>
        </>
      )}

      {b.type === "qr" && (
        <>
          <label className="block">
            Value
            <input
              value={b.value || ""}
              onChange={(e) => update(b.id, { value: e.target.value })}
              className="w-full border p-1"
            />
          </label>
          <label className="block">
            Size (1..16)
            <input
              type="number"
              value={b.size || 6}
              onChange={(e) => update(b.id, { size: Number(e.target.value) })}
              className="w-full border p-1"
            />
          </label>
          <label className="block">
            EC (L/M/Q/H)
            <select
              value={b.ec || "M"}
              onChange={(e) => update(b.id, { ec: e.target.value })}
              className="w-full border p-1"
            >
              <option>L</option>
              <option>M</option>
              <option>Q</option>
              <option>H</option>
            </select>
          </label>
          <label className="block">
            Align
            <select
              value={b.align || "left"}
              onChange={(e) => update(b.id, { align: e.target.value })}
              className="w-full border p-1"
            >
              <option>left</option>
              <option>center</option>
              <option>right</option>
            </select>
          </label>
        </>
      )}
    </div>
  );
}
