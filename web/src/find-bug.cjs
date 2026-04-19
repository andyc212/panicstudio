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
  const scopes = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect function start: function Name( or const Name = ( or const Name = function(
    const funcMatch = trimmed.match(/^(?:export\s+)?(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>|function\s*\())/);
    if (funcMatch && !trimmed.startsWith('//')) {
      scopes.push({ startLine: i + 1, hasUseTranslation: false, hasTCall: false, name: funcMatch[1] || funcMatch[2] });
    }

    // Detect useTranslation in current scope
    if (scopes.length > 0 && line.includes('useTranslation()')) {
      scopes[scopes.length - 1].hasUseTranslation = true;
    }

    // Detect t( call in current scope
    if (scopes.length > 0 && /\bt\(/.test(line) && !line.includes('useTranslation')) {
      scopes[scopes.length - 1].hasTCall = true;
    }

    // Detect function end (rough heuristic)
    if (trimmed === '}' && scopes.length > 0) {
      const scope = scopes.pop();
      if (scope.hasTCall && !scope.hasUseTranslation) {
        bugs.push(`${file.replace(/\\/g, '/')}: function '${scope.name}' (line ${scope.startLine}) uses t() but has no useTranslation()`);
      }
    }
  }

  for (const scope of scopes) {
    if (scope.hasTCall && !scope.hasUseTranslation) {
      bugs.push(`${file.replace(/\\/g, '/')}: function '${scope.name}' (line ${scope.startLine}) uses t() but has no useTranslation()`);
    }
  }
}

if (bugs.length === 0) {
  console.log('No bugs found with simple heuristic.');
} else {
  for (const bug of bugs) console.log(bug);
}
