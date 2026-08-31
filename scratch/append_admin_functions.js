const fs = require('fs');

let mainJs = fs.readFileSync('assets/js/main.js', 'utf-8');

const adminFunctions = `

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
          dateStr = \`\${dt.getFullYear()}.\${String(dt.getMonth() + 1).padStart(2, '0')}.\${String(dt.getDate()).padStart(2, '0')}\`;
        }
        adminInquiriesCache.push({
          id: doc.id,
          nickname: d.nickname || '익명',
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
      i.nickname.toLowerCase().includes(currentAdminSearch)
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
    const safeNick = escapeHtml(item.nickname);
    const safeDate = escapeHtml(item.date);
    const safeDisease = escapeHtml(item.disease);
    const safeId = escapeHtml(item.id);

    html += \`
      <tr>
        <td class="col-num">\${num}</td>
        <td><span class="cat-badge \${item.category}">\${safeDisease}</span></td>
        <td>
          <div style="font-weight:700; color:#0F172A; margin-bottom:3px;">\${safeTitle}</div>
          <div style="font-size:0.84rem; color:#64748B;">\${safeContent}</div>
        </td>
        <td>\${safeNick}</td>
        <td>\${safeDate}</td>
        <td>\${statusBadge}</td>
        <td>
          <button type="button" class="btn-admin-action reply" onclick="openAdminDoctorReplyModal('\${safeId}')">
            <i class="ph-bold ph-pencil"></i> \${isAnswered ? '수정' : '답변'}
          </button>
          <button type="button" class="btn-admin-action delete" onclick="handleAdminDeleteInquiryFromTable('\${safeId}')">
            <i class="ph-bold ph-trash"></i>
          </button>
        </td>
      </tr>
    \`;
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
  if (nickEl) nickEl.textContent = '작성자: ' + item.nickname;
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
    await db.collection('online_inquiries').doc(editingInquiryId).update({
      answer: answerText,
      status: 'answered',
      answeredAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

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
`;

if (!mainJs.includes('initAdminDashboard()')) {
  mainJs += adminFunctions;
  fs.writeFileSync('assets/js/main.js', mainJs, 'utf-8');
  console.log('Successfully appended Admin Controller functions to assets/js/main.js!');
}
