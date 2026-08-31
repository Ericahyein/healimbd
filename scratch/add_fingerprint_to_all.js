const fs = require('fs');
const path = require('path');

function updateFingerprintInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      updateFingerprintInDir(full);
    } else if (f.endsWith('.html')) {
      let content = fs.readFileSync(full, 'utf-8');
      let modified = false;

      // Pattern 1: {{ $script := resources.Get "js/main.js" | resources.Minify }}
      if (content.includes('resources.Get "js/main.js" | resources.Minify }}') && !content.includes('Fingerprint')) {
        content = content.replace(
          '{{ $script := resources.Get "js/main.js" | resources.Minify }}',
          '{{ $script := resources.Get "js/main.js" | resources.Minify | resources.Fingerprint }}'
        );
        modified = true;
      }

      // Pattern 2: style.css fingerprinting check
      if (content.includes('resources.Get "css/style.css" | resources.Minify }}') && !content.includes('Fingerprint')) {
        content = content.replace(
          '{{ $style := resources.Get "css/style.css" | resources.Minify }}',
          '{{ $style := resources.Get "css/style.css" | resources.Minify | resources.Fingerprint }}'
        );
        modified = true;
      }

      if (modified) {
        fs.writeFileSync(full, content, 'utf-8');
        console.log('Updated cache-busting fingerprint in:', full);
      }
    }
  }
}

updateFingerprintInDir('layouts');
console.log('Done adding cache-busting fingerprint to all layouts!');
