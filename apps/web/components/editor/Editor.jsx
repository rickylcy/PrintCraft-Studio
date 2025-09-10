"use client";
import { useEffect, useState, useMemo } from "react";
import BlockPalette from "./BlockPalette";
import EditorCanvas from "./EditorCanvas";
import BlockInspector from "./BlockInspector";
import { useEditorStore } from "./store";
import PreviewPane from "./PreviewPane";
import FieldPalette from "./FieldPalette";
import BindingsWarnings from "./BindingsWarnings";

export default function Editor({
  templateId,
  initialName,
  initialContent,
  type,
  initialProfileId = null,
}) {
  const setInitial = useEditorStore((s) => s.setInitial);
  const blocks = useEditorStore((s) => s.blocks);

  // UI state
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [name, setName] = useState(initialName || "Untitled");
  const [savingName, setSavingName] = useState(false);
  const [nameStatus, setNameStatus] = useState("");

  // Printer profiles
  const [profiles, setProfiles] = useState([]);
  const [profileId, setProfileId] = useState(initialProfileId || null);

  // Physical printers (from Agent)
  const [printers, setPrinters] = useState([]);
  const [printer, setPrinter] = useState("");

  // Canvas settings
  const [showGrid, setShowGrid] = useState(true);
  const [snap, setSnap] = useState(true);
  const [gridStep, setGridStep] = useState(8);

  // Sample data for {{bindings}}
  const [sampleData, setSampleData] = useState(
    `{
  "order": { "deal_no": 1234, "sendtime": "2025-09-09T09:00:00+10:00" },
  "customer": { "name": "Ada Lovelace" }
}`
  );

  // Derived: current profile → width & margins
  const currentProfile = profiles.find((p) => p.id === profileId);
  const widthDots = currentProfile?.widthDots ?? (type === "zpl" ? 600 : 576);
  const margins = useMemo(
    () => ({
      left: currentProfile?.marginLeftDots ?? 0,
      right: currentProfile?.marginRightDots ?? 0,
      top: currentProfile?.marginTopDots ?? 0,
      bottom: currentProfile?.marginBottomDots ?? 0,
    }),
    [currentProfile]
  );

  const dataObj = useMemo(() => {
    try {
      return JSON.parse(sampleData);
    } catch {
      return {};
    }
  }, [sampleData]);

  // Init editor + fetch profiles/printers
  useEffect(() => {
    setInitial({
      name: initialName,
      type,
      blocks: initialContent.blocks || [],
    });
    setName(initialName || "Untitled");

    fetch("/api/profiles")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) setProfiles(d.profiles || []);
      })
      .catch(() => {});

    fetch("/api/printers")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) {
          const list = d.printers || [];
          setPrinters(list);
          const def =
            list.find((p) => p.isDefault)?.name ||
            (list[0] ? list[0].name : "");
          setPrinter(def || "");
        }
      })
      .catch(() => {});
  }, [initialName, type, initialContent, setInitial]);

  async function saveName() {
    if (!name || name === initialName) return;
    try {
      setSavingName(true);
      setNameStatus("Saving…");
      const res = await fetch(`/api/templates/${templateId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Rename failed");
      setNameStatus("Saved");
    } catch (e) {
      setNameStatus(String(e.message || e));
    } finally {
      setSavingName(false);
    }
  }

  // Auto-select first profile if none is chosen yet
  useEffect(() => {
    if (!profileId && profiles.length) {
      setProfileId(profiles[0].id);
    }
  }, [profiles, profileId]);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/templates/${templateId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        contentJson: JSON.stringify({ blocks }),
        profileId,
      }),
    });
    const data = await res.json();
    setSaving(false);
    setStatus(data.ok ? "Saved" : `Error: ${data.error}`);
  }

  async function runPrint(dry = true) {
    setStatus("Rendering…");
    const res = await fetch("/api/print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        blocks,
        data: dataObj,
        dry,
        templateId,
        profileId,
        printer,
      }),
    });
    const out = await res.json();
    setStatus(
      out.ok
        ? dry
          ? `Preview ready (bytes=${out.bytes})`
          : `Sent to Agent (bytes=${out.bytes})`
        : `Error: ${out.error}`
    );
  }

  return (
    <div className="min-h-[calc(100vh-140px)]">
      {/* Title / rename (centered container) */}
      <div className="mx-auto w-full max-w-[1400px] px-0">
        <div className="flex items-center gap-2 rounded-md border bg-white px-3 py-2">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            className="opacity-70"
          >
            <path
              fill="currentColor"
              d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm3.92 2.33H5V18.1L14.06 9.04l1.92 1.92L6.92 19.58ZM20.71 7a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83l3.75 3.75L20.71 7Z"
            />
          </svg>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-neutral-600">
              Template name
            </label>
            <input
              aria-label="Template name"
              className="w-64 rounded border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameStatus("");
              }}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
              }}
              placeholder="Untitled template"
              maxLength={80}
            />
            <button
              className="rounded border px-2 py-1 text-sm disabled:opacity-60"
              onClick={saveName}
              disabled={savingName || !name || name === initialName}
              title="Save template name"
            >
              {savingName ? "Saving…" : "Save name"}
            </button>
            {!!nameStatus && (
              <span
                className={[
                  "rounded px-2 py-0.5 text-xs",
                  nameStatus === "Saved"
                    ? "bg-green-100 text-green-700"
                    : "bg-amber-100 text-amber-700",
                ].join(" ")}
              >
                {nameStatus}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Top toolbar (centered container) */}
      <div className="mx-auto w-full max-w-[1400px] px-0">
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded border bg-white p-3">
          {/* Profile */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Profile</label>
            <select
              className="border p-1 text-sm"
              value={profileId || ""}
              onChange={(e) => setProfileId(e.target.value || null)}
            >
              {profiles.length === 0 && <option value="">(no profiles)</option>}
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.type} · {p.widthDots} dots
                </option>
              ))}
            </select>
          </div>

          {/* Printer */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Printer</label>
            <select
              className="border p-1 text-sm"
              value={printer}
              onChange={(e) => setPrinter(e.target.value)}
            >
              <option value="">(default)</option>
              {printers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                  {p.isDefault ? " (default)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Canvas controls */}
          <div className="ml-auto flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
              />
              Grid
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={snap}
                onChange={(e) => setSnap(e.target.checked)}
              />
              Snap
            </label>
            <label className="flex items-center gap-2 text-sm">
              Step
              <input
                type="number"
                min={2}
                max={64}
                step={2}
                className="w-16 border p-1 text-sm"
                value={gridStep}
                onChange={(e) =>
                  setGridStep(Math.max(2, Number(e.target.value) || 8))
                }
              />
            </label>

            <button
              className="rounded bg-black px-3 py-2 text-white disabled:opacity-60"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              className="rounded border px-3 py-2"
              onClick={() => runPrint(true)}
            >
              Preview (dry)
            </button>
            <button
              className="rounded border px-3 py-2"
              onClick={() => runPrint(false)}
            >
              Test Print
            </button>
          </div>
        </div>
      </div>

      {/* 3-column layout — centered, no left padding */}
      <div className="mx-auto w-full max-w-[1400px] px-0">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[20rem,minmax(640px,1fr),28rem]">
          {/* LEFT — Tools / Inspector / Data */}
          <aside className="space-y-4 lg:sticky lg:top-4 self-start">
            <section className="space-y-2 rounded border bg-white p-3">
              <h3 className="text-sm font-semibold">Blocks</h3>
              <BlockPalette />
            </section>

            <section className="space-y-2 rounded border bg-white p-3">
              <h3 className="text-sm font-semibold">Inspector</h3>
              <BlockInspector />
            </section>

            <section className="space-y-2 rounded border bg-white p-3">
              <h3 className="text-sm font-semibold">Sample Data (JSON)</h3>
              <div className="text-xs opacity-60">
                Use <code>{"{{path.to.value}}"}</code> in Text/Barcode/QR
                values.
              </div>
              <textarea
                value={sampleData}
                onChange={(e) => setSampleData(e.target.value)}
                className="h-40 w-full resize-vertical border p-2 font-mono text-xs"
              />
            </section>

            <section className="space-y-2 rounded border bg-white p-3">
              <h3 className="text-sm font-semibold">Fields</h3>
              <FieldPalette data={dataObj} />
            </section>

            <section className="space-y-2 rounded border bg-white p-3">
              <h3 className="text-sm font-semibold">Warnings</h3>
              <BindingsWarnings data={dataObj} />
            </section>
          </aside>

          {/* CENTER — Canvas */}
          <main className="rounded border bg-white p-3">
            <div className="max-h-[calc(100vh-220px)] overflow-auto">
              <EditorCanvas
                widthDots={widthDots}
                showGrid={showGrid}
                gridStep={gridStep}
                margins={margins}
                snap={snap}
                snapStep={gridStep}
              />
            </div>
          </main>

          {/* RIGHT — Live Preview */}
          <aside className="space-y-3 lg:sticky lg:top-4 self-start">
            <section className="space-y-2 rounded border bg-white p-3">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-semibold">Preview</h3>
                <div className="text-xs text-neutral-500">
                  width: {widthDots} dots
                  {margins.left ||
                  margins.right ||
                  margins.top ||
                  margins.bottom
                    ? ` · margins L${margins.left} R${margins.right} T${margins.top} B${margins.bottom}`
                    : ""}
                </div>
              </div>
              <div className="max-h-[calc(100vh-240px)] overflow-auto">
                <PreviewPane
                  type={type}
                  blocks={blocks}
                  data={dataObj}
                  margins={margins}
                  widthDots={widthDots}
                  templateId={templateId}
                  profileId={profileId}
                />
              </div>
            </section>

            {!!status && (
              <div className="rounded border bg-white p-3 text-sm text-neutral-700">
                {status}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
