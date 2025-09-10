// packages/encoders/bind.js
function get(obj, path) {
  if (!path) return undefined;
  const parts = path
    .split(".")
    .map((s) => s.trim())
    .filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    const m = p.match(/^(\w+)(\[(\d+)\])?$/); // user.items[0]
    if (!m) return undefined;
    const key = m[1];
    if (cur == null || typeof cur !== "object" || !(key in cur))
      return undefined;
    cur = cur[key];
    if (m[3] != null) {
      const idx = Number(m[3]);
      if (!Array.isArray(cur) || idx >= cur.length) return undefined;
      cur = cur[idx];
    }
  }
  return cur;
}

export function bindText(text = "", data = {}) {
  if (typeof text !== "string") return text;
  return text.replace(/{{\s*([^}]+)\s*}}/g, (_, p) => {
    const v = get(data, p);
    return v == null ? "" : String(v);
  });
}

export function findPlaceholders(text = "") {
  const out = new Set();
  if (typeof text !== "string") return out;
  text.replace(/{{\s*([^}]+)\s*}}/g, (_, p) => out.add(p.trim()));
  return out;
}
