const express = require("express");
const { Buffer } = require("buffer");

let printerLib = null;
try {
  printerLib = require("printer");
} catch (e) {
  console.warn("no native printer, will fallback to lp:", e.message);
}
const exec = require("child_process").exec;

const app = express();
app.use(express.json({ limit: "2mb" }));

const PRINTER_NAME =
  process.env.PRINTER_NAME ||
  (printerLib ? printerLib.getDefaultPrinterName() : null);

app.get("/health", (req, res) =>
  res.json({
    ok: true,
    printer: PRINTER_NAME || "default (lp)",
    transport: printerLib ? "node-printer" : "lp-raw",
  })
);

app.post("/print", async (req, res) => {
  try {
    const { bytes, type = "escpos", printer } = req.body;
    const data = Buffer.from(bytes, "base64");
    const chosen = printer || PRINTER_NAME;

    if (printerLib) {
      printerLib.printDirect({
        data,
        printer: chosen,
        type: "RAW",
        success: (jobID) =>
          res.json({ ok: true, jobID, transport: "node-printer" }),
        error: (err) => res.status(500).json({ ok: false, error: String(err) }),
      });
    } else {
      const { spawn } = require("child_process");
      const args = [];
      if (chosen) args.push("-d", chosen);
      args.push("-o", "raw");
      const lp = spawn("lp", args);
      let stderr = "";
      lp.stderr.on("data", (c) => (stderr += c.toString()));
      lp.on("close", (code) =>
        code === 0
          ? res.json({ ok: true, transport: "lp-raw" })
          : res
              .status(500)
              .json({ ok: false, error: stderr || `lp exited ${code}` })
      );
      lp.stdin.write(data);
      lp.stdin.end();
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/printers", async (_req, res) => {
  try {
    if (printerLib) {
      const list = printerLib
        .getPrinters()
        .map((p) => ({ name: p.name, isDefault: p.isDefault || false }));
      return res.json({ ok: true, printers: list });
    }
    // fallback via lpstat (mac/linux)
    exec("lpstat -p -d", (err, stdout) => {
      if (err) return res.json({ ok: false, error: String(err) });
      const names = [...stdout.matchAll(/^printer\s+([^\s]+)/gm)].map(
        (m) => m[1]
      );
      const def = (stdout.match(/system default destination: (.+)/) || [])[1];
      const list = names.map((n) => ({ name: n, isDefault: n === def }));
      res.json({ ok: true, printers: list });
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

const PORT = process.env.PORT || 4747;
app.listen(PORT, () =>
  console.log(
    `Agent listening on :${PORT} (printer=${PRINTER_NAME || "default"})`
  )
);
