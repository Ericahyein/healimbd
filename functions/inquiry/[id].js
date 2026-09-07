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

// 4 Permanent Authentic Base Inquiries fallback
const PERMANENT_BASE_INQUIRIES = {
  'inq_01_autonomic': {
    id: 'inq_01_autonomic',
    category: 'autonomic',
    disease: '자율신경실조증',
    region: '분당',
    ageText: '40대',
    gender: 'female',
    nickname: '분당 · 40대 · 여',
    title: '자율신경실조증 때문에 증상이 여러 가지로 나타날 수 있나요?',
    date: '2026.08.31',
    status: 'answered',
    content: "어지럼증과 가슴 두근거림이 있어 내과와 이비인후과를 다녀왔는데 검사 결과는 정상이라고 합니다. 그런데 소화불량도 심하고, 얼굴로 열이 확 올랐다가 손발은 차가워지며 식은땀이 나는 등 증상이 온몸에 걸쳐 여러 가지로 나타납니다. 이런 복합적인 증상들이 전부 자율신경실조증 하나 때문에 생길 수 있는 건가요?",
    answer: "안녕하세요, 손지웅 대표원장입니다.\n\n네, 맞습니다. 환자분께서 겪고 계신 어지럼, 두근거림, 상열하한, 소화장애, 식은땀은 모두 '자율신경실조증'의 대표적인 전신 복합 증상들입니다.\n\n자율신경계는 우리 몸의 혈압, 심장박동, 체온, 소화, 땀 분비 등 생명 유지 기능을 24시간 무의식적으로 조절하는 시스템입니다. 액셀(교감신경)과 브레이크(부교감신경)의 균형이 깨지면 특정 장기 하나가 아닌 전신에 걸쳐 동시다발적인 이상 신호가 발생하게 됩니다.\n\n종합병원 검사(내시경, MRI 등)는 신체의 구조적 파괴나 질병을 찾는 검사이므로, 기능적 조절 장애인 자율신경실조증은 검사상 정상으로 나오는 경우가 대부분입니다.\n\n한의학에서는 이를 상초의 열을 내리고 하초를 따뜻하게 하는 '수승화강(水昇火降)' 치료로 다스립니다. 교감신경의 과흥분을 가라앉히고 오장육부의 기혈 순환을 돕는 맞춤 탕약과 자율신경 안정 침구 치료를 통해 여러 증상들을 한 번에 근본적으로 회복하실 수 있습니다.",
    answerDate: '2026.08.31'
  },
  'inq_02_adhd': {
    id: 'inq_02_adhd',
    category: 'adhd',
    disease: 'ADHD·집중력',
    region: '성남시',
    ageText: '초등학생',
    gender: 'male',
    nickname: '성남시 · 초등학생 · 남',
    title: 'adhd 때문에 아이가 실수가 너무 많아요',
    date: '2026.08.31',
    status: 'answered',
    content: "초등학생 아들이 평소에 덜렁거리고 준비물을 자주 빠뜨리며, 시험을 볼 때도 문제를 끝까지 읽지 않고 틀리는 실수가 너무 많습니다. 선생님께도 수업 시간에 멍하니 있거나 딴짓을 한다는 지적을 받는데 ADHD 증상일까요? 아이를 혼내도 그때뿐인데 한방 치료로 실수를 줄이고 집중력을 높일 수 있는지 궁금합니다.",
    answer: "안녕하세요, 손지웅 대표원장입니다. 어머님께서 답답하고 속상하셨을 마음이 전해집니다.\n\n적어주신 모습은 전형적인 ADHD의 '주의력 결핍형(inattentive type)' 양상에 해당합니다. 과잉행동이 두드러지지 않더라도, 주의 집중을 유지하고 계획을 실행하는 두뇌 전두엽(Prefrontal Cortex)의 성숙도가 또래에 비해 지연되어 세부적인 것에 주의를 기울이지 못하고 실수를 연발하게 되는 것입니다.\n\n이때 아이를 혼내거나 다그치면 아이의 자존감이 크게 떨어지고 학습에 대한 거부감만 커지게 됩니다. 이는 아이의 의지나 성격 탓이 아닌 신경학적 기능 미성숙이기 때문입니다.\n\n해아림한의원에서는 뇌기능 및 주의집중도 검사를 통해 아이의 두뇌 발달 상태를 평가하고, 전두엽으로의 기혈 순환과 도파민 밸런스를 돕는 총명·안신 한약 처방과 두뇌 훈련을 진행합니다. 아이의 식욕 부진이나 수면 장애 등 양약 부작용 걱정 없이 스스로 주의를 조절하고 실수를 줄여나갈 수 있도록 돕고 있습니다.",
    answerDate: '2026.08.31'
  },
  'inq_03_sleep': {
    id: 'inq_03_sleep',
    category: 'sleep',
    disease: '수면·불면증',
    region: '용인',
    ageText: '직장인',
    gender: 'male',
    nickname: '용인 · 직장인 · 남',
    title: '불면증이 오래가면 어떻게 치료해야 하나요?',
    date: '2026.08.31',
    status: 'answered',
    content: "직장 생활을 하면서 불면증이 시작된 지 6개월이 넘었습니다. 침대에 누워도 1~2시간 동안 잡생각 때문에 잠이 오지 않고, 어렵게 잠들어도 사소한 소리에 깨서 아침까지 멍합니다. 수면유도제를 계속 먹기에는 내성이나 의존성이 걱정되는데, 이렇게 만성화된 불면증은 한방에서 어떤 원리로 치료하는지 알고 싶습니다.",
    answer: "안녕하세요, 손지웅 대표원장입니다.\n\n불면증이 6개월 이상 지속되면 낮 동안의 피로, 집중력 저하뿐만 아니라 ‘오늘 밤에도 못 자면 어쩌지’ 하는 수면 예기불안이 생겨 뇌가 더 각성되는 악순환에 빠지게 됩니다.\n\n만성 불면증의 핵심 원인은 뇌 신경계의 과각성(Hyperarousal)과 자율신경계(교감신경 항진 및 부교감신경 저하)의 불균형입니다. 몸은 쉬고 싶어 하지만, 뇌의 시상하부와 각성 중추가 꺼지지 않는 것입니다.\n\n해아림한의원에서는 수면제처럼 인위적으로 뇌를 진정시키는 것이 아니라:\n1. 청뇌·안신 맞춤 한약: 심장과 간의 불필요한 열을 내리고 뇌파를 이완시켜 천연 멜라토닌 분비를 촉진합니다.\n2. 수면 혈자리 침구 요법: 백회혈, 신문혈 등을 자극하여 교감신경의 긴장을 낮추고 깊은 서파수면(숙면)을 유도합니다.\n3. 수면 위생 습관 교정: 뇌의 수면 리듬을 재설정하는 행동 요법을 함께 안내합니다.\n\n약물 의존 없이 스스로 잠드는 뇌의 자연 치유력을 되찾으실 수 있으니 편안히 상담받아보시기 바랍니다.",
    answerDate: '2026.08.31'
  },
  'inq_04_tic': {
    id: 'inq_04_tic',
    category: 'tic',
    disease: '틱장애·뚜렛',
    region: '분당',
    ageText: '초등학생',
    gender: 'male',
    nickname: '분당 · 초등학생 · 남',
    title: '틱장애가 심해지는 이유가 뭘까요?',
    date: '2026.08.31',
    status: 'answered',
    content: "초등학교에 다니는 아이가 틱 증상이 나타난 지 좀 되었는데, 최근 들어 증상이 더 심해지고 있습니다. 눈 깜빡임뿐만 아니라 목을 꺾거나 헛기침하는 소리까지 더 잦아졌어요. 스트레스나 피로 때문인지, 아니면 계절이나 환경 변화 때문인지 틱장애가 갑자기 심해지는 원인과 한방에서는 이를 어떻게 치료하고 관리해야 하는지 궁금합니다.",
    answer: "안녕하세요, 해아림한의원 대표원장 손지웅입니다.\n\n아이가 틱 증상으로 힘들어하고 증상이 심해져 부모님께서도 걱정이 많으셨겠습니다.\n\n틱장애는 증상이 좋아졌다가 나빠지기를 반복하는 ‘왁싱 앤 웨이닝(Waxing & Waning)’ 특성을 지닙니다. 틱이 갑자기 심해지는 주된 원인은 다음과 같습니다:\n\n1. 심리적 스트레스 및 긴장감: 새 학기, 시험, 낯선 환경 적응, 부모나 선생님의 지적\n2. 육체적 피로 및 수면 부족: 늦은 취침 시간, 면역력 저하, 과도한 학업량\n3. 시각적 과자극: 스마트폰, 유튜브, 게임 등 미디어의 과도한 시청으로 인한 뇌 흥분\n4. 두뇌 기저핵의 신경 불균형: 운동 신호를 걸러내는 기저핵의 기능이 일시적으로 저하\n\n한의학에서는 틱의 악화를 뇌 신경계의 열(熱)과 담음(痰飮), 기혈 불균형으로 진단합니다. 해아림한의원에서는 과열된 뇌 신경계를 진정시키는 체질 맞춤 한약 처방과 두뇌 밸런스를 바로잡는 침구 요법, 가정 내 생활관리 코칭을 통해 증상의 악화를 막고 근본적인 뇌 자생력을 길러드립니다. 아이에게 절대 틱을 지적하거나 참으라고 하지 마시고 편안한 마음으로 내원하셔서 진료를 받아보시길 권합니다.",
    answerDate: '2026.08.31'
  }
};

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

  // 2. Check Permanent Base Inquiries
  if (PERMANENT_BASE_INQUIRIES[inquiryId]) {
    inquiry = PERMANENT_BASE_INQUIRIES[inquiryId];
  } else {
    // 3. Fetch from Firestore REST API
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
      // If service account secret is not set in dev, check permanent fallback
      if (PERMANENT_BASE_INQUIRIES[inquiryId]) {
        inquiry = PERMANENT_BASE_INQUIRIES[inquiryId];
      } else {
        return renderNotFoundResponse('상담글 정보를 확인할 수 없습니다.');
      }
    }
  }

  if (!inquiry || !inquiry.title) {
    return renderNotFoundResponse('존재하지 않거나 삭제된 상담글입니다.');
  }

  // 4. Resolve Dynamic Assets Fingerprint from Cloudflare Pages static assets
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

  // 5. Build Sanitized Variables for HTML Injection
  const cleanTitle = escapeHtml(inquiry.title);
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

  // 6. Complete Server-Side Rendered (SSR) HTML
  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${cleanTitle} | 해아림한의원 분당점 온라인상담</title>
  <meta name="robots" content="${robotsMeta}">
  <meta name="description" content="${cleanSnippet}">
  <link rel="canonical" href="${canonicalUrl}">

  <!-- Open Graph -->
  <meta property="og:title" content="${cleanTitle} | 해아림한의원 분당점">
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
