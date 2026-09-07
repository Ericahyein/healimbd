import { getGoogleAccessToken } from '../_googleAuth.js';

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

const REPRESENTATIVE_DISEASE_MAP = {
  tic: '틱장애',
  adhd: 'ADHD',
  panic: '공황장애',
  anxiety: '불안장애',
  sleep: '불면증',
  autonomic: '자율신경실조증',
  hyperhidrosis: '다한증',
  ibs: '과민성대장증후군',
  headache: '두통·어지럼증',
  depression: '우울증',
  child: '소아신경정신',
  fatigue: '만성피로',
  '틱장애·뚜렛': '틱장애',
  '틱장애': '틱장애',
  '뚜렛': '틱장애',
  'ADHD·집중력': 'ADHD',
  'ADHD': 'ADHD',
  '공황장애': '공황장애',
  '불안·공포': '불안장애',
  '불안장애': '불안장애',
  '수면·불면증': '불면증',
  '불면증': '불면증',
  '자율신경': '자율신경실조증',
  '자율신경실조증': '자율신경실조증',
  '과민성대장': '과민성대장증후군',
  '두통·어지럼': '두통·어지럼증',
  '우울·강박': '우울증',
  '소아 성장·야뇨': '소아신경정신',
  '만성피로·번아웃': '만성피로'
};

export function getRepresentativeDisease(category, disease) {
  if (disease && REPRESENTATIVE_DISEASE_MAP[disease.trim()]) {
    return REPRESENTATIVE_DISEASE_MAP[disease.trim()];
  }
  if (category && REPRESENTATIVE_DISEASE_MAP[category.trim().toLowerCase()]) {
    return REPRESENTATIVE_DISEASE_MAP[category.trim().toLowerCase()];
  }
  if (category && REPRESENTATIVE_DISEASE_MAP[category.trim()]) {
    return REPRESENTATIVE_DISEASE_MAP[category.trim()];
  }
  const target = `${category || ''} ${disease || ''}`;
  if (/틱|뚜렛/i.test(target)) return '틱장애';
  if (/adhd/i.test(target)) return 'ADHD';
  if (/공황/i.test(target)) return '공황장애';
  if (/불안|공포/i.test(target)) return '불안장애';
  if (/수면|불면/i.test(target)) return '불면증';
  if (/자율신경/i.test(target)) return '자율신경실조증';
  if (/다한증|땀/i.test(target)) return '다한증';
  if (/과민성/i.test(target)) return '과민성대장증후군';
  if (/두통|어지럼/i.test(target)) return '두통·어지럼증';
  if (/우울|강박/i.test(target)) return '우울증';
  if (/소아|야뇨/i.test(target)) return '소아신경정신';
  if (/피로|번아웃/i.test(target)) return '만성피로';
  return '';
}

export function buildSeoTitle(inquiry) {
  const rawTitle = (inquiry && inquiry.title) ? String(inquiry.title).trim() : '';
  if (!rawTitle) {
    return '온라인 상담 | 해아림한의원 분당점';
  }

  const region = (inquiry && inquiry.region) ? String(inquiry.region).trim() : '';
  const disease = getRepresentativeDisease(inquiry?.category, inquiry?.disease);

  // If both region and disease are missing, safe fallback to rawTitle
  if (!region && !disease) {
    return `${rawTitle} | 해아림한의원 분당점`;
  }

  // Prefix format: [지역 질환명 상담]
  let prefixCore = '';
  if (region && disease) {
    prefixCore = `${region} ${disease} 상담`;
  } else if (disease) {
    prefixCore = `${disease} 상담`;
  } else if (region) {
    prefixCore = `${region} 상담`;
  }

  const standardPrefix = `[${prefixCore}]`;

  // Prevent duplicate prefix or bracketed tags
  let cleanBody = rawTitle;
  if (cleanBody.startsWith(standardPrefix)) {
    cleanBody = cleanBody.slice(standardPrefix.length).trim();
  } else {
    cleanBody = cleanBody.replace(/^\[[^\]]+\]\s*/, '').trim();
  }

  if (prefixCore && cleanBody.startsWith(prefixCore)) {
    cleanBody = cleanBody.slice(prefixCore.length).trim();
  }

  if (!cleanBody) {
    cleanBody = rawTitle;
  }

  return `${standardPrefix} ${cleanBody} | 해아림한의원 분당점`;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function makeDescription(content, maxLen = 130) {
  if (!content) return '해아림한의원 분당점 1:1 온라인 상담 문의글입니다.';
  const clean = content.replace(/\s+/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen).trim() + '...';
}

function formatAuthorInfo(data) {
  if (data.nickname) return data.nickname;
  const parts = [];
  if (data.region) parts.push(data.region);
  if (data.ageText) parts.push(data.ageText);
  if (data.gender) {
    parts.push(data.gender === 'female' ? '여' : (data.gender === 'male' ? '남' : ''));
  }
  return parts.filter(Boolean).join(' · ') || '익명';
}

function formatDate(isoOrStr) {
  if (!isoOrStr) return '';
  try {
    const d = new Date(isoOrStr);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}.${m}.${day}`;
    }
  } catch (e) {}
  return String(isoOrStr).replace(/T.*$/, '').replace(/-/g, '.');
}

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const rawId = params && params.id ? String(params.id).trim() : '';

  // 1. Strict ID Format Validation
  if (!rawId || !/^inq_[0-9A-Za-z_-]{1,64}$/.test(rawId)) {
    return renderNotFoundResponse('유효하지 않은 상담글 식별자입니다.');
  }

  const inquiryId = rawId;
  let inquiry = null;

  // 2. Fetch live data purely from Firestore REST API (Sample baseline purged)
  const projectId = (env && env.FIREBASE_PROJECT_ID) || 'healimbd-b726f';
  try {
    const accessToken = await getGoogleAccessToken(env);
    const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/online_inquiries/${inquiryId}`;

    const resp = await fetch(docUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (resp.status === 404) {
      return renderNotFoundResponse('존재하지 않거나 삭제된 상담글입니다.');
    }

    if (!resp.ok) {
      const errText = await resp.text();
      console.error('[INQUIRY SSR FIRESTORE FETCH ERROR]', resp.status, errText);
      return renderNotFoundResponse('상담글을 불러오는 중 오류가 발생했습니다.');
    }

    const docData = await resp.json();
    const fields = docData.fields || {};

    let dateStr = '';
    if (fields.createdAt && fields.createdAt.timestampValue) {
      dateStr = formatDate(fields.createdAt.timestampValue);
    }

    let answerDateStr = '';
    if (fields.answeredAt && fields.answeredAt.timestampValue) {
      answerDateStr = formatDate(fields.answeredAt.timestampValue);
    } else if (dateStr) {
      answerDateStr = dateStr;
    }

    inquiry = {
      id: inquiryId,
      region: fields.region?.stringValue || '',
      ageText: fields.ageText?.stringValue || '',
      gender: fields.gender?.stringValue || '',
      nickname: fields.nickname?.stringValue || '',
      category: fields.category?.stringValue || 'etc',
      title: fields.title?.stringValue || '',
      content: fields.content?.stringValue || '',
      status: fields.status?.stringValue || 'pending',
      answer: fields.answer?.stringValue || '',
      date: dateStr,
      answerDate: answerDateStr
    };
  } catch (err) {
    console.error('[INQUIRY SSR EXCEPTION]', err);
    return renderNotFoundResponse('상담글 정보를 확인할 수 없습니다.');
  }

  if (!inquiry || !inquiry.title) {
    return renderNotFoundResponse('존재하지 않거나 삭제된 상담글입니다.');
  }

  // 3. Resolve Dynamic Assets Fingerprint from Cloudflare Pages static assets
  let cssHref = '/css/style.css';
  if (env && env.ASSETS) {
    try {
      const listResp = await env.ASSETS.fetch(new URL('/inquiry/', request.url));
      if (listResp.ok) {
        const listHtml = await listResp.text();
        const cssMatch = listHtml.match(/href="?(\/css\/style\.min\.[a-f0-9]+\.css)"?/i);
        if (cssMatch && cssMatch[1]) {
          cssHref = cssMatch[1];
        }
      }
    } catch (e) {}
  }

  // 4. Build Sanitized Variables for HTML Injection
  const cleanTitle = escapeHtml(inquiry.title);
  const seoTitle = buildSeoTitle(inquiry);
  const cleanContent = escapeHtml(inquiry.content);
  const cleanCategory = escapeHtml(inquiry.category || 'etc');
  const cleanDisease = escapeHtml(inquiry.disease || CATEGORY_MAP[inquiry.category] || '기타 질환');
  const isAnswered = inquiry.status === 'answered' && Boolean(inquiry.answer);
  const cleanStatusText = isAnswered ? '답변완료' : '답변대기';
  const cleanStatusClass = isAnswered ? 'answered' : 'pending';
  const cleanAuthor = escapeHtml(formatAuthorInfo(inquiry));
  const cleanDate = escapeHtml(inquiry.date || '');
  const cleanAnswer = escapeHtml(inquiry.answer || '');
  const cleanAnswerDate = escapeHtml(inquiry.answerDate || cleanDate);
  const cleanSnippet = escapeHtml(makeDescription(inquiry.content));
  const canonicalUrl = `https://healimbd.com/inquiry/${inquiryId}/`;
  const robotsMeta = (inquiry.status === 'answered') ? 'index,follow' : 'noindex,follow';

  // 5. Complete Server-Side Rendered (SSR) HTML
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(seoTitle)}</title>
  <meta name="robots" content="${robotsMeta}">
  <meta name="description" content="${cleanSnippet}">
  <link rel="canonical" href="${canonicalUrl}">

  <!-- Open Graph -->
  <meta property="og:title" content="${escapeHtml(seoTitle)}">
  <meta property="og:description" content="${cleanSnippet}">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="해아림한의원 분당점">
  <meta property="og:locale" content="ko_KR">

  <!-- Fonts (Pretendard & Outfit) -->
  <link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://unpkg.com/@phosphor-icons/web@2.1.1"></script>

  <!-- Main Stylesheet -->
  <link rel="stylesheet" href="${cssHref}">
</head>
<body class="inquiry-page-body">
  <!-- Site Header -->
  <header class="site-header" id="site-header">
    <div class="header-main">
      <div class="container header-main-inner">
        <a href="/" class="brand-logo" aria-label="해아림한의원 분당점 홈으로">
          <img src="/images/logo.png" alt="해아림 로고" class="brand-logo-img" width="44" height="44">
          <div class="brand-text-group">
            <span class="brand-slogan-top">마음까지 헤아리는</span>
            <div class="brand-main-row">
              <span class="brand-name-main">해아림한의원</span>
              <span class="brand-branch-badge">분당점</span>
            </div>
          </div>
        </a>

        <nav class="desktop-nav" aria-label="주요 메뉴">
          <ul class="nav-list">
            <li><a href="/philosophy/" class="nav-link">진료철학</a></li>
            <li><a href="/treatments/" class="nav-link">진료과목</a></li>
            <li><a href="/reviews/" class="nav-link">치료후기</a></li>
            <li><a href="/blog/" class="nav-link">원장 칼럼</a></li>
            <li><a href="/inquiry/" class="nav-link active">온라인문의</a></li>
            <li><a href="/reservation/" class="nav-link">상담예약</a></li>
          </ul>
        </nav>

        <div class="header-cta-group">
          <div class="header-auth-container" id="header-auth-container">
            <button class="btn btn-header-login" id="btn-header-login" onclick="openAuthModal('login')" aria-label="로그인">
              <i class="ph-bold ph-lock-key"></i>
              <span>로그인</span>
            </button>
            <div class="header-user-badge" id="header-user-badge" style="display: none;">
              <span class="user-greeting"><i class="ph-bold ph-user-circle-check"></i> <strong id="logged-user-name">회원</strong>님</span>
              <button class="btn-logout-link" onclick="logoutUser()" title="로그아웃">로그아웃</button>
            </div>
          </div>
          <button class="btn btn-inquiry-header" id="btn-open-inquiry" onclick="location.href='/inquiry/'" aria-label="상담 문의하기">
            <i class="ph-bold ph-chat-teardrop-dots"></i>
            <span>문의하기</span>
          </button>
          <button class="mobile-menu-toggle" id="mobile-menu-toggle" aria-label="메뉴 열기" aria-expanded="false">
            <span class="bar"></span>
            <span class="bar"></span>
            <span class="bar"></span>
          </button>
        </div>
      </div>
    </div>
  </header>

  <!-- Mobile Drawer Menu -->
  <div class="mobile-drawer" id="mobile-drawer">
    <div class="drawer-header">
      <div class="drawer-logo-wrap">
        <img src="/images/logo.png" alt="해아림 로고" class="drawer-logo-img" width="38" height="38">
        <div class="brand-text-group">
          <span class="brand-slogan-top">마음까지 헤아리는</span>
          <div class="brand-main-row">
            <span class="brand-name-main">해아림한의원</span>
            <span class="brand-branch-badge">분당점</span>
          </div>
        </div>
      </div>
      <button class="drawer-close" id="drawer-close" aria-label="메뉴 닫기"><i class="ph ph-x"></i></button>
    </div>
    <ul class="mobile-nav-list">
      <li><a href="/philosophy/" class="mobile-nav-link"><i class="ph ph-heart"></i> 진료철학</a></li>
      <li><a href="/treatments/" class="mobile-nav-link"><i class="ph ph-first-aid"></i> 진료과목</a></li>
      <li><a href="/reviews/" class="mobile-nav-link"><i class="ph ph-star"></i> 치료후기</a></li>
      <li><a href="/blog/" class="mobile-nav-link"><i class="ph ph-article"></i> 원장 칼럼</a></li>
      <li><a href="/inquiry/" class="mobile-nav-link"><i class="ph ph-chat-centered-text"></i> 온라인문의</a></li>
      <li><a href="/reservation/" class="mobile-nav-link"><i class="ph ph-calendar-check"></i> 상담예약</a></li>
    </ul>
  </div>
  <div class="mobile-drawer-overlay" id="drawer-overlay"></div>

  <main id="main-content">
    <!-- Breadcrumb -->
    <div class="container" style="padding-top: 24px; padding-bottom: 8px;">
      <nav aria-label="Breadcrumb" style="font-size: 0.85rem; color: #64748B;">
        <a href="/" style="color: #64748B; text-decoration: none;">홈</a> &gt;
        <a href="/inquiry/" style="color: #64748B; text-decoration: none;">온라인 상담</a> &gt;
        <span style="color: #0369A1; font-weight: 600;">${cleanDisease}</span>
      </nav>
    </div>

    <!-- Inquiry Detail Section -->
    <section class="section" style="padding-top: 14px; padding-bottom: 60px;">
      <div class="container" style="max-width: 860px;">
        <div class="inquiry-detail-card" style="box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05); border: 1px solid #E2E8F0; border-radius: 16px; background: #FFFFFF; padding: 28px 32px;">
          <!-- Header -->
          <div class="inquiry-detail-header" style="border-bottom: 1px solid #F1F5F9; padding-bottom: 20px; margin-bottom: 24px;">
            <div class="detail-top-row" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div class="detail-badge-row" style="display: flex; gap: 8px; align-items: center;">
                <span class="cat-badge ${cleanCategory}" style="font-size: 0.82rem; font-weight: 700; padding: 4px 10px; border-radius: 6px;">${cleanDisease}</span>
                <span class="detail-status-tag ${cleanStatusClass}" style="font-size: 0.82rem; font-weight: 700; padding: 4px 10px; border-radius: 6px;">${cleanStatusText}</span>
              </div>
              <a href="/inquiry/" class="btn btn-outline-cases" style="padding: 6px 14px; font-size: 0.85rem; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
                <i class="ph-bold ph-list"></i> <span>목록 보기</span>
              </a>
            </div>
            <h1 class="detail-main-title" style="font-size: 1.5rem; font-weight: 800; color: #0F172A; line-height: 1.4; margin: 12px 0 14px;">${cleanTitle}</h1>
            <div class="detail-meta-info" style="display: flex; gap: 16px; font-size: 0.88rem; color: #64748B; flex-wrap: wrap;">
              <span><i class="ph-bold ph-user"></i> 작성자: <strong>${cleanAuthor}</strong></span>
              <span><i class="ph-bold ph-calendar"></i> 작성일: <strong>${cleanDate}</strong></span>
            </div>
          </div>

          <!-- Body -->
          <div class="inquiry-detail-body">
            <!-- 1. Patient Question Box -->
            <div class="inq-question-box">
              <div class="box-label"><i class="ph-bold ph-question"></i> 상담 문의 내용</div>
              <div class="question-content">${cleanContent}</div>
            </div>

            <!-- 2. Doctor Consultation Answer Box -->
            ${isAnswered ? `
            <div class="inq-doctor-answer-box" id="view-doctor-answer-wrapper" style="margin-top: 24px;">
              <div class="doctor-answer-header">
                <div class="doc-badge-group">
                  <span class="doc-badge">해아림 대표원장</span>
                  <span class="doc-name">손지웅 원장의 <strong>전문 1:1 상담 답변</strong></span>
                </div>
                <span class="answer-date">답변일: ${cleanAnswerDate}</span>
              </div>
              <div class="doctor-answer-content">${cleanAnswer}</div>
              <div class="doctor-answer-footer">
                <p class="answer-notice">※ 본 답변은 환자분의 기재 내용을 토대로 작성된 한의학적 소견이며, 정확한 진단과 처방을 위해서는 원내 내원 정밀 진단(자율신경계·뇌파·체질 검사)을 권장합니다.</p>
              </div>
            </div>
            ` : `
            <div class="inq-unanswered-box" style="margin-top: 24px;">
              <div class="pending-icon"><i class="ph-bold ph-clock"></i></div>
              <h4>손지웅 대표원장이 상담 내용을 확인 중입니다.</h4>
              <p>빠른 시일 내에 성심성의껏 전문 답변을 등록해 드리겠습니다.</p>
            </div>
            `}
          </div>

          <!-- Footer Action Buttons -->
          <div class="inquiry-detail-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 36px; padding-top: 20px; border-top: 1px solid #F1F5F9; flex-wrap: wrap; gap: 12px;">
            <a href="/inquiry/" class="btn btn-outline-cases" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 8px; font-weight: 600;">
              <i class="ph-bold ph-arrow-left"></i> <span>온라인 상담 목록으로 돌아가기</span>
            </a>
            <a href="/reservation/" class="btn btn-primary" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; border-radius: 8px; font-weight: 700; background: #0369A1; color: white;">
              <i class="ph-bold ph-calendar-check"></i> <span>원장님 진료 예약하기</span>
            </a>
          </div>
        </div>

        <!-- Doctor Consultation CTA Banner -->
        <div class="case-cta-banner blog-cta-banner" style="margin-top: 36px;">
          <div class="cta-banner-text">
            <h3>유사한 증상으로 일상에 어려움을 겪고 계신가요?</h3>
            <p>손지웅 대표원장이 직접 1:1로 원인을 분석하고 맞춤 치료 계획을 설계해 드립니다.</p>
          </div>
          <div class="cta-banner-buttons">
            <a href="/inquiry/" class="btn btn-inquiry-header" style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px;">
              <i class="ph-bold ph-chat-teardrop-dots"></i> 상담글 남기기
            </a>
            <a href="https://map.naver.com/p/entry/place/1272285133" target="_blank" rel="noopener noreferrer" class="btn btn-hero-naver-dark" style="text-decoration: none;">
              <span class="n-box">N</span> 네이버 실시간 예약
            </a>
          </div>
        </div>

      </div>
    </section>
  </main>

  <!-- Site Footer -->
  <footer class="site-footer">
    <div class="container footer-inner">
      <div class="footer-top">
        <div class="footer-clinic-info">
          <div class="footer-logo">
            <span class="brand-name">해아림한의원</span>
            <span class="branch-name">분당점</span>
          </div>
          <p class="footer-slogan">마음까지 헤아리는 두뇌·신경정신 질환 특화 진료</p>
          <div class="clinic-details">
            <p><strong>대표원장:</strong> 손지웅 | <strong>사업자등록번호:</strong> 127-22-85133</p>
            <p><strong>주소:</strong> 경기도 성남시 분당구 성남대로 389 (정자동 17-6) 폴라리스빌딩 4층</p>
            <p><strong>대표전화:</strong> 031-718-7575</p>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p class="copyright">&copy; 2026 해아림한의원 분당점. All rights reserved.</p>
      </div>
    </div>
  </footer>

  <!-- Firebase & Scripts -->
  <script src="https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/12.17.1/firebase-app-check-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/12.17.1/firebase-auth-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore-compat.js"></script>
  <script src="/js/main.js"></script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60, s-maxage=300',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

function renderNotFoundResponse(message) {
  const cleanMsg = escapeHtml(message);
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>상담글을 찾을 수 없습니다 | 해아림한의원 분당점</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
  <link rel="stylesheet" href="/css/style.css">
</head>
<body class="inquiry-page-body">
  <main id="main-content" style="display:flex;align-items:center;justify-content:center;min-height:75vh;padding:24px;">
    <div style="max-width:540px;width:100%;text-align:center;background:#fff;border:1px solid #E2E8F0;border-radius:16px;padding:40px 24px;box-shadow:0 8px 24px rgba(0,0,0,0.06);">
      <div style="font-size:3rem;margin-bottom:12px;color:#0284C7;">📋</div>
      <h1 style="font-size:1.4rem;font-weight:800;color:#0F172A;margin-bottom:12px;">온라인 상담글을 찾을 수 없습니다</h1>
      <p style="font-size:0.95rem;color:#64748B;line-height:1.6;margin-bottom:24px;">${cleanMsg}<br>삭제되었거나 주소가 올바르지 않습니다.</p>
      <a href="/inquiry/" style="display:inline-block;background:#0369A1;color:#fff;font-weight:700;padding:10px 22px;border-radius:8px;text-decoration:none;">온라인 상담 목록으로 이동</a>
    </div>
  </main>
</body>
</html>`;

  return new Response(html, {
    status: 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}
