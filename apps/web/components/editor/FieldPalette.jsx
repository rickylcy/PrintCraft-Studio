"use client";
import { useMemo, useState } from "react";
import { useEditorStore } from "./store";

function flatten(obj, prefix = "") {
  const out = [];
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => {
      const base = prefix ? `${prefix}[${i}]` : `[${i}]`;
      if (v !== null && typeof v === "object") out.push(...flatten(v, base));
      else out.push([base, v]);
    });
  } else if (obj && typeof obj === "object") {
    Object.keys(obj).forEach((k) => {
      const base = prefix ? `${prefix}.${k}` : k;
      const v = obj[k];
      if (v !== null && typeof v === "object") out.push(...flatten(v, base));
      else out.push([base, v]);
    });
  } else if (prefix) {
    out.push([prefix, obj]);
  }
  return out;
}

export default function FieldPalette({ data }) {
  const [q, setQ] = useState("");
  const updateBlock = useEditorStore((s) => s.updateBlock);
  const selectedId = useEditorStore((s) => s.selectedId);
  const blocks = useEditorStore((s) => s.blocks);

  const pairs = useMemo(() => flatten(data || {}), [data]);
  const filtered = useMemo(
    () => pairs.filter(([k]) => k.toLowerCase().includes(q.toLowerCase())),
    [pairs, q]
  );

  function insert(path) {
    if (!selectedId) return;
    const b = blocks.find((x) => x.id === selectedId);
    if (!b) return;
    const token = `{{${path}}}`;
    if (b.type === "text") updateBlock(b.id, { text: (b.text || "") + token });
    else if (b.type === "barcode" || b.type === "qr")
      updateBlock(b.id, { value: (b.value || "") + token });
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Fields</div>
      <input
        className="w-full border p-1 text-sm"
        placeholder="Search fields…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="border rounded max-h-48 overflow-auto text-sm">
        {filtered.length === 0 ? (
          <div className="p-2 text-xs opacity-60">No fields</div>
        ) : (
          filtered.map(([k, v]) => (
            <div
              key={k}
              className="flex items-center justify-between px-2 py-1 border-b last:border-b-0"
            >
              <div className="truncate">
                <span className="font-mono">{k}</span>
                <span className="ml-2 text-xs opacity-60 truncate">
                  = {String(v)}
                </span>
              </div>
              <button
                className="text-xs px-2 py-0.5 border"
                onClick={() => insert(k)}
              >
                Insert
              </button>
            </div>
          ))
        )}
      </div>
      <div className="text-xs opacity-60">
        Tip: select a block first, then click “Insert”. Text →{" "}
        <code>{"{{path}}"}</code>, Barcode/QR → value.
      </div>
    </div>
  );
}
