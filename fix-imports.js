import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, 'dist');

function addJsExtension(dir) {
  if (!fs.existsSync(dir)) return;
  
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      addJsExtension(filePath);
    } else if (file.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      const regex = /from\s+['"](\.[^'"]+)(?<!\.js)(?<!\.json)['"]/g;
      
      let modified = false;
      content = content.replace(regex, (match, importPath) => {
        // Resolve the import path relative to the current file
        const currentDir = path.dirname(filePath);
        const absoluteImportPath = path.resolve(currentDir, importPath);
        
        // Check if it exists as a .js file
        if (fs.existsSync(absoluteImportPath + '.js')) {
          modified = true;
          return `from '${importPath}.js'`;
        }
        
        // Check if it exists as a directory with index.js
        if (fs.existsSync(path.join(absoluteImportPath, 'index.js'))) {
          modified = true;
          return `from '${importPath}/index.js'`;
        }
        
        // If neither, leave it alone (or maybe it's an alias? unlikely in this setup)
        return match;
      });

      // Handle dynamic imports
       const dynamicImportRegex = /import\s*\(\s*['"](\.[^'"]+)(?<!\.js)(?<!\.json)['"]\s*\)/g;
       content = content.replace(dynamicImportRegex, (match, importPath) => {
          const currentDir = path.dirname(filePath);
          const absoluteImportPath = path.resolve(currentDir, importPath);
          
          if (fs.existsSync(absoluteImportPath + '.js')) {
            modified = true;
            return `import('${importPath}.js')`;
          }
          if (fs.existsSync(path.join(absoluteImportPath, 'index.js'))) {
            modified = true;
            return `import('${importPath}/index.js')`;
          }
          return match;
       });

      if (modified) {
        console.log(`Fixed imports in ${filePath}`);
        fs.writeFileSync(filePath, content);
      }
    }
  });
}

if (fs.existsSync(distDir)) {
  console.log('Fixing imports in dist directory...');
  addJsExtension(distDir);
  console.log('Done.');
} else {
  console.error('dist directory not found!');
  process.exit(1);
}
