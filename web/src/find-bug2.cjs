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
const bugs = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const funcs = [];
  let braceDepth = 0;
  let currentFunc = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect function/component start
    let name = null;
    let m = trimmed.match(/^export\s+function\s+(\w+)/);
    if (m) name = m[1];
    if (!name) {
      m = trimmed.match(/^function\s+(\w+)/);
      if (m) name = m[1];
    }
    if (!name) {
      m = trimmed.match(/^const\s+(\w+)\s*=\s*\(/);
      if (m) name = m[1];
    }
    if (!name) {
      m = trimmed.match(/^const\s+(\w+)\s*=\s*function/);
      if (m) name = m[1];
    }

    if (name && !trimmed.startsWith('//')) {
      if (currentFunc) {
        funcs.push(currentFunc);
      }
      currentFunc = {
        name,
        startLine: i + 1,
        hasUseTranslation: false,
        hasTCall: false,
        isComponent: false,
        braceDepthAtStart: braceDepth
      };
    }

    if (currentFunc) {
      if (line.includes('useTranslation()')) {
        currentFunc.hasUseTranslation = true;
      }
      if (/\bt\(/.test(line) && !line.includes('useTranslation')) {
        currentFunc.hasTCall = true;
      }
      if (/return\s*\(?\s*<[A-Za-z]/.test(line)) {
        currentFunc.isComponent = true;
      }
    }

    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    braceDepth += openBraces - closeBraces;

    if (currentFunc && braceDepth <= currentFunc.braceDepthAtStart && closeBraces > openBraces) {
      funcs.push(currentFunc);
      currentFunc = null;
    }
  }

  if (currentFunc) funcs.push(currentFunc);

  for (const f of funcs) {
    if (f.hasTCall && !f.hasUseTranslation && f.isComponent) {
      bugs.push(`${file.replace(/\\/g, '/')}: COMPONENT '${f.name}' (line ${f.startLine}) uses t() but has no useTranslation()`);
    }
  }
}

if (bugs.length === 0) {
  console.log('No component bugs found.');
} else {
  for (const bug of bugs) console.log(bug);
}
