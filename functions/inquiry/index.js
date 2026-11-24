import { getGoogleAccessToken } from '../_googleAuth.js';
import { listAllInquiryDocuments, readInquiryPage, inquiryUnavailableResponse } from '../_inquiryStore.js';

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
  const rawCategory = fields.category?.stringValue || 'etc';
  const category = Object.hasOwn(CATEGORY_MAP, rawCategory) ? rawCategory : Object.keys(CATEGORY_MAP).find(key => CATEGORY_MAP[key] === rawCategory) || 'etc';
  const answered = fields.status?.stringValue === 'answered' && Boolean(fields.answer?.stringValue);
  return {
    id,
    title,
    category,
    disease: CATEGORY_MAP[category] || CATEGORY_MAP.etc,
    author: formatAuthor(fields),
    date: formatDate(createdAt),
    createdAt,
    answered,
    searchText: [title, rawCategory, category, CATEGORY_MAP[category], fields.content?.stringValue, fields.region?.stringValue, fields.ageText?.stringValue, fields.nickname?.stringValue].filter(Boolean).join(' ').toLowerCase()
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

function listHref(page, category = 'all', search = '') {
  const params = new URLSearchParams({ page: String(page) });
  if (category !== 'all') params.set('category', category);
  if (search) params.set('q', search);
  return '/inquiry/?' + params;
}

function renderPagination(currentPage, totalPages, category, search) {
  if (totalPages <= 1) return '';
  const link = (page, label, extra = '') => `<a class="inquiry-pag-btn${page === currentPage ? ' active' : ''}" href="${escapeHtml(listHref(page, category, search))}"${page === currentPage ? ' aria-current="page"' : ''}${extra}>${label}</a>`;
  const links = [];
  if (currentPage > 1) links.push(link(currentPage - 1, '‹', ' aria-label="이전 페이지"'));
  // Keep the navigation compact while retaining a crawlable next/previous chain.
  const pages = new Set([1, totalPages]);
  for (let p = Math.max(1, currentPage - 2); p <= Math.min(totalPages, currentPage + 2); p++) pages.add(p);
  let previous = 0;
  for (const page of [...pages].sort((a, b) => a - b)) {
    if (page - previous > 1) links.push('<span aria-hidden="true">…</span>');
    links.push(link(page, page));
    previous = page;
  }
  if (currentPage < totalPages) links.push(link(currentPage + 1, '›', ' aria-label="다음 페이지"'));
  return links.join('');
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const assetResponse = await env.ASSETS.fetch(new URL('/inquiry/', request.url));
  if (!assetResponse.ok) return assetResponse;

  let html = await assetResponse.text();
  let robots = 'index,follow';
  try {
    const accessToken = await getGoogleAccessToken(env);
    const projectId = env.FIREBASE_PROJECT_ID || 'healimbd-b726f';
    const url = new URL(request.url);
    const pageParam = url.searchParams.get('page') || '1';
    const requestedPage = /^[1-9]\d*$/.test(pageParam) && Number.isSafeInteger(Number(pageParam)) ? Number(pageParam) : 1;
    const rawCategory = url.searchParams.get('category') || 'all';
    const category = Object.hasOwn(CATEGORY_MAP, rawCategory) ? rawCategory : 'all';
    const search = (url.searchParams.get('q') || '').trim().slice(0, 100);
    let pageItems, totalItems, totalPages, currentPage, offset;
    if (category === 'all' && !search) {
      const result = await readInquiryPage(projectId, accessToken, requestedPage, PAGE_SIZE);
      ({ total: totalItems, totalPages, page: currentPage, offset } = result);
      pageItems = result.documents.map(parseInquiryDocument).filter(Boolean);
    } else {
      // Firestore has no native substring search. Read all continuation pages
      // for a filtered/search request, including old records and legacy labels.
      const documents = await listAllInquiryDocuments(projectId, accessToken);
      const inquiries = documents.map(parseInquiryDocument).filter(Boolean)
        .filter(item => category === 'all' || item.category === category || item.category === CATEGORY_MAP[category])
        .filter(item => !search || item.searchText.includes(search.toLowerCase()))
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)) || b.id.localeCompare(a.id));
      totalItems = inquiries.length;
      totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
      currentPage = Math.min(requestedPage, totalPages);
      offset = (currentPage - 1) * PAGE_SIZE;
      pageItems = inquiries.slice(offset, offset + PAGE_SIZE);
    }
    const rows = renderRows(pageItems, totalItems, offset);
    const pagination = renderPagination(currentPage, totalPages, category, search);
    const canonical = 'https://healimbd.com' + (currentPage === 1 && category === 'all' && !search ? '/inquiry/' : listHref(currentPage, category, search));
    robots = category === 'all' && !search ? 'index,follow' : 'noindex,follow';
    html = html
      .replace(/<link\s+rel=["']?canonical["']?\s+href=["']?[^\s>"']+["']?\s*\/?>/i, () => `<link rel="canonical" href="${escapeHtml(canonical)}">`)
      .replace(/<meta\s+property=["']?og:url["']?\s+content=["']?[^\s>"']+["']?\s*\/?>/i, () => `<meta property="og:url" content="${escapeHtml(canonical)}">`)
      .replace(/<meta\s+name=["']?robots["']?[^>]*>/gi, '');
    html = html.replace('</head>', `<meta name="robots" content="${robots}"></head>`);
    html = html.replace(/<input\b(?=[^>]*\bid=["']?inquiry-search-input["'\s>])[^>]*>/i,
      () => `<input id="inquiry-search-input" type="search" name="q" maxlength="100" value="${escapeHtml(search)}" placeholder="제목·내용·지역으로 상담글 검색">`);
    html = html.replace(/<input\b(?=[^>]*\bid=["']?inquiry-search-category["'\s>])[^>]*>/i,
      () => `<input id="inquiry-search-category" type="hidden" name="category" value="${escapeHtml(category)}">`);
    // Selection remains correct even before JavaScript runs.
    html = html.replace(/<a\b(?=[^>]*\bdata-category=)[^>]*>/gi, tag => {
      const key = tag.match(/data-category=["']?([^"'\s>]+)/i)?.[1];
      const href = listHref(1, Object.hasOwn(CATEGORY_MAP, key) ? key : 'all', search);
      return tag.replace(/href=(["'])[^"']*\1|href=[^\s>]+/i, () => `href="${escapeHtml(href)}"`).replace(/class=(["'])[^"']*\1|class=[^\s>]+/i, `class="inquiry-tab-btn${key === category ? ' active' : ''}"`);
    });

    html = html.replace(
      /<tbody\s+id=["']?inquiry-list-tbody["']?[^>]*>[\s\S]*?<\/tbody>/i,
      () => `<tbody id="inquiry-list-tbody" data-server-inquiry-list="true">${rows || '<tr><td colspan="6">조건에 맞는 상담글이 없습니다.</td></tr>'}</tbody>`
    );
    html = html.replace(
      /<nav[^>]*id=["']?inquiry-pagination-nav["']?[^>]*>[\s\S]*?<\/nav>/i,
      () => `<nav class="inquiry-pagination-nav" id="inquiry-pagination-nav" aria-label="상담 페이지 번호"${pagination ? ' style="display:flex"' : ' style="display:none"'}>${pagination}</nav>`
    );

  } catch (error) {
    console.warn('[INQUIRY LIST SSR NOTICE]', error.message);
    return inquiryUnavailableResponse();
  }

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=300',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': robots.replace(',', ', ')
    }
  });
}

export async function onRequestHead(context) {
  const response = await onRequestGet(context);
  return new Response(null, { status: response.status, headers: response.headers });
}
