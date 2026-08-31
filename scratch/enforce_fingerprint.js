const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      processDir(full);
    } else if (f.endsWith('.html')) {
      let text = fs.readFileSync(full, 'utf-8');
      const original = text;
      
      // Replace all instances of js/main.js minify without fingerprint
      text = text.replace(/\{\{\s*\$script\s*:=\s*resources\.Get\s*"js\/main\.js"\s*\|\s*resources\.Minify\s*\}\}/g, '{{ $script := resources.Get "js/main.js" | resources.Minify | resources.Fingerprint }}');
      text = text.replace(/\{\{\s*\$js\s*:=\s*resources\.Get\s*"js\/main\.js"\s*\|\s*resources\.Minify\s*\}\}/g, '{{ $js := resources.Get "js/main.js" | resources.Minify | resources.Fingerprint }}');
      
      if (text !== original) {
        fs.writeFileSync(full, text, 'utf-8');
        console.log('Fingerprinted:', full);
      }
    }
  }
}

processDir('layouts');
console.log('Done!');
