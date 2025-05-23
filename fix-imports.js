const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Map of incorrect imports to correct ones
const importMap = {
  '@/context/AuthContext': '@/context/AuthProvider',
  '@/context/NetworkMetricsContext': '@/context/NetworkMetricsProvider',
  '@/components/ErrorBoundary': '@/utils/errorBoundary',
  '@/components/common/ErrorBoundary': '@/utils/errorBoundary',
  'react-toastify': 'react-toastify',
};

// Find all JS/JSX files
const files = glob.sync('**/*.{js,jsx}', {
  ignore: ['node_modules/**', '.next/**', 'fix-imports.js']
});

let fixedFiles = 0;

files.forEach(file => {
  const filePath = path.resolve(file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Check for each incorrect import
  Object.entries(importMap).forEach(([incorrect, correct]) => {
    const importRegex = new RegExp(`import\\s+(.+)\\s+from\\s+['"]${incorrect}['"]`, 'g');
    if (importRegex.test(content)) {
      content = content.replace(importRegex, `import $1 from '${correct}'`);
      modified = true;
      console.log(`Fixed import in ${file}: ${incorrect} -> ${correct}`);
    }

    // Also check for named imports
    const namedImportRegex = new RegExp(`import\\s+{\\s*(.+)\\s*}\\s+from\\s+['"]${incorrect}['"]`, 'g');
    if (namedImportRegex.test(content)) {
      content = content.replace(namedImportRegex, `import { $1 } from '${correct}'`);
      modified = true;
      console.log(`Fixed named import in ${file}: ${incorrect} -> ${correct}`);
    }
  });

  // Save the file if it was modified
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    fixedFiles++;
  }
});

console.log(`Fixed imports in ${fixedFiles} files.`);