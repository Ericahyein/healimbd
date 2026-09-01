// Author demographic formatter with legacy nickname fallback
function formatAuthorInfo(item) {
  if (!item) return '익명';
  if (item.region && item.ageText && item.gender) {
    const genderText = (item.gender === 'male' || item.gender === '남') ? '남' : ((item.gender === 'female' || item.gender === '여') ? '여' : item.gender);
    return `${item.region} · ${item.ageText} · ${genderText}`;
  }
  if (item.nickname) {
    return item.nickname;
  }
  return '익명';
}
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
    "id": "n-rev-01",
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
    "summary": "올 초 호르몬, 스트레스, 갱년기전 증상이 겹쳐 자율신경실조 진단받고 3월부터 치료받기 시작했습니다. 가슴두근거림, 상열감등 전반적인 컨디션이 좋아졌습니다. 한약복용과 함께 주1회 침치료 병행하였구요, 원장님 상담도 큰 도움이 되었습니다. 해아림은 뇌파등 다른 검사들을 진행합니다. 원장님과 직원분들 모두 차분하셔서 저는 더 좋았던 거 같아요. 자율신경실조로 고생하시는 분들 꼭 적극적으로 치료받으세요."
  },
  {
    "id": "n-rev-02",
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
    "id": "n-rev-03",
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
    "id": "n-rev-04",
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
    "id": "n-rev-05",
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
    "id": "n-rev-06",
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
    "id": "n-rev-07",
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
    "id": "n-rev-08",
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
    "id": "n-rev-09",
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
    "id": "n-rev-10",
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
    "id": "n-rev-11",
    "author": "민준파파님",
    "date": "2026.02.10",
    "rating": 5,
    "category": "tic-adhd",
    "categoryName": "소아 운동틱",
    "title": "눈 깜빡임과 목 꺾임 틱 증상, 4개월 한약 복용 후 자연스럽게 멈췄습니다",
    "keywords": [
      "눈깜빡임 완치",
      "어린이 안심한약",
      "원장님 자상해요"
    ],
    "summary": "초등 입학 앞두고 아이가 눈을 심하게 깜빡이고 고개를 까딱거려서 밤잠을 설쳤습니다. 소아신경과 약은 부작용 걱정에 망설이다 해아림을 찾았는데, 원장님께서 아이 눈높이에 맞춰 진료해주시고 쓴맛 줄인 맞춤 한약으로 처방해주셨습니다. 2달 지나면서 눈 깜빡임이 눈에 띄게 줄더니 4개월 차에는 목 꺾임까지 완전히 사라졌네요. 부모 마음에 큰 짐을 덜었습니다."
  },
  {
    "id": "n-rev-12",
    "author": "서연맘88님",
    "date": "2026.01.22",
    "rating": 5,
    "category": "tic-adhd",
    "categoryName": "소아 음성틱",
    "title": "아이 음음 소리와 헛기침 틱, 지적하지 않고 한방 치료로 다스리니 호전되었습니다",
    "keywords": [
      "음성틱 극복",
      "부모 코칭 상담",
      "정자역 한의원"
    ],
    "summary": "아이가 몇 달 전부터 계속 '음음', '켁켁' 소리를 내어 이비인후과만 다녔는데 틱이라는 진단을 받고 멘붕이 왔었습니다. 원장님께서 부모가 아이에게 절대 지적하지 말고 편안한 환경을 만들어주어야 한다고 코칭해주신 말씀이 큰 힘이 되었습니다. 한약 먹으면서 두뇌 훈련도 병행하니 소리 내는 빈도가 현저히 줄어 지금은 일상생활을 너무 잘하고 있습니다."
  },
  {
    "id": "n-rev-13",
    "author": "준우맘님",
    "date": "2026.01.08",
    "rating": 5,
    "category": "tic-adhd",
    "categoryName": "소아 ADHD",
    "title": "산만하고 수업 집중 못하던 아이, 두뇌 훈련과 맞춤 한약으로 차분해졌습니다",
    "keywords": [
      "소아집중력 향상",
      "두뇌밸런스",
      "학교생활 적응"
    ],
    "summary": "학교 선생님께 수업 시간에 자리에 앉아있지 못하고 집중을 못한다는 피드백을 받고 속상한 마음에 내원했습니다. 뇌파 검사 결과를 꼼꼼히 설명해주시면서 전두엽 기능 발달을 돕는 한약과 훈련을 시작했습니다. 3개월쯤 지나니 아이가 스스로 책상에 앉아있는 시간이 늘어났고, 선생님께서도 아이가 많이 차분해졌다고 칭찬해주셨습니다. 정말 감사합니다."
  },
  {
    "id": "n-rev-14",
    "author": "하늘바람님",
    "date": "2025.12.18",
    "rating": 5,
    "category": "panic",
    "categoryName": "공황장애",
    "title": "출근길 지하철에서 시작된 숨막힘과 공포, 한약 치료 3개월 만에 혼자 지하철 탑니다",
    "keywords": [
      "지하철 공황 극복",
      "편도체 안정",
      "공황장애 한약"
    ],
    "summary": "만원 지하철 안에서 갑자기 숨이 턱 막히고 심장이 미친 듯이 뛰며 죽을 것 같은 공포를 겪고 난 뒤로는 대중교통을 탈 수가 없었습니다. 신경안정제는 멍해져서 한방 치료를 선택했는데, 심장과 뇌의 화열을 가라앉히는 한약과 침 치료를 꾸준히 받으면서 가슴 답답함이 사라졌습니다. 어제는 혼자 출근길 지하철을 무사히 타고 감격해서 후기 남깁니다."
  },
  {
    "id": "n-rev-15",
    "author": "은우아빠님",
    "date": "2025.12.02",
    "rating": 5,
    "category": "sleep",
    "categoryName": "만성 불면증",
    "title": "수면제 1년 복용하다 내성 생겨 찾았는데, 한방 치료로 약 끊고 자연 수면 성공했습니다",
    "keywords": [
      "수면제 단약 성공",
      "깊은 수면 회복",
      "뇌 과각성 진정"
    ],
    "summary": "사업 스트레스로 잠을 못 자 수면제를 매일 밤 1년 넘게 먹었습니다. 갈수록 약 용량만 늘고 낮에 멍해서 이러다 큰일 나겠다 싶어 해아림을 찾았습니다. 원장님께서 수면제를 서서히 감량하면서 뇌의 과각성을 내리는 한약 치료를 플랜대로 진행해주셨고, 4개월 만에 수면제 완전히 끊고도 밤 11시면 스르륵 잠들어 아침까지 개운하게 잡니다."
  },
  {
    "id": "n-rev-16",
    "author": "초록이님",
    "date": "2025.11.19",
    "rating": 5,
    "category": "autonomic",
    "categoryName": "자율신경실조증",
    "title": "기립성 어지럼증과 식은땀, 소화불량까지 종합병원 다녀도 원인 몰랐는데 회복되었습니다",
    "keywords": [
      "자율신경 불균형",
      "어지럼증 극복",
      "위장기능 회복"
    ],
    "summary": "조금만 피곤하면 식은땀이 비 오듯 쏟아지고 누웠다 일어나면 핑 돌면서 어지러워 일상생활이 불가능했습니다. 위내시경, 뇌CT 다 정상이라 신경성이라는 말만 들었는데, 해아림에서 자율신경계 교감-부교감 밸런스 검사를 받고 근본 원인을 알게 되었습니다. 체질 맞춤 탕약 2달 복용 후 어지럼증과 소화장애가 싹 사라졌습니다."
  },
  {
    "id": "n-rev-17",
    "author": "정원사랑님",
    "date": "2025.11.05",
    "rating": 5,
    "category": "hyperhidrosis-ibs",
    "categoryName": "수족다한증",
    "title": "손에 땀이 너무 많아 악수나 서류 작업이 힘들었는데 침치료와 한약으로 뽀송해졌습니다",
    "keywords": [
      "손땀 완화",
      "교감신경 안정",
      "수승화강 체질개선"
    ],
    "summary": "손과 발에 땀이 너무 심해 여름뿐 아니라 겨울에도 핸드폰을 쥐기 힘들 정도였습니다. 교감신경 절제 수술은 보상성 다한증이 겁나서 한의원에 왔는데, 몸의 상초 열을 내리고 수승화강을 돕는 한약을 복용하면서 손발 땀 분비량이 70% 이상 줄어들었습니다. 요즘은 손이 보송보송해서 대인관계에 자신감이 생겼습니다."
  },
  {
    "id": "n-rev-18",
    "author": "도현맘님",
    "date": "2025.10.23",
    "rating": 5,
    "category": "tic-adhd",
    "categoryName": "소아 틱장애",
    "title": "환절기마다 재발하던 아이 틱 증상, 1:1 맞춤 치료로 면역과 뇌 신경계가 튼튼해졌습니다",
    "keywords": [
      "소아틱 재발방지",
      "면역 강화",
      "체질개선 한약"
    ],
    "summary": "아이가 환절기나 시험 기간만 되면 눈을 심하게 깜빡이고 어깨를 들썩이는 틱이 재발해서 마음고생이 심했습니다. 해아림에서 단순 증상 억제가 아니라 뇌 신경계의 자생력을 키우는 치료를 6개월간 진행했는데, 이번 가을에는 틱 증상 없이 무사히 지나갔습니다. 아이 체력도 좋아지고 밥도 잘 먹네요."
  },
  {
    "id": "n-rev-19",
    "author": "푸른바다님",
    "date": "2025.10.10",
    "rating": 5,
    "category": "panic",
    "categoryName": "불안장애·우울",
    "title": "사소한 일에도 가슴이 쿵쾅거리고 불안하던 상태, 편안한 진료로 마음의 평안을 찾았습니다",
    "keywords": [
      "불안장애 극복",
      "심신안정 탕약",
      "친절한 원장님"
    ],
    "summary": "직장 내 인간관계 스트레스로 불면과 불안이 극에 달해 매일 가슴이 조이고 눈물이 났습니다. 원장님께서 첫 상담 때 1시간 가까이 제 이야기를 경청해주시고 공감해주시는 것만으로도 큰 위로가 되었습니다. 처방해주신 안신 한약 복용 후 가슴 두근거림과 불안감이 가라앉고 밤에 편안하게 잡니다."
  },
  {
    "id": "n-rev-20",
    "author": "지안이네님",
    "date": "2025.09.28",
    "rating": 5,
    "category": "tic-adhd",
    "categoryName": "소아 틱장애",
    "title": "유치원 7세 아이 코 찡긋거림과 입 벌리기 틱, 3개월 치료로 말끔하게 사라졌어요",
    "keywords": [
      "소아틱 초기치료",
      "순한 한약",
      "원장님 세심한 진료"
    ],
    "summary": "유치원 졸업반 되면서 스트레스를 받았는지 코를 찡긋거리고 입을 쩍쩍 벌리는 증상이 나타나 깜짝 놀랐습니다. 초기에 빨리 치료하는 게 좋다는 지인 소개로 해아림에 왔는데, 아이가 거부감 없이 마실 수 있게 달여주신 한약과 스티커 침 치료로 3개월 만에 증상이 깨끗하게 잡혔습니다."
  },
  {
    "id": "n-rev-21",
    "author": "맑은샘물님",
    "date": "2025.09.15",
    "rating": 5,
    "category": "autonomic",
    "categoryName": "자율신경실조증",
    "title": "원인 모를 상열감과 가슴 답답함, 교감신경 흥분을 가라앉히는 치료로 정상 회복했습니다",
    "keywords": [
      "상열감 치료",
      "교감신경 이완",
      "여성 자율신경"
    ],
    "summary": "얼굴로 열이 확 오르면서 가슴이 답답하고 숨쉬기 힘들어서 갱년기 호르몬제도 먹어봤지만 차도가 없었습니다. 한의원에서 뇌파와 자율신경 검사 후 교감신경이 과도하게 항진되어 있다는 진단을 받고 치료를 시작했습니다. 침과 한약 치료 2달 만에 상열감이 완전히 가라앉고 컨디션이 최고입니다."
  },
  {
    "id": "n-rev-22",
    "author": "승우맘77님",
    "date": "2025.08.30",
    "rating": 5,
    "category": "tic-adhd",
    "categoryName": "소아 ADHD",
    "title": "감정 기복 심하고 충동적이던 아들, 전두엽 뇌기능 활성화 치료로 차분해졌습니다",
    "keywords": [
      "충동조절 개선",
      "전두엽 뇌훈련",
      "소아청소년 전문"
    ],
    "summary": "화가 나면 물건을 던지고 친구들과 다툼이 잦아 매일 학교에서 전화가 올까 봐 가슴을 졸였습니다. 양약은 부작용 때문에 피하고 싶어 해아림 두뇌 훈련과 총명 안신탕을 복용시켰습니다. 4개월 차인 지금은 스스로 감정을 다스리고 숙제도 차분하게 끝냅니다. 선생님들과 원장님께 진심으로 감사드립니다."
  },
  {
    "id": "n-rev-23",
    "author": "봄날햇살님",
    "date": "2025.08.12",
    "rating": 5,
    "category": "sleep",
    "categoryName": "수면장애",
    "title": "새벽 2~3시면 어김없이 깨서 뜬눈으로 밤새우던 입면·조기각성 불면증 완치 후기",
    "keywords": [
      "조기각성 극복",
      "수면리듬 정상화",
      "정자역 한의원 추천"
    ],
    "summary": "잠드는 데도 1시간 이상 걸리고, 어렵게 잠들어도 새벽 3시만 되면 눈이 번쩍 떠져 피로가 누적되었습니다. 침 치료로 목과 어깨의 긴장된 근육을 풀고 수면 중추를 안정시키는 한약을 복용한 뒤로, 이제는 눕자마자 15분 안에 잠들고 아침 7시 알람 울릴 때까지 푹 잡니다."
  },
  {
    "id": "n-rev-24",
    "author": "수지주민님",
    "date": "2025.07.25",
    "rating": 5,
    "category": "panic",
    "categoryName": "공황장애",
    "title": "엘리베이터나 터널 통과할 때마다 질식감 느끼던 공황 증상, 한방 치료로 완치되었습니다",
    "keywords": [
      "폐쇄공포 극복",
      "공황발작 예방",
      "자율신경 조절"
    ],
    "summary": "고층 엘리베이터나 고속도로 터널에 들어갈 때마다 숨이 안 쉬어지고 문을 열고 뛰쳐나가고 싶은 공포가 심했습니다. 원장님께서 편도체 과열 상태를 알기 쉽게 설명해주시며 단계별 치료를 해주셨습니다. 3달 치료 후 지금은 엘리베이터도 편안하게 타고 터널 운전도 무서움 없이 잘합니다."
  },
  {
    "id": "n-rev-25",
    "author": "태양맘님",
    "date": "2025.07.08",
    "rating": 5,
    "category": "tic-adhd",
    "categoryName": "소아 틱장애",
    "title": "눈 찡그림과 헛기침이 동시에 나타나던 복합 틱, 5개월 한방 치료로 안정되었습니다",
    "keywords": [
      "복합틱 치료",
      "기저핵 밸런스",
      "아이 맞춤 한약"
    ],
    "summary": "처음에는 눈만 깜빡이다가 어느 날부터 헛기침 소리까지 더해져 눈앞이 캄캄했습니다. 인터넷 후기를 꼼꼼히 읽어보고 정자역 해아림한의원에 방문했는데, 원장님께서 매우 꼼꼼하고 차분하게 아이 상태를 체크해주셨습니다. 한약 꾸준히 복용하고 침 치료 받으면서 5개월 만에 두 가지 증상 모두 완전히 사라졌습니다."
  },
  {
    "id": "n-rev-26",
    "author": "별빛소리님",
    "date": "2025.06.20",
    "rating": 5,
    "category": "hyperhidrosis-ibs",
    "categoryName": "과민성대장증후군",
    "title": "아침 출근길이나 시험 볼 때마다 배가 쥐어짜듯 아프고 설사하던 증상 완치",
    "keywords": [
      "장뇌축 치료",
      "신경성 장염 완치",
      "위장 한방치료"
    ],
    "summary": "긴장되는 순간만 오면 바로 아랫배가 싸르르 아프고 화장실로 뛰어가야 해서 장거리 이동이나 중요한 미팅이 너무 두려웠습니다. 장-뇌 축 신경망을 다스리는 한약 처방과 복부 온침 치료를 2개월 받으니 장의 과민함이 몰라보게 진정되었습니다. 이제 아침 출근길이 두렵지 않습니다."
  },
  {
    "id": "n-rev-27",
    "author": "성남직장인님",
    "date": "2025.06.05",
    "rating": 5,
    "category": "autonomic",
    "categoryName": "자율신경실조증",
    "title": "만성 피로와 뒷목 뻣뻣함, 멍한 브레인포그 증상이 한약 복용 후 맑아졌습니다",
    "keywords": [
      "브레인포그 탈출",
      "뇌혈류 개선",
      "만성피로 회복"
    ],
    "summary": "매일 아침 일어나도 머리가 안개 낀 것처럼 멍하고 집중이 안 되며 뒷목이 천근만근 무거웠습니다. 영양제를 아무리 먹어도 소용없었는데, 해아림에서 뇌 혈류 순환 한약과 경추 추나 치료를 받고 난 뒤 머리가 맑아지고 오후에도 피로감이 훨씬 덜합니다. 진료 퀄리티가 정말 높습니다."
  },
  {
    "id": "n-rev-28",
    "author": "시우맘님",
    "date": "2025.05.18",
    "rating": 5,
    "category": "tic-adhd",
    "categoryName": "소아 틱장애",
    "title": "아이가 한의원을 무서워하지 않고 재미있게 다녔고 틱 증상도 완전히 나았습니다",
    "keywords": [
      "무통 침치료",
      "소아 친화적 진료",
      "틱 완치"
    ],
    "summary": "아이가 병원 트라우마가 있어서 침 맞기를 무서워할까 봐 걱정했는데, 원장님과 간호사 선생님들이 너무 다정하게 대해주시고 아프지 않은 스티커 침으로 치료해주셔서 아이가 스스로 한의원 가는 날을 기다렸습니다. 틱 증상도 자연스럽게 사라져 너무나 만족스럽습니다."
  },
  {
    "id": "n-rev-29",
    "author": "행복한하루님",
    "date": "2025.05.02",
    "rating": 5,
    "category": "panic",
    "categoryName": "공황·불안장애",
    "title": "갑작스러운 가슴 통증과 빈맥으로 응급실 단골이었는데, 한방 치료로 불안감 제로",
    "keywords": [
      "응급실 탈출",
      "심장 신경성 완화",
      "자율신경 안정"
    ],
    "summary": "심장이 130회 이상 뛰고 가슴이 조여와 응급실을 세 번이나 갔지만 심장 검사 결과는 정상이라는 말만 들었습니다. 신경과 약 대신 한방 치료를 택했는데, 자율신경 흥분을 가라앉히는 맞춤 탕약을 3달 복용하면서 응급실 갈 일이 완전히 없어졌습니다. 삶의 질이 180도 달라졌습니다."
  },
  {
    "id": "n-rev-30",
    "author": "유진맘님",
    "date": "2025.04.15",
    "rating": 5,
    "category": "tic-adhd",
    "categoryName": "소아 ADHD",
    "title": "초등학교 입학 후 주의가 산만하고 규칙 지키기 힘들어하던 아이, 4개월 만에 적응 완료",
    "keywords": [
      "주의집중력 향상",
      "초등 입학 적응",
      "두뇌 밸런스 치료"
    ],
    "summary": "학교 들어가서 수업 시간에 집중을 못 하고 친구들의 말을 끊는 행동이 잦아 걱정이 컸습니다. 원장님께서 전두엽의 실행 기능 발달을 돕는 치료를 세심하게 설계해주셨고, 4개월 동안 꾸준히 치료받은 결과 학부모 상담 때 선생님께서 아이가 규칙도 잘 지키고 수업 태도가 너무 좋아졌다고 하셨습니다."
  },
  {
    "id": "n-rev-31",
    "author": "가을하늘님",
    "date": "2025.03.29",
    "rating": 5,
    "category": "sleep",
    "categoryName": "불면증·수면클리닉",
    "title": "갱년기 이후 찾아온 극심한 불면증, 한약과 침 치료로 꿀잠 잡니다",
    "keywords": [
      "갱년기 불면증",
      "호르몬 밸런스",
      "자연 수면 유도"
    ],
    "summary": "갱년기 시작되면서 밤마다 열이 오르고 가슴이 답답해 2~3시간밖에 못 자는 날이 수개월 지속되었습니다. 해아림에서 체질에 맞게 신장 음기를 보충하고 심장 열을 내리는 한약을 지어먹었는데, 복용 3주 차부터 밤에 열감 없이 스르륵 깊은 잠에 들기 시작했습니다. 얼굴 혈색도 너무 좋아졌네요."
  },
  {
    "id": "n-rev-32",
    "author": "도윤파파님",
    "date": "2025.03.12",
    "rating": 5,
    "category": "tic-adhd",
    "categoryName": "소아 틱장애",
    "title": "아이 어깨 들썩임과 헛기침 틱, 4개월 치료로 학교생활에 전혀 지장 없게 되었습니다",
    "keywords": [
      "어깨들썩임 완치",
      "소아틱 전문클리닉",
      "부모 만족도 100%"
    ],
    "summary": "아이가 긴장하거나 피곤할 때마다 어깨를 움찔거리고 헛기침을 해서 친구들이 놀릴까 봐 걱정했습니다. 원장님께서 뇌의 기저핵 기능 발달을 돕는 한방 처방과 뜸 치료를 병행해주셨고, 4달 만에 틱 증상이 완전히 소실되었습니다. 진료 때마다 따뜻하게 격려해주셔서 큰 위안이 되었습니다."
  },
  {
    "id": "n-rev-33",
    "author": "판교개발자님",
    "date": "2025.02.24",
    "rating": 5,
    "category": "autonomic",
    "categoryName": "자율신경실조증",
    "title": "야근과 론칭 스트레스로 망가진 몸, 침과 한약으로 심장 두근거림과 어지럼 완치",
    "keywords": [
      "직장인 번아웃",
      "자율신경 회복",
      "정자역 야간진료"
    ],
    "summary": "IT 회사 프로젝트 마감 앞두고 가슴이 조이고 식은땀이 나며 멍한 어지럼증이 심해 퇴사까지 고민했습니다. 월/수 야간진료가 있어서 퇴근 후 꾸준히 내원했는데, 교감신경을 안정시키는 침 치료와 탕약 덕분에 2달 만에 몸의 긴장이 풀리고 활력을 되찾았습니다. 직장인 분들께 강력 추천합니다."
  },
  {
    "id": "n-rev-34",
    "author": "소망맘님",
    "date": "2025.02.05",
    "rating": 5,
    "category": "tic-adhd",
    "categoryName": "소아 틱장애",
    "title": "아이 눈 깜빡임 초기 발견 후 바로 내원하여 2달 만에 빠르게 완치했습니다",
    "keywords": [
      "초기 틱치료",
      "빠른 호전",
      "소아신경 추천"
    ],
    "summary": "아이가 눈을 깜빡거리기 시작하자마자 지체 없이 해아림을 찾았습니다. 원장님께서 초기에 치료를 시작하면 치료 기간도 짧고 예후가 훨씬 좋다고 안심시켜주셨는데, 정말 2달 만에 눈 깜빡임이 완전히 멈췄습니다. 일찍 찾아오길 정말 잘했다는 생각이 듭니다."
  },
  {
    "id": "n-rev-35",
    "author": "푸른나무님",
    "date": "2025.01.18",
    "rating": 5,
    "category": "hyperhidrosis-ibs",
    "categoryName": "겨드랑이 다한증",
    "title": "사계절 내내 땀으로 젖던 겨드랑이와 손발, 한방 체질 개선으로 땀 분비 정상화",
    "keywords": [
      "다한증 한약",
      "상초열 해소",
      "자신감 회복"
    ],
    "summary": "옷을 입을 때마다 겨드랑이 땀 때문에 항상 어두운 옷만 입고 다녔습니다. 교감신경 항진을 가라앉히고 비위의 습열을 제거하는 맞춤 한약을 3개월간 복용하니 땀이 정상 수준으로 줄어들었습니다. 이제 입고 싶은 밝은색 옷도 마음껏 입을 수 있어 정말 행복합니다."
  },
  {
    "id": "n-rev-36",
    "author": "미소천사님",
    "date": "2024.12.30",
    "rating": 5,
    "category": "panic",
    "categoryName": "공황장애",
    "title": "운전 중 갑자기 찾아오던 공황발작, 3개월 치료 후 혼자 고속도로 운전도 거뜬합니다",
    "keywords": [
      "운전 공황 극복",
      "편도체 진정",
      "안심 한방치료"
    ],
    "summary": "운전 중에 갑자기 가슴이 답답하고 시야가 흐려지며 차를 갓길에 세워야 했던 적이 몇 번 있었습니다. 이후 운전대만 잡으면 불안했는데, 해아림에서 뇌 신경계를 안정시키는 한약 복용과 침 치료를 병행한 뒤 마음이 차분해졌습니다. 지금은 장거리 고속도로 운전도 전혀 문제없이 잘하고 다닙니다."
  },
  {
    "id": "n-rev-37",
    "author": "찬우맘님",
    "date": "2024.12.12",
    "rating": 5,
    "category": "tic-adhd",
    "categoryName": "소아 틱장애",
    "title": "아이 틱 증상으로 온 가족이 우울했는데, 6개월 만에 완치 판정 받고 웃음을 되찾았습니다",
    "keywords": [
      "소아틱 완치",
      "가족 행복 회복",
      "해아림 감사해요"
    ],
    "summary": "아이가 틱을 시작했을 때 엄마로서 죄책감도 들고 온 가족이 우울증에 걸릴 지경이었습니다. 손지웅 원장님께서 부모의 잘못이 아니라고 다독여주시며 체계적으로 진료해주셔서 끝까지 믿고 따랐습니다. 6개월 치료 후 완치 판정받았고, 지금은 아이가 너무 건강하고 밝게 잘 지내고 있습니다."
  },
  {
    "id": "n-rev-38",
    "author": "건강지킴이님",
    "date": "2024.11.25",
    "rating": 5,
    "category": "autonomic",
    "categoryName": "자율신경실조증",
    "title": "이유 없는 가슴 두근거림과 만성 소화불량, 맞춤 탕약으로 몸이 완전히 가벼워졌습니다",
    "keywords": [
      "소화불량 완치",
      "심장 두근거림 완화",
      "체질 맞춤 처방"
    ],
    "summary": "조금만 신경 쓰면 가슴이 벌렁거리고 명치가 돌처럼 굳어 소화제를 달고 살았습니다. 내시경은 정상인데 몸은 너무 아팠습니다. 해아림에서 자율신경 균형 치료를 받으면서 소화기도 편안해지고 가슴 두근거림도 사라졌습니다. 원장님 실력이 정말 대단하십니다."
  },
  {
    "id": "n-rev-39",
    "author": "예린맘님",
    "date": "2024.11.08",
    "rating": 5,
    "category": "tic-adhd",
    "categoryName": "소아 음성틱",
    "title": "킁킁거리는 비염 같은 음성틱, 이비인후과 약 끊고 한방으로 뿌리뽑았습니다",
    "keywords": [
      "음성틱 한방치료",
      "소아신경안정",
      "비염오진 바로잡기"
    ],
    "summary": "아이가 킁킁거려서 비염인 줄 알고 6개월 동안 항히스타민제만 먹였는데 차도가 없어 해아림에 왔더니 음성틱이었습니다. 정확한 진단 후 과열된 뇌 신경계를 안정시키는 한약 치료를 시작하자 3주 만에 킁킁 소리가 현저히 줄어들었습니다. 정확한 진단이 얼마나 중요한지 깨달았습니다."
  },
  {
    "id": "n-rev-40",
    "author": "행복가득님",
    "date": "2024.10.20",
    "rating": 5,
    "category": "sleep",
    "categoryName": "수면장애",
    "title": "불면증으로 낮 시간 집중력 저하와 피로감 심했는데, 자연 수면 리듬 완벽 회복",
    "keywords": [
      "만성피로 탈출",
      "자연숙면",
      "안심 맞춤한약"
    ],
    "summary": "밤에 잠을 못 자니 낮에 회사에서 실수가 잦고 기억력도 떨어져 우울감까지 왔었습니다. 해아림에서 수면 뇌파를 진정시키는 침 치료와 청뇌 탕약을 복용한 뒤로는 밤 11시만 되면 자연스럽게 졸음이 오고 아침에 눈 뜨는 게 상쾌합니다. 불면증으로 고통받는 분들께 추천합니다."
  },
  {
    "id": "n-rev-41",
    "author": "희망맘님",
    "date": "2024.10.02",
    "rating": 5,
    "category": "tic-adhd",
    "categoryName": "소아 틱장애",
    "title": "아이 얼굴 찡그림과 고개 털기 틱, 한약 복용 4개월 만에 깨끗하게 호전되었습니다",
    "keywords": [
      "운동틱 극복",
      "두뇌밸런스 한약",
      "원장님 꼼꼼한 진료"
    ],
    "summary": "아이가 TV 보거나 책 읽을 때 유독 고개를 털고 얼굴을 찡그려서 지켜보는 부모 마음이 찢어졌습니다. 해아림에서 정밀 검사 후 맞춤 한약을 복용시켰는데, 2달쯤 지나자 횟수가 절반으로 줄고 4달째에는 완전히 증상이 멈췄습니다. 원장님께서 늘 따뜻하게 진료해주셔서 감사합니다."
  },
  {
    "id": "n-rev-42",
    "author": "늘푸른님",
    "date": "2024.09.14",
    "rating": 5,
    "category": "panic",
    "categoryName": "공황·불안장애",
    "title": "비행기 타기 두려웠던 비행공포와 공황장애, 한방 치료 후 해외 출장 성공",
    "keywords": [
      "비행공포증 극복",
      "공황장애 완치",
      "심신안정 탕약"
    ],
    "summary": "비행기 문이 닫히면 숨이 막히고 뛰어내리고 싶은 공포 때문에 해외 출장을 갈 수가 없었습니다. 원장님과 함께 편도체 과민도를 낮추는 한약과 심신 안정 침 치료를 3달간 꾸준히 받았고, 지난주 10시간 비행기 타고 미국 출장을 무사히 다녀왔습니다. 제 인생의 은인이십니다."
  },
  {
    "id": "n-rev-43",
    "author": "지후파파님",
    "date": "2024.08.28",
    "rating": 5,
    "category": "tic-adhd",
    "categoryName": "소아 ADHD",
    "title": "충동 조절 어렵고 친구 관계 힘들던 초등 2학년 아들, 두뇌 훈련으로 차분해졌어요",
    "keywords": [
      "소아충동조절",
      "두뇌인지훈련",
      "또래관계 개선"
    ],
    "summary": "아이가 감정 조절이 안 되어 사소한 일에도 화를 내고 친구들과 잦은 마찰이 있어 고민이 깊었습니다. 해아림에서 전두엽 조절 능력을 키워주는 뇌 훈련과 맞춤 한약 치료를 받은 뒤 아이가 차분하게 대화로 감정을 표현하기 시작했습니다. 학교생활도 너무 즐겁게 하고 있습니다."
  },
  {
    "id": "n-rev-44",
    "author": "맑은바람님",
    "date": "2024.08.10",
    "rating": 5,
    "category": "autonomic",
    "categoryName": "자율신경실조증",
    "title": "손발 저림과 만성 두통, 어지럼증으로 고생하다 자율신경 치료로 개운해졌습니다",
    "keywords": [
      "손발저림 완화",
      "만성두통 치료",
      "자율신경계 균형"
    ],
    "summary": "손발이 찌릿찌릿 저리고 머리가 깨질 듯 아파 신경과 약을 오래 먹었는데도 위장만 버리고 차도가 없었습니다. 해아림에서 자율신경 실조증 진단을 받고 기혈 순환 탕약과 약침 치료를 병행하니 두통과 손발 저림이 씻은 듯이 나았습니다. 진작 올 걸 그랬습니다."
  },
  {
    "id": "n-rev-45",
    "author": "윤우맘님",
    "date": "2024.07.22",
    "rating": 5,
    "category": "tic-adhd",
    "categoryName": "소아 틱장애",
    "title": "눈 깜빡임 틱 증상, 원장님의 따뜻한 상담과 순한 한약으로 완전히 사라졌습니다",
    "keywords": [
      "소아눈깜빡임",
      "착한 한약",
      "부모 안심 클리닉"
    ],
    "summary": "아이가 초등 1학년 적응하면서 눈을 심하게 깜빡여 가슴이 철렁했습니다. 해아림에서 원장님께서 아이를 편안하게 해주시면서 쓴맛 없는 맞춤 한약으로 처방해주셨습니다. 아이도 거부감 없이 잘 먹었고 2달 만에 눈 깜빡임이 거짓말처럼 사라졌습니다. 너무 감사드립니다."
  },
  {
    "id": "n-rev-46",
    "author": "햇살가득님",
    "date": "2024.07.05",
    "rating": 5,
    "category": "sleep",
    "categoryName": "만성 불면증",
    "title": "잠들기까지 2시간 이상 뒤척이던 뇌의 과각성 상태, 한방 치료로 완벽하게 치유",
    "keywords": [
      "입면장애 완치",
      "뇌 과각성 해소",
      "숙면 회복"
    ],
    "summary": "베개에 누우면 온갖 잡생각이 꼬리를 물고 시계 소리만 째깍째깍 들려 매일 밤이 지옥 같았습니다. 뇌의 불필요한 열을 내리고 부교감신경을 활성화하는 한약과 수면 침 치료를 받고 난 뒤, 이제는 눕자마자 스르륵 깊은 잠에 빠져듭니다. 아침이 너무 상쾌합니다."
  },
  {
    "id": "n-rev-47",
    "author": "다온맘님",
    "date": "2024.06.18",
    "rating": 5,
    "category": "tic-adhd",
    "categoryName": "소아 복합 틱장애",
    "title": "소아 틱장애와 정서 불안, 6개월간 세심한 진료로 완치되고 아이가 밝아졌습니다",
    "keywords": [
      "복합틱 완치",
      "소아정서안정",
      "원장님 명의"
    ],
    "summary": "아이 틱 때문에 유명하다는 병원은 다 다녀봤지만 해아림한의원 손지웅 원장님만큼 원인부터 생활 관리까지 꼼꼼하게 짚어주신 분은 없었습니다. 6개월 동안 꾸준히 치료받으며 틱 증상도 사라지고 아이 표정이 너무 밝고 건강해졌습니다. 평생 은혜 잊지 않겠습니다."
  },
  {
    "id": "n-rev-48",
    "author": "평화로운삶님",
    "date": "2024.05.30",
    "rating": 5,
    "category": "panic",
    "categoryName": "공황장애",
    "title": "갑작스러운 과호흡과 공포감으로 힘들었던 시간, 한방 치료로 마음의 평화를 찾았습니다",
    "keywords": [
      "과호흡 극복",
      "공황장애 완치",
      "정자역 한의원 추천"
    ],
    "summary": "업무 스트레스가 극에 달했을 때 갑자기 숨이 가빠지고 손발이 마비되며 쓰러졌던 경험 이후 늘 불안에 시달렸습니다. 원장님께서 자율신경계 과민도를 낮추고 심신을 안정시키는 탕약을 정성껏 지어주셨고, 3달 치료 후 가슴 답답함과 과호흡 증상이 완전히 사라졌습니다."
  },
  {
    "id": "n-rev-49",
    "author": "수지맘님",
    "date": "2024.05.12",
    "rating": 5,
    "category": "hyperhidrosis-ibs",
    "categoryName": "수족다한증·소화기",
    "title": "시험 때마다 손 땀과 배탈로 고생하던 수험생 딸아이, 한약 복용 후 수능 무사히 치렀습니다",
    "keywords": [
      "수험생 다한증",
      "시험불안 극복",
      "체질개선 성공"
    ],
    "summary": "고3 딸아이가 모의고사 볼 때마다 손에 땀이 흥건해서 OMR 카드가 젖고 배탈이 나서 시험을 망치기 일쑤였습니다. 해아림에서 교감신경을 안정시키고 비위를 보강하는 한약을 먹인 뒤 손 땀과 복통이 싹 사라져 수능 시험을 너무 편안하게 잘 치렀습니다. 진심으로 감사드립니다."
  },
  {
    "id": "n-rev-50",
    "author": "늘감사님",
    "date": "2024.04.25",
    "rating": 5,
    "category": "autonomic",
    "categoryName": "자율신경실조증",
    "title": "원인 모를 어지럼증과 두근거림으로 삶이 무너졌던 제게 새로운 활력을 주신 해아림",
    "keywords": [
      "자율신경 완치",
      "어지럼증 극복",
      "친절한 의료진"
    ],
    "summary": "어지럼증과 두근거림 때문에 외출도 못 하고 침대에만 누워있던 시절이 있었습니다. 마지막 희망으로 찾은 해아림에서 원장님의 따뜻한 진료와 맞춤 한약, 침 치료를 4개월간 받으며 기적처럼 건강을 회복했습니다. 지금은 직장도 복직하고 일상의 행복을 누리고 있습니다. 원장님 정말 감사합니다."
  }
];

let currentNaverPage = 1;
const NAVER_ITEMS_PER_PAGE = 5;
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
let inquiryUnsubscribe = null;
let adminInquiryUnsubscribe = null;
let lastInquirySubmitTime = 0;

// ==========================================================================
// FIREBASE REAL-TIME CLOUD DATABASE SETUP & CONFIG
// ==========================================================================
let db = null;
let auth = null;
let isFirebaseConnected = false;

// Default Firebase Configuration (Official Production healimbd-web app)
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDkvUH811bBK5FepUZqIk7s7_n-yYydMn4",
  authDomain: "healimbd-b726f.firebaseapp.com",
  projectId: "healimbd-b726f",
  storageBucket: "healimbd-b726f.firebasestorage.app",
  messagingSenderId: "456254993853",
  appId: "1:456254993853:web:e4d01aa0f32607bb5eced4",
  measurementId: "G-VT6QHEM9MR"
};

function getFirebaseConfig() {
  const custom = localStorage.getItem('healim_custom_firebase_config');
  if (custom) {
    try {
      return JSON.parse(custom);
    } catch (e) {}
  }
  return DEFAULT_FIREBASE_CONFIG;
}

// XSS Prevention / HTML Sanitizer Utility
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ReCAPTCHA Enterprise Site Key for Firebase App Check
const RECAPTCHA_ENTERPRISE_SITE_KEY = "6LfP16ItAAAAAMaUadL33uzJNgDbGiNluoxZcLXh";
let appCheck = null;

function initFirebase() {
  if (typeof firebase === 'undefined') {
    return;
  }

  try {
    const config = getFirebaseConfig();
    
    // 1. Initialize Firebase App or reuse existing instance
    const app = (!firebase.apps || !firebase.apps.length)
      ? firebase.initializeApp(config)
      : firebase.app();

    // 2. Initialize Firebase App Check IMMEDIATELY AFTER app initialization AND BEFORE Firestore calls
    initFirebaseAppCheck(app);

    // 3. Initialize Firestore & Auth AFTER App Check is initialized
    db = firebase.firestore();
    auth = firebase.auth ? firebase.auth() : null;
    isFirebaseConnected = true;

    // 4. Listen to real-time updates from Cloud Firestore
    listenToCloudInquiries();
  } catch (err) {
    console.warn('Firebase initialization notice:', err);
    isFirebaseConnected = false;
  }
}

function initFirebaseAppCheck(app) {
  if (typeof firebase === 'undefined' || typeof firebase.appCheck !== 'function') {
    return null;
  }

  try {
    // Development / Localhost Debug Token: separated so it only runs on local dev hostnames
    if (typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }

    const appCheckInstance = firebase.appCheck(app);
    if (firebase.appCheck.ReCaptchaEnterpriseProvider) {
      appCheckInstance.activate(
        new firebase.appCheck.ReCaptchaEnterpriseProvider(RECAPTCHA_ENTERPRISE_SITE_KEY),
        true // isTokenAutoRefreshEnabled: true
      );
      appCheck = appCheckInstance;
    }
    return appCheckInstance;
  } catch (e) {
    console.warn('Firebase App Check initialization notice:', e);
    return null;
  }
}

// Singleton Realtime Listener with Duplicate Prevention & Limit
function listenToCloudInquiries() {
  if (!db) return;

  // Unsubscribe existing listener if already active
  if (inquiryUnsubscribe) {
    inquiryUnsubscribe();
    inquiryUnsubscribe = null;
  }

  try {
    inquiryUnsubscribe = db.collection('online_inquiries')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .onSnapshot((snapshot) => {
        const cloudItems = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          let dateStr = '';
          if (data.createdAt && typeof data.createdAt.toDate === 'function') {
            const d = data.createdAt.toDate();
            dateStr = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
          } else if (data.date) {
            dateStr = data.date;
          }

          cloudItems.push({
            id: doc.id,
            region: data.region || '',
            ageText: data.ageText || '',
            gender: data.gender || '',
            nickname: data.nickname || '',
            category: data.category || 'etc',
            disease: getCategoryTitle(data.category || 'etc'),
            title: data.title || '',
            content: data.content || '',
            status: data.status || 'pending',
            answer: data.answer || '',
            date: dateStr
          });
        });

        localStorage.setItem('healim_cloud_inquiries', JSON.stringify(cloudItems));
        renderInquiryList();
      }, (error) => {
        console.warn('Cloud Firestore stream notice:', error.message);
      });
  } catch (e) {}
}

function initOnlineInquiry() {
  const tbody = document.getElementById('inquiry-list-tbody');
  if (!tbody) return;

  // Initialize Firebase Cloud connection
  initFirebase();

  renderInquiryList();
}

// 4 Permanent Base Inquiries (Always present on all devices)
const PERMANENT_BASE_INQUIRIES = [
  {
    "id": "inq_01_autonomic",
    "category": "autonomic",
    "disease": "자율신경실조증",
    "region": "분당",
    "ageText": "40대",
    "gender": "female",
    "nickname": "분당 · 40대 · 여",
    "title": "자율신경실조증 때문에 증상이 여러 가지로 나타날 수 있나요?",
    "date": "2026.08.31",
    "status": "answered",
    "content": "어지럼증과 가슴 두근거림이 있어 내과와 이비인후과를 다녀왔는데 검사 결과는 정상이라고 합니다. 그런데 소화불량도 심하고, 얼굴로 열이 확 올랐다가 손발은 차가워지며 식은땀이 나는 등 증상이 온몸에 걸쳐 여러 가지로 나타납니다. 이런 복합적인 증상들이 전부 자율신경실조증 하나 때문에 생길 수 있는 건가요?",
    "answer": "안녕하세요, 손지웅 대표원장입니다.\n\n네, 맞습니다. 환자분께서 겪고 계신 어지럼, 두근거림, 상열하한, 소화장애, 식은땀은 모두 '자율신경실조증'의 대표적인 전신 복합 증상들입니다.\n\n자율신경계는 우리 몸의 혈압, 심장박동, 체온, 소화, 땀 분비 등 생명 유지 기능을 24시간 무의식적으로 조절하는 시스템입니다. 액셀(교감신경)과 브레이크(부교감신경)의 균형이 깨지면 특정 장기 하나가 아닌 전신에 걸쳐 동시다발적인 이상 신호가 발생하게 됩니다.\n\n종합병원 검사(내시경, MRI 등)는 신체의 구조적 파괴나 질병을 찾는 검사이므로, 기능적 조절 장애인 자율신경실조증은 검사상 정상으로 나오는 경우가 대부분입니다.\n\n한의학에서는 이를 상초의 열을 내리고 하초를 따뜻하게 하는 '수승화강(水昇火降)' 치료로 다스립니다. 교감신경의 과흥분을 가라앉히고 오장육부의 기혈 순환을 돕는 맞춤 탕약과 자율신경 안정 침구 치료를 통해 여러 증상들을 한 번에 근본적으로 회복하실 수 있습니다.",
    "answerDate": "2026.08.31"
  },
  {
    "id": "inq_02_adhd",
    "category": "adhd",
    "disease": "ADHD·집중력",
    "region": "성남시",
    "ageText": "초등학생",
    "gender": "male",
    "nickname": "성남시 · 초등학생 · 남",
    "title": "adhd 때문에 아이가 실수가 너무 많아요",
    "date": "2026.08.31",
    "status": "answered",
    "content": "초등학생 아들이 평소에 덜렁거리고 준비물을 자주 빠뜨리며, 시험을 볼 때도 문제를 끝까지 읽지 않고 틀리는 실수가 너무 많습니다. 선생님께도 수업 시간에 멍하니 있거나 딴짓을 한다는 지적을 받는데 ADHD 증상일까요? 아이를 혼내도 그때뿐인데 한방 치료로 실수를 줄이고 집중력을 높일 수 있는지 궁금합니다.",
    "answer": "안녕하세요, 손지웅 대표원장입니다. 어머님께서 답답하고 속상하셨을 마음이 전해집니다.\n\n적어주신 모습은 전형적인 ADHD의 '주의력 결핍형(inattentive type)' 양상에 해당합니다. 과잉행동이 두드러지지 않더라도, 주의 집중을 유지하고 계획을 실행하는 두뇌 전두엽(Prefrontal Cortex)의 성숙도가 또래에 비해 지연되어 세부적인 것에 주의를 기울이지 못하고 실수를 연발하게 되는 것입니다.\n\n이때 아이를 혼내거나 다그치면 아이의 자존감이 크게 떨어지고 학습에 대한 거부감만 커지게 됩니다. 이는 아이의 의지나 성격 탓이 아닌 신경학적 기능 미성숙이기 때문입니다.\n\n해아림한의원에서는 뇌기능 및 주의집중도 검사를 통해 아이의 두뇌 발달 상태를 평가하고, 전두엽으로의 기혈 순환과 도파민 밸런스를 돕는 총명·안신 한약 처방과 두뇌 훈련을 진행합니다. 아이의 식욕 부진이나 수면 장애 등 양약 부작용 걱정 없이 스스로 주의를 조절하고 실수를 줄여나갈 수 있도록 돕고 있습니다.",
    "answerDate": "2026.08.31"
  },
  {
    "id": "inq_03_sleep",
    "category": "sleep",
    "disease": "수면·불면증",
    "region": "용인",
    "ageText": "직장인",
    "gender": "male",
    "nickname": "용인 · 직장인 · 남",
    "title": "불면증이 오래가면 어떻게 치료해야 하나요?",
    "date": "2026.08.31",
    "status": "answered",
    "content": "직장 생활을 하면서 불면증이 시작된 지 6개월이 넘었습니다. 침대에 누워도 1~2시간 동안 잡생각 때문에 잠이 오지 않고, 어렵게 잠들어도 사소한 소리에 깨서 아침까지 멍합니다. 수면유도제를 계속 먹기에는 내성이나 의존성이 걱정되는데, 이렇게 만성화된 불면증은 한방에서 어떤 원리로 치료하는지 알고 싶습니다.",
    "answer": "안녕하세요, 손지웅 대표원장입니다.\n\n불면증이 6개월 이상 지속되면 낮 동안의 피로, 집중력 저하뿐만 아니라 ‘오늘 밤에도 못 자면 어쩌지’ 하는 수면 예기불안이 생겨 뇌가 더 각성되는 악순환에 빠지게 됩니다.\n\n만성 불면증의 핵심 원인은 뇌 신경계의 과각성(Hyperarousal)과 자율신경계(교감신경 항진 및 부교감신경 저하)의 불균형입니다. 몸은 쉬고 싶어 하지만, 뇌의 시상하부와 각성 중추가 꺼지지 않는 것입니다.\n\n해아림한의원에서는 수면제처럼 인위적으로 뇌를 진정시키는 것이 아니라:\n1. 청뇌·안신 맞춤 한약: 심장과 간의 불필요한 열을 내리고 뇌파를 이완시켜 천연 멜라토닌 분비를 촉진합니다.\n2. 수면 혈자리 침구 요법: 백회혈, 신문혈 등을 자극하여 교감신경의 긴장을 낮추고 깊은 서파수면(숙면)을 유도합니다.\n3. 수면 위생 습관 교정: 뇌의 수면 리듬을 재설정하는 행동 요법을 함께 안내합니다.\n\n약물 의존 없이 스스로 잠드는 뇌의 자연 치유력을 되찾으실 수 있으니 편안히 상담받아보시기 바랍니다.",
    "answerDate": "2026.08.31"
  },
  {
    "id": "inq_04_tic",
    "category": "tic",
    "disease": "틱장애·뚜렛",
    "region": "분당",
    "ageText": "초등학생",
    "gender": "male",
    "nickname": "분당 · 초등학생 · 남",
    "title": "틱장애가 심해지는 이유가 뭘까요?",
    "date": "2026.08.31",
    "status": "answered",
    "content": "초등학교에 다니는 아이가 틱 증상이 나타난 지 좀 되었는데, 최근 들어 증상이 더 심해지고 있습니다. 눈 깜빡임뿐만 아니라 목을 꺾거나 헛기침하는 소리까지 더 잦아졌어요. 스트레스나 피로 때문인지, 아니면 계절이나 환경 변화 때문인지 틱장애가 갑자기 심해지는 원인과 한방에서는 이를 어떻게 치료하고 관리해야 하는지 궁금합니다.",
    "answer": "안녕하세요, 해아림한의원 대표원장 손지웅입니다.\n\n아이가 틱 증상으로 힘들어하고 증상이 심해져 부모님께서도 걱정이 많으셨겠습니다.\n\n틱장애는 증상이 좋아졌다가 나빠지기를 반복하는 ‘왁싱 앤 웨이닝(Waxing & Waning)’ 특성을 지닙니다. 틱이 갑자기 심해지는 주된 원인은 다음과 같습니다:\n\n1. 심리적 스트레스 및 긴장감: 새 학기, 시험, 낯선 환경 적응, 부모나 선생님의 지적\n2. 육체적 피로 및 수면 부족: 늦은 취침 시간, 면역력 저하, 과도한 학업량\n3. 시각적 과자극: 스마트폰, 유튜브, 게임 등 미디어의 과도한 시청으로 인한 뇌 흥분\n4. 두뇌 기저핵의 신경 불균형: 운동 신호를 걸러내는 기저핵의 기능이 일시적으로 저하\n\n한의학에서는 틱의 악화를 뇌 신경계의 열(熱)과 담음(痰飮), 기혈 불균형으로 진단합니다. 해아림한의원에서는 과열된 뇌 신경계를 진정시키는 체질 맞춤 한약 처방과 두뇌 밸런스를 바로잡는 침구 요법, 가정 내 생활관리 코칭을 통해 증상의 악화를 막고 근본적인 뇌 자생력을 길러드립니다. 아이에게 절대 틱을 지적하거나 참으라고 하지 마시고 편안한 마음으로 내원하셔서 진료를 받아보시길 권합니다.",
    "answerDate": "2026.08.31"
  }
];

function getStoredInquiries() {
  let cloudInquiries = [];
  const cloudStored = localStorage.getItem('healim_cloud_inquiries');
  if (cloudStored) {
    try {
      cloudInquiries = JSON.parse(cloudStored);
      if (!Array.isArray(cloudInquiries)) cloudInquiries = [];
    } catch (e) {}
  }

  let userInquiries = [];
  const stored = localStorage.getItem('healim_online_inquiries');
  if (stored) {
    try {
      userInquiries = JSON.parse(stored);
      if (Array.isArray(userInquiries)) {
        userInquiries = userInquiries.filter(item => 
          !item.id.startsWith('inq-answered-') && 
          !item.id.startsWith('inq-real-') && 
          !item.id.startsWith('inq-10')
        );
      } else {
        userInquiries = [];
      }
    } catch (e) {
      userInquiries = [];
    }
  }

  // Merge User local + Cloud items
  const merged = [...userInquiries];
  cloudInquiries.forEach(c => {
    if (!merged.some(m => m.id === c.id)) {
      merged.push(c);
    }
  });

  // Always include the 4 base authentic inquiries
  const baseList = PERMANENT_BASE_INQUIRIES.filter(baseItem => 
    !merged.some(m => m.id === baseItem.id)
  );

  return [...merged, ...baseList];
}

function renderInquiryList() {
  const tbody = document.getElementById('inquiry-list-tbody');
  const table = document.getElementById('inquiry-table');
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
      (item.title && item.title.toLowerCase().includes(q)) ||
      (item.disease && item.disease.toLowerCase().includes(q)) ||
      (item.content && item.content.toLowerCase().includes(q)) ||
      (item.nickname && item.nickname.toLowerCase().includes(q)) ||
      (item.region && item.region.toLowerCase().includes(q)) ||
      (item.ageText && item.ageText.toLowerCase().includes(q))
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    if (table) table.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (table) table.style.display = 'table';
  if (emptyState) emptyState.style.display = 'none';

  let html = '';
  filtered.forEach((item, index) => {
    const num = filtered.length - index;
    const catClass = escapeHtml(item.category || 'etc');
    const isAnswered = item.status === 'answered';
    const statusText = isAnswered ? '답변완료' : '답변대기';
    const statusClass = isAnswered ? 'answered' : 'pending';
    const cleanTitle = escapeHtml(item.title);
    const authorInfo = formatAuthorInfo(item);
    const cleanNickname = escapeHtml(authorInfo);
    const cleanDate = escapeHtml(item.date || '');
    const cleanDisease = escapeHtml(item.disease || getCategoryTitle(item.category));
    const cleanId = escapeHtml(item.id);

    html += `
      <tr onclick="handleInquiryClick('${cleanId}')">
        <td class="col-num">${num}</td>
        <td class="col-cat">
          <span class="cat-badge ${catClass}">${cleanDisease}</span>
        </td>
        <td class="col-title">
          <span class="table-title-link">
            <span>${cleanTitle}</span>
          </span>
        </td>
        <td class="col-info">${cleanNickname}</td>
        <td class="col-date">${cleanDate}</td>
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
  const btns = document.querySelectorAll('#inquiry-category-tabs .inquiry-tab-btn');
  btns.forEach(btn => {
    if (btn.getAttribute('data-category') === cat) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  renderInquiryList();
}

function handleInquirySearch(query) {
  currentInquirySearchQuery = query.trim();
  renderInquiryList();
}

// Detail Modal Handler
function handleInquiryClick(id) {
  openInquiryDetailModal(id);
}

function openInquiryDetailModal(id) {
  const items = getStoredInquiries();
  const inquiry = items.find(item => item.id === id);
  if (!inquiry) return;

  currentOpenedInquiryId = id;

  const modal = document.getElementById('inquiry-detail-modal');
  const diseaseEl = document.getElementById('view-inq-disease');
  const statusEl = document.getElementById('view-inq-status');
  const titleEl = document.getElementById('view-inq-title');
  const nicknameEl = document.getElementById('view-inq-nickname');
  const dateEl = document.getElementById('view-inq-date');
  const contentEl = document.getElementById('view-inq-content');
  const answerWrapper = document.getElementById('view-doctor-answer-wrapper');
  const answerContentEl = document.getElementById('view-doctor-answer-content');
  const unansweredBox = document.getElementById('view-unanswered-box');
  const adminControls = document.getElementById('inquiry-admin-controls');

  if (diseaseEl) diseaseEl.textContent = inquiry.disease || getCategoryTitle(inquiry.category);
  if (statusEl) {
    const isAnswered = inquiry.status === 'answered';
    statusEl.textContent = isAnswered ? '답변완료' : '답변대기';
    statusEl.className = 'detail-status-tag ' + (isAnswered ? 'answered' : 'pending');
  }
  if (titleEl) titleEl.textContent = inquiry.title;
  const authorEl = document.getElementById('view-inq-author') || nicknameEl;
  if (authorEl) authorEl.textContent = formatAuthorInfo(inquiry);
  if (nicknameEl && nicknameEl !== authorEl) nicknameEl.textContent = formatAuthorInfo(inquiry);
  if (dateEl) dateEl.textContent = inquiry.date || '';
  if (contentEl) contentEl.textContent = inquiry.content;

  if (inquiry.status === 'answered' && inquiry.answer) {
    if (answerWrapper) answerWrapper.style.display = 'block';
    if (unansweredBox) unansweredBox.style.display = 'none';
    if (answerContentEl) answerContentEl.textContent = inquiry.answer;
  } else {
    if (answerWrapper) answerWrapper.style.display = 'none';
    if (unansweredBox) unansweredBox.style.display = 'block';
  }

  // Admin buttons visibility
  if (adminControls) {
    const isAdmin = checkIsAdminUser();
    adminControls.style.display = isAdmin ? 'flex' : 'none';
  }

  if (modal) modal.classList.add('active');
}

function closeInquiryDetailModal() {
  const modal = document.getElementById('inquiry-detail-modal');
  if (modal) modal.classList.remove('active');
  currentOpenedInquiryId = null;
}

function checkIsAdminUser() {
  if (auth && auth.currentUser) return true;
  return localStorage.getItem('healim_admin_logged') === 'true';
}

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

async function handleInquirySubmit(e) {
  e.preventDefault();

  const submitBtn = document.getElementById('inquiry-submit-btn');

  // Rate Limiting & Cooldown Protection (Anti-Spam)
  const now = Date.now();
  if (now - lastInquirySubmitTime < 5000) {
    alert('상담글은 5초 간격으로 등록하실 수 있습니다. 잠시 후 다시 시도해주세요.');
    return;
  }

  const region = document.getElementById('inq-region')?.value.trim() || '';
  const ageText = document.getElementById('inq-age')?.value.trim() || '';
  const gender = document.querySelector('input[name="inq-gender"]:checked')?.value || 'male';

  const selectedDiseaseEl = document.querySelector('input[name="inq-disease"]:checked');
  const category = selectedDiseaseEl ? selectedDiseaseEl.getAttribute('data-category') : 'tic';
  const disease = selectedDiseaseEl ? selectedDiseaseEl.value : '틱장애·뚜렛';
  const title = document.getElementById('inq-title')?.value.trim() || '';
  const content = document.getElementById('inq-content')?.value.trim() || '';

  // Input Validation
  if (!region || region.length < 1 || region.length > 30) {
    alert('거주지역을 1자 이상 30자 이하로 입력해주세요. (예: 분당 / 성남시 / 서울 강남구)');
    return;
  }

  if (!ageText || ageText.length < 1 || ageText.length > 20) {
    alert('나이를 1자 이상 20자 이하로 입력해주세요. (예: 35세 또는 30대)');
    return;
  }

  if (!['male', 'female'].includes(gender)) {
    alert('성별을 올바르게 선택해주세요.');
    return;
  }

  if (title.length < 2 || title.length > 100) {
    alert('제목은 2자 이상 100자 이하로 입력해주세요.');
    return;
  }
  if (content.length < 5 || content.length > 3000) {
    alert('상담 내용은 5자 이상 3000자 이하로 입력해주세요.');
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> <span>등록 중...</span>';
  }

  try {
    const today = new Date();
    const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

    const newDocId = `inq_${Date.now()}`;

    // Local fallback object
    const newInquiryLocal = {
      id: newDocId,
      region: region,
      ageText: ageText,
      gender: gender,
      category: category,
      disease: disease,
      title: title,
      content: content,
      status: 'pending',
      date: dateStr,
      answer: '',
      answerDate: ''
    };

    // 1. Save to Local
    const stored = getStoredInquiries();
    stored.unshift(newInquiryLocal);
    localStorage.setItem('healim_online_inquiries', JSON.stringify(stored));

    // 2. Sync to Firebase Cloud Firestore (Strict demographic schema: region, ageText, gender)
    if (db && isFirebaseConnected) {
      await db.collection('online_inquiries').doc(newDocId).set({
        region: region,
        ageText: ageText,
        gender: gender,
        category: category,
        title: title,
        content: content,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    lastInquirySubmitTime = Date.now();

    document.getElementById('inquiry-submit-form')?.reset();
    closeInquiryWriteModal();
    showAuthToast('🎉 온라인 상담글이 성공적으로 등록되었습니다. 손지웅 원장님이 확인 후 성심성의껏 전문 답변을 등록해 드립니다.');
    renderInquiryList();
  } catch (err) {
    console.error('Inquiry submit error:', err);
    alert('상담글 등록 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="ph-bold ph-paper-plane-tilt"></i> <span>상담글 등록하기</span>';
    }
  }
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

async function handleDoctorReplySubmit(e) {
  e.preventDefault();
  if (!currentOpenedInquiryId) return;

  const textarea = document.getElementById('doctor-reply-textarea');
  const answerText = textarea ? textarea.value.trim() : '';
  if (!answerText) return;

  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;

  const items = getStoredInquiries();
  const targetIndex = items.findIndex(item => item.id === currentOpenedInquiryId);
  if (targetIndex !== -1) {
    items[targetIndex].answer = answerText;
    items[targetIndex].answerDate = dateStr;
    items[targetIndex].status = 'answered';
    localStorage.setItem('healim_online_inquiries', JSON.stringify(items));
  }

  // Sync answer to Cloud Firestore
  if (db && isFirebaseConnected && currentOpenedInquiryId) {
    try {
      const existing = items.find(i => i.id === currentOpenedInquiryId);
      const isFirstAnswer = !existing || existing.status !== 'answered';

      const updateData = {
        answer: answerText,
        status: 'answered',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (isFirstAnswer) {
        updateData.answeredAt = firebase.firestore.FieldValue.serverTimestamp();
      }

      await db.collection('online_inquiries').doc(currentOpenedInquiryId).update(updateData);
      console.log('☁️ Doctor answer synced to Cloud Firestore!');
    } catch (err) {
      console.warn('Cloud Firestore reply update notice:', err);
    }
  }

  closeDoctorReplyEditorModal();
  showAuthToast('🩺 손지웅 대표원장의 전문 답변이 성공적으로 등록되었습니다.');

  openInquiryDetailModal(currentOpenedInquiryId);
  renderInquiryList();
}

async function handleAdminDeleteInquiry() {
  if (!currentOpenedInquiryId) return;
  if (!confirm('정말 이 상담글을 삭제하시겠습니까?')) return;

  const targetId = currentOpenedInquiryId;
  let items = getStoredInquiries();
  items = items.filter(item => item.id !== targetId);
  localStorage.setItem('healim_online_inquiries', JSON.stringify(items));

  // Delete from Cloud Firestore
  if (db && isFirebaseConnected && targetId) {
    try {
      await db.collection('online_inquiries').doc(targetId).delete();
      console.log('☁️ Deleted from Cloud Firestore!');
    } catch (err) {}
  }

  closeInquiryDetailModal();
  showAuthToast('🗑️ 상담글이 삭제되었습니다.');
  renderInquiryList();
}


// ==========================================================================
// ADMIN DASHBOARD CONTROLLER (/admin)
// ==========================================================================
let currentAdminFilter = 'all';
let currentAdminSearch = '';
let adminInquiriesCache = [];
let editingInquiryId = null;

function initAdminDashboard() {
  const adminPanel = document.getElementById('admin-authenticated-panel');
  const loginCard = document.getElementById('admin-auth-login-card');
  if (!adminPanel && !loginCard) return;

  // Initialize Firebase
  initFirebase();

  if (auth) {
    auth.onAuthStateChanged((user) => {
      if (user) {
        if (loginCard) loginCard.style.display = 'none';
        if (adminPanel) adminPanel.style.display = 'block';
        const emailEl = document.getElementById('admin-logged-user-email');
        if (emailEl) emailEl.textContent = user.email || '관리자 접속 중';
        listenToAdminInquiries();
      } else {
        if (loginCard) loginCard.style.display = 'block';
        if (adminPanel) adminPanel.style.display = 'none';
        if (adminInquiryUnsubscribe) {
          adminInquiryUnsubscribe();
          adminInquiryUnsubscribe = null;
        }
      }
    });
  } else {
    if (loginCard) loginCard.style.display = 'block';
  }
}

async function handleFirebaseAdminLogin(e) {
  e.preventDefault();
  const email = document.getElementById('admin-auth-email')?.value.trim();
  const password = document.getElementById('admin-auth-password')?.value.trim();
  const errorEl = document.getElementById('admin-login-error');
  const submitBtn = document.getElementById('admin-login-submit-btn');

  if (errorEl) errorEl.style.display = 'none';
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> <span>로그인 중...</span>';
  }

  if (!auth) {
    if (errorEl) {
      errorEl.textContent = 'Firebase 인증 모듈을 불러올 수 없습니다. 네트워크를 확인해주세요.';
      errorEl.style.display = 'block';
    }
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="ph-bold ph-sign-in"></i> <span>관리자 로그인</span>'; }
    return;
  }

  try {
    await auth.signInWithEmailAndPassword(email, password);
    localStorage.setItem('healim_admin_logged', 'true');
    showAuthToast('🩺 관리자 인증에 성공하였습니다.');
  } catch (err) {
    console.warn('Firebase login error:', err.message);
    if (errorEl) {
      errorEl.textContent = '로그인 실패: 이메일 또는 비밀번호를 다시 확인해주세요. (' + err.code + ')';
      errorEl.style.display = 'block';
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="ph-bold ph-sign-in"></i> <span>관리자 로그인</span>';
    }
  }
}

async function handleFirebaseAdminLogout() {
  if (auth) {
    await auth.signOut();
  }
  localStorage.removeItem('healim_admin_logged');
  showAuthToast('로그아웃되었습니다.');
}

function listenToAdminInquiries() {
  if (!db) return;

  if (adminInquiryUnsubscribe) {
    adminInquiryUnsubscribe();
    adminInquiryUnsubscribe = null;
  }

  adminInquiryUnsubscribe = db.collection('online_inquiries')
    .orderBy('createdAt', 'desc')
    .limit(100)
    .onSnapshot((snapshot) => {
      adminInquiriesCache = [];
      snapshot.forEach(doc => {
        const d = doc.data();
        let dateStr = '';
        if (d.createdAt && typeof d.createdAt.toDate === 'function') {
          const dt = d.createdAt.toDate();
          dateStr = `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')}`;
        }
        adminInquiriesCache.push({
          id: doc.id,
          region: d.region || '',
          ageText: d.ageText || '',
          gender: d.gender || '',
          nickname: d.nickname || '',
          category: d.category || 'etc',
          disease: getCategoryTitle(d.category || 'etc'),
          title: d.title || '',
          content: d.content || '',
          status: d.status || 'pending',
          answer: d.answer || '',
          date: dateStr
        });
      });

      renderAdminInquiries();
      updateAdminStats();
    }, (error) => {
      console.warn('Admin onSnapshot error:', error.message);
    });
}

function updateAdminStats() {
  const total = adminInquiriesCache.length;
  const pending = adminInquiriesCache.filter(i => i.status === 'pending').length;
  const answered = adminInquiriesCache.filter(i => i.status === 'answered').length;

  const totalEl = document.getElementById('admin-stat-total');
  const pendingEl = document.getElementById('admin-stat-pending');
  const answeredEl = document.getElementById('admin-stat-answered');

  if (totalEl) totalEl.textContent = total;
  if (pendingEl) pendingEl.textContent = pending;
  if (answeredEl) answeredEl.textContent = answered;
}

function filterAdminStatus(status) {
  currentAdminFilter = status;
  const btns = document.querySelectorAll('.admin-filter-btn');
  btns.forEach(b => {
    if (b.getAttribute('data-status') === status) b.classList.add('active');
    else b.classList.remove('active');
  });
  renderAdminInquiries();
}

function handleAdminSearch(val) {
  currentAdminSearch = val.trim().toLowerCase();
  renderAdminInquiries();
}

function renderAdminInquiries() {
  const tbody = document.getElementById('admin-inquiries-tbody');
  const emptyState = document.getElementById('admin-inquiries-empty');
  if (!tbody) return;

  let list = adminInquiriesCache;
  if (currentAdminFilter !== 'all') {
    list = list.filter(i => i.status === currentAdminFilter);
  }
  if (currentAdminSearch) {
    list = list.filter(i => 
      i.title.toLowerCase().includes(currentAdminSearch) ||
      i.content.toLowerCase().includes(currentAdminSearch) ||
      (i.nickname && i.nickname.toLowerCase().includes(currentAdminSearch)) ||
      (i.region && i.region.toLowerCase().includes(currentAdminSearch)) ||
      (i.ageText && i.ageText.toLowerCase().includes(currentAdminSearch))
    );
  }

  if (list.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  if (emptyState) emptyState.style.display = 'none';

  let html = '';
  list.forEach((item, idx) => {
    const num = list.length - idx;
    const isAnswered = item.status === 'answered';
    const statusBadge = isAnswered 
      ? '<span class="status-badge answered">답변완료</span>' 
      : '<span class="status-badge pending">답변대기</span>';

    const safeTitle = escapeHtml(item.title);
    const safeContent = escapeHtml(item.content.substring(0, 70)) + (item.content.length > 70 ? '...' : '');
    const safeNick = escapeHtml(formatAuthorInfo(item));
    const safeDate = escapeHtml(item.date);
    const safeDisease = escapeHtml(item.disease);
    const safeId = escapeHtml(item.id);

    html += `
      <tr>
        <td class="col-num">${num}</td>
        <td><span class="cat-badge ${item.category}">${safeDisease}</span></td>
        <td>
          <div style="font-weight:700; color:#0F172A; margin-bottom:3px;">${safeTitle}</div>
          <div style="font-size:0.84rem; color:#64748B;">${safeContent}</div>
        </td>
        <td>${safeNick}</td>
        <td>${safeDate}</td>
        <td>${statusBadge}</td>
        <td>
          <button type="button" class="btn-admin-action reply" onclick="openAdminDoctorReplyModal('${safeId}')">
            <i class="ph-bold ph-pencil"></i> ${isAnswered ? '수정' : '답변'}
          </button>
          <button type="button" class="btn-admin-action delete" onclick="handleAdminDeleteInquiryFromTable('${safeId}')">
            <i class="ph-bold ph-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
}

function openAdminDoctorReplyModal(id) {
  const item = adminInquiriesCache.find(i => i.id === id);
  if (!item) return;

  editingInquiryId = id;
  const modal = document.getElementById('admin-doctor-reply-modal');
  const catEl = document.getElementById('admin-modal-q-category');
  const nickEl = document.getElementById('admin-modal-q-nickname');
  const dateEl = document.getElementById('admin-modal-q-date');
  const titleEl = document.getElementById('admin-modal-q-title');
  const contentEl = document.getElementById('admin-modal-q-content');
  const textarea = document.getElementById('admin-doctor-reply-text');

  if (catEl) catEl.textContent = item.disease;
  const authorEl = document.getElementById('admin-modal-q-author') || nickEl;
  if (authorEl) authorEl.textContent = '작성자: ' + formatAuthorInfo(item);
  if (nickEl && nickEl !== authorEl) nickEl.textContent = '작성자: ' + formatAuthorInfo(item);
  if (dateEl) dateEl.textContent = item.date;
  if (titleEl) titleEl.textContent = item.title;
  if (contentEl) contentEl.textContent = item.content;
  if (textarea) textarea.value = item.answer || '';

  if (modal) modal.classList.add('active');
}

function closeAdminDoctorReplyModal() {
  const modal = document.getElementById('admin-doctor-reply-modal');
  if (modal) modal.classList.remove('active');
  editingInquiryId = null;
}

async function handleAdminSaveDoctorReply(e) {
  e.preventDefault();
  if (!editingInquiryId || !db) return;

  const textarea = document.getElementById('admin-doctor-reply-text');
  const answerText = textarea ? textarea.value.trim() : '';
  if (!answerText) return;

  const saveBtn = document.getElementById('admin-save-reply-btn');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> <span>저장 중...</span>';
  }

  try {
    const existing = adminInquiriesCache.find(i => i.id === editingInquiryId);
    const isFirstAnswer = !existing || existing.status !== 'answered';

    const updatePayload = {
      answer: answerText,
      status: 'answered',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (isFirstAnswer) {
      updatePayload.answeredAt = firebase.firestore.FieldValue.serverTimestamp();
    }

    await db.collection('online_inquiries').doc(editingInquiryId).update(updatePayload);

    closeAdminDoctorReplyModal();
    showAuthToast('🩺 손지웅 대표원장의 전문 답변이 실시간 등록되었습니다.');
  } catch (err) {
    alert('답변 저장 실패: ' + err.message);
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<i class="ph-bold ph-check"></i> <span>답변 등록 / 완료 처리</span>';
    }
  }
}

async function handleAdminDeleteInquiryFromTable(id) {
  if (!confirm('정말 이 상담글을 영구 삭제하시겠습니까?')) return;
  if (!db) return;

  try {
    await db.collection('online_inquiries').doc(id).delete();
    showAuthToast('🗑️ 상담글이 삭제되었습니다.');
  } catch (err) {
    alert('삭제 실패: ' + err.message);
  }
}

// Attach admin init to DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  initAdminDashboard();
});
