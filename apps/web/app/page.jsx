"use client";
import { useState } from "react";

export default function Home() {
  const [status, setStatus] = useState("");
  async function testPrint(kind = "escpos") {
    setStatus("Printing…");
    const res = await fetch("/api/print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: kind,
        title: kind === "escpos" ? "PrintCraft Receipt" : "PrintCraft Label",
        lines: ["1x Tuna Roll", "2x Miso Soup"],
        size: { w: 1.5, h: 1.5 }, // <-- decimal → raster fallback
      }),
    });
    const data = await res.json();
    setStatus(data.ok ? `OK (bytes=${data.bytes})` : `Error: ${data.error}`);
  }
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-bold">PrintCraft Studio — v0</h1>
      <p className="text-sm opacity-80">One‑click test to Agent</p>
      <div className="flex gap-3">
        <button
          className="px-3 py-2 bg-black text-white"
          onClick={() => testPrint("escpos")}
        >
          Test ESC/POS
        </button>
        <button
          className="px-3 py-2 bg-black text-white"
          onClick={() => testPrint("zpl")}
        >
          Test ZPL
        </button>
      </div>
      <div className="text-sm">{status}</div>
    </main>
  );
}
