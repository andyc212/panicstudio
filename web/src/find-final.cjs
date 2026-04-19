const fs = require('fs');

function findFiles(dir, pattern) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = require('path').join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(full, pattern));
    } else if (entry.name.endsWith(pattern)) {
      results.push(full);
    }
  }
  return results;
}

const files = findFiles('.', '.tsx');
let found = false;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Only top-level functions with { body (not arrow functions without body)
    const match = trimmed.match(/^(export\s+)?function\s+(\w+)\s*\(/);
    if (!match) continue;
    if (line.startsWith(' ') || line.startsWith('\t')) continue; // not top-level

    const name = match[2];

    // Find function body
    let j = i;
    let braceDepth = 0;
    let inBody = false;
    let hasUseTranslation = false;
    let hasTCall = false;

    for (; j < lines.length; j++) {
      const l = lines[j];
      if (!inBody) {
        const idx = l.indexOf('{');
        if (idx !== -1) {
          inBody = true;
          braceDepth = 1;
        }
        continue;
      }

      if (l.includes('useTranslation()')) hasUseTranslation = true;
      if (/\bt\(/.test(l) && !l.includes('useTranslation')) hasTCall = true;

      for (let c = 0; c < l.length; c++) {
        if (l[c] === '{') braceDepth++;
        else if (l[c] === '}') braceDepth--;
      }

      if (braceDepth <= 0) break;
    }

    if (hasTCall && !hasUseTranslation) {
      console.log(`BUG: ${file.replace(/\\/g, '/')}:${i+1} "${name}" uses t() but has no useTranslation()`);
      found = true;
    }
  }
}

if (!found) console.log('No bugs found!');
