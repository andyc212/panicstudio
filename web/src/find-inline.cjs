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

  // Find component functions (exported or top-level functions)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect top-level component function
    const isComponent = trimmed.match(/^(?:export\s+)?(?:function\s+\w+|const\s+\w+\s*=)/);
    if (isComponent && !trimmed.startsWith('//')) {
      // Find the function body
      let braceDepth = 0;
      let inFunc = false;
      let funcStart = i;

      // Find opening brace
      for (let j = i; j < lines.length && !inFunc; j++) {
        if (lines[j].includes('{')) {
          inFunc = true;
          braceDepth = 1;
          funcStart = j;
        }
      }

      if (!inFunc) continue;

      // Scan function body for inner functions that use t
      let j = funcStart + 1;
      while (j < lines.length && braceDepth > 0) {
        const l = lines[j];
        const open = (l.match(/\{/g) || []).length;
        const close = (l.match(/\}/g) || []).length;

        // Detect inner function definition
        const innerFunc = l.trim().match(/^(?:const\s+(\w+)\s*=\s*\(|function\s+(\w+)\()/);
        if (innerFunc && braceDepth > 1) {
          const innerName = innerFunc[1] || innerFunc[2];
          // Check if inner function returns JSX
          let k = j + 1;
          let innerBrace = 1;
          let usesT = false;
          let returnsJSX = false;
          while (k < lines.length && innerBrace > 0) {
            const innerLine = lines[k];
            const innerOpen = (innerLine.match(/\{/g) || []).length;
            const innerClose = (innerLine.match(/\}/g) || []).length;
            if (/\bt\(/.test(innerLine)) usesT = true;
            if (innerLine.match(/return\s*\(?\s*<[A-Za-z]/)) returnsJSX = true;
            innerBrace += innerOpen - innerClose;
            k++;
          }
          if (usesT && returnsJSX) {
            console.log(`${file.replace(/\\/g, '/')}:${j+1} INNER COMPONENT "${innerName}" uses t() inside ${line.trim().substring(0, 40)}...`);
          }
        }

        braceDepth += open - close;
        j++;
      }
    }
  }
}
