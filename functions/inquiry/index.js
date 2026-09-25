import { getGoogleAccessToken } from '../_googleAuth.js';

const PAGE_SIZE = 10;
const CATEGORY_MAP = {
  tic: '틱장애·뚜렛',
  adhd: 'ADHD·집중력',
  panic: '공황장애',
  anxiety: '불안·공포',
  sleep: '수면·불면증',
  autonomic: '자율신경',
  hyperhidrosis: '다한증',
  ibs: '과민성대장',
  headache: '두통·어지럼',
  depression: '우울·강박',
  child: '소아 성장·야뇨',
  fatigue: '만성피로·번아웃',
  etc: '기타 질환'
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date).replace(/\. /g, '.').replace(/\.$/, '');
}

function formatAuthor(fields) {
  const gender = fields.gender?.stringValue === 'female'
    ? '여'
    : fields.gender?.stringValue === 'male' ? '남' : '';
  return [
    fields.region?.stringValue,
    fields.ageText?.stringValue,
    gender
  ].filter(Boolean).join(' · ') || '익명';
}

function parseInquiryDocument(document) {
  const id = String(document.name || '').split('/').pop();
  if (!id || !/^inq_[0-9A-Za-z_-]{1,64}$/.test(id)) return null;
  const fields = document.fields || {};
  const title = fields.title?.stringValue || '';
  if (!title) return null;
  const createdAt = fields.createdAt?.timestampValue || document.createTime || '';
  const category = fields.category?.stringValue || 'etc';
  const answered = fields.status?.stringValue === 'answered' && Boolean(fields.answer?.stringValue);
  return {
    id,
    title,
    category,
    disease: CATEGORY_MAP[category] || CATEGORY_MAP.etc,
    author: formatAuthor(fields),
    date: formatDate(createdAt),
    createdAt,
    answered
  };
}

function renderRows(items, totalItems, offset) {
  return items.map((item, index) => {
    const number = totalItems - (offset + index);
    const statusText = item.answered ? '답변완료' : '답변대기';
    const statusClass = item.answered ? 'answered' : 'pending';
    return `
              <tr data-ssr-inquiry="true">
                <td class="col-num">${number}</td>
                <td class="col-cat"><span class="inq-cat-tag ${escapeHtml(item.category)}">${escapeHtml(item.disease)}</span></td>
                <td class="col-title">
                  <a href="/inquiry/${escapeHtml(item.id)}/" class="table-title-link"><span>${escapeHtml(item.title)}</span></a>
                </td>
                <td class="col-info">${escapeHtml(item.author)}</td>
                <td class="col-date">${escapeHtml(item.date)}</td>
                <td class="col-status">
                  <span class="inq-status-indicator ${statusClass}"><span class="inq-status-dot">●</span><span class="inq-status-text">${statusText}</span></span>
                </td>
              </tr>`;
  }).join('');
}

function renderPagination(currentPage, totalPages) {
  if (totalPages <= 1) return '';
  const links = [];
  if (currentPage > 1) {
    links.push(`<a class="inquiry-pag-btn prev" href="/inquiry/?page=${currentPage - 1}" aria-label="이전 페이지">‹</a>`);
  }
  for (let page = 1; page <= totalPages; page += 1) {
    const current = page === currentPage;
    links.push(`<a class="inquiry-pag-btn${current ? ' active' : ''}" href="/inquiry/?page=${page}"${current ? ' aria-current="page"' : ''}>${page}</a>`);
  }
  if (currentPage < totalPages) {
    links.push(`<a class="inquiry-pag-btn next" href="/inquiry/?page=${currentPage + 1}" aria-label="다음 페이지">›</a>`);
  }
  return links.join('');
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const assetResponse = await env.ASSETS.fetch(new URL('/inquiry/', request.url));
  if (!assetResponse.ok) return assetResponse;

  let html = await assetResponse.text();
  try {
    const accessToken = await getGoogleAccessToken(env);
    const projectId = env.FIREBASE_PROJECT_ID || 'healimbd-b726f';
    const listUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/online_inquiries?pageSize=300`;
    const response = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) throw new Error(`Firestore list failed: ${response.status}`);

    const payload = await response.json();
    const inquiries = (payload.documents || [])
      .map(parseInquiryDocument)
      .filter(Boolean)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    const requestedPage = Number.parseInt(new URL(request.url).searchParams.get('page') || '1', 10);
    const totalPages = Math.max(1, Math.ceil(inquiries.length / PAGE_SIZE));
    const currentPage = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), totalPages);
    const offset = (currentPage - 1) * PAGE_SIZE;
    const pageItems = inquiries.slice(offset, offset + PAGE_SIZE);
    const rows = renderRows(pageItems, inquiries.length, offset);
    const pagination = renderPagination(currentPage, totalPages);

    html = html.replace(
      /<tbody\s+id=["']?inquiry-list-tbody["']?[^>]*>[\s\S]*?<\/tbody>/i,
      `<tbody id="inquiry-list-tbody">${rows}</tbody>`
    );
    html = html.replace(
      /<nav[^>]*id=["']?inquiry-pagination-nav["']?[^>]*>[\s\S]*?<\/nav>/i,
      `<nav class="inquiry-pagination-nav" id="inquiry-pagination-nav" aria-label="상담 페이지 번호"${pagination ? ' style="display:flex"' : ' style="display:none"'}>${pagination}</nav>`
    );

    if (currentPage > 1) {
      const canonical = `https://healimbd.com/inquiry/?page=${currentPage}`;
      html = html
        .replace(/<link\s+rel=["']?canonical["']?\s+href=["']?[^\s>"']+["']?\s*\/?>/i, `<link rel="canonical" href="${canonical}">`)
        .replace(/<meta\s+property=["']?og:url["']?\s+content=["']?[^\s>"']+["']?\s*\/?>/i, `<meta property="og:url" content="${canonical}">`);
    }
  } catch (error) {
    console.warn('[INQUIRY LIST SSR NOTICE]', error.message);
  }

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=300',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
