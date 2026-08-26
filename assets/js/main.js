// Healim Bundang Clinic - Interactions & UI Script
document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initInquiryModal();
  initSelfCheck();
  initFAQ();
  initScrollEffects();
  initSmoothScroll();
  initReviewTabs();
  initAuth();
  initAdminCaseWriter();
  initAdminColumnBoard();
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

// 8. Medical Law Member Auth System (로그인 / 회원가입 & 보호 콘텐츠 열람)
function initAuth() {
  const storedUser = localStorage.getItem('healim_auth_user');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
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
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');

  if (tab === 'signup') {
    if (loginTabBtn) loginTabBtn.classList.remove('active');
    if (signupTabBtn) signupTabBtn.classList.add('active');
    if (loginForm) loginForm.style.display = 'none';
    if (signupForm) signupForm.style.display = 'block';
  } else {
    if (loginTabBtn) loginTabBtn.classList.add('active');
    if (signupTabBtn) signupTabBtn.classList.remove('active');
    if (loginForm) loginForm.style.display = 'block';
    if (signupForm) signupForm.style.display = 'none';
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
  const email = emailInput ? emailInput.value.trim() : '회원';
  const name = email.split('@')[0] || '회원';

  const user = {
    name: name,
    email: email,
    provider: 'email',
    loginAt: new Date().toISOString()
  };

  localStorage.setItem('healim_auth_user', JSON.stringify(user));
  updateAuthUI(user);
  closeAuthModal();
  showAuthToast(`🎉 ${name}님 환영합니다! 로그인되어 자필 수기를 열람하실 수 있습니다.`);
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
    loginAt: new Date().toISOString()
  };

  localStorage.setItem('healim_auth_user', JSON.stringify(user));
  updateAuthUI(user);
  closeAuthModal();
  showAuthToast(`🎉 회원가입이 완료되었습니다! ${name}님 환영합니다.`);
}

function logoutUser() {
  localStorage.removeItem('healim_auth_user');
  updateAuthUI(null);
  showAuthToast('로그아웃 되었습니다.');
}

function updateAuthUI(user) {
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

function initAdminCaseWriter() {
  renderCustomCasesToList();
}

function openAdminCaseWriter() {
  openAdminAuthModal('case');
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
    closeAdminAuthModal();
    const isColumn = window.adminTargetModal === 'column';
    showAuthToast(isColumn ? '🔓 관리자 인증 성공! 원장 칼럼 작성창이 열립니다.' : '🔓 관리자 인증 성공! 치료사례 작성창이 열립니다.');
    setTimeout(() => {
      if (isColumn) {
        openAdminColumnWriterModal();
      } else {
        openAdminWriterModal();
      }
      window.adminTargetModal = null;
    }, 250);
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
  }
}

function closeAdminWriterModal() {
  const modal = document.getElementById('admin-case-writer-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
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

function handleAdminCaseSubmit(e) {
  e.preventDefault();
  const cat = document.getElementById('case-input-category').value;
  const startMonth = document.getElementById('case-input-start-month').value;
  const endMonth = document.getElementById('case-input-end-month').value;
  const content = document.getElementById('case-input-content').value.trim();

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
    createdAt: Date.now()
  };

  const stored = JSON.parse(localStorage.getItem('healim_custom_cases') || '[]');
  stored.unshift(newCase);
  localStorage.setItem('healim_custom_cases', JSON.stringify(stored));

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

  if (catEl) {
    catEl.textContent = found.categoryName;
    catEl.className = 'case-tag-pill ' + found.category;
  }
  if (titleEl) titleEl.textContent = found.title;
  if (durationEl) durationEl.textContent = `치료기간: ${found.duration || found.date}`;
  if (photoEl) photoEl.src = found.image;
  if (bodyEl) bodyEl.innerHTML = found.content.replace(/\n/g, '<br>');

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

const DEFAULT_COLUMNS_DATA = {
  tic: {
    category: 'tic',
    categoryName: '소아·성인 틱장애',
    title: '눈깜빡임과 킁킁거림, 틱장애는 억제가 아닌 뇌신경계 조절력 강화가 핵심입니다',
    date: '2026.08.20',
    author: '손지웅 대표원장',
    image: 'images/clinics/tic.jpg',
    content: `틱장애(Tic Disorder)는 자신의 의지와 무관하게 근육을 움직이거나(운동틱) 특정한 소리를 내는(음성틱) 질환입니다.

많은 부모님들께서 "하지 마", "참아봐"라며 아이를 다그치시지만, 이는 아이의 긴장도와 뇌 흥분도를 극대화하여 증상을 더욱 악화시킬 뿐입니다.

■ 틱장애가 발생하는 근본 원인
두뇌의 기저핵(Basal Ganglia)은 불필요한 근육 움직임을 억제하고 정교한 운동을 조절하는 제동장치 역할을 합니다. 성장기 두뇌 발달의 불균형이나 유전적·환경적 스트레스, 자율신경의 과항진이 겹치면 이 억제 기능에 과부하가 걸리며 불수의적 움직임이 표출됩니다.

■ 해아림한의원 분당점의 3단계 치료
1. 뇌신경계 긴장 완화: 맞춤 한약을 통해 뇌의 기혈 순환을 돕고 과흥분된 신경 전달물질의 균형을 맞춥니다.
2. 기저핵·전두엽 자율 조절 훈련: 뇌파 훈련(뉴로피드백)과 소뇌 운동 치료를 병행하여 스스로 제동할 수 있는 힘을 키웁니다.
3. 심리적 안정 및 가족 코칭: 틱 증상에 대한 부모님의 대처법과 환경 개선으로 재발을 방지합니다.`
  },
  adhd: {
    category: 'adhd',
    categoryName: '주의집중력·ADHD',
    title: '산만함과 충동성, 전두엽 억제 제동장치를 회복하는 맞춤 한방 치료',
    date: '2026.08.18',
    author: '손지웅 대표원장',
    image: 'images/clinics/adhd.jpg',
    content: `ADHD(주의력결핍 과잉행동장애)는 성격이나 훈육의 문제가 아닌, 전두엽(Frontal Lobe)의 자기조절 기능 발달 지연에서 기인합니다.

■ ADHD의 핵심 증상 3가지
1. 주의력 결핍: 한 가지 일에 지속적으로 집중하지 못하고 잦은 실수를 반복함
2. 과잉 행동: 가만히 앉아 있지 못하고 손발을 꼼지락거리거나 지나치게 뛰어다님
3. 충동성: 순서를 기다리지 못하고 불쑥 끼어들거나 감정 조절이 어려움

■ 한방 맞춤 치료의 장점
양약 신경정신과 약물의 식욕부진, 수면장애, 의존성 부담 없이, 뇌의 전두엽 혈류를 개선하고 두뇌 각성도를 자연스럽게 정상화하는 한약 처방과 두뇌 훈련을 병행하여 스스로 계획하고 절제하는 힘을 길러줍니다.`
  },
  panic: {
    category: 'panic',
    categoryName: '공황장애',
    title: '검사상 이상은 없는데 죽을 것 같은 공포... 공황장애와 자율신경 과흥분의 진실',
    date: '2026.08.15',
    author: '손지웅 대표원장',
    image: 'images/clinics/panic.jpg',
    content: `갑자기 숨이 턱 막히고 심장이 터질 듯이 뛰며 '이러다 죽거나 미치는 것은 아닐까' 하는 극심한 공포가 밀려오는 공황발작.
응급실에서 심전도와 피검사를 받아도 "아무 이상이 없다"는 말만 듣고 돌아오기 일쑤입니다.

■ 공황발작이 일어나는 기전
뇌 속 위험 감지 센서인 편도체(Amygdala)가 실제 위험이 없음에도 '초비상 사태'로 오작동하여 교감신경을 극한으로 폭주시키는 현상입니다.

■ 자율신경 안정을 통한 근본 치유
불안을 무조건 누르는 것이 아니라, 과열된 교감신경의 스위치를 끄고 부교감신경의 이완력을 복원하는 청심(淸心), 안신(安神) 한약과 자율신경 조절 침구 요법으로 공황의 고리를 끊어냅니다.`
  },
  sleep: {
    category: 'sleep',
    categoryName: '수면·불면증',
    title: '수면제에 의존하지 않고 자연스러운 깊은 잠을 회복하는 두뇌 리듬 치유법',
    date: '2026.08.10',
    author: '손지웅 대표원장',
    image: 'images/clinics/sleep.jpg',
    content: `잠자리에 누워 1시간 넘게 뒤척이거나, 새벽에 자꾸 깨어 아침이 피곤한 만성 불면증.
수면유도제나 신경안정제는 일시적으로 뇌를 기절시킬 뿐, 깊은 3~4단계 숙면을 만들어내지 못합니다.

■ 불면의 유형별 원인
1. 입면장애: 뇌의 생각이 멈추지 않고 심장이 두근거려 잠들기 힘든 상태
2. 수면유지장애: 얕은 잠을 자며 작은 소리에도 자주 깨고 꿈이 많은 상태 (다몽증)
3. 조기각성: 새벽 3~4시에 눈이 떠져 다시 잠들지 못하는 상태

■ 해아림의 자연 수면 리듬 회복법
심장의 열(心熱)을 내리고 간의 피로(肝鬱)를 풀어주는 맞춤 한약과 이완 치료를 통해 뇌가 스스로 편안하게 수면 스위치를 켤 수 있도록 만듭니다.`
  },
  anxiety: {
    category: 'anxiety',
    categoryName: '불안·사회공포',
    title: '발표할 때 목소리가 떨리고 얼굴이 붉어지는 사회공포증, 체질별 접근법',
    date: '2026.08.05',
    author: '손지웅 대표원장',
    image: 'images/clinics/anxiety.jpg',
    content: `사람들 앞에서 발표하거나 회의를 할 때 심장이 미친 듯이 뛰고, 목소리가 떨리거나 얼굴이 화끈거려 일상과 직장 생활에 큰 고통을 받는 사회공포증(대인불안).

단순한 성격의 소심함이 아니라, 타인의 시선과 평가 상황에서 자율신경계가 과민 반응을 일으키는 뇌신경계 질환입니다.

■ 한방 치유 프로세스
- 교감신경 과민 완화: 가슴 답답함과 상열감을 해소하는 한약 처방
- 심신 이완 및 두뇌 피드백: 긴장 상황에서도 안정된 심박수와 호흡을 유지할 수 있는 바이오피드백 훈련`
  },
  autonomic: {
    category: 'autonomic',
    categoryName: '자율신경실조증',
    title: '원인 모를 두통, 어지럼증, 가슴 답답함... 자율신경 불균형이 보내는 신호',
    date: '2026.07.28',
    author: '손지웅 대표원장',
    image: 'images/clinics/autonomic.jpg',
    content: `머리가 맑지 않고 어지러우며, 소화가 안 되고 온몸이 천근만근 무거운데 병원 검사에서는 "스트레스성 신경성"이라는 말만 들으셨나요?

우리 몸의 호흡, 맥박, 혈압, 소화, 체온을 무의식적으로 조율하는 자율신경계(교감신경-부교감신경)의 시소가 무너졌기 때문입니다.

■ 자율신경 불균형의 대표 증상
- 원인 모를 만성 두통, 멍함, 브레인 포그
- 가슴 두근거림, 숨찬 느낌, 식은땀
- 만성 위장 장애, 과민성 대장, 전신 근육통

체질 분석과 정밀 자율신경 검사를 통해 깨진 균형점을 바로잡고 몸의 자연 치유력을 되살려드립니다.`
  }
};

function initAdminColumnBoard() {
  const dateInput = document.getElementById('column-input-date');
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
  renderCustomColumns();
}

function openAdminColumnWriter() {
  openAdminAuthModal('column');
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
  }
}

function closeAdminColumnWriterModal() {
  const modal = document.getElementById('admin-column-writer-modal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
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
}

function handleAdminColumnSubmit(e) {
  e.preventDefault();

  const category = document.getElementById('column-input-category').value;
  const title = document.getElementById('column-input-title').value.trim();
  const dateVal = document.getElementById('column-input-date').value || new Date().toISOString().split('T')[0];
  const content = document.getElementById('column-input-content').value.trim();

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
    summary: content.slice(0, 110) + (content.length > 110 ? '...' : '')
  };

  const customColumns = JSON.parse(localStorage.getItem('healim_custom_columns') || '[]');
  customColumns.unshift(newColumn);
  localStorage.setItem('healim_custom_columns', JSON.stringify(customColumns));

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
    // Remove existing custom column cards
    const existingCustoms = grid.querySelectorAll('.custom-column-card');
    existingCustoms.forEach(el => el.remove());

    if (!customColumns.length) return;

    const fragment = document.createDocumentFragment();
    customColumns.forEach(col => {
      const card = document.createElement('article');
      card.className = 'doctor-column-card custom-column-card';
      card.setAttribute('data-category', col.category);
      card.onclick = () => openCustomColumnReader(col.id);

      const colImg = col.image || CLINIC_THUMB_MAP[col.category] || 'images/clinics/autonomic.jpg';

      card.innerHTML = `
        <div class="col-thumb-wrap">
          <img src="${colImg}" alt="${col.title}" class="col-thumb-img" loading="lazy">
          <span class="col-badge-pill ${col.category}">${col.categoryName}</span>
        </div>
        <div class="col-card-body">
          <div class="col-meta-row">
            <span class="col-date-text">${col.date}</span>
          </div>
          <h3 class="col-card-title">${col.title}</h3>
          <p class="col-card-desc">${col.summary}</p>
          <div class="col-card-footer">
            <span class="col-author-label"><i class="ph-bold ph-user-circle"></i> ${col.author}</span>
            <span class="col-read-more">칼럼 읽기 <i class="ph-bold ph-arrow-right"></i></span>
          </div>
        </div>
      `;
      fragment.appendChild(card);
    });

    grid.insertBefore(fragment, grid.firstChild);
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
  const cards = document.querySelectorAll('.doctor-column-card');
  cards.forEach(card => {
    const cardCat = card.getAttribute('data-category');
    if (filterKey === 'all' || cardCat === filterKey) {
      card.style.display = 'flex';
      card.classList.add('fade-in');
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
  const catName = CATEGORY_NAME_MAP[cat] || '신경정신';

  const mdContent = `---
title: "${title}"
date: ${dateVal}
category: "${cat}"
category_name: "${catName}"
author: "손지웅 대표원장"
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



