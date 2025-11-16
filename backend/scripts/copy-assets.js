const fs = require('fs');
const path = require('path');

/**
 * Copy assets (JSON files, etc.) from libs to dist after build
 */
function copyAssets() {
  const rootDir = __dirname.replace(/[\\/]scripts$/, '');
  
  // Copy seed_user.json
  const seedJsonSrc = path.join(rootDir, 'libs', 'database', 'src', 'seed', 'json', 'seed_user.json');
  const seedJsonDest = path.join(rootDir, 'dist', 'libs', 'database', 'src', 'seed', 'json', 'seed_user.json');
  
  if (fs.existsSync(seedJsonSrc)) {
    const destDir = path.dirname(seedJsonDest);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }
    fs.copyFileSync(seedJsonSrc, seedJsonDest);
    console.log('✓ Copied seed_user.json to dist');
  } else {
    console.warn('⚠ seed_user.json not found at:', seedJsonSrc);
  }
  
  // Add more asset copying here as needed
}

copyAssets();

