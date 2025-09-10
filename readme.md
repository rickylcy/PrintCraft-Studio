# PrintCraft Studio

> Visual template editor + raw printing pipeline for **ESC/POS** receipts and **ZPL** labels.
>
> **Apps:** Next.js web editor · Node Agent for on‑prem printers · Shared encoders package.

<p align="center">
  <img src="docs/screenshot-editor.png" alt="Editor UI" width="720" />
</p>

<p align="center">
  <a href="https://nodejs.org/en">Node 18+</a> · Next.js 14 · pnpm workspaces · Prisma · Tailwind
</p>

---

## ✨ Features

- Visual editor for text/divider (barcodes/QR next), with drag/align and sample‑data bindings
- **ESC/POS** + **ZPL** byte generation (raw) with **mnemonic** review mode for ESC/POS
- Printer **profiles** (paper width/margins) and on‑screen preview width in dots
- **Local Agent** (Express) that sends **RAW** bytes to your OS printer drivers
- 203dpi friendly; **1.5× text size fallback** via rasterization (see notes)
- Templates saved in DB (Prisma); simple Jobs log (roadmap)

---

## 🧭 Monorepo layout

```
printcraft/
  packages/
    encoders/           # shared ESC/POS & ZPL helpers
  apps/
    web/                # Next.js app (App Router)
    agent/              # Node printer agent (Express)
  prisma/
    schema.prisma
  .env                  # environment (see .env.example)
```

---

## 🚀 Quick start

### Prereqs

- **Node 18+**
- **pnpm** (`npm i -g pnpm`) — or use npm/yarn if you prefer
- **SQLite** for dev (default via Prisma). Switch to MySQL in prod.
- A printer installed on your OS (for Agent RAW printing)

### 1) Clone & install

```bash
git clone <YOUR_REPO_URL> printcraft-studio
cd printcraft-studio
pnpm i
```

### 2) Configure env

Copy and edit `.env.example` → `.env`:

```
DATABASE_URL="file:./dev.db"
AGENT_URL="http://localhost:4747"
PRINTER_NAME=""            # optional: leave blank to use OS default printer
```

### 3) DB init (Prisma)

```bash
pnpm dlx prisma generate
pnpm dlx prisma migrate dev -n init
```

### 4) Run web + agent (two terminals)

```bash
pnpm --filter @printcraft/agent dev
pnpm --filter @printcraft/web dev
```

Open **[http://localhost:3000](http://localhost:3000)** → try **Test ESC/POS** / **Test ZPL**.

---

## ⚙️ Configuration

- **AGENT_URL** – where the Agent listens (default `http://localhost:4747`)
- **PRINTER_NAME** – set to a specific device to avoid system default
- **DATABASE_URL** – SQLite/MySQL connection string

> Agent exposes `GET /health` to verify the selected printer.

---

## 🖨️ Printing Agent

The Agent uses the OS printer driver to send **RAW** bytes. Works on Windows/macOS/Linux.

**Run:**

```bash
pnpm --filter @printcraft/agent dev
```

**Change printer:** set `PRINTER_NAME` in `.env` (see `printer.getPrinters()` for names).

> On Windows you can install as a service (see `apps/agent/service.js`). On macOS/Linux, use `pm2` or a systemd unit.

---

## 🧪 Development

Common scripts:

```bash
pnpm dev:web        # Next.js at :3000
pnpm dev:agent      # Agent at :4747
pnpm dlx prisma studio
```

Project uses **pnpm workspaces**. Shared encoders live in `packages/encoders`.

---

## 🧩 Encoders

- **ESC/POS**: alignment, line feed, cut, size (1..8). Decimal sizes (e.g. **1.5×**) use a raster fallback that emits GS `v` bit‑image blocks (simple implementation included; swap with a proper renderer when ready).
- **ZPL**: minimal helpers for `^PW`, `^FO`, `^A0`, `^BC`, etc.

---

## 🧰 Troubleshooting

**Agent prints nothing**

- Ensure the OS can print a test page to the selected printer.
- Verify `PRINTER_NAME` matches `printer.getPrinters()`.

**“Cannot find module '../build/Release/canvas.node'”**

- We do **not** require `node-canvas` in the web app. If you added it, remove it or ensure it isn’t bundled in Next server routes.

**Binary module parse error (napi-rs/canvas … skia … .node)**

- Avoid importing native `.node` binaries in Next.js. Keep rasterization inside Node (Agent) if needed.

**ESC/POS text indent**

- Indentation is handled by **left margin + print area width**. Use `GS L n` and `GS W n` in mnemonic/export, or block `x` position in the editor.

**ZPL downloaded as .zpl vs .txt**

- By default we download plain commands as `.txt` for easy viewing. You can rename to `.zpl` if your workflow expects it.

---

## 🗺️ Roadmap

- Barcode + QR blocks (ESC/POS raster/ZPL native)
- Jobs table, reprint, and status
- WebUSB direct printing (where supported)
- Profiles UI (paper width/margins/codepage)
- Multi‑user auth and roles

---

## 📸 Screenshots

- `docs/screenshot-editor.png` — editor with canvas, inspector, preview
- `docs/screenshot-print-preview.png` — print preview with byte count

> Add GIFs in PRs to show changes visually.

---

## 🤝 Contributing

PRs welcome! Please read `CONTRIBUTING.md` and follow Conventional Commits.

---

## 📄 License

MIT © You

---

## 📦 Release checklist

- [ ] Update README screenshots
- [ ] Bump version in root `package.json`
- [ ] Tag `v0.1.0` and create a GitHub Release with notes
- [ ] Attach example bytes or sample templates in `/examples`

---

## 📁 Repository extras (recommended)

Include these files to make the repo shine:

```
LICENSE (MIT)
README.md
.env.example
.gitignore
.gitattributes
.editorconfig
.github/
  ├─ ISSUE_TEMPLATE/
  │   ├─ bug_report.md
  │   └─ feature_request.md
  ├─ pull_request_template.md
  └─ workflows/ci.yml
CONTRIBUTING.md
CODE_OF_CONDUCT.md
SECURITY.md
CHANGELOG.md
docs/
  ├─ screenshot-editor.png
  └─ screenshot-print-preview.png
```

**.gitignore** should exclude: `node_modules/`, `.next/`, `*.log`, `.env`, `prisma/*.db`, `coverage/`, `apps/**/dist/`.

**.github/workflows/ci.yml** (example):

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: "pnpm" }
      - run: pnpm i --frozen-lockfile
      - run: pnpm -F @printcraft/web build || echo "no build step yet"
```

Happy printing! 🖨️✨
