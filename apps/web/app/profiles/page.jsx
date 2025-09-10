"use client";

import { useEffect, useState } from "react";

export default function ProfilesPage() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  // new profile form
  const [form, setForm] = useState({
    name: "80mm w/24px margins",
    type: "escpos",
    widthDots: 576,
    codepage: "cp437",
    marginLeftDots: 24,
    marginRightDots: 24,
    marginTopDots: 0,
    marginBottomDots: 0,
  });

  async function load() {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/profiles", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok)
        throw new Error(data.error || `HTTP ${res.status}`);
      setProfiles(data.profiles || []);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function updateFormField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function createProfile() {
    try {
      setCreating(true);
      setError("");
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.ok)
        throw new Error(data.error || `HTTP ${res.status}`);
      // reset name only for convenience
      setForm((f) => ({ ...f, name: "" }));
      await load();
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setCreating(false);
    }
  }

  function updateRowLocal(id, patch) {
    setProfiles((rows) =>
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r))
    );
  }

  async function saveRow(row) {
    try {
      setError("");
      const res = await fetch(`/api/profiles/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        // only send known fields
        body: JSON.stringify({
          name: row.name,
          type: row.type,
          device: row.device ?? null,
          widthDots: Number(row.widthDots) || 0,
          codepage: row.codepage || "cp437",
          marginLeftDots: Number(row.marginLeftDots) || 0,
          marginRightDots: Number(row.marginRightDots) || 0,
          marginTopDots: Number(row.marginTopDots) || 0,
          marginBottomDots: Number(row.marginBottomDots) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok)
        throw new Error(data.error || `HTTP ${res.status}`);
      await load();
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Printer Profiles</h1>
        <p className="text-sm text-neutral-600">
          Define paper width, codepage and safe margins. The editor & preview
          use these.
        </p>
      </header>

      {/* Create form */}
      <section className="border rounded p-4">
        <div className="grid grid-cols-8 gap-3 items-end">
          <div className="col-span-2">
            <label className="block text-sm mb-1">Name</label>
            <input
              className="border p-2 w-full"
              value={form.name}
              onChange={(e) => updateFormField("name", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Type</label>
            <select
              className="border p-2 w-full"
              value={form.type}
              onChange={(e) => updateFormField("type", e.target.value)}
            >
              <option value="escpos">escpos</option>
              <option value="zpl">zpl</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Width (dots)</label>
            <input
              type="number"
              className="border p-2 w-full"
              value={form.widthDots}
              onChange={(e) =>
                updateFormField("widthDots", Number(e.target.value) || 0)
              }
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Codepage</label>
            <input
              className="border p-2 w-full"
              value={form.codepage}
              onChange={(e) => updateFormField("codepage", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Left</label>
            <input
              type="number"
              className="border p-2 w-full"
              value={form.marginLeftDots}
              onChange={(e) =>
                updateFormField("marginLeftDots", Number(e.target.value) || 0)
              }
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Right</label>
            <input
              type="number"
              className="border p-2 w-full"
              value={form.marginRightDots}
              onChange={(e) =>
                updateFormField("marginRightDots", Number(e.target.value) || 0)
              }
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Top</label>
            <input
              type="number"
              className="border p-2 w-full"
              value={form.marginTopDots}
              onChange={(e) =>
                updateFormField("marginTopDots", Number(e.target.value) || 0)
              }
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Bottom</label>
            <input
              type="number"
              className="border p-2 w-full"
              value={form.marginBottomDots}
              onChange={(e) =>
                updateFormField("marginBottomDots", Number(e.target.value) || 0)
              }
            />
          </div>

          <div className="col-span-8">
            <button
              className="px-3 py-2 bg-black text-white rounded disabled:opacity-60"
              onClick={createProfile}
              disabled={creating || !form.name.trim()}
            >
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      </section>

      {/* Error & loading */}
      {!!error && <div className="text-sm text-red-700">{error}</div>}
      {loading && <div className="text-sm">Loading…</div>}

      {/* List & inline edit */}
      {!loading && (
        <section>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-3">Name</th>
                <th className="pr-3">Type</th>
                <th className="pr-3">Width</th>
                <th className="pr-3">Codepage</th>
                <th className="pr-1">L</th>
                <th className="pr-1">R</th>
                <th className="pr-1">T</th>
                <th className="pr-1">B</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-2 pr-3">
                    <input
                      className="border p-1 w-full"
                      value={row.name}
                      onChange={(e) =>
                        updateRowLocal(row.id, { name: e.target.value })
                      }
                    />
                  </td>
                  <td className="pr-3">
                    <select
                      className="border p-1"
                      value={row.type}
                      onChange={(e) =>
                        updateRowLocal(row.id, { type: e.target.value })
                      }
                    >
                      <option value="escpos">escpos</option>
                      <option value="zpl">zpl</option>
                    </select>
                  </td>
                  <td className="pr-3">
                    <input
                      type="number"
                      className="border p-1 w-20"
                      value={row.widthDots}
                      onChange={(e) =>
                        updateRowLocal(row.id, {
                          widthDots: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </td>
                  <td className="pr-3">
                    <input
                      className="border p-1 w-28"
                      value={row.codepage || "cp437"}
                      onChange={(e) =>
                        updateRowLocal(row.id, { codepage: e.target.value })
                      }
                    />
                  </td>
                  <td className="pr-1">
                    <input
                      type="number"
                      className="border p-1 w-16"
                      value={row.marginLeftDots || 0}
                      onChange={(e) =>
                        updateRowLocal(row.id, {
                          marginLeftDots: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </td>
                  <td className="pr-1">
                    <input
                      type="number"
                      className="border p-1 w-16"
                      value={row.marginRightDots || 0}
                      onChange={(e) =>
                        updateRowLocal(row.id, {
                          marginRightDots: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </td>
                  <td className="pr-1">
                    <input
                      type="number"
                      className="border p-1 w-16"
                      value={row.marginTopDots || 0}
                      onChange={(e) =>
                        updateRowLocal(row.id, {
                          marginTopDots: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </td>
                  <td className="pr-1">
                    <input
                      type="number"
                      className="border p-1 w-16"
                      value={row.marginBottomDots || 0}
                      onChange={(e) =>
                        updateRowLocal(row.id, {
                          marginBottomDots: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </td>
                  <td className="py-2">
                    <button
                      className="px-2 py-1 border rounded"
                      onClick={() => saveRow(row)}
                    >
                      Save
                    </button>
                  </td>
                </tr>
              ))}
              {profiles.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-4 text-neutral-500">
                    No profiles yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
