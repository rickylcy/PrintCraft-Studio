"use client";
import { useMemo } from "react";
import { useEditorStore } from "./store";
import { findPlaceholders } from "@printcraft/encoders/bind";

export default function BindingsWarnings({ data }) {
  const blocks = useEditorStore((s) => s.blocks);

  const warnings = useMemo(() => {
    const missing = new Set();
    const hasPath = (obj, path) => {
      try {
        return (
          path.split(".").reduce((cur, key) => {
            const m = key.match(/^(\w+)(\[(\d+)\])?$/);
            if (!m || cur == null) return undefined;
            const k = m[1];
            cur = cur[k];
            if (m[3] != null)
              cur = Array.isArray(cur) ? cur[Number(m[3])] : undefined;
            return cur;
          }, data) !== undefined
        );
      } catch {
        return false;
      }
    };

    for (const b of blocks) {
      const texts = [];
      if (typeof b.text === "string") texts.push(b.text);
      if (typeof b.value === "string") texts.push(b.value);
      for (const t of texts) {
        for (const p of findPlaceholders(t)) {
          if (!hasPath(data, p)) missing.add(p);
        }
      }
    }
    return Array.from(missing);
  }, [blocks, data]);

  if (warnings.length === 0) return null;

  return (
    <div className="space-y-1">
      <div className="text-sm font-medium text-amber-700">Missing bindings</div>
      <ul className="list-disc ml-5 text-xs">
        {warnings.map((w) => (
          <li key={w}>
            <code>{`{{${w}}}`}</code> not found in sample data
          </li>
        ))}
      </ul>
    </div>
  );
}
