const fs = require('fs');

let mainJs = fs.readFileSync('assets/js/main.js', 'utf-8');

const startMarker = 'let currentInquiryFilter = \'all\';';
const endMarker = 'function filterInquiryCategory(cat) {';

const sIdx = mainJs.indexOf(startMarker);
const eIdx = mainJs.indexOf(endMarker);

if (sIdx !== -1 && eIdx !== -1) {
  const cleanInquiryCode = `let currentInquiryFilter = 'all';
let currentInquirySearchQuery = '';
let currentOpenedInquiryId = null;
let currentPendingVerifyInquiryId = null;

// No dummy sample inquiries - Only real posts written by users
const DEFAULT_INQUIRIES = [];

function initOnlineInquiry() {
  const tbody = document.getElementById('inquiry-list-tbody');
  if (!tbody) return;
  
  // Clean out any legacy sample IDs from localStorage
  const stored = localStorage.getItem('healim_online_inquiries');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(item => !item.id.startsWith('inq-real-') && !item.id.startsWith('inq-10'));
        localStorage.setItem('healim_online_inquiries', JSON.stringify(cleaned));
      }
    } catch (e) {
      localStorage.setItem('healim_online_inquiries', '[]');
    }
  }

  renderInquiryList();
}

function getStoredInquiries() {
  const stored = localStorage.getItem('healim_online_inquiries');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        // Exclude any auto-generated sample items
        return parsed.filter(item => !item.id.startsWith('inq-real-') && !item.id.startsWith('inq-10'));
      }
    } catch (e) {
      return [];
    }
  }
  return [];
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
      (item.region && item.region.toLowerCase().includes(q))
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
    const catClass = item.category || 'etc';
    const isAnswered = item.status === 'answered';
    const statusText = isAnswered ? '답변완료' : '답변대기';
    const statusClass = isAnswered ? 'answered' : 'pending';

    html += \`
      <tr onclick="handleInquiryClick('\${item.id}')">
        <td class="col-num">\${num}</td>
        <td class="col-cat">
          <span class="cat-badge \${catClass}">\${item.disease}</span>
        </td>
        <td class="col-title">
          <span class="table-title-link">
            <span>\${item.title}</span>
          </span>
        </td>
        <td class="col-info">\${item.region} (\${item.age} / \${item.gender})</td>
        <td class="col-date">\${item.date}</td>
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

`;

  mainJs = mainJs.substring(0, sIdx) + cleanInquiryCode + mainJs.substring(eIdx);
  fs.writeFileSync('assets/js/main.js', mainJs, 'utf-8');
  console.log('Successfully updated assets/js/main.js to only show real user written inquiries!');
} else {
  console.error('Could not find markers in assets/js/main.js');
}
