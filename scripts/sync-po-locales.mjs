import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const localeDir = path.join(root, "src/locales");
const basePath = path.join(localeDir, "en.po");

function parsePo(raw) {
  const entries = [];
  const lines = raw.split("\n");
  let currentId = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (trimmed.startsWith("msgid ")) {
      currentId = JSON.parse(trimmed.slice(6));
      continue;
    }
    if (trimmed.startsWith("msgstr ") && currentId !== null) {
      entries.push({ id: currentId, value: JSON.parse(trimmed.slice(7)) });
      currentId = null;
    }
  }

  return entries;
}

function formatPo(entries) {
  return `${entries.map(({ id, value }) => `msgid ${JSON.stringify(id)}\nmsgstr ${JSON.stringify(value)}`).join("\n\n")}\n`;
}

const baseEntries = parsePo(fs.readFileSync(basePath, "utf8"));
const baseMap = new Map(baseEntries.map((entry) => [entry.id, entry.value]));

for (const file of fs.readdirSync(localeDir)) {
  if (!file.endsWith(".po") || file === "en.po") continue;
  const fullPath = path.join(localeDir, file);
  const existing = parsePo(fs.readFileSync(fullPath, "utf8"));
  const existingMap = new Map(existing.map((entry) => [entry.id, entry.value]));

  for (const [id, value] of baseMap.entries()) {
    if (!existingMap.has(id)) {
      existingMap.set(id, value);
    }
  }

  const ordered = baseEntries.map(({ id }) => ({ id, value: existingMap.get(id) ?? baseMap.get(id) ?? id }));
  fs.writeFileSync(fullPath, formatPo(ordered));
  console.log(`Synced ${file}`);
}
