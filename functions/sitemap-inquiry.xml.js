import { getGoogleAccessToken } from './_googleAuth.js';
import { listAllInquiryDocuments } from './_inquiryStore.js';

function formatLastMod(isoStr) {
  if (!isoStr) return new Date().toISOString().split('T')[0];
  try {
    const d = new Date(isoStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) {}
  return String(isoStr).split('T')[0];
}

function escapeXml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function onRequestGet(context) {
  const { env } = context;
  const projectId = (env && env.FIREBASE_PROJECT_ID) || 'healimbd-b726f';
  const urlMap = new Map();

  // 1. Fetch live public answered inquiries from Firestore REST API
  try {
    const accessToken = await getGoogleAccessToken(env);
    const documents = await listAllInquiryDocuments(projectId, accessToken);

    documents.forEach(doc => {
      if (!doc.name) return;
      const id = doc.name.split('/').pop();
      if (!id || !/^inq_[0-9A-Za-z_-]{1,64}$/.test(id)) return;

      const fields = doc.fields || {};
      // Safety: only fully answered public documents belong in the indexable sitemap.
      if (!fields.title || !fields.title.stringValue) return;
      if (fields.status?.stringValue !== 'answered') return;
      if (!fields.answer?.stringValue || !fields.answer.stringValue.trim()) return;

      const dateIso = [fields.updatedAt?.timestampValue, fields.answeredAt?.timestampValue, fields.createdAt?.timestampValue, doc.updateTime, doc.createTime].filter(Boolean).sort().pop();

      urlMap.set(id, {
        loc: `https://healimbd.com/inquiry/${id}/`,
        lastmod: formatLastMod(dateIso),
        changefreq: 'monthly',
        priority: '0.7'
      });
    });

  } catch (err) {
    console.warn('[SITEMAP INQUIRY EXCEPTION]', err.message);
    return new Response('Sitemap temporarily unavailable', { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' } });
  }

  // 3. Assemble XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  urlMap.forEach(item => {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(item.loc)}</loc>\n`;
    xml += `    <lastmod>${escapeXml(item.lastmod)}</lastmod>\n`;
    xml += `    <changefreq>${escapeXml(item.changefreq)}</changefreq>\n`;
    xml += `    <priority>${escapeXml(item.priority)}</priority>\n`;
    xml += '  </url>\n';
  });

  xml += '</urlset>\n';

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
