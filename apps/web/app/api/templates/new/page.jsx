"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewTemplatePage() {
  const [name, setName] = useState("Kitchen Slip");
  const router = useRouter();
  async function create() {
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type: "escpos" }),
    });
    const data = await res.json();
    if (data.ok) router.push(`/templates/${data.template.id}/edit`);
  }
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">New Template</h1>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="border p-2"
      />
      <button onClick={create} className="px-3 py-2 bg-black text-white">
        Create
      </button>
    </div>
  );
}
