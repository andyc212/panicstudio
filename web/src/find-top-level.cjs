const fs = require('fs');
const path = require('path');

function findFiles(dir, pattern) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(full, pattern));
    } else if (entry.name.endsWith(pattern)) {
      results.push(full);
    }
  }
  return results;
}

const files = findFiles('.', '.tsx');

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Only top-level functions (not indented or only export keyword)
    const isTopLevel = trimmed.match(/^(export\s+)?(?:function\s+(\w+)|const\s+(\w+)\s*=\s*\()/);
    if (!isTopLevel) continue;
    if (trimmed.startsWith('//')) continue;

    const name = isTopLevel[2] || isTopLevel[3];

    // Find function body
    let j = i;
    let braceDepth = 0;
    let inBody = false;
    let hasUseTranslation = false;
    let hasTCall = false;

    for (; j < lines.length; j++) {
      const l = lines[j];
      if (!inBody) {
        if (l.includes('{')) {
          inBody = true;
          braceDepth = 1;
        }
        continue;
      }

      if (l.includes('useTranslation()')) hasUseTranslation = true;
      if (/\bt\(/.test(l) && !l.includes('useTranslation')) hasTCall = true;

      const open = (l.match(/\{/g) || []).length;
      const close = (l.match(/\}/g) || []).length;
      braceDepth += open - close;

      if (braceDepth <= 0) break;
    }

    if (hasTCall && !hasUseTranslation) {
      console.log(`${file.replace(/\\/g, '/')}:${i+1} TOP-LEVEL COMPONENT "${name}" uses t() but has no useTranslation()`);
    }
  }
}
