const assert = require('assert');
const fs = require('fs');

const home = fs.readFileSync('content/_index.md', 'utf8');
const head = fs.readFileSync('layouts/partials/head_seo.html', 'utf8');
const map = fs.readFileSync('layouts/partials/naver_map.html', 'utf8');
const adminModal = fs.readFileSync('layouts/partials/admin_case_modal.html', 'utf8');

assert(home.includes('심층 치료'), 'Home description must use the approved 심층 치료 wording');
assert(!home.includes('근본 치료'), 'Stale 근본 치료 wording must not remain');

assert(
  head.includes('분당 틱장애·ADHD·공황장애 | 해아림한의원 분당점'),
  'Home title must remain concise and locally relevant'
);
assert(
  head.includes('static/images/healim_open_hand_hero.png') &&
  head.includes('<meta property="og:image"'),
  'A verified default Open Graph image must be emitted'
);
assert(
  head.includes('<meta property="twitter:image"'),
  'Twitter image metadata must follow the Open Graph fallback'
);

assert(
  map.includes('IntersectionObserver') && map.includes("rootMargin: '600px 0px'"),
  'Map SDK must be deferred until the map nears the viewport'
);
assert(
  map.includes('function showMapFallback()'),
  'Map must retain a deterministic fallback path'
);
assert(
  map.includes('iframe[data-src]') &&
  map.includes('data-src="https://www.openstreetmap.org/export/embed.html'),
  'OSM fallback must remain dormant until NAVER Maps fails'
);
assert(
  !/<iframe[\s\S]*?\ssrc="https:\/\/www\.openstreetmap\.org\//.test(map),
  'OSM iframe must not have an eager src attribute'
);
assert(
  !map.includes('<script \n      src="https://oapi.map.naver.com'),
  'NAVER Maps SDK must not be loaded eagerly by static markup'
);

assert(
  !/<h[1-6][^>]*id=["']preflight-card-title["']/.test(adminModal),
  'Hidden admin preview title must not introduce a heading before the public home H1'
);
assert(
  /<p[^>]*id=["']preflight-card-title["']/.test(adminModal),
  'Admin preview title must preserve its styling hook as non-heading text'
);

console.log('✅ Home SEO metadata and lazy map safeguards passed');
