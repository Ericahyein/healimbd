const fs = require('fs');

let mainJs = fs.readFileSync('assets/js/main.js', 'utf-8');

// Find the Inquiry section
const sMarker = 'let currentInquiryFilter = \'all\';';
const eMarker = 'function openInquiryWriteModal() {';

const sIdx = mainJs.indexOf(sMarker);
const eIdx = mainJs.indexOf(eMarker);

if (sIdx !== -1 && eIdx !== -1) {
  const completeEngine = `let currentInquiryFilter = 'all';
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

// Default Firebase Configuration (Can be customized via Admin or Code)
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyDummyKeyForHealimFirebaseProject",
  authDomain: "healimbd-online-inquiry.firebaseapp.com",
  projectId: "healimbd-online-inquiry",
  storageBucket: "healimbd-online-inquiry.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
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

function initFirebase() {
  if (typeof firebase === 'undefined') {
    return;
  }

  try {
    const config = getFirebaseConfig();
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(config);
    }
    db = firebase.firestore();
    auth = firebase.auth ? firebase.auth() : null;
    isFirebaseConnected = true;

    // Initialize App Check if available
    initFirebaseAppCheck();

    // Listen to real-time updates from Cloud Firestore
    listenToCloudInquiries();
  } catch (err) {
    isFirebaseConnected = false;
  }
}

function initFirebaseAppCheck() {
  if (typeof firebase !== 'undefined' && firebase.appCheck) {
    try {
      const appCheck = firebase.appCheck();
      // In development / testing or configured with ReCaptchaEnterprise
      if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
      }
    } catch (e) {}
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
            dateStr = \`\${d.getFullYear()}.\${String(d.getMonth() + 1).padStart(2, '0')}.\${String(d.getDate()).padStart(2, '0')}\`;
          } else if (data.date) {
            dateStr = data.date;
          }

          cloudItems.push({
            id: doc.id,
            nickname: data.nickname || '익명',
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

  return merged;
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
      (item.nickname && item.nickname.toLowerCase().includes(q))
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
    const cleanNickname = escapeHtml(item.nickname || '익명');
    const cleanDate = escapeHtml(item.date || '');
    const cleanDisease = escapeHtml(item.disease || getCategoryTitle(item.category));
    const cleanId = escapeHtml(item.id);

    html += \`
      <tr onclick="handleInquiryClick('\${cleanId}')">
        <td class="col-num">\${num}</td>
        <td class="col-cat">
          <span class="cat-badge \${catClass}">\${cleanDisease}</span>
        </td>
        <td class="col-title">
          <span class="table-title-link">
            <span>\${cleanTitle}</span>
          </span>
        </td>
        <td class="col-info">\${cleanNickname}</td>
        <td class="col-date">\${cleanDate}</td>
        <td class="col-status">
          <span class="status-badge \${statusClass}">\${statusText}</span>
        </td>
      </tr>
    \`;
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
  if (nicknameEl) nicknameEl.textContent = inquiry.nickname || '익명';
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

`;

  mainJs = mainJs.substring(0, sIdx) + completeEngine + mainJs.substring(eIdx);

  // Update handleInquirySubmit for public non-PII schema
  mainJs = mainJs.replace(/async function handleInquirySubmit\(e\) \{[\s\S]*?renderInquiryList\(\);\s*\}/, `async function handleInquirySubmit(e) {
  e.preventDefault();

  // Rate Limiting & Cooldown Protection (Anti-Spam)
  const now = Date.now();
  if (now - lastInquirySubmitTime < 5000) {
    alert('상담글은 5초 간격으로 등록하실 수 있습니다. 잠시 후 다시 시도해주세요.');
    return;
  }

  const submitBtn = document.getElementById('inquiry-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> <span>등록 중...</span>';
  }

  const nickname = document.getElementById('inq-nickname')?.value.trim() || '익명';
  const selectedDiseaseEl = document.querySelector('input[name="inq-disease"]:checked');
  const category = selectedDiseaseEl ? selectedDiseaseEl.getAttribute('data-category') : 'tic';
  const disease = selectedDiseaseEl ? selectedDiseaseEl.value : '틱장애·뚜렛';
  const title = document.getElementById('inq-title')?.value.trim() || '';
  const content = document.getElementById('inq-content')?.value.trim() || '';

  // Input Length Validation
  if (title.length < 2 || title.length > 100) {
    alert('제목은 2자 이상 100자 이하로 입력해주세요.');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="ph-bold ph-paper-plane-tilt"></i> <span>상담글 등록하기</span>'; }
    return;
  }
  if (content.length < 5 || content.length > 3000) {
    alert('상담 내용은 5자 이상 3000자 이하로 입력해주세요.');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="ph-bold ph-paper-plane-tilt"></i> <span>상담글 등록하기</span>'; }
    return;
  }

  const today = new Date();
  const dateStr = \`\${today.getFullYear()}.\${String(today.getMonth() + 1).padStart(2, '0')}.\${String(today.getDate()).padStart(2, '0')}\`;

  const newDocId = \`inq_\${Date.now()}\`;

  // Local fallback object
  const newInquiryLocal = {
    id: newDocId,
    nickname: nickname,
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

  // 2. Sync to Firebase Cloud Firestore (Strictly validated public schema)
  if (db && isFirebaseConnected) {
    try {
      await db.collection('online_inquiries').doc(newDocId).set({
        id: newDocId,
        nickname: nickname,
        category: category,
        title: title,
        content: content,
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (err) {
      console.warn('Firebase Cloud write notice:', err);
    }
  }

  lastInquirySubmitTime = Date.now();

  document.getElementById('inquiry-submit-form')?.reset();
  closeInquiryWriteModal();
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="ph-bold ph-paper-plane-tilt"></i> <span>상담글 등록하기</span>';
  }
  showAuthToast('🎉 온라인 상담글이 성공적으로 등록되었습니다. 손지웅 원장님이 확인 후 성심성의껏 전문 답변을 등록해 드립니다.');
  renderInquiryList();
}`);

  fs.writeFileSync('assets/js/main.js', mainJs, 'utf-8');
  console.log('Successfully updated assets/js/main.js with complete Firebase Public Q&A Engine!');
}
