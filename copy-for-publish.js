const fs = require('fs');
const path = require('path');

// Files needed for Chrome Web Store publication
const requiredFiles = [
  'manifest.json',
  'panel.html',
  'panel.js', 
  'panel.css',
  'background.js',
  'content.js',
  'popup.html',
  'popup.js',
  'lib/crypto.js',
  'lib/content-security.js',
  'icons/icon16.png',
  'icons/icon48.png', 
  'icons/icon128.png'
];

function copyForPublish(targetDir) {
  // Create target directory if it doesn't exist
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Create subdirectories
  const subdirs = ['lib', 'icons'];
  subdirs.forEach(dir => {
    const targetSubdir = path.join(targetDir, dir);
    if (!fs.existsSync(targetSubdir)) {
      fs.mkdirSync(targetSubdir, { recursive: true });
    }
  });

  // Copy each required file
  requiredFiles.forEach(file => {
    const sourcePath = path.join(__dirname, file);
    const targetPath = path.join(targetDir, file);
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, targetPath);
      console.log(`✅ Copied: ${file}`);
    } else {
      console.log(`❌ Missing: ${file}`);
    }
  });

  // Verify crypto.js contains KeyManager
  const cryptoPath = path.join(targetDir, 'lib/crypto.js');
  if (fs.existsSync(cryptoPath)) {
    const cryptoContent = fs.readFileSync(cryptoPath, 'utf8');
    if (cryptoContent.includes('class KeyManager')) {
      console.log('✅ KeyManager class found in crypto.js');
    } else {
      console.log('❌ KeyManager class NOT found in crypto.js');
    }
  }

  console.log(`\n📦 Extension files copied to: ${targetDir}`);
  console.log('🔧 Load this folder in Chrome Extensions (Developer Mode)');
}

// Usage
const targetDir = process.argv[2] || path.join(__dirname, '..', 'summarize-slider-publish');
copyForPublish(targetDir);