const assert = require('assert');
const fs = require('fs');

const home = fs.readFileSync('layouts/home.html', 'utf8');
const header = fs.readFileSync('layouts/partials/header.html', 'utf8');

const expectedImages = [
  ['images/doctor-son.png', 682, 1024],
  ['images/clinic/healim-entrance.jpg', 1920, 1082],
  ['images/clinic/clinic-interior-01.jpg', 1200, 676],
  ['images/clinic/clinic-interior-02.jpg', 1200, 676],
  ['images/clinic/clinic-interior-03.jpg', 1200, 1600],
  ['images/clinic/clinic-interior-04.jpg', 1200, 676],
  ['images/philosophy/philosophy-consult.jpg', 1024, 768],
  ['images/philosophy/philosophy-pulse.jpg', 1024, 768],
  ['images/philosophy/philosophy-acupuncture.jpg', 1024, 768]
];

for (const [path, width, height] of expectedImages) {
  const escaped = path.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&');
  const matches = home.match(new RegExp('<img[^>]+src="\\{\\{ "' + escaped + '" \\| relURL \\}\\}"[^>]*>', 'g')) || [];
  assert(matches.length > 0, path + ' must be rendered');
  for (const tag of matches) {
    assert(tag.includes('width="' + width + '"'), path + ' must declare its intrinsic width');
    assert(tag.includes('height="' + height + '"'), path + ' must declare its intrinsic height');
    assert(tag.includes('loading="lazy"'), path + ' must remain lazy-loaded');
    assert(tag.includes('decoding="async"'), path + ' must decode asynchronously');
  }
}

assert(header.includes('images/user-profile-icon.webp'), 'Profile icon must prefer the existing WebP asset');
assert(header.includes('loading="eager" decoding="async"'), 'Above-the-fold brand images must have explicit loading intent');
assert(header.includes('loading="lazy" decoding="async"'), 'Hidden drawer/modal brand images must remain deferred');

console.log('✅ Home image dimensions, loading intent, and WebP safeguards passed');
