const fs = require('fs');

const content = fs.readFileSync('scratch/script_4.txt', 'utf-8');
console.log('Script 4 starts with:', content.substring(0, 300));

// Try to find JSON inside
const startIdx = content.indexOf('{');
const endIdx = content.lastIndexOf('}');
if (startIdx !== -1 && endIdx !== -1) {
  const jsonStr = content.substring(startIdx, endIdx + 1);
  try {
    const data = JSON.parse(jsonStr);
    console.log('Parsed JSON successfully! Top-level keys:', Object.keys(data));
    
    // Recursively search for review objects or arrays
    function findReviews(obj, path = '') {
      if (!obj || typeof obj !== 'object') return;
      
      if (Array.isArray(obj)) {
        if (obj.length > 0 && (obj[0].body !== undefined || obj[0].review !== undefined || obj[0].nickname !== undefined || obj[0].rating !== undefined)) {
          console.log(`Found array at ${path} with ${obj.length} items:`);
          console.log('Sample item:', JSON.stringify(obj[0], null, 2));
        }
        obj.forEach((item, i) => findReviews(item, `${path}[${i}]`));
      } else {
        Object.keys(obj).forEach(k => {
          if (k.toLowerCase().includes('review') || k.toLowerCase().includes('visitor')) {
            console.log(`Key match: ${path}.${k} (type: ${typeof obj[k]})`);
          }
          findReviews(obj[k], `${path}.${k}`);
        });
      }
    }
    
    findReviews(data);
  } catch (e) {
    console.log('Direct JSON parse failed:', e.message);
  }
}
