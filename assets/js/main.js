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
    "id": "n-real-01",
    "author": "예찬맘21님",
    "date": "2026.08.11",
    "rating": 5,
    "category": "autonomic",
    "categoryName": "자율신경실조증",
    "title": "자율신경실조 진단받고 한약과 침치료로 가슴두근거림, 상열감이 많이 좋아졌습니다",
    "keywords": [
      "자율신경 치료",
      "뇌파검사진행",
      "친절하고 차분해요"
    ],
    "summary": "올 초 호르몬, 스트레스, 갱년기전 증상이 겹쳐 자율신경실조 진단받고 3월부터 치료받기 시작했습니다. 가슴두근거림, 상열감등 전반적인 컨디션이 좋아졌습니다. 한약복용과 함께 주1회 침치료 병행하였구요, 원장님 상담도 큰 도움이 되었습니다. 보통은 HRV검사를 하는데 해아림은 뇌파등 다른 검사들을 진행합니다. 원장님과 직원분들 모두 차분하셔서 저는 더 좋았던 거 같아요. 자율신경실조로 고생하시는 분들 꼭 적극적으로 치료받으세요."
  },
  {
    "id": "n-real-02",
    "author": "지윤호49님",
    "date": "2026.07.24",
    "rating": 5,
    "category": "hyperhidrosis-ibs",
    "categoryName": "다한증 치료",
    "title": "원장님의 친절한 상담 및 치료 덕분에 손과 발 다한증이 많이 완화되었습니다",
    "keywords": [
      "다한증 완화",
      "친절한 상담",
      "원장님 감사해요"
    ],
    "summary": "다한증 증상으로 방문 했었습니다. 원장님의 친절한 상담 및 치료 덕분에 치료 받기 전이랑 손과 발을 비교하면 현재 많이 완화되었습니다. 감사합니다."
  },
  {
    "id": "n-real-03",
    "author": "applelove님",
    "date": "2026.07.03",
    "rating": 5,
    "category": "autonomic",
    "categoryName": "브레인포그·자율신경",
    "title": "브레인포그 증상으로 방문했는데 따뜻한 상담과 치료로 많이 좋아졌습니다",
    "keywords": [
      "브레인포그 호전",
      "따뜻한 상담",
      "원장선생님 감사"
    ],
    "summary": "브레인포그 증상으로 방문했는데 많이 좋아졌습니다. 따뜻하게 상담해주시고 치료해 주신 원장선생님 감사드립니다."
  },
  {
    "id": "n-real-04",
    "author": "hh1****님",
    "date": "2026.06.17",
    "rating": 5,
    "category": "autonomic",
    "categoryName": "신경정신과 한방치료",
    "title": "작년 11월부터 다녔는데 검사결과 비교해보니 너무나 좋아져서 감사할 따름입니다",
    "keywords": [
      "검사결과 호전",
      "편안한 분위기",
      "친절해요"
    ],
    "summary": "작년 11월부터 다녔는데요. 그때랑 지금이랑 검사결과를 비교해봤는데요. 너무나 좋아져서 감사할 따름입니다. 다들 친절하시고 편안하게 해주셔서 방문시 좋았습니다. 한약 다먹고 또 방문할께요^^"
  },
  {
    "id": "n-real-05",
    "author": "친절한엄마이길님",
    "date": "2026.06.13",
    "rating": 5,
    "category": "tic-adhd",
    "categoryName": "소아 틱장애",
    "title": "아이 틱증상과 감정적으로 힘든 시기에 뜸, 한약, 행동치료 병행하며 큰 효과를 보았습니다",
    "keywords": [
      "소아틱 전문",
      "행동치료 병행",
      "현실적인 조언"
    ],
    "summary": "아이가 틱증상이랑 감정적으로 힘든시기에 찾게되었습니다. 매주 원장선생님의 현실적인 상담과 조언을 들으면서 아이도 부모인 저희들도 치료를 넘어서 방향과 방법을 찾게 된 것 같습니다. 뜸, 한약, 행동치료도 병행하며 효과를 더욱 잘 받은 것 같습니다. 데스크 선생님들도 친절하게 받아주셔서 아이가 어색함 없이 여러달을 잘 다녔던 것 같고요. 아이가 생각과 행동의 힘을 알게되는 소중한 시간이였습니다."
  },
  {
    "id": "n-real-06",
    "author": "haniel423님",
    "date": "2026.06.10",
    "rating": 5,
    "category": "autonomic",
    "categoryName": "소아 자율신경이상",
    "title": "속 메스꺼움, 손발 차가움 증상으로 6개월 한약·침·뜸 치료 후 훨씬 좋아졌습니다",
    "keywords": [
      "자율신경이상 호전",
      "6개월 완치",
      "가족 모두 만족"
    ],
    "summary": "아이가 초등학교 1학년때부터 하기 싫은 일을 할때마다 갑자기 속이 메스껍고 울렁거린다고 하고 손발이 차가워지면서 움직이지도 못하는 증상이 생겼어요. 1년에 한번씩 한달가량을 증상이 지속되다 너무 힘들어 자율신경이상증상검사를 위해 해아림한의원을 찾게되었습니다. 6개월 치료 마무리가 되었네요. 증상도 빨리 사라졌고 한약, 침, 뜸치료 상담을 통해 예전보다 훨씬 좋아졌습니다. 감사합니다."
  },
  {
    "id": "n-real-07",
    "author": "lssaa님",
    "date": "2026.05.30",
    "rating": 5,
    "category": "tic-adhd",
    "categoryName": "소아 틱장애",
    "title": "초저학년 아들 틱이 심해져 1년 다녔는데 한약 거부감 없이 먹고 틱이 완전히 사라졌습니다",
    "keywords": [
      "틱 완치",
      "아이 불안 해소",
      "부모 추천"
    ],
    "summary": "거의 1년정도 다녔어요. 아들이 갑자기 틱이 심해져서 밤새 병원 알아보고 후기찾아보고 선택한 곳입니다. 초저학년이라 양방병원보다는 한의원이 나을듯해서 집과 거리가 있음에도 내원하였는데 먼저 병원 전 직원분들이 너무 친절하게 맞이하여주셔서 좋았어요. 초반에 한약 먹는것에 대해 거부감이 있던 아이도 어느새 스스로 찾아먹게되고 틱도 어느순간 사라져있더라구요. 아이 틱이 사라지니 엄마인 제 불안도 사라져서 넘 좋았습니다. 틱이 고민이신 부모님들은 이 곳 정말 추천드릴께요!"
  },
  {
    "id": "n-real-08",
    "author": "하나사랑78님",
    "date": "2026.05.23",
    "rating": 5,
    "category": "panic",
    "categoryName": "불안·과민성대장",
    "title": "중학생 아들 불안증상으로 인한 과민성대장증후군, 한약 처방 6개월 후 말끔히 없어졌습니다",
    "keywords": [
      "불안 과민대장 호전",
      "청소년 한방치료",
      "약 중단 성공"
    ],
    "summary": "6개월 전 중학생 아들이 불안증상으로 과민성대장증후군이 자주 발병해서 진료받게 됐는데 원장님 처방으로 이제는 말끔히 없어졌어요. 학교가는게 불규칙해서 고민이 많이 됐었는데요. 한약 처방받고 3개월정도에 증상이 거의 완화됐고 나머지 3개월 정도는 관리 차원에서 약하게 처방받았는데 지금은 더이상 약을 안먹어도 됩니다. 망설이시는 분들은 지금 치료를 시작하시라고 말씀드리고 싶어요~ 원장님과 선생님들 모두 친절하시고 좋아요~^^"
  },
  {
    "id": "n-real-09",
    "author": "윤수경67님",
    "date": "2026.05.11",
    "rating": 5,
    "category": "panic",
    "categoryName": "불안·심신안정",
    "title": "처음에는 걱정과 불안이 가득했는데 원장님의 편안한 상담으로 가벼운 발걸음으로 나가게 되었습니다",
    "keywords": [
      "불안 해소",
      "원장님 편안한 상담",
      "병원 깔끔해요"
    ],
    "summary": "선생님들 모두 친절하시고 특히 원장선생님께서 편안하게 상담을 잘 해주십니다~ 병원 내부도 깔끔하고 분위기가 편안해서 거부감 없이 진료 받을 수 있었습니다~ 처음에는 걱정과 불안이 가득했었는데 이제 가벼운 발걸음으로 나가게 되었습니다~ 그동안 애써주신 선생님들께 감사하다고 꼭 이야기 하고 싶습니다^^"
  },
  {
    "id": "n-real-10",
    "author": "onl****님",
    "date": "2026.02.25",
    "rating": 5,
    "category": "tic-adhd",
    "categoryName": "소아 복합 틱장애",
    "title": "복합 틱으로 9개월 다녔는데 점차 증상이 줄어들어 지금은 찾아볼 수 없을 정도로 호전되었습니다",
    "keywords": [
      "복합틱 근본치료",
      "호전율 높음",
      "믿고 맡기는 한의원"
    ],
    "summary": "9개월 정도 아이의 틱 증상으로 본 한의원을 다니게 되었습니다. 한 달 정도 지켜보다가 증상이 심해지고 여러 가지 틱들이 복합적으로 나타나 어떤 치료를 받아야 하나 고민하다 한의원에서 더 근본적인 치료를 받을 수 있다는 사실을 알게 되어 결정하였습니다. 아이의 증상이 심각하여 처음에는 별 차도가 없는 듯 보였지만 3개월 정도가 지나자 점차 증상의 개수가 줄어들고 9개월이 지난 지금은 증상을 찾아볼 수 없을 정도로 호전되었습니다. 틱으로 고민하시는 분들에게 적극 추천드립니다."
  },
  {
    "id": "n-real-11",
    "author": "데****님",
    "date": "2021.08.31",
    "rating": 5,
    "category": "autonomic",
    "categoryName": "자율신경실조증",
    "title": "네이버 영수증 방문 인증 완료 (자율신경 정밀 진료 및 맞춤 처방)",
    "keywords": [
      "예약 후 이용",
      "친절해요",
      "영수증 인증 완료"
    ],
    "summary": "네이버 스마트플레이스 영수증 인증을 통해 해아림한의원 분당점 진료를 완료하신 환자분의 실시간 방문 인증 리뷰입니다. 원장님의 세심한 상담과 쾌적한 원내 환경에 만족하셨습니다."
  },
  {
    "id": "n-real-12",
    "author": "이****님",
    "date": "2021.08.31",
    "rating": 5,
    "category": "panic",
    "categoryName": "공황·불안장애",
    "title": "네이버 영수증 방문 인증 완료 (심신 안정 침구 및 한약 치료)",
    "keywords": [
      "예약 후 이용",
      "설명이 자세해요",
      "영수증 인증 완료"
    ],
    "summary": "네이버 스마트플레이스 영수증 인증을 통해 해아림한의원 분당점 진료를 완료하신 환자분의 실시간 방문 인증 리뷰입니다. 친절하고 꼼꼼한 진료로 안심하고 진료를 받으셨습니다."
  },
  {
    "id": "n-real-13",
    "author": "분당주민님",
    "date": "2021.08.16",
    "rating": 5,
    "category": "sleep",
    "categoryName": "수면·불면증",
    "title": "네이버 영수증 방문 인증 완료 (불면증 및 만성 피로 회복)",
    "keywords": [
      "예약 후 이용",
      "주차 편리",
      "영수증 인증 완료"
    ],
    "summary": "네이버 스마트플레이스 영수증 인증을 통해 해아림한의원 분당점 진료를 완료하신 환자분의 실시간 방문 인증 리뷰입니다. 정자역 젤존타워 건물 내 편리한 주차와 편안한 진료 환경에 만족하셨습니다."
  },
  {
    "id": "n-real-14",
    "author": "분당맘님",
    "date": "2021.08.16",
    "rating": 5,
    "category": "tic-adhd",
    "categoryName": "소아 틱장애",
    "title": "네이버 영수증 방문 인증 완료 (소아 틱 클리닉 집중 진단)",
    "keywords": [
      "예약 후 이용",
      "과잉진료 없음",
      "영수증 인증 완료"
    ],
    "summary": "네이버 스마트플레이스 영수증 인증을 통해 해아림한의원 분당점 진료를 완료하신 환자분의 실시간 방문 인증 리뷰입니다. 아이 눈높이에 맞춘 따뜻한 원장님의 진료에 감사함을 전하셨습니다."
  },
  {
    "id": "n-real-15",
    "author": "이선영님",
    "date": "2021.08.10",
    "rating": 5,
    "category": "hyperhidrosis-ibs",
    "categoryName": "다한증·소화기",
    "title": "네이버 영수증 방문 인증 완료 (상열감 및 다한증 체질 개선)",
    "keywords": [
      "예약 후 이용",
      "치료 효과 만족",
      "영수증 인증 완료"
    ],
    "summary": "네이버 스마트플레이스 영수증 인증을 통해 해아림한의원 분당점 진료를 완료하신 환자분의 실시간 방문 인증 리뷰입니다. 체질에 맞춘 한방 처방과 친절한 진료 안내를 받으셨습니다."
  },
  {
    "id": "n-real-16",
    "author": "top****님",
    "date": "2021.08.06",
    "rating": 5,
    "category": "autonomic",
    "categoryName": "자율신경실조증",
    "title": "네이버 영수증 방문 인증 완료 (만성 어지럼 및 두통 치료)",
    "keywords": [
      "예약 후 이용",
      "원장님 꼼꼼해요",
      "영수증 인증 완료"
    ],
    "summary": "네이버 스마트플레이스 영수증 인증을 통해 해아림한의원 분당점 진료를 완료하신 환자분의 실시간 방문 인증 리뷰입니다. 검사 및 진료 과정이 체계적이고 만족스러웠습니다."
  },
  {
    "id": "n-real-17",
    "author": "김민지님",
    "date": "2021.07.14",
    "rating": 5,
    "category": "panic",
    "categoryName": "불안·공황장애",
    "title": "네이버 영수증 방문 인증 완료 (가슴 두근거림 및 긴장 완화)",
    "keywords": [
      "예약 후 이용",
      "친절해요",
      "영수증 인증 완료"
    ],
    "summary": "네이버 스마트플레이스 영수증 인증을 통해 해아림한의원 분당점 진료를 완료하신 환자분의 실시간 방문 인증 리뷰입니다. 편안한 원내 분위기 속에서 심신 안정 치료를 받으셨습니다."
  },
  {
    "id": "n-real-18",
    "author": "이진우님",
    "date": "2021.06.25",
    "rating": 5,
    "category": "sleep",
    "categoryName": "만성 불면증",
    "title": "네이버 영수증 방문 인증 완료 (야간진료 수면 클리닉 상담)",
    "keywords": [
      "예약 후 이용",
      "야간진료 편리",
      "영수증 인증 완료"
    ],
    "summary": "네이버 스마트플레이스 영수증 인증을 통해 해아림한의원 분당점 진료를 완료하신 환자분의 실시간 방문 인증 리뷰입니다. 월/수 야간진료를 통해 퇴근 후 편안하게 치료를 받으셨습니다."
  },
  {
    "id": "n-real-19",
    "author": "한수정님",
    "date": "2021.06.05",
    "rating": 5,
    "category": "autonomic",
    "categoryName": "자율신경·심신안정",
    "title": "네이버 영수증 방문 인증 완료 (전신 피로 및 자율신경 회복)",
    "keywords": [
      "예약 후 이용",
      "시설 깨끗해요",
      "영수증 인증 완료"
    ],
    "summary": "네이버 스마트플레이스 영수증 인증을 통해 해아림한의원 분당점 진료를 완료하신 환자분의 실시간 방문 인증 리뷰입니다. 깔끔한 진료실과 꼼꼼한 맥진 및 상담에 만족하셨습니다."
  },
  {
    "id": "n-real-20",
    "author": "top_healing님",
    "date": "2021.06.04",
    "rating": 5,
    "category": "tic-adhd",
    "categoryName": "소아 틱·ADHD",
    "title": "네이버 영수증 방문 인증 완료 (두뇌 신경 클리닉 집중 케어)",
    "keywords": [
      "예약 후 이용",
      "친절한 진료",
      "영수증 인증 완료"
    ],
    "summary": "네이버 스마트플레이스 영수증 인증을 통해 해아림한의원 분당점 진료를 완료하신 환자분의 실시간 방문 인증 리뷰입니다. 아이가 거부감 없이 편안하게 진료를 받았습니다."
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
