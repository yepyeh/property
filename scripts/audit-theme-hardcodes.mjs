import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = 'src';
const exts = new Set(['.astro', '.css']);
const ignore = new Set(['src/styles/app-shell.css']);
const checks = [
  { name: 'raw hex color', regex: /#[0-9a-fA-F]{3,8}\b/g },
  { name: 'raw rgba color', regex: /rgba\([^\n]+?\)/g },
  { name: 'light-only white background', regex: /background\s*:\s*white\b/g },
  { name: 'hardcoded white text', regex: /color\s*:\s*white\b/g },
  { name: 'literal light gradient', regex: /linear-gradient\([^\n]*#ffffff[^\n]*#f8fafc[^\n]*\)/g },
];

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if (exts.has(extname(full))) files.push(full);
  }
  return files;
}

const files = walk(ROOT).filter((file) => !ignore.has(file));
const findings = [];

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const lines = source.split('\n');
  for (const check of checks) {
    for (const match of source.matchAll(check.regex)) {
      const index = match.index ?? 0;
      const line = source.slice(0, index).split('\n').length;
      findings.push({ file, line, check: check.name, snippet: lines[line - 1].trim().slice(0, 180) });
    }
  }
}

if (!findings.length) {
  console.log('No hardcoded theme violations found.');
  process.exit(0);
}

for (const finding of findings) {
  console.log(`${finding.file}:${finding.line} [${finding.check}] ${finding.snippet}`);
}

process.exit(1);
