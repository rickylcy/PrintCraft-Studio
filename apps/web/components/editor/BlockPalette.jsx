"use client";
import { useEditorStore } from "./store";

export default function BlockPalette() {
  const add = useEditorStore((s) => s.addBlock);
  return (
    <div className="flex gap-2">
      <button onClick={() => add("text")} className="px-2 py-1 border">
        + Text
      </button>
      <button onClick={() => add("divider")} className="px-2 py-1 border">
        + Divider
      </button>
      <button onClick={() => add("barcode")} className="px-2 py-1 border">
        + Barcode
      </button>
      <button onClick={() => add("qr")} className="px-2 py-1 border">
        + QR
      </button>
    </div>
  );
}
