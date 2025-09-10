"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [name, setName] = useState("Kitchen Slip");
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/templates");
      const d = await r.json();
      setTemplates(d.templates || []);
    })();
  }, []);

  async function create() {
    const r = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type: "escpos" }),
    });
    const d = await r.json();
    if (d.ok) router.push(`/templates/${d.template.id}/edit`);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          className="border p-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="bg-black px-3 py-2 text-white" onClick={create}>
          New Template
        </button>
      </div>
      <ul className="space-y-2">
        {templates.map((t) => (
          <li
            key={t.id}
            className="flex items-center justify-between rounded border p-2"
          >
            <div>{t.name}</div>
            <Link className="underline" href={`/templates/${t.id}/edit`}>
              Edit
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
