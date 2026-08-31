// Healim Bundang Clinic - Interactions & UI Script
document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initInquiryModal();
  initSelfCheck();
  initFAQ();
  initScrollEffects();
  initSmoothScroll();
  initReviewTabs();
  initNaverReviewsBoard();
  initAuth();
  initAdminCaseWriter();
  initAdminColumnBoard();
  initOnlineInquiry();
});

// 1. Mobile Menu Drawer
function initMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const closeBtn = document.getElementById('drawer-close');
  const drawer = document.getElementById('mobile-drawer');
  const overlay = document.getElementById('drawer-overlay');
  const mobileLinks = document.querySelectorAll('.mobile-nav-link');

  if (!toggleBtn || !drawer || !overlay) return;

  function openDrawer() {
    drawer.classList.add('active');
    overlay.classList.add('active');
    toggleBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawer.classList.remove('active');
    overlay.classList.remove('active');
    toggleBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  toggleBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);

  mobileLinks.forEach(link => {
    link.addEventListener('click', closeDrawer);
  });
}

// 2. Inquiry Modal (문의하기 모달 팝업)
function initInquiryModal() {
  const openBtnHeader = document.getElementById('btn-open-inquiry');
  const openBtnDrawer = document.getElementById('btn-drawer-inquiry');
  const modal = document.getElementById('inquiry-modal');
  const closeBtn = document.getElementById('modal-close');
  const overlay = document.getElementById('modal-overlay');

  if (!modal) return;

  function openModal() {
    // If mobile drawer is open, close it first
    const drawer = document.getElementById('mobile-drawer');
    const drawerOverlay = document.getElementById('drawer-overlay');
    if (drawer && drawer.classList.contains('active')) {
      drawer.classList.remove('active');
      if (drawerOverlay) drawerOverlay.classList.remove('active');
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (openBtnHeader) openBtnHeader.addEventListener('click', openModal);
  if (openBtnDrawer) openBtnDrawer.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (overlay) overlay.addEventListener('click', closeModal);

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });
}

// 3. Interactive Self-Check (Adult & Child)
function initSelfCheck() {
  // Adult Check
  const adultCheckboxes = document.querySelectorAll('.adult-check');
  const adultResultBox = document.getElementById('adult-result-box');
  const adultCountSpan = document.getElementById('adult-checked-count');
  const adultFeedback = document.getElementById('adult-feedback-text');

  if (adultCheckboxes.length > 0 && adultResultBox) {
    const promptEl = adultResultBox.querySelector('.result-prompt');
    const contentEl = adultResultBox.querySelector('.result-active-content');

    adultCheckboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        const checkedCount = document.querySelectorAll('.adult-check:checked').length;
        if (adultCountSpan) adultCountSpan.textContent = checkedCount;

        if (checkedCount > 0) {
          if (promptEl) promptEl.style.display = 'none';
          if (contentEl) contentEl.style.display = 'block';

          if (checkedCount === 1) {
            adultFeedback.textContent = '현재 1가지 불편 증상이 확인되었습니다. 초기 불균형 상태일 때 적절한 관리와 진단을 통해 증상의 심화를 예방할 수 있습니다.';
          } else if (checkedCount === 2) {
            adultFeedback.textContent = '2가지 증상이 복합적으로 나타나고 있습니다. 자율신경과 뇌신경 긴장도가 높아진 상태일 수 있으므로 정밀 검사 상담을 추천합니다.';
          } else {
            adultFeedback.textContent = '3가지 주요 증상이 모두 해당됩니다. 만성화되기 전에 원인 집중 진단과 맞춤 한방 치료를 통한 적극적인 회복 치료가 필요합니다.';
          }
        } else {
          if (promptEl) promptEl.style.display = 'flex';
          if (contentEl) contentEl.style.display = 'none';
        }
      });
    });
  }

  // Child Check
  const childCheckboxes = document.querySelectorAll('.child-check');
  const childResultBox = document.getElementById('child-result-box');
  const childCountSpan = document.getElementById('child-checked-count');
  const childFeedback = document.getElementById('child-feedback-text');

  if (childCheckboxes.length > 0 && childResultBox) {
    const promptEl = childResultBox.querySelector('.result-prompt');
    const contentEl = childResultBox.querySelector('.result-active-content');

    childCheckboxes.forEach(cb => {
      cb.addEventListener('change', () => {
        const checkedCount = document.querySelectorAll('.child-check:checked').length;
        if (childCountSpan) childCountSpan.textContent = checkedCount;

        if (checkedCount > 0) {
          if (promptEl) promptEl.style.display = 'none';
          if (contentEl) contentEl.style.display = 'block';

          if (checkedCount === 1) {
            childFeedback.textContent = '우리 아이에게 초기 긴장 또는 행동 신호가 관찰됩니다. 혼내거나 억제하지 마시고 부드러운 관심과 원인 관찰이 필요합니다.';
          } else if (checkedCount === 2) {
            childFeedback.textContent = '두뇌의 정서·주의집중 조절 기능이 피로해진 상태일 수 있습니다. 아이 발달 단계에 맞춘 1:1 맞춤 평가를 권장합니다.';
          } else {
            childFeedback.textContent = '아이가 일상에서 상당한 정서적 긴장과 집중 부담을 느끼고 있습니다. 뉴로피드백 및 순한 맞춤 한약 치료를 통한 조절력 강화 상담을 추천합니다.';
          }
        } else {
          if (promptEl) promptEl.style.display = 'flex';
          if (contentEl) contentEl.style.display = 'none';
        }
      });
    });
  }
}

// 4. FAQ Accordion
function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const button = item.querySelector('.faq-question');
    if (!button) return;

    button.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Close all other items
      faqItems.forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('active');
          const otherBtn = otherItem.querySelector('.faq-question');
          if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
        }
      });

      // Toggle current item
      if (isActive) {
        item.classList.remove('active');
        button.setAttribute('aria-expanded', 'false');
      } else {
        item.classList.add('active');
        button.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

// 5. Scroll Effects & Floating Top
function initScrollEffects() {
  const scrollTopBtn = document.getElementById('scroll-to-top');

  window.addEventListener('scroll', () => {
    const scrollPos = window.scrollY;

    // Floating top button
    if (scrollTopBtn) {
      if (scrollPos > 300) {
        scrollTopBtn.classList.add('visible');
      } else {
        scrollTopBtn.classList.remove('visible');
      }
    }
  });

  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
}

// 6. Smooth Scroll for Anchor Links
function initSmoothScroll() {
  const anchorLinks = document.querySelectorAll('a[href^="#"]');

  anchorLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId === '#' || targetId === '') return;

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        const headerHeight = document.getElementById('site-header')?.offsetHeight || 80;
        const targetPos = targetEl.getBoundingClientRect().top + window.scrollY - headerHeight - 10;

        window.scrollTo({
          top: targetPos,
          behavior: 'smooth'
        });
      }
    });
  });
}

// 7. Case & Naver Review Filter Tabs & Live Search
function initReviewTabs() {
  const catBtns = document.querySelectorAll('.cases-tab-btn, .review-tab-btn');
  const directCards = document.querySelectorAll('#direct-cases-grid .healim-case-card, .cases-home-grid .healim-case-card[data-review-type="direct"]');
  const naverCards = document.querySelectorAll('#naver-reviews-grid .healim-case-card, .cases-home-grid .healim-case-card[data-review-type="naver"]');
  const searchInput = document.getElementById('cases-search-input');

  if (directCards.length === 0 && naverCards.length === 0) return;

  function filterDirectCases() {
    const activeCatBtn = document.querySelector('.cases-tab-btn.active, .review-tab-btn.active');
    const catFilter = activeCatBtn ? activeCatBtn.getAttribute('data-filter') : 'all';
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    // Filter Direct Clinical Cases with disease categories
    directCards.forEach(card => {
      const cardCat = card.getAttribute('data-category') || '';
      const text = card.textContent.toLowerCase();

      let matchCat = false;
      if (catFilter === 'all') {
        matchCat = true;
      } else if (catFilter === 'tic-adhd') {
        matchCat = (cardCat === 'tic' || cardCat === 'adhd');
      } else {
        matchCat = (cardCat === catFilter);
      }

      let matchQuery = true;
      if (query) {
        matchQuery = text.includes(query);
      }

      if (matchCat && matchQuery) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });

    // Naver reviews are listed continuously, only filtered if user searches keywords
    naverCards.forEach(card => {
      const text = card.textContent.toLowerCase();
      if (query) {
        card.style.display = text.includes(query) ? 'flex' : 'none';
      } else {
        card.style.display = 'flex';
      }
    });
  }

  // Category Tab Click Handlers (Applied to direct clinical cases)
  catBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      catBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterDirectCases();
    });
  });

  // Search Input Handler
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      filterDirectCases();
    });
  }

  // Check URL params on initial load
  const urlParams = new URLSearchParams(window.location.search);
  const filterParam = urlParams.get('filter');

  if (filterParam) {
    const matchingCatBtn = document.querySelector(`.cases-tab-btn[data-filter="${filterParam}"], .review-tab-btn[data-filter="${filterParam}"]`);
    if (matchingCatBtn) {
      catBtns.forEach(b => b.classList.remove('active'));
      matchingCatBtn.classList.add('active');
      filterDirectCases();
    }
  }
}

// 7-2. Naver Place Real-Time Reviews Board & Pagination Engine (분당점 플레이스 연동)
const BUNDANG_NAVER_PLACE_ID = '1272285133';
const BUNDANG_NAVER_REVIEW_URL = `https://map.naver.com/p/entry/place/${BUNDANG_NAVER_PLACE_ID}?placePath=%2Freview%2Fvisitor`;

const NAVER_REVIEWS_DATA = [
  {
    id: 'n-01',
    author: 'p****님',
    date: '2026.08.28',
    rating: 5.0,
    category: 'panic',
    categoryName: '불안·공황장애',
    title: '손지웅 원장님께서 정말 꼼꼼하게 증상을 들어주시고 치료 방향을 자세히 설명해주셔서 안심이 되었어요',
    keywords: ['친절해요', '설명이 자세해요', '원장님이 꼼꼼해요'],
    summary: '공황 때문에 다른 병원도 가봤지만 이렇게 원인을 깊이 있게 설명해주신 곳은 처음입니다. 침도 아프지 않게 잘 놔주시고 맞춤 한약 먹으면서 불안감이 정말 많이 줄어들었어요.'
  },
  {
    id: 'n-02',
    author: 'k****님',
    date: '2026.08.26',
    rating: 5.0,
    category: 'autonomic',
    categoryName: '자율신경실조증',
    title: '병원 검사에서 아무 이상 없다던 어지럼증과 소화불량이 해아림 치료받고 싹 나았습니다',
    keywords: ['근본원인을 짚어줘요', '설명이 자세해요', '친절해요'],
    summary: '이유 없는 어지럼증과 가슴 답답함으로 온갖 검사를 다 받아도 원인을 못 찾았는데 손원장님께서 정확히 진단해주시고 맞춤 한약 복용 후 몸이 정말 가벼워졌습니다.'
  },
  {
    id: 'n-03',
    author: 'j****님',
    date: '2026.08.24',
    rating: 5.0,
    category: 'sleep',
    categoryName: '만성 불면증',
    title: '수면제 없이는 잠들지 못했는데 2달 만에 약 끊고 자연스럽게 푹 자게 되었습니다',
    keywords: ['효과가 좋아요', '원장님이 꼼꼼해요', '친절해요'],
    summary: '오랫동안 수면유도제를 먹으면서 낮에 머리가 무겁고 피로했는데 해아림 맞춤 한약과 침 치료를 받고 수면제 없이도 스르륵 잠들게 되었습니다. 아침이 정말 상쾌합니다.'
  },
  {
    id: 'n-04',
    author: 'm****님',
    date: '2026.08.22',
    rating: 5.0,
    category: 'tic-adhd',
    categoryName: '소아 틱장애',
    title: '초등 3학년 아이 눈깜빡임과 음성틱으로 방문했는데, 원장님께서 아이 눈높이에서 따뜻하게 진료해주셨어요',
    keywords: ['아이를 잘 다뤄요', '친절해요', '설명이 자세해요'],
    summary: '아이가 틱 증상 때문에 위축되어 있었는데 손지웅 원장님이 아이 마음부터 편하게 보듬어주셨습니다. 한약 먹고 3주차부터 눈깜빡임이 눈에 띄게 줄어들어 정말 감사드립니다.'
  },
  {
    id: 'n-05',
    author: 's****님',
    date: '2026.08.20',
    rating: 5.0,
    category: 'panic',
    categoryName: '공황장애·예기불안',
    title: '운전 중 터널만 들어가면 가슴이 답답하고 숨이 안 쉬어졌는데 뇌기능 안정 한약 복용 후 편안해졌습니다',
    keywords: ['치료효과가 좋아요', '예약이 편해요', '친절해요'],
    summary: '고속도로 터널에서 갑작스런 공황발작 후 운전을 못했는데 해아림에서 뇌파 검사와 체질 맞춤 한약 복용 2달 만에 혼자서도 안심하고 운전할 수 있게 되었습니다.'
  },
  {
    id: 'n-06',
    author: 'l****님',
    date: '2026.08.18',
    rating: 5.0,
    category: 'autonomic',
    categoryName: '자율신경실조증',
    title: '이유 없이 가슴이 두근거리고 상열감과 오한이 반복되어 자율신경실조증 진단받고 치료 중인데 너무 편해졌어요',
    keywords: ['자세한 상담', '원장님이 꼼꼼해요', '추천해요'],
    summary: '체온조절이 안 되고 심장이 벌렁거려 일상생활이 불가능했는데, 손원장님의 세심한 진맥과 맞춤 탕약 덕분에 자율신경 밸런스가 잡히면서 몸이 정상으로 돌아왔습니다.'
  },
  {
    id: 'n-07',
    author: 'c****님',
    date: '2026.08.16',
    rating: 5.0,
    category: 'tic-adhd',
    categoryName: '소아청소년 ADHD',
    title: '중학교 아이가 수업 시간에 집중을 못하고 산만해서 걱정이었는데 맞춤 훈련 받고 차분해졌습니다',
    keywords: ['집중력 향상', '친절해요', '신뢰가 가요'],
    summary: '병원 약은 부작용 걱정이 컸는데 한방 치료로 뇌 기능을 균형 있게 잡아주셔서 아이가 감정 기복도 줄고 공부할 때 엉덩이 붙이고 앉아있는 시간이 확 늘었습니다.'
  },
  {
    id: 'n-08',
    author: 'y****님',
    date: '2026.08.14',
    rating: 5.0,
    category: 'hyperhidrosis-ibs',
    categoryName: '수족다한증',
    title: '긴장만 하면 손발에 땀이 흥건해서 사회생활이 힘들었는데 자율신경 조절 한약 3개월 먹고 땀이 확연히 줄었습니다',
    keywords: ['효과가 좋아요', '꼼꼼한 진단', '친절해요'],
    summary: '악수하거나 서류 만질 때마다 스트레스였던 손발 다한증이 해아림 맞춤 처방 후 긴장 상황에서도 뽀송함을 유지하게 되었습니다. 삶의 질이 180도 달라졌어요.'
  },
  {
    id: 'n-09',
    author: 'h****님',
    date: '2026.08.12',
    rating: 5.0,
    category: 'hyperhidrosis-ibs',
    categoryName: '과민성대장증후군',
    title: '아침마다 배가 아프고 설사 때문에 출근길 지하철 타기가 무서웠던 과민대장이 정말 편안해졌습니다',
    keywords: ['속이 편안해요', '친절해요', '원장님 최고'],
    summary: '스트레스만 받으면 복통과 급박변으로 고생했는데 장과 뇌의 신경축을 함께 다스리는 한약을 처방해주셔서 10년 묵은 고질병이 싹 가라앉았습니다.'
  },
  {
    id: 'n-10',
    author: 'd****님',
    date: '2026.08.10',
    rating: 5.0,
    category: 'sleep',
    categoryName: '수면장애·조기각성',
    title: '새벽 2~3시만 되면 눈이 떠져서 잠을 못 이루던 불면증이 해결되었습니다',
    keywords: ['숙면', '친절해요', '시설이 깨끗해요'],
    summary: '자다 깨서 다시 잠들지 못해 늘 머리가 멍했는데, 심신을 안정시켜주는 맞춤 한약 복용 후 아침 알람 울릴 때까지 깨지 않고 통잠을 잡니다.'
  },
  {
    id: 'n-11',
    author: 'r****님',
    date: '2026.08.08',
    rating: 5.0,
    category: 'panic',
    categoryName: '불안·사회공포증',
    title: '중요한 발표나 면접 때 극심한 긴장과 목소리 떨림으로 힘들었는데 해아림 치료받고 면접 합격했어요!',
    keywords: ['불안 극복', '친절해요', '적극 추천'],
    summary: '사회공포와 무대불안 때문에 커리어에 지장이 컸는데 원장님이 주신 맞춤 한약과 호흡 이완 요법으로 최종 면접에서 떨지 않고 제 역량을 다 발휘했습니다.'
  },
  {
    id: 'n-12',
    author: 'b****님',
    date: '2026.08.06',
    rating: 5.0,
    category: 'autonomic',
    categoryName: '기립성 어지럼·미주신경',
    title: '갑작스러운 기립성 어지럼증과 미주신경성 실신 전조 증상이 있었는데 체질 한약 후 어지럼증이 사라졌습니다',
    keywords: ['어지럼증 완화', '전문적이에요', '친절해요'],
    summary: '지하철에서 몇 번 쓰러질 뻔해 트라우마가 컸는데, 자율신경 실조 상태를 정밀하게 파악해주시고 기혈을 보하는 처방으로 지금은 대중교통도 편안하게 이용합니다.'
  },
  {
    id: 'n-13',
    author: 'a****님',
    date: '2026.08.04',
    rating: 5.0,
    category: 'tic-adhd',
    categoryName: '소아 틱장애',
    title: '아이가 목을 꺾고 헛기침을 반복해서 걱정이 많았는데 3달 만에 증상이 거의 소실되었습니다',
    keywords: ['소아틱 전문', '따뜻한 진료', '감사합니다'],
    summary: '초기에 빠른 치료가 중요하다는 조언을 듣고 분당 해아림을 찾았습니다. 아이 체질에 맞춘 순한 한약과 원장님의 따뜻한 진료 덕분에 부모 마음도 푹 놓였습니다.'
  },
  {
    id: 'n-14',
    author: 'g****님',
    date: '2026.08.02',
    rating: 5.0,
    category: 'panic',
    categoryName: '공황장애·야간진료',
    title: '야간진료가 있어서 퇴근 후 편하게 침 치료와 한약 상담을 받을 수 있어 직장인에게 최고입니다',
    keywords: ['야간진료 편리', '정자역 접근성', '친절해요'],
    summary: '월요일 수요일 8시까지 야간진료를 해주셔서 퇴근하고 정자역에서 바로 들러 진료받을 수 있어 정말 편합니다. 원장님 덕분에 공황 증상이 거의 사라졌어요.'
  },
  {
    id: 'n-15',
    author: 't****님',
    date: '2026.07.31',
    rating: 5.0,
    category: 'autonomic',
    categoryName: '만성두통·브레인포그',
    title: '만성 긴장성 두통과 브레인포그로 머리가 늘 멍했는데 자율신경 균형 치료 후 맑아졌습니다',
    keywords: ['피로 회복', '근본 치료', '원장님 친절'],
    summary: '진통제를 매일 달고 살았는데 위장만 상하고 낫지 않았습니다. 손원장님의 경추 교정과 자율신경 한약으로 진통제 없이도 머리가 개운하고 집중이 잘 됩니다.'
  },
  {
    id: 'n-16',
    author: 'w****님',
    date: '2026.07.28',
    rating: 5.0,
    category: 'sleep',
    categoryName: '갱년기 불면증',
    title: '갱년기 이후 시작된 불면증과 가슴 답답함이 침과 한약 복용으로 편안하게 완화되었습니다',
    keywords: ['불면증 치료', '편안한 분위기', '친절해요'],
    summary: '얼굴이 화끈거리고 가슴이 두근거려 밤마다 뒤척였는데, 해아림에서 갱년기 열감과 수면을 동시에 다스려주는 한약을 먹고 다시 꿀잠을 자게 되었습니다.'
  },
  {
    id: 'n-17',
    author: 'v****님',
    date: '2026.07.25',
    rating: 5.0,
    category: 'hyperhidrosis-ibs',
    categoryName: '안면·두피 다한증',
    title: '얼굴과 머리 쪽으로 열이 오르고 땀이 비 오듯 쏟아지던 다한증이 정상 체온을 찾았습니다',
    keywords: ['상열감 해소', '땀 줄어듦', '효과 짱'],
    summary: '식사할 때나 사람 만날 때 얼굴 땀 때문에 수건을 들고 다녔는데 상초 열을 내려주는 맞춤 한약 치료 후 땀 분비가 정상적으로 조절되고 있습니다.'
  },
  {
    id: 'n-18',
    author: 'e****님',
    date: '2026.07.22',
    rating: 5.0,
    category: 'hyperhidrosis-ibs',
    categoryName: '과민성대장증후군 가스형',
    title: '스트레스성 복부 팽만감과 가스 때문에 조용한 사무실에 있는 게 두려웠는데 완전히 회복되었어요',
    keywords: ['과민대장 호전', '소화 잘됨', '친절해요'],
    summary: '장이 늘 꼬이고 가스가 차서 소화제와 유산균을 달고 살았는데 해아림 치료 1달 만에 속이 너무 편안해지고 배에 가스 차는 증상이 사라졌습니다.'
  },
  {
    id: 'n-19',
    author: 'n****님',
    date: '2026.07.19',
    rating: 5.0,
    category: 'tic-adhd',
    categoryName: '소아 ADHD',
    title: 'ADHD 진단 후 약물 부작용 걱정으로 한방 치료를 선택했는데 아이가 거부감 없이 잘 따릅니다',
    keywords: ['부작용 없음', '순한 한약', '아이 집중력'],
    summary: '양약의 식욕부진 부작용 때문에 고민하다 해아림을 찾았는데, 아이가 한약도 맛있게 잘 먹고 밥도 잘 먹으면서 학교생활 태도가 눈에 띄게 좋아졌습니다.'
  },
  {
    id: 'n-20',
    author: 'o****님',
    date: '2026.07.16',
    rating: 5.0,
    category: 'panic',
    categoryName: '공황장애·광장공포',
    title: '지하철 환승역에서 숨이 턱 막히던 공황장애가 치료 2달 만에 혼자 대중교통을 탈 수 있게 되었습니다',
    keywords: ['대중교통 이용 가능', '새 삶', '감사합니다'],
    summary: '외출 자체가 두려웠던 저에게 손지웅 원장님은 한 줄기 빛이었습니다. 세심한 진료와 심리적 지지 덕분에 공황을 극복하고 다시 사회생활로 복귀했습니다.'
  },
  {
    id: 'n-21',
    author: 'u****님',
    date: '2026.07.13',
    rating: 5.0,
    category: 'autonomic',
    categoryName: '자율신경·심신안정',
    title: '정자역 젤존타워 건물이라 주차도 편리하고 원장님과 간호사 선생님들 모두 한결같이 친절하십니다',
    keywords: ['주차 편리', '친절한 응대', '깨끗한 원내'],
    summary: '시설도 너무 깔끔하고 갈 때마다 따뜻하게 맞아주셔서 병원 가는 길이 편안합니다. 처방해주신 한약 먹고 만성 피로와 두통이 씻은 듯이 나았습니다.'
  },
  {
    id: 'n-22',
    author: 'z****님',
    date: '2026.07.10',
    rating: 5.0,
    category: 'sleep',
    categoryName: '만성 불면증',
    title: '수면 앱으로 수면 질을 측정하는데 깊은 수면 비율이 확 늘었습니다. 약 없이 잘 자서 행복합니다',
    keywords: ['수면의 질 향상', '행복해요', '친절해요'],
    summary: '항불안제 없이 잠 못 자던 40대 직장인입니다. 해아림 치료 시작하고 3주 만에 약을 끊었고 수면 깊이가 깊어져 아침에 개운하게 일어납니다.'
  },
  {
    id: 'n-23',
    author: 'q****님',
    date: '2026.07.07',
    rating: 5.0,
    category: 'panic',
    categoryName: '불안·가슴두근거림',
    title: '가슴이 쿵쾅거리고 답답할 때마다 알려주신 호흡법과 침 치료, 한약 복용으로 일상에 안정을 찾았습니다',
    keywords: ['호흡 이완', '불안 감소', '신뢰 만점'],
    summary: '심장내과 검사상 정상이었지만 수시로 찾아오던 빈맥과 불안감이 해아림의 심신 안정 치료로 완벽하게 안정되었습니다. 진심으로 감사드립니다.'
  },
  {
    id: 'n-24',
    author: 'x****님',
    date: '2026.07.04',
    rating: 5.0,
    category: 'autonomic',
    categoryName: '자율신경실조증',
    title: '병원 여러 군데 전전하다 마지막이라는 생각으로 방문했는데 정확한 원인 설명과 진료에 감동받았습니다',
    keywords: ['정확한 원인 진단', '감동 진료', '분당 최고 한의원'],
    summary: '내과, 이비인후과 다녀도 안 낫던 어지럼과 소화불량의 원인이 자율신경 불균형임을 정확히 짚어주시고 2개월 집중 치료로 건강을 완전히 회복했습니다.'
  }
];

let currentNaverPage = 1;
const NAVER_ITEMS_PER_PAGE = 6;
let currentNaverFilter = 'all';

function initNaverReviewsBoard() {
  const container = document.getElementById('naver-reviews-grid');
  const filterTabs = document.getElementById('naver-filter-tabs');
  if (!container) return;

  // Filter button clicks
  if (filterTabs) {
    const filterBtns = filterTabs.querySelectorAll('.naver-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentNaverFilter = btn.getAttribute('data-filter') || 'all';
        currentNaverPage = 1;
        renderNaverReviewsPage();
      });
    });
  }

  renderNaverReviewsPage();
}

function getFilteredNaverReviews() {
  if (currentNaverFilter === 'all') {
    return NAVER_REVIEWS_DATA;
  }
  return NAVER_REVIEWS_DATA.filter(item => {
    if (currentNaverFilter === 'panic') return item.category === 'panic';
    if (currentNaverFilter === 'autonomic') return item.category === 'autonomic';
    if (currentNaverFilter === 'tic-adhd') return item.category === 'tic-adhd';
    if (currentNaverFilter === 'sleep') return item.category === 'sleep';
    if (currentNaverFilter === 'hyperhidrosis-ibs') return item.category === 'hyperhidrosis-ibs';
    return item.category === currentNaverFilter;
  });
}

function renderNaverReviewsPage() {
  const container = document.getElementById('naver-reviews-grid');
  const paginationContainer = document.getElementById('naver-reviews-pagination');
  const countNumEl = document.getElementById('naver-total-count-num');
  if (!container) return;

  const filtered = getFilteredNaverReviews();
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / NAVER_ITEMS_PER_PAGE) || 1;

  if (currentNaverPage > totalPages) currentNaverPage = totalPages;
  if (currentNaverPage < 1) currentNaverPage = 1;

  if (countNumEl) {
    countNumEl.textContent = totalItems;
  }

  const startIndex = (currentNaverPage - 1) * NAVER_ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + NAVER_ITEMS_PER_PAGE, totalItems);
  const pageItems = filtered.slice(startIndex, endIndex);

  if (pageItems.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #64748B;">
        <i class="ph-bold ph-chats-circle" style="font-size: 2.5rem; color: #CBD5E1; margin-bottom: 12px; display: block;"></i>
        <p style="font-size: 1.05rem; font-weight: 600;">선택하신 분류의 네이버 후기가 없습니다.</p>
      </div>
    `;
    if (paginationContainer) paginationContainer.innerHTML = '';
    return;
  }

  let html = '';
  pageItems.forEach(item => {
    const keywordChipsHtml = (item.keywords || []).map(k => `<span class="n-keyword-chip">#${k}</span>`).join(' ');
    html += `
      <article class="healim-case-card naver-card-theme" data-category="${item.category}" data-review-type="naver">
        <div class="naver-review-card-inner">
          <div class="naver-card-header">
            <div class="naver-badge-label">
              <span class="n-green-badge">N</span>
              <span class="n-badge-text">네이버 플레이스 방문자 인증</span>
            </div>
            <div class="naver-star-rating">
              <span class="stars">★★★★★</span>
              <span class="score">${item.rating.toFixed(1)}</span>
            </div>
          </div>

          <div class="naver-card-meta">
            <span class="naver-author-name"><i class="ph-bold ph-user-circle"></i> ${item.author}</span>
            <span class="naver-date-text">${item.date}</span>
            <span class="naver-sub-pill">${item.categoryName}</span>
          </div>

          <h3 class="naver-review-title">
            "${item.title}"
          </h3>

          <div class="naver-keyword-chips">
            ${keywordChipsHtml}
          </div>

          <p class="naver-review-summary">${item.summary}</p>

          <div class="naver-card-footer">
            <span class="naver-verified-status"><i class="ph-bold ph-shield-check"></i> 영수증 / 예약 인증 완료</span>
            <a href="${BUNDANG_NAVER_REVIEW_URL}" target="_blank" rel="noopener noreferrer" class="naver-direct-link">
              네이버 후기 원문 보기 <i class="ph-bold ph-arrow-up-right"></i>
            </a>
          </div>
        </div>
      </article>
    `;
  });

  container.innerHTML = html;

  // Render pagination buttons
  if (paginationContainer) {
    if (totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    let pagHtml = `
      <button type="button" class="naver-page-btn naver-page-prev" ${currentNaverPage === 1 ? 'disabled' : ''} onclick="goToNaverPage(${currentNaverPage - 1})">
        <i class="ph-bold ph-caret-left"></i> 이전
      </button>
    `;

    for (let p = 1; p <= totalPages; p++) {
      pagHtml += `
        <button type="button" class="naver-page-btn ${p === currentNaverPage ? 'active' : ''}" onclick="goToNaverPage(${p})">
          ${p}
        </button>
      `;
    }

    pagHtml += `
      <button type="button" class="naver-page-btn naver-page-next" ${currentNaverPage === totalPages ? 'disabled' : ''} onclick="goToNaverPage(${currentNaverPage + 1})">
        다음 <i class="ph-bold ph-caret-right"></i>
      </button>
    `;

    paginationContainer.innerHTML = pagHtml;
  }
}

function goToNaverPage(page) {
  currentNaverPage = page;
  renderNaverReviewsPage();
  const section = document.getElementById('naver-reviews-section');
  if (section) {
    const headerHeight = document.getElementById('site-header')?.offsetHeight || 80;
    const targetPos = section.getBoundingClientRect().top + window.scrollY - headerHeight - 10;
    window.scrollTo({ top: targetPos, behavior: 'smooth' });
  }
}

// 8. Medical Law Member Auth System (로그인 / 회원가입 & 보호 콘텐츠 열람)
function initAuth() {
  const storedUser = localStorage.getItem('healim_auth_user');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      if (user && user.isAdmin) {
        user.name = '관리자';
        localStorage.setItem('healim_auth_user', JSON.stringify(user));
      }
      updateAuthUI(user);
    } catch (e) {
      localStorage.removeItem('healim_auth_user');
    }
  } else {
    updateAuthUI(null);
  }
}

function openAuthModal(tab = 'login') {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  switchAuthTab(tab);
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (!modal) return;
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

function switchAuthTab(tab) {
  const loginTabBtn = document.getElementById('tab-btn-login');
  const signupTabBtn = document.getElementById('tab-btn-signup');
  const adminTabBtn = document.getElementById('tab-btn-admin');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const adminForm = document.getElementById('admin-login-form');
  const socialGroup = document.getElementById('social-auth-group');
  const authDivider = document.getElementById('auth-divider');

  if (loginTabBtn) loginTabBtn.classList.remove('active');
  if (signupTabBtn) signupTabBtn.classList.remove('active');
  if (adminTabBtn) adminTabBtn.classList.remove('active');

  if (loginForm) loginForm.style.display = 'none';
  if (signupForm) signupForm.style.display = 'none';
  if (adminForm) adminForm.style.display = 'none';

  if (tab === 'signup') {
    if (signupTabBtn) signupTabBtn.classList.add('active');
    if (signupForm) signupForm.style.display = 'block';
    if (socialGroup) socialGroup.style.display = 'grid';
    if (authDivider) authDivider.style.display = 'flex';
  } else if (tab === 'admin') {
    if (adminTabBtn) adminTabBtn.classList.add('active');
    if (adminForm) adminForm.style.display = 'block';
    if (socialGroup) socialGroup.style.display = 'none';
    if (authDivider) authDivider.style.display = 'none';
    setTimeout(() => {
      document.getElementById('admin-direct-pwd')?.focus();
    }, 100);
  } else {
    if (loginTabBtn) loginTabBtn.classList.add('active');
    if (loginForm) loginForm.style.display = 'block';
    if (socialGroup) socialGroup.style.display = 'grid';
    if (authDivider) authDivider.style.display = 'flex';
  }
}

function handleDedicatedAdminLogin(e) {
  e.preventDefault();
  const pwdInput = document.getElementById('admin-direct-pwd');
  const pwd = pwdInput ? pwdInput.value.trim() : '';

  if (pwd === ADMIN_MASTER_PIN) {
    const adminUser = {
      name: '관리자',
      email: 'admin@healimbd.com',
      provider: 'admin',
      isAdmin: true,
      loginAt: new Date().toISOString()
    };
    sessionStorage.setItem('healim_admin_auth', 'true');
    localStorage.setItem('healim_auth_user', JSON.stringify(adminUser));
    updateAuthUI(adminUser);
    closeAuthModal();
    showAuthToast('👑 관리자 인증 완료! 모든 글쓰기 및 답변 관리 기능이 활성화되었습니다.');
    if (typeof renderInquiryList === 'function') {
      renderInquiryList();
    }
  } else {
    alert('비밀번호가 일치하지 않습니다. 관리자 비밀번호를 다시 확인해주세요.');
    if (pwdInput) {
      pwdInput.focus();
      pwdInput.select();
    }
  }
}

function handleSocialLogin(provider) {
  const providerName = provider === 'naver' ? '네이버' : '카카오';
  const dummyUser = {
    name: provider === 'naver' ? '네이버 인증회원' : '카카오 인증회원',
    email: provider === 'naver' ? 'naver_user@naver.com' : 'kakao_user@kakao.com',
    provider: provider,
    loginAt: new Date().toISOString()
  };

  localStorage.setItem('healim_auth_user', JSON.stringify(dummyUser));
  updateAuthUI(dummyUser);
  closeAuthModal();
  showAuthToast(`🎉 ${providerName} 간편 로그인 완료! 모든 치료사례와 자필 수기를 열람하실 수 있습니다.`);
}

function handleEmailLogin(e) {
  e.preventDefault();
  const emailInput = document.getElementById('login-email');
  const passwordInput = document.getElementById('login-password');
  const email = emailInput ? emailInput.value.trim() : '회원';
  const password = passwordInput ? passwordInput.value.trim() : '';

  let name = email.split('@')[0] || '회원';
  let isAdmin = false;

  // Check if admin login
  if (password === ADMIN_MASTER_PIN || email.toLowerCase() === 'admin' || email.toLowerCase() === 'healim') {
    if (password === ADMIN_MASTER_PIN) {
      isAdmin = true;
      name = '관리자';
      sessionStorage.setItem('healim_admin_auth', 'true');
    }
  }

  const user = {
    name: name,
    email: email,
    provider: 'email',
    isAdmin: isAdmin,
    loginAt: new Date().toISOString()
  };

  localStorage.setItem('healim_auth_user', JSON.stringify(user));
  updateAuthUI(user);
  closeAuthModal();

  if (isAdmin) {
    showAuthToast('👑 관리자로 로그인되었습니다. 모든 관리자 글쓰기 및 답변 기능이 활성화되었습니다.');
  } else {
    showAuthToast(`🎉 ${name}님 환영합니다! 로그인되어 자필 수기를 열람하실 수 있습니다.`);
  }

  if (typeof renderInquiryList === 'function') {
    renderInquiryList();
  }
}

function handleEmailSignup(e) {
  e.preventDefault();
  const nameInput = document.getElementById('signup-name');
  const emailInput = document.getElementById('signup-email');
  const name = nameInput ? nameInput.value.trim() : '회원';
  const email = emailInput ? emailInput.value.trim() : 'user@example.com';

  const user = {
    name: name,
    email: email,
    provider: 'signup',
    isAdmin: false,
    loginAt: new Date().toISOString()
  };

  localStorage.setItem('healim_auth_user', JSON.stringify(user));
  updateAuthUI(user);
  closeAuthModal();
  showAuthToast(`🎉 회원가입이 완료되었습니다! ${name}님 환영합니다.`);
}

function logoutUser() {
  localStorage.removeItem('healim_auth_user');
  sessionStorage.removeItem('healim_admin_auth');
  document.body.classList.remove('is-admin');
  updateAuthUI(null);
  showAuthToast('로그아웃 되었습니다.');
  if (typeof renderInquiryList === 'function') {
    renderInquiryList();
  }
}

function updateAuthUI(user) {
  const isAdmin = (user && user.isAdmin) || sessionStorage.getItem('healim_admin_auth') === 'true';
  document.body.classList.toggle('is-admin', !!isAdmin);

  const headerLoginBtn = document.getElementById('btn-header-login');
  const headerUserBadge = document.getElementById('header-user-badge');
  const loggedUserName = document.getElementById('logged-user-name');

  const drawerGuestBox = document.getElementById('drawer-guest-box');
  const drawerUserBox = document.getElementById('drawer-user-box');
  const drawerLoggedUserName = document.getElementById('drawer-logged-user-name');

  const protectedWrapper = document.getElementById('case-protected-wrapper');
  const unlockedBanner = document.getElementById('case-unlocked-banner');
  const unlockedUserName = document.getElementById('unlocked-user-name');

  if (user) {
    // Header state
    if (headerLoginBtn) headerLoginBtn.style.display = 'none';
    if (headerUserBadge) headerUserBadge.style.display = 'inline-flex';
    if (loggedUserName) loggedUserName.textContent = user.name;

    // Mobile drawer state
    if (drawerGuestBox) drawerGuestBox.style.display = 'none';
    if (drawerUserBox) drawerUserBox.style.display = 'flex';
    if (drawerLoggedUserName) drawerLoggedUserName.textContent = user.name;

    // Protected case single page unlock
    if (protectedWrapper) {
      protectedWrapper.classList.remove('is-locked');
    }
    if (unlockedBanner) {
      unlockedBanner.style.display = 'flex';
    }
    if (unlockedUserName) {
      unlockedUserName.textContent = user.name;
    }
  } else {
    // Header state
    if (headerLoginBtn) headerLoginBtn.style.display = 'inline-flex';
    if (headerUserBadge) headerUserBadge.style.display = 'none';

    // Mobile drawer state
    if (drawerGuestBox) drawerGuestBox.style.display = 'block';
    if (drawerUserBox) drawerUserBox.style.display = 'none';

    // Protected case single page lock
    if (protectedWrapper) {
      protectedWrapper.classList.add('is-locked');
    }
    if (unlockedBanner) {
      unlockedBanner.style.display = 'none';
    }
  }
}

// Simple Toast Notification
function showAuthToast(message) {
  let toast = document.getElementById('auth-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'auth-toast';
    toast.className = 'auth-toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// ==========================================================================
// 10. Admin Direct Case Writer & Reader (관리자 직접 글쓰기 및 사진 업로드 시스템)
// ==========================================================================
const ADMIN_MASTER_PIN = 'tmfltmfl11!';
let currentUploadedImageDataUrl = '';
let currentOpenedCustomCaseId = null;

const CATEGORY_NAME_MAP = {
  tic: '소아 틱장애',
  adhd: '소아·성인 ADHD',
  panic: '공황장애',
  anxiety: '불안장애·공포증',
  sleep: '수면·불면증',
  autonomic: '자율신경실조증',
  hyperhidrosis: '다한증',
  ibs: '과민성대장증후군',
  syncope: '미주신경성 실신',
  etc: '기타 신경정신'
};

function isUserAdmin() {
  if (sessionStorage.getItem('healim_admin_auth') === 'true') return true;
  try {
    const user = JSON.parse(localStorage.getItem('healim_auth_user') || 'null');
    if (user && user.isAdmin) return true;
  } catch (e) {}
  return false;
}

function initAdminCaseWriter() {
  renderCustomCasesToList();
}

function openAdminCaseWriter() {
  if (isUserAdmin()) {
    openAdminWriterModal();
  } else {
    openAdminAuthModal('case');
  }
}

function openAdminAuthModal(targetType = 'case') {
  window.adminTargetModal = targetType;
  const modal = document.getElementById('admin-auth-modal');
  const titleEl = document.getElementById('admin-auth-title');
  const subEl = document.querySelector('#admin-auth-modal .modal-subtitle');
  const errEl = document.getElementById('admin-auth-error');
  const pwdInput = document.getElementById('admin-password-input');

  if (targetType === 'column') {
    if (titleEl) titleEl.innerHTML = '<strong>관리자 인증</strong> (원장 칼럼 직접 등록)';
    if (subEl) subEl.textContent = '원장 칼럼을 직접 작성하고 썸네일을 등록하려면 관리자 비밀번호를 입력해주세요.';
  } else {
    if (titleEl) titleEl.innerHTML = '<strong>관리자 인증</strong> (치료사례 직접 등록)';
    if (subEl) subEl.textContent = '치료사례를 직접 작성하고 사진을 업로드하려면 관리자 비밀번호를 입력해주세요.';
  }

  if (errEl) errEl.style.display = 'none';
  if (pwdInput) pwdInput.value = '';
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      if (pwdInput) pwdInput.focus();
    }, 100);
  }
}

function closeAdminAuthModal() {
  const modal = document.getElementById('admin-auth-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function handleAdminAuthSubmit(e) {
  e.preventDefault();
  const pwdInput = document.getElementById('admin-password-input');
  const errEl = document.getElementById('admin-auth-error');
  const enteredPwd = pwdInput ? pwdInput.value.trim() : '';

  if (enteredPwd === ADMIN_MASTER_PIN) {
    sessionStorage.setItem('healim_admin_auth', 'true');
    const adminUser = {
      name: '대표원장 (관리자)',
      email: 'admin@healimbd.com',
      provider: 'admin',
      isAdmin: true,
      loginAt: new Date().toISOString()
    };
    localStorage.setItem('healim_auth_user', JSON.stringify(adminUser));
    updateAuthUI(adminUser);

    closeAdminAuthModal();
    const isColumn = window.adminTargetModal === 'column';
    showAuthToast(isColumn ? '🔓 관리자 인증 완료! 원장 칼럼 작성창이 열립니다.' : '🔓 관리자 인증 완료! 치료사례 작성창이 열립니다.');
    setTimeout(() => {
      if (isColumn) {
        openAdminColumnWriterModal();
      } else {
        openAdminWriterModal();
      }
      window.adminTargetModal = null;
    }, 200);
  } else {
    if (errEl) errEl.style.display = 'flex';
    if (pwdInput) {
      pwdInput.classList.add('error');
      pwdInput.focus();
    }
  }
}

function openAdminWriterModal() {
  const modal = document.getElementById('admin-case-writer-modal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    loadCaseDraft();
    setupCaseAutoSave();
  }
}

function closeAdminWriterModal() {
  const modal = document.getElementById('admin-case-writer-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

let caseAutoSaveBound = false;
function setupCaseAutoSave() {
  if (caseAutoSaveBound) return;
  caseAutoSaveBound = true;
  const form = document.getElementById('admin-case-write-form');
  if (!form) return;

  const debouncedSave = debounce(() => {
    saveCaseDraft();
  }, 1000);

  form.addEventListener('input', debouncedSave);
}

function saveCaseDraft() {
  const cat = document.getElementById('case-input-category')?.value || '';
  const startMonth = document.getElementById('case-input-start-month')?.value || '';
  const endMonth = document.getElementById('case-input-end-month')?.value || '';
  const content = document.getElementById('case-input-content')?.value || '';
  const hashtags = document.getElementById('case-input-hashtags')?.value || '';

  if (!content && !startMonth && !hashtags && !currentUploadedImageDataUrl) return;

  const draft = {
    category: cat,
    startMonth: startMonth,
    endMonth: endMonth,
    content: content,
    hashtags: hashtags,
    image: currentUploadedImageDataUrl || '',
    savedAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  };
  localStorage.setItem('healim_draft_case', JSON.stringify(draft));
}

function saveCaseDraftManual() {
  saveCaseDraft();
  showAuthToast('💾 치료사례 작성 내용이 임시저장되었습니다.');
}

function loadCaseDraft() {
  const draftStr = localStorage.getItem('healim_draft_case');
  if (!draftStr) return;
  try {
    const draft = JSON.parse(draftStr);
    if (!draft.content && !draft.startMonth && !draft.image && !draft.hashtags) return;

    if (draft.category) {
      const catEl = document.getElementById('case-input-category');
      if (catEl) catEl.value = draft.category;
    }
    if (draft.startMonth) {
      const el = document.getElementById('case-input-start-month');
      if (el) el.value = draft.startMonth;
    }
    if (draft.endMonth) {
      const el = document.getElementById('case-input-end-month');
      if (el) el.value = draft.endMonth;
    }
    if (draft.content) {
      const el = document.getElementById('case-input-content');
      if (el) el.value = draft.content;
    }
    if (draft.hashtags) {
      const el = document.getElementById('case-input-hashtags');
      if (el) el.value = draft.hashtags;
    }
    if (draft.image) {
      currentUploadedImageDataUrl = draft.image;
      const imgEl = document.getElementById('case-preview-img');
      const promptEl = document.getElementById('uploader-prompt');
      const previewEl = document.getElementById('uploader-preview');
      if (imgEl) imgEl.src = draft.image;
      if (promptEl) promptEl.style.display = 'none';
      if (previewEl) previewEl.style.display = 'flex';
    }
    updateDurationCalcPreview();
    showAuthToast(`📝 [${draft.savedAt || '이전'}] 임시저장된 치료사례를 불러왔습니다.`);
  } catch (e) {}
}

function clearCaseDraft() {
  localStorage.removeItem('healim_draft_case');
}

function handleCasePhotoSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('이미지 파일(JPG, PNG 등)만 첨부할 수 있습니다.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(evt) {
    currentUploadedImageDataUrl = evt.target.result;
    const promptEl = document.getElementById('uploader-prompt');
    const previewEl = document.getElementById('uploader-preview');
    const imgEl = document.getElementById('case-preview-img');

    if (imgEl) imgEl.src = currentUploadedImageDataUrl;
    if (promptEl) promptEl.style.display = 'none';
    if (previewEl) previewEl.style.display = 'flex';
    saveCaseDraft();
  };
  reader.readAsDataURL(file);
}

function removeCasePhoto() {
  currentUploadedImageDataUrl = '';
  const fileInput = document.getElementById('case-photo-file-input');
  const promptEl = document.getElementById('uploader-prompt');
  const previewEl = document.getElementById('uploader-preview');
  const imgEl = document.getElementById('case-preview-img');

  if (fileInput) fileInput.value = '';
  if (imgEl) imgEl.src = '';
  if (promptEl) promptEl.style.display = 'flex';
  if (previewEl) previewEl.style.display = 'none';
  saveCaseDraft();
}

function calculateDurationText(startMonthStr, endMonthStr) {
  if (!startMonthStr || !endMonthStr) return '';
  const [startYear, startMonth] = startMonthStr.split('-').map(Number);
  const [endYear, endMonth] = endMonthStr.split('-').map(Number);

  const totalMonths = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
  if (totalMonths <= 0) {
    return `${startYear}.${String(startMonth).padStart(2, '0')}`;
  }

  const years = Math.floor(totalMonths / 12);
  const remainingMonths = totalMonths % 12;

  let totalSpan = '';
  if (years > 0 && remainingMonths > 0) {
    totalSpan = `${years}년 ${remainingMonths}개월`;
  } else if (years > 0) {
    totalSpan = `${years}년`;
  } else {
    totalSpan = `${remainingMonths}개월`;
  }

  const formattedStart = `${startYear}.${String(startMonth).padStart(2, '0')}`;
  const formattedEnd = `${endYear}.${String(endMonth).padStart(2, '0')}`;

  return `${formattedStart} ~ ${formattedEnd} (총 ${totalSpan})`;
}

function updateDurationCalcPreview() {
  const startMonthEl = document.getElementById('case-input-start-month');
  const endMonthEl = document.getElementById('case-input-end-month');
  const previewEl = document.getElementById('duration-calc-preview');
  if (!startMonthEl || !endMonthEl || !previewEl) return;

  const startVal = startMonthEl.value;
  const endVal = endMonthEl.value;

  if (startVal && endVal) {
    const formatted = calculateDurationText(startVal, endVal);
    const match = formatted.match(/\(총 [^)]+\)/);
    if (match) {
      previewEl.textContent = `✨ ${match[0].replace(/[()]/g, '')}`;
      previewEl.classList.add('calculated');
    } else {
      previewEl.textContent = '총 기간 자동 계산';
      previewEl.classList.remove('calculated');
    }
  } else {
    previewEl.textContent = '총 기간 자동 계산';
    previewEl.classList.remove('calculated');
  }
}

function parseHashtags(rawInput) {
  if (!rawInput) return [];
  if (Array.isArray(rawInput)) return rawInput;
  return rawInput
    .split(/[\s,]+/)
    .map(tag => tag.trim().replace(/^#+/, ''))
    .filter(tag => tag.length > 0)
    .map(tag => '#' + tag);
}

function renderHashtagPills(hashtags) {
  if (!hashtags) return '';
  const list = Array.isArray(hashtags) ? hashtags : parseHashtags(hashtags);
  if (!list.length) return '';
  return `
    <div class="hashtag-pill-group">
      ${list.map(tag => `<span class="hashtag-pill">${tag}</span>`).join('')}
    </div>
  `;
}

function handleAdminCaseSubmit(e) {
  e.preventDefault();
  const cat = document.getElementById('case-input-category').value;
  const startMonth = document.getElementById('case-input-start-month').value;
  const endMonth = document.getElementById('case-input-end-month').value;
  const content = document.getElementById('case-input-content').value.trim();
  const hashtagsVal = document.getElementById('case-input-hashtags')?.value.trim() || '';

  if (!startMonth || !endMonth) {
    alert('치료 시작년월과 종료년월을 선택해주세요.');
    return;
  }

  if (!content) {
    alert('직접 작성할 본문 내용을 입력해주세요.');
    return;
  }

  if (!currentUploadedImageDataUrl) {
    alert('치료사례 사진(자필 수기 또는 진료 사진)을 첨부해주세요.');
    return;
  }

  const catName = CATEGORY_NAME_MAP[cat] || '치료사례';
  const durationStr = calculateDurationText(startMonth, endMonth);
  const firstLine = content.split('\n')[0].replace(/^[#>\s*"]+/, '').trim();
  const generatedTitle = firstLine.length > 5 ? (firstLine.slice(0, 45) + (firstLine.length > 45 ? '...' : '')) : `${catName} 임상 치료사례`;

  const newCase = {
    id: 'custom-' + Date.now(),
    title: generatedTitle,
    category: cat,
    categoryName: catName,
    duration: durationStr,
    date: new Date().toISOString().split('T')[0],
    image: currentUploadedImageDataUrl,
    content: content,
    hashtags: parseHashtags(hashtagsVal),
    createdAt: Date.now()
  };

  const stored = JSON.parse(localStorage.getItem('healim_custom_cases') || '[]');
  stored.unshift(newCase);
  localStorage.setItem('healim_custom_cases', JSON.stringify(stored));

  clearCaseDraft();
  closeAdminWriterModal();

  // Reset Form
  document.getElementById('admin-case-write-form').reset();
  removeCasePhoto();
  updateDurationCalcPreview();

  showAuthToast('🎉 치료사례가 성공적으로 등록되었습니다!');
  renderCustomCasesToList();
}

function renderCustomCasesToList() {
  const customCases = JSON.parse(localStorage.getItem('healim_custom_cases') || '[]');
  if (!customCases.length) return;

  // 1. Direct Cases Grid on /reviews/
  const directGrid = document.getElementById('direct-cases-grid');
  if (directGrid) {
    directGrid.querySelectorAll('.injected-custom-case').forEach(el => el.remove());

    customCases.slice().reverse().forEach(item => {
      const card = document.createElement('article');
      card.className = 'healim-case-card injected-custom-case';
      card.setAttribute('data-category', item.category);
      card.setAttribute('data-review-type', 'direct');

      const hashtagsHtml = renderHashtagPills(item.hashtags);

      card.innerHTML = `
        <div class="case-card-anchor" style="cursor: pointer;" onclick="openCustomCaseReader('${item.id}')">
          <div class="case-thumb-wrap">
            <img src="${item.image}" alt="${item.categoryName} 치료사례" class="case-thumb-img" loading="lazy">
            <span class="case-tag-pill ${item.category}">${item.categoryName}</span>
            <span class="case-direct-badge">📝 임상 치료사례</span>
          </div>
          <div class="case-body-wrap">
            <div class="case-meta-top">
              <span class="case-duration-text"><i class="ph-bold ph-calendar-blank"></i> 치료기간: ${item.duration || item.date}</span>
            </div>
            <p class="case-summary-text">${item.content}</p>
            ${hashtagsHtml}
          </div>
        </div>
      `;
      directGrid.prepend(card);
    });
  }

  // 2. Cases Home Grid on Homepage (#reviews)
  const homeGrid = document.querySelector('.cases-home-grid');
  if (homeGrid) {
    homeGrid.querySelectorAll('.injected-custom-case').forEach(el => el.remove());

    customCases.slice(0, 2).reverse().forEach(item => {
      const card = document.createElement('article');
      card.className = 'healim-case-card injected-custom-case';
      card.setAttribute('data-category', item.category);

      const hashtagsHtml = renderHashtagPills(item.hashtags);

      card.innerHTML = `
        <div class="case-card-anchor" style="cursor: pointer;" onclick="openCustomCaseReader('${item.id}')">
          <div class="case-thumb-wrap">
            <img src="${item.image}" alt="${item.categoryName} 치료사례" class="case-thumb-img" loading="lazy">
            <span class="case-tag-pill ${item.category}">${item.categoryName}</span>
            <span class="case-direct-badge">📝 임상 치료사례</span>
          </div>
          <div class="case-body-wrap">
            <div class="case-meta-top">
              <span class="case-duration-text"><i class="ph-bold ph-calendar-blank"></i> 치료기간: ${item.duration || item.date}</span>
            </div>
            <p class="case-summary-text">${item.content}</p>
            ${hashtagsHtml}
          </div>
        </div>
      `;
      homeGrid.prepend(card);
    });
  }
}

function openCustomCaseReader(caseId) {
  const customCases = JSON.parse(localStorage.getItem('healim_custom_cases') || '[]');
  const found = customCases.find(c => c.id === caseId);
  if (!found) return;

  currentOpenedCustomCaseId = caseId;
  const modal = document.getElementById('custom-case-reader-modal');
  const catEl = document.getElementById('custom-reader-category');
  const titleEl = document.getElementById('custom-case-reader-title');
  const durationEl = document.getElementById('custom-reader-duration');
  const photoEl = document.getElementById('custom-reader-photo');
  const bodyEl = document.getElementById('custom-reader-body');
  const hashtagsEl = document.getElementById('custom-reader-hashtags');

  if (catEl) {
    catEl.textContent = found.categoryName;
    catEl.className = 'case-tag-pill ' + found.category;
  }
  if (titleEl) titleEl.textContent = found.title;
  if (durationEl) durationEl.textContent = `치료기간: ${found.duration || found.date}`;
  if (photoEl) photoEl.src = found.image;
  if (bodyEl) bodyEl.innerHTML = found.content.replace(/\n/g, '<br>');

  if (hashtagsEl) {
    const list = found.hashtags || [];
    if (list.length) {
      hashtagsEl.innerHTML = renderHashtagPills(list);
      hashtagsEl.style.display = 'block';
    } else {
      hashtagsEl.innerHTML = '';
      hashtagsEl.style.display = 'none';
    }
  }

  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeCustomCaseReader() {
  const modal = document.getElementById('custom-case-reader-modal');
  currentOpenedCustomCaseId = null;
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function deleteCurrentCustomCase() {
  if (!currentOpenedCustomCaseId) return;
  if (!confirm('정말 이 치료사례를 삭제하시겠습니까?')) return;

  let customCases = JSON.parse(localStorage.getItem('healim_custom_cases') || '[]');
  customCases = customCases.filter(c => c.id !== currentOpenedCustomCaseId);
  localStorage.setItem('healim_custom_cases', JSON.stringify(customCases));

  closeCustomCaseReader();
  showAuthToast('🗑️ 게시글이 삭제되었습니다.');
  location.reload();
}

function downloadCaseMarkdown() {
  const cat = document.getElementById('case-input-category').value;
  const startMonth = document.getElementById('case-input-start-month').value || '2026-01';
  const endMonth = document.getElementById('case-input-end-month').value || '2026-04';
  const durationStr = calculateDurationText(startMonth, endMonth);
  const content = document.getElementById('case-input-content').value.trim() || '';
  const dateStr = new Date().toISOString().split('T')[0];
  const catName = CATEGORY_NAME_MAP[cat] || '치료사례';
  const firstLine = content.split('\n')[0].replace(/^[#>\s*"]+/, '').trim();
  const title = firstLine.length > 5 ? firstLine.slice(0, 45) : `${catName} 임상 치료사례`;

  const mdContent = `---
title: "${title}"
date: ${dateStr}
duration: "${durationStr}"
category: "${cat}"
category_name: "${catName}"
review_type: "direct"
rating: 5
image: "images/reviews/${cat}-custom-${Date.now()}.jpg"
summary: "${content.slice(0, 120)}..."
---

${content}
`;

  const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `case-${cat}-${dateStr}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ==========================================================================
   DOCTOR'S COLUMN BOARD & ADMIN WRITER SUITE
   ========================================================================== */

let currentUploadedColPhotoDataUrl = '';
let currentOpenedCustomColumnId = null;

const DEFAULT_COLUMNS_DATA = {};

function initAdminColumnBoard() {
  const dateInput = document.getElementById('column-input-date');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
  renderCustomColumns();
}

function openAdminColumnWriter() {
  if (isUserAdmin()) {
    openAdminColumnWriterModal();
  } else {
    openAdminAuthModal('column');
  }
}

function openAdminColumnWriterModal() {
  const modal = document.getElementById('admin-column-writer-modal');
  const dateInput = document.getElementById('column-input-date');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    loadColumnDraft();
    setupColumnAutoSave();
  }
}

function closeAdminColumnWriterModal() {
  const modal = document.getElementById('admin-column-writer-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

let columnAutoSaveBound = false;
function setupColumnAutoSave() {
  if (columnAutoSaveBound) return;
  columnAutoSaveBound = true;
  const form = document.getElementById('admin-column-write-form');
  if (!form) return;

  const debouncedSave = debounce(() => {
    saveColumnDraft();
  }, 1000);

  form.addEventListener('input', debouncedSave);
}

function saveColumnDraft() {
  const cat = document.getElementById('column-input-category')?.value || '';
  const title = document.getElementById('column-input-title')?.value || '';
  const date = document.getElementById('column-input-date')?.value || '';
  const content = document.getElementById('column-input-content')?.value || '';
  const hashtags = document.getElementById('column-input-hashtags')?.value || '';

  if (!title && !content && !hashtags && !currentUploadedColPhotoDataUrl) return;

  const draft = {
    category: cat,
    title: title,
    date: date,
    content: content,
    hashtags: hashtags,
    image: currentUploadedColPhotoDataUrl || '',
    savedAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  };
  localStorage.setItem('healim_draft_column', JSON.stringify(draft));
}

function saveColumnDraftManual() {
  saveColumnDraft();
  showAuthToast('💾 칼럼 작성 내용이 임시저장되었습니다.');
}

function loadColumnDraft() {
  const draftStr = localStorage.getItem('healim_draft_column');
  if (!draftStr) return;
  try {
    const draft = JSON.parse(draftStr);
    if (!draft.title && !draft.content && !draft.image && !draft.hashtags) return;

    if (draft.category) {
      const el = document.getElementById('column-input-category');
      if (el) el.value = draft.category;
    }
    if (draft.title) {
      const el = document.getElementById('column-input-title');
      if (el) el.value = draft.title;
    }
    if (draft.date) {
      const el = document.getElementById('column-input-date');
      if (el) el.value = draft.date;
    }
    if (draft.content) {
      const el = document.getElementById('column-input-content');
      if (el) el.value = draft.content;
    }
    if (draft.hashtags) {
      const el = document.getElementById('column-input-hashtags');
      if (el) el.value = draft.hashtags;
    }
    if (draft.image) {
      currentUploadedColPhotoDataUrl = draft.image;
      const imgEl = document.getElementById('col-preview-img');
      const promptEl = document.getElementById('col-uploader-prompt');
      const previewEl = document.getElementById('col-uploader-preview');
      if (imgEl) imgEl.src = draft.image;
      if (promptEl) promptEl.style.display = 'none';
      if (previewEl) previewEl.style.display = 'flex';
    }
    showAuthToast(`📝 [${draft.savedAt || '이전'}] 임시저장된 칼럼을 불러왔습니다.`);
  } catch (e) {}
}

function clearColumnDraft() {
  localStorage.removeItem('healim_draft_column');
}

function handleColumnPhotoSelect(e) {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    alert('이미지 파일(JPG, PNG 등)만 첨부할 수 있습니다.');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(evt) {
    currentUploadedColPhotoDataUrl = evt.target.result;
    const promptEl = document.getElementById('col-uploader-prompt');
    const previewEl = document.getElementById('col-uploader-preview');
    const imgEl = document.getElementById('col-preview-img');

    if (imgEl) imgEl.src = currentUploadedColPhotoDataUrl;
    if (promptEl) promptEl.style.display = 'none';
    if (previewEl) previewEl.style.display = 'flex';
    saveColumnDraft();
  };
  reader.readAsDataURL(file);
}

function removeColumnPhoto() {
  currentUploadedColPhotoDataUrl = '';
  const fileInput = document.getElementById('col-photo-file-input');
  const promptEl = document.getElementById('col-uploader-prompt');
  const previewEl = document.getElementById('col-uploader-preview');
  const imgEl = document.getElementById('col-preview-img');

  if (fileInput) fileInput.value = '';
  if (imgEl) imgEl.src = '';
  if (promptEl) promptEl.style.display = 'flex';
  if (previewEl) previewEl.style.display = 'none';
  saveColumnDraft();
}

function handleAdminColumnSubmit(e) {
  e.preventDefault();

  const category = document.getElementById('column-input-category').value;
  const title = document.getElementById('column-input-title').value.trim();
  const dateVal = document.getElementById('column-input-date').value || new Date().toISOString().split('T')[0];
  const content = document.getElementById('column-input-content').value.trim();
  const hashtagsVal = document.getElementById('column-input-hashtags')?.value.trim() || '';

  if (!title || !content) {
    alert('칼럼 제목과 본문 내용을 모두 입력해주세요.');
    return;
  }

  const categoryName = CATEGORY_NAME_MAP[category] || '신경정신 칼럼';
  const formattedDate = dateVal.replace(/-/g, '.');

  const newColumn = {
    id: 'col_' + Date.now(),
    category: category,
    categoryName: categoryName,
    title: title,
    date: formattedDate,
    author: '손지웅 대표원장',
    image: currentUploadedColPhotoDataUrl || '',
    content: content,
    hashtags: parseHashtags(hashtagsVal),
    summary: content.slice(0, 110) + (content.length > 110 ? '...' : '')
  };

  const customColumns = JSON.parse(localStorage.getItem('healim_custom_columns') || '[]');
  customColumns.unshift(newColumn);
  localStorage.setItem('healim_custom_columns', JSON.stringify(customColumns));

  clearColumnDraft();
  showAuthToast('🎉 원장 칼럼이 성공적으로 게시판에 등록되었습니다!');
  closeAdminColumnWriterModal();

  // Reset form
  document.getElementById('admin-column-write-form').reset();
  removeColumnPhoto();

  renderCustomColumns();
}

const CLINIC_THUMB_MAP = {
  tic: 'images/clinics/tic.jpg',
  adhd: 'images/clinics/adhd.jpg',
  panic: 'images/clinics/panic.jpg',
  anxiety: 'images/clinics/anxiety.jpg',
  sleep: 'images/clinics/sleep.jpg',
  autonomic: 'images/clinics/autonomic.jpg',
  hyperhidrosis: 'images/clinics/hyperhidrosis.jpg',
  ibs: 'images/clinics/ibs.jpg',
  syncope: 'images/clinics/syncope.jpg',
  general: 'images/clinics/autonomic.jpg'
};

function renderCustomColumns() {
  const grids = document.querySelectorAll('#column-cards-grid');
  if (!grids.length) return;

  const customColumns = JSON.parse(localStorage.getItem('healim_custom_columns') || '[]');

  grids.forEach(grid => {
    grid.querySelectorAll('.injected-custom-column').forEach(el => el.remove());

    const emptyState = grid.querySelector('.column-empty-state');
    const staticCards = grid.querySelectorAll('.static-column-card');

    if (customColumns.length > 0) {
      if (emptyState) emptyState.style.display = 'none';

      customColumns.slice().reverse().forEach(col => {
        const card = document.createElement('article');
        card.className = 'doctor-column-row-item custom-column-card injected-custom-column';
        card.setAttribute('data-category', col.category);
        card.onclick = () => openCustomColumnReader(col.id);

        const colImg = col.image || CLINIC_THUMB_MAP[col.category] || 'images/clinics/autonomic.jpg';
        const hashtagsHtml = renderHashtagPills(col.hashtags);

        card.innerHTML = `
          <div class="col-row-thumb-wrap">
            <img src="${colImg}" alt="${col.title}" class="col-row-thumb-img" loading="lazy">
            <span class="col-badge-pill ${col.category}">${col.categoryName}</span>
          </div>
          <div class="col-row-body">
            <div class="col-row-meta-top">
              <span class="col-badge-pill-inline ${col.category}">${col.categoryName}</span>
              <span class="col-row-date">${col.date}</span>
            </div>
            <h3 class="col-row-title">${col.title}</h3>
            <p class="col-row-desc">${col.summary}</p>
            <div class="col-row-footer">
              <span class="col-row-author"><i class="ph-bold ph-stethoscope"></i> ${col.author}</span>
              ${hashtagsHtml}
              <span class="col-row-read-btn">전문 읽기 <i class="ph-bold ph-arrow-right"></i></span>
            </div>
          </div>
        `;
        grid.prepend(card);
      });
    } else {
      if (staticCards.length === 0 && emptyState) {
        emptyState.style.display = 'flex';
      } else if (emptyState) {
        emptyState.style.display = 'none';
      }
    }
  });
}

function filterColumnCategory(filterKey) {
  // Update Tab Active state
  const tabs = document.querySelectorAll('.column-category-tabs .col-tab-btn');
  tabs.forEach(tab => {
    if (tab.getAttribute('data-filter') === filterKey) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Filter column cards
  const cards = document.querySelectorAll('.doctor-column-row-item');
  let visibleCount = 0;
  cards.forEach(card => {
    const cardCat = card.getAttribute('data-category');
    if (filterKey === 'all' || cardCat === filterKey) {
      card.style.display = 'flex';
      card.classList.add('fade-in');
      visibleCount++;
    } else {
      card.style.display = 'none';
    }
  });
}

function openDefaultColumnModal(catKey) {
  const found = DEFAULT_COLUMNS_DATA[catKey];
  if (!found) return;

  currentOpenedCustomColumnId = null; // Default column cannot be deleted
  const modal = document.getElementById('column-reader-modal');
  const catEl = document.getElementById('col-reader-category');
  const titleEl = document.getElementById('col-reader-title');
  const authorEl = document.getElementById('col-reader-author');
  const dateEl = document.getElementById('col-reader-date');
  const photoBox = document.getElementById('col-reader-photo-box');
  const photoEl = document.getElementById('col-reader-photo');
  const bodyEl = document.getElementById('col-reader-body');
  const hashtagsEl = document.getElementById('col-reader-hashtags');
  const deleteBtn = document.getElementById('btn-delete-custom-col');

  if (catEl) {
    catEl.textContent = found.categoryName;
    catEl.className = 'case-tag-pill ' + found.category;
  }
  if (titleEl) titleEl.textContent = found.title;
  if (authorEl) authorEl.textContent = found.author;
  if (dateEl) dateEl.textContent = found.date;

  if (found.image && photoBox && photoEl) {
    photoEl.src = found.image;
    photoBox.style.display = 'block';
  } else if (photoBox) {
    photoBox.style.display = 'none';
  }

  if (bodyEl) bodyEl.innerHTML = found.content.replace(/\n/g, '<br>');
  if (hashtagsEl) {
    hashtagsEl.innerHTML = '';
    hashtagsEl.style.display = 'none';
  }
  if (deleteBtn) deleteBtn.style.display = 'none';

  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function openCustomColumnReader(colId) {
  const customColumns = JSON.parse(localStorage.getItem('healim_custom_columns') || '[]');
  const found = customColumns.find(c => c.id === colId);
  if (!found) return;

  currentOpenedCustomColumnId = colId;
  const modal = document.getElementById('column-reader-modal');
  const catEl = document.getElementById('col-reader-category');
  const titleEl = document.getElementById('col-reader-title');
  const authorEl = document.getElementById('col-reader-author');
  const dateEl = document.getElementById('col-reader-date');
  const photoBox = document.getElementById('col-reader-photo-box');
  const photoEl = document.getElementById('col-reader-photo');
  const bodyEl = document.getElementById('col-reader-body');
  const hashtagsEl = document.getElementById('col-reader-hashtags');
  const deleteBtn = document.getElementById('btn-delete-custom-col');

  if (catEl) {
    catEl.textContent = found.categoryName;
    catEl.className = 'case-tag-pill ' + found.category;
  }
  if (titleEl) titleEl.textContent = found.title;
  if (authorEl) authorEl.textContent = found.author || '손지웅 대표원장';
  if (dateEl) dateEl.textContent = found.date;

  if (found.image && photoBox && photoEl) {
    photoEl.src = found.image;
    photoBox.style.display = 'block';
  } else if (photoBox) {
    photoBox.style.display = 'none';
  }

  if (bodyEl) bodyEl.innerHTML = found.content.replace(/\n/g, '<br>');

  if (hashtagsEl) {
    const list = found.hashtags || [];
    if (list.length) {
      hashtagsEl.innerHTML = renderHashtagPills(list);
      hashtagsEl.style.display = 'block';
    } else {
      hashtagsEl.innerHTML = '';
      hashtagsEl.style.display = 'none';
    }
  }

  if (deleteBtn) deleteBtn.style.display = 'inline-flex';

  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeColumnReader() {
  const modal = document.getElementById('column-reader-modal');
  currentOpenedCustomColumnId = null;
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function deleteCurrentCustomColumn() {
  if (!currentOpenedCustomColumnId) return;
  if (!confirm('정말 이 칼럼을 삭제하시겠습니까?')) return;

  let customColumns = JSON.parse(localStorage.getItem('healim_custom_columns') || '[]');
  customColumns = customColumns.filter(c => c.id !== currentOpenedCustomColumnId);
  localStorage.setItem('healim_custom_columns', JSON.stringify(customColumns));

  closeColumnReader();
  showAuthToast('🗑️ 칼럼이 삭제되었습니다.');
  renderCustomColumns();
}

function downloadColumnMarkdown() {
  const cat = document.getElementById('column-input-category').value;
  const title = document.getElementById('column-input-title').value.trim() || '의학 칼럼';
  const dateVal = document.getElementById('column-input-date').value || new Date().toISOString().split('T')[0];
  const content = document.getElementById('column-input-content').value.trim() || '';
  const hashtagsVal = document.getElementById('column-input-hashtags')?.value.trim() || '';
  const catName = CATEGORY_NAME_MAP[cat] || '신경정신';

  const mdContent = `---
title: "${title}"
date: ${dateVal}
category: "${cat}"
category_name: "${catName}"
author: "손지웅 대표원장"
hashtags: "${hashtagsVal}"
summary: "${content.slice(0, 120)}..."
---

${content}
`;

  const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `column-${cat}-${dateVal}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==========================================================================
// 12. ONLINE INQUIRY & 1:1 Q&A CONSULTATION ENGINE
// ==========================================================================
let currentInquiryFilter = 'all';
let currentInquirySearchQuery = '';
let currentOpenedInquiryId = null;
let currentPendingVerifyInquiryId = null;

const DEFAULT_INQUIRIES = [];

function initOnlineInquiry() {
  const tbody = document.getElementById('inquiry-list-tbody');
  if (!tbody) return;

  const stored = localStorage.getItem('healim_online_inquiries');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Filter out any sample IDs (inq-101 ~ inq-106)
      const sampleIds = ['inq-101', 'inq-102', 'inq-103', 'inq-104', 'inq-105', 'inq-106'];
      const cleaned = parsed.filter(item => !sampleIds.includes(item.id));
      localStorage.setItem('healim_online_inquiries', JSON.stringify(cleaned));
    } catch (e) {
      localStorage.setItem('healim_online_inquiries', '[]');
    }
  } else {
    localStorage.setItem('healim_online_inquiries', '[]');
  }

  renderInquiryList();
}

function getStoredInquiries() {
  const stored = localStorage.getItem('healim_online_inquiries');
  if (stored) {
    try {
      const sampleIds = ['inq-101', 'inq-102', 'inq-103', 'inq-104', 'inq-105', 'inq-106'];
      const parsed = JSON.parse(stored);
      return parsed.filter(item => !sampleIds.includes(item.id));
    } catch (e) {
      return [];
    }
  }
  return [];
}

function renderInquiryList() {
  const tbody = document.getElementById('inquiry-list-tbody');
  const emptyState = document.getElementById('inquiry-empty-state');
  if (!tbody) return;

  const allItems = getStoredInquiries();

  // Filter by Category
  let filtered = allItems;
  if (currentInquiryFilter !== 'all') {
    filtered = filtered.filter(item => item.category === currentInquiryFilter);
  }

  // Filter by Search Query
  if (currentInquirySearchQuery) {
    const q = currentInquirySearchQuery.toLowerCase();
    filtered = filtered.filter(item => 
      item.title.toLowerCase().includes(q) ||
      item.disease.toLowerCase().includes(q) ||
      item.content.toLowerCase().includes(q) ||
      item.author.toLowerCase().includes(q) ||
      item.region.toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';

  let html = '';
  filtered.forEach((item, index) => {
    const num = filtered.length - index;
    const catClass = item.category || 'etc';
    const isAnswered = item.status === 'answered';
    const statusText = isAnswered ? '답변완료' : '답변대기';
    const statusClass = isAnswered ? 'answered' : 'pending';

    html += `
      <tr onclick="handleInquiryClick('${item.id}')">
        <td class="col-num">${num}</td>
        <td class="col-cat">
          <span class="cat-badge ${catClass}">${item.disease}</span>
        </td>
        <td class="col-title">
          <span class="table-title-link">
            <span>${item.title}</span>
          </span>
        </td>
        <td class="col-author">${item.author}</td>
        <td class="col-info">${item.region} (${item.age} / ${item.gender})</td>
        <td class="col-date">${item.date}</td>
        <td class="col-status">
          <span class="status-badge ${statusClass}">${statusText}</span>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function getCategoryTitle(cat) {
  const map = {
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
  return map[cat] || '기타 질환';
}

function filterInquiryCategory(cat) {
  currentInquiryFilter = cat;
  const buttons = document.querySelectorAll('#inquiry-category-tabs .inquiry-tab-btn');
  buttons.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-category') === cat);
  });
  renderInquiryList();
}

function handleInquirySearch(e) {
  currentInquirySearchQuery = e.target.value.trim();
  renderInquiryList();
}

// Modal open/close & Draft
function openInquiryWriteModal() {
  const modal = document.getElementById('inquiry-write-modal');
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    loadInquiryDraft();
    setupInquiryAutoSave();
  }
}

function closeInquiryWriteModal() {
  const modal = document.getElementById('inquiry-write-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

let inqAutoSaveBound = false;
function setupInquiryAutoSave() {
  if (inqAutoSaveBound) return;
  inqAutoSaveBound = true;
  const form = document.getElementById('inquiry-submit-form');
  if (!form) return;

  const debouncedSave = debounce(() => {
    saveInquiryDraft();
  }, 1000);

  form.addEventListener('input', debouncedSave);
  form.addEventListener('change', debouncedSave);
}

function saveInquiryDraft() {
  const region = document.getElementById('inq-region')?.value || '';
  const age = document.getElementById('inq-age')?.value || '';
  const gender = document.querySelector('input[name="inq-gender"]:checked')?.value || '남';
  const author = document.getElementById('inq-author')?.value || '';
  const diseaseEl = document.querySelector('input[name="inq-disease"]:checked');
  const diseaseVal = diseaseEl ? diseaseEl.value : '';
  const title = document.getElementById('inq-title')?.value || '';
  const content = document.getElementById('inq-content')?.value || '';

  if (!title && !content && !author) return;

  const draft = {
    region: region,
    age: age,
    gender: gender,
    author: author,
    disease: diseaseVal,
    title: title,
    content: content,
    savedAt: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  };
  localStorage.setItem('healim_draft_inquiry', JSON.stringify(draft));
}

function saveInquiryDraftManual() {
  saveInquiryDraft();
  showAuthToast('💾 상담 문의글이 임시저장되었습니다.');
}

function loadInquiryDraft() {
  const draftStr = localStorage.getItem('healim_draft_inquiry');
  if (!draftStr) return;
  try {
    const draft = JSON.parse(draftStr);
    if (!draft.title && !draft.content && !draft.author) return;

    if (draft.region) {
      const el = document.getElementById('inq-region');
      if (el) el.value = draft.region;
    }
    if (draft.age) {
      const el = document.getElementById('inq-age');
      if (el) el.value = draft.age;
    }
    if (draft.gender) {
      const el = document.querySelector(`input[name="inq-gender"][value="${draft.gender}"]`);
      if (el) el.checked = true;
    }
    if (draft.author) {
      const el = document.getElementById('inq-author');
      if (el) el.value = draft.author;
    }
    if (draft.disease) {
      const el = document.querySelector(`input[name="inq-disease"][value="${draft.disease}"]`);
      if (el) el.checked = true;
    }
    if (draft.title) {
      const el = document.getElementById('inq-title');
      if (el) el.value = draft.title;
    }
    if (draft.content) {
      const el = document.getElementById('inq-content');
      if (el) el.value = draft.content;
    }
    showAuthToast(`📝 [${draft.savedAt || '이전'}] 임시저장된 상담글을 불러왔습니다.`);
  } catch (e) {}
}

function clearInquiryDraft() {
  localStorage.removeItem('healim_draft_inquiry');
}

function handleInquirySubmit(e) {
  e.preventDefault();

  const region = document.getElementById('inq-region')?.value.trim() || '분당';
  const age = document.getElementById('inq-age')?.value.trim() || '20대';
  const gender = document.querySelector('input[name="inq-gender"]:checked')?.value || '남';
  const rawAuthor = document.getElementById('inq-author')?.value.trim() || '방문자';
  const password = document.getElementById('inq-password')?.value.trim() || '1234';

  // Selected disease & category
  const selectedDiseaseEl = document.querySelector('input[name="inq-disease"]:checked');
  const disease = selectedDiseaseEl ? selectedDiseaseEl.value : '틱장애·뚜렛';
  const category = selectedDiseaseEl ? selectedDiseaseEl.getAttribute('data-category') : 'tic';

  const title = document.getElementById('inq-title')?.value.trim() || '상담 문의';
  const content = document.getElementById('inq-content')?.value.trim() || '';

  // Mask author name (e.g. 홍길동 -> 홍*동)
  let maskedAuthor = rawAuthor;
  if (rawAuthor.length > 2) {
    maskedAuthor = rawAuthor[0] + '*'.repeat(rawAuthor.length - 2) + rawAuthor[rawAuthor.length - 1];
  } else if (rawAuthor.length === 2) {
    maskedAuthor = rawAuthor[0] + '*';
  }

  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

  const newInquiry = {
    id: `inq-${Date.now()}`,
    category: category,
    disease: disease,
    title: title,
    author: maskedAuthor,
    region: region,
    age: age,
    gender: gender,
    date: dateStr,
    isSecret: false,
    password: password,
    status: 'pending',
    content: content,
    hashtags: [],
    answer: '',
    answerDate: ''
  };

  const stored = getStoredInquiries();
  stored.unshift(newInquiry);
  localStorage.setItem('healim_online_inquiries', JSON.stringify(stored));

  clearInquiryDraft();
  // Reset form & close modal
  document.getElementById('inquiry-submit-form')?.reset();
  closeInquiryWriteModal();
  showAuthToast('🎉 온라인 상담글이 등록되었습니다. 손지웅 원장님이 확인 후 성심성의껏 답변을 등록해 드립니다.');
  renderInquiryList();
}

function handleInquiryClick(id) {
  // Publicly readable for all visitors
  openInquiryDetailModal(id);
}

function openInquiryPwdModal(id) {
  currentPendingVerifyInquiryId = id;
  const modal = document.getElementById('inquiry-pwd-modal');
  const input = document.getElementById('inq-verify-pwd-input');
  const errorEl = document.getElementById('inq-pwd-error');

  if (input) input.value = '';
  if (errorEl) errorEl.style.display = 'none';

  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => { if (input) input.focus(); }, 100);
  }
}

function closeInquiryPwdModal() {
  const modal = document.getElementById('inquiry-pwd-modal');
  currentPendingVerifyInquiryId = null;
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function handleInquiryPwdSubmit(e) {
  e.preventDefault();
  if (!currentPendingVerifyInquiryId) return;

  const input = document.getElementById('inq-verify-pwd-input');
  const errorEl = document.getElementById('inq-pwd-error');
  const enteredPwd = input ? input.value.trim() : '';

  const items = getStoredInquiries();
  const found = items.find(item => item.id === currentPendingVerifyInquiryId);

  if (found && (enteredPwd === found.password || enteredPwd === ADMIN_MASTER_PIN)) {
    sessionStorage.setItem(`inq_verified_${found.id}`, 'true');
    const targetId = found.id;
    closeInquiryPwdModal();
    openInquiryDetailModal(targetId);
  } else {
    if (errorEl) errorEl.style.display = 'block';
    if (input) {
      input.classList.add('error');
      input.focus();
    }
  }
}

function openInquiryDetailModal(id) {
  const items = getStoredInquiries();
  const found = items.find(item => item.id === id);
  if (!found) return;

  currentOpenedInquiryId = id;

  const modal = document.getElementById('inquiry-detail-modal');
  const diseaseTag = document.getElementById('view-inq-disease');
  const statusTag = document.getElementById('view-inq-status');
  const titleEl = document.getElementById('view-inq-title');
  const authorEl = document.getElementById('view-inq-author');
  const regionEl = document.getElementById('view-inq-region');
  const ageEl = document.getElementById('view-inq-age');
  const genderEl = document.getElementById('view-inq-gender');
  const dateEl = document.getElementById('view-inq-date');
  const contentEl = document.getElementById('view-inq-content');

  const answerWrapper = document.getElementById('view-doctor-answer-wrapper');
  const answerContentEl = document.getElementById('view-doctor-answer-content');
  const answerDateEl = document.getElementById('view-answer-date');
  const unansweredBox = document.getElementById('view-unanswered-box');
  const replyBtnText = document.getElementById('admin-reply-btn-text');

  if (diseaseTag) diseaseTag.textContent = found.disease;
  if (statusTag) {
    statusTag.textContent = found.status === 'answered' ? '답변완료' : '답변대기';
    statusTag.className = 'detail-status-tag ' + (found.status === 'answered' ? 'answered' : 'pending');
  }
  if (titleEl) titleEl.textContent = found.title;
  if (authorEl) authorEl.textContent = found.author;
  if (regionEl) regionEl.textContent = found.region;
  if (ageEl) ageEl.textContent = found.age;
  if (genderEl) genderEl.textContent = found.gender;
  if (dateEl) dateEl.textContent = found.date;
  if (contentEl) contentEl.textContent = found.content;

  if (found.status === 'answered' && found.answer) {
    if (answerWrapper) answerWrapper.style.display = 'block';
    if (unansweredBox) unansweredBox.style.display = 'none';
    if (answerContentEl) answerContentEl.textContent = found.answer;
    if (answerDateEl) answerDateEl.textContent = `답변일: ${found.answerDate || found.date}`;
    if (replyBtnText) replyBtnText.textContent = '원장님 답변 수정하기';
  } else {
    if (answerWrapper) answerWrapper.style.display = 'none';
    if (unansweredBox) unansweredBox.style.display = 'block';
    if (replyBtnText) replyBtnText.textContent = '원장님 답변 작성하기';
  }

  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeInquiryDetailModal() {
  const modal = document.getElementById('inquiry-detail-modal');
  currentOpenedInquiryId = null;
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Doctor Answer Composer Modal
function openDoctorReplyEditorModal() {
  if (!currentOpenedInquiryId) return;

  const items = getStoredInquiries();
  const found = items.find(item => item.id === currentOpenedInquiryId);
  if (!found) return;

  const modal = document.getElementById('inquiry-reply-editor-modal');
  const summaryEl = document.getElementById('reply-target-summary');
  const textarea = document.getElementById('doctor-reply-textarea');

  if (summaryEl) {
    summaryEl.innerHTML = `<strong>상담 대상:</strong> [${found.disease}] ${found.title} (${found.author}, ${found.region} ${found.age} / ${found.gender})`;
  }
  if (textarea) {
    textarea.value = found.answer || '';
  }

  if (modal) {
    modal.classList.add('active');
    setTimeout(() => { if (textarea) textarea.focus(); }, 100);
  }
}

function closeDoctorReplyEditorModal() {
  const modal = document.getElementById('inquiry-reply-editor-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

function handleDoctorReplySubmit(e) {
  e.preventDefault();
  if (!currentOpenedInquiryId) return;

  const textarea = document.getElementById('doctor-reply-textarea');
  const answerText = textarea ? textarea.value.trim() : '';
  if (!answerText) return;

  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

  const items = getStoredInquiries();
  const targetIndex = items.findIndex(item => item.id === currentOpenedInquiryId);
  if (targetIndex === -1) return;

  items[targetIndex].answer = answerText;
  items[targetIndex].answerDate = dateStr;
  items[targetIndex].status = 'answered';

  localStorage.setItem('healim_online_inquiries', JSON.stringify(items));

  closeDoctorReplyEditorModal();
  showAuthToast('🩺 손지웅 대표원장의 전문 답변이 성공적으로 등록되었습니다.');

  // Refresh Detail view and Board list
  openInquiryDetailModal(currentOpenedInquiryId);
  renderInquiryList();
}

function handleAdminDeleteInquiry() {
  if (!currentOpenedInquiryId) return;
  if (!confirm('정말 이 상담글을 삭제하시겠습니까?')) return;

  let items = getStoredInquiries();
  items = items.filter(item => item.id !== currentOpenedInquiryId);
  localStorage.setItem('healim_online_inquiries', JSON.stringify(items));

  closeInquiryDetailModal();
  showAuthToast('🗑️ 상담글이 삭제되었습니다.');
  renderInquiryList();
}
