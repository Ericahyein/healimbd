const fs = require('fs');

const content = fs.readFileSync('scratch/script_4.txt', 'utf-8');

// Find all `window.__...` or `naver.place... = {...}`
const lines = content.split('\n');
console.log('Total lines:', lines.length);

const assignments = [];
const regex = /(naver\.place\.[a-zA-Z0-9_\.]+|window\.[a-zA-Z0-9_\.]+)\s*=\s*(\{[\s\S]*?\}|\[[\s\S]*?\]);/g;
let match;

while ((match = regex.exec(content)) !== null) {
  assignments.push({ name: match[1], length: match[2].length, preview: match[2].substring(0, 100) });
}

console.log('Found assignments:', assignments.map(a => `${a.name} (${a.length} bytes)`));

// Also check if there's any review text directly in HTML or script
const bodyRegex = /"body"\s*:\s*"([^"]+)"/g;
let bMatch;
const bodies = [];
while ((bMatch = bodyRegex.exec(content)) !== null) {
  bodies.push(bMatch[1]);
}
console.log(`Found ${bodies.length} review bodies!`);
bodies.slice(0, 10).forEach((b, i) => console.log(`[${i+1}] ${b.replace(/\\n/g, ' ')}`));
