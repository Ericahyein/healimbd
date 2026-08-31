const fs = require('fs');

const DOCTOR_ANSWERED_INQUIRIES = [
  {
    id: 'inq-answered-01',
    category: 'tic',
    disease: '틱장애·뚜렛',
    title: '초등학교 2학년 아이 눈 깜빡임과 킁킁 소리가 3주째 지속됩니다. 치료가 가능한가요?',
    author: '익명',
    region: '분당 정자',
    age: '10세',
    gender: '남',
    date: '2026.08.31',
    isSecret: false,
    password: '****',
    status: 'answered',
    content: '새 학기 시작하고 스트레스를 좀 받더니 처음에는 눈을 심하게 깜빡거리다가, 며칠 전부터는 킁킁거리는 소리까지 함께 내고 있습니다. 안과나 이비인후과에서는 이상이 없다고 하는데 틱장애 증상인지요? 아이에게 하지 말라고 다그쳐도 되는지, 한방 치료로 뇌 신경계를 안정시키는 치료가 가능한지 문의드립니다.',
    answer: '안녕하세요, 해아림한의원 대표원장 손지웅입니다. 어머님께서 걱정이 많으셨겠습니다.\n\n적어주신 증상은 전형적인 소아 단순 운동틱(눈 깜빡임)에서 단순 음성틱(킁킁 소리)으로 이어지는 초기 틱장애 양상으로 보입니다. 틱장애는 아이의 나쁜 버릇이나 고의적인 행동이 아니라, 두뇌 기저핵의 운동 신호 필터링 기능이 일시적으로 미성숙하여 발생합니다.\n\n가장 중요한 점은 가정에서 아이에게 "눈 깜빡이지 마라", "소리 내지 마라"고 지적하거나 다그치지 않는 것입니다. 지적을 받으면 뇌의 긴장도가 높아져 참다가 더 심하게 터져 나오는 반동 현상이 생깁니다.\n\n해아림한의원에서는 뇌파 검사 및 두뇌 기능 평가를 통해 아이의 뇌 흥분도를 파악하고, 과열된 뇌 신경계를 진정시키는 순수 한약 처방과 무통 침구 요법을 통해 기저핵이 스스로 조절 능력을 회복하도록 돕고 있습니다. 편안한 마음으로 내원하셔서 정밀 진단을 받아보시길 권해드립니다.',
    answerDate: '2026.08.31'
  },
  {
    id: 'inq-answered-02',
    category: 'autonomic',
    disease: '자율신경실조증',
    title: '병원 검사상 이상은 없는데 만성 어지럼증, 가슴 답답함, 소화불량이 계속됩니다.',
    author: '익명',
    region: '판교 백현',
    age: '30대',
    gender: '여',
    date: '2026.08.30',
    isSecret: false,
    password: '****',
    status: 'answered',
    content: 'IT 개발자로 일하면서 야근과 스트레스가 많았습니다. 3달 전부터 갑자기 머리가 멍하고 핑 도는 어지럼증이 생겼고, 밥만 먹으면 명치가 꽉 막히고 식은땀이 납니다. 대학병원에서 뇌 MRI, 위내시경, 이비인후과 어지럼 검사를 다 해봤는데 아무 이상이 없다고 하네요. 자율신경실조증 치료가 가능한가요?',
    answer: '안녕하세요, 손지웅 대표원장입니다.\n\n병원 정밀검사상 구조적 이상이 없는데도 전신에 걸쳐 복합 증상이 나타나는 것은 전형적인 \'자율신경실조증(교감신경 항진증)\'의 상태입니다. 지속적인 업무 스트레스와 과로로 인해 신체의 액셀 역할을 하는 교감신경이 과도하게 켜져 있고, 브레이크 역할을 하는 부교감신경이 제 기능을 하지 못해 뇌 혈류 저하(어지럼·브레인포그)와 위장 연동운동 정체(소화불량)가 동반되는 것입니다.\n\n한의학에서는 이를 \'수승화강(水昇火降)\'의 균형이 깨진 상열하한(上熱下寒) 상태로 진단합니다. 상초로 쏠린 신경성 열을 내리고 자율신경계 밸런스를 조율하는 청뇌안신 탕약과 침구 치료를 병행하면 무너진 신체 리듬을 충분히 회복하실 수 있습니다.',
    answerDate: '2026.08.30'
  },
  {
    id: 'inq-answered-03',
    category: 'panic',
    disease: '공황장애',
    title: '출퇴근 지하철이나 터널 안에서 갑자기 숨이 막히고 죽을 것 같은 공포가 찾아옵니다.',
    author: '익명',
    region: '용인 수지',
    age: '40대',
    gender: '남',
    date: '2026.08.29',
    isSecret: false,
    password: '****',
    status: 'answered',
    content: '한 달 전 출근길 만원 지하철에서 갑자기 심장이 터질 듯이 뛰고 숨이 턱 막히면서 쓰러질 것 같은 공포를 겪었습니다. 응급실에 실려갔지만 심장에는 이상이 없다고 하더군요. 이후로 대중교통을 타기가 너무 두렵고 일상생활에 지장이 큽니다. 한방으로 공황장애 치료가 어떻게 이루어지나요?',
    answer: '안녕하세요, 손지웅 대표원장입니다. 당시 겪으셨을 극심한 공포와 당혹감이 얼마나 크셨을지 짐작이 갑니다.\n\n공황발작(Panic Attack)은 심장이나 폐의 실제 이상이 아니라, 뇌 속의 위험 감지 센서인 \'편도체(Amygdala)\'가 과도하게 민감해져 실제 위험이 없는 상황에서도 잘못된 화재 경보를 울리는 현상입니다. 한 번 발작을 경험하면 뇌에 공포 기억이 각인되어 "또 발작이 오면 어쩌지" 하는 예기불안이 생기게 됩니다.\n\n해아림한의원에서는 편도체의 과흥분을 진정시키고 심신을 안정시키는(안신정경) 천연 탕약 처방과 함께, 자율신경계 과민도를 낮추는 치료를 진행합니다. 양약처럼 일시적으로 뇌를 억누르는 것이 아니라, 뇌가 스스로 불안을 조절할 수 있는 힘을 길러드리는 근본 치료를 목표로 합니다.',
    answerDate: '2026.08.29'
  },
  {
    id: 'inq-answered-04',
    category: 'sleep',
    disease: '수면·불면증',
    title: '수면제를 6개월째 복용 중인데 약을 줄이고 한방 치료로 자연 수면을 찾고 싶습니다.',
    author: '익명',
    region: '성남 분당',
    age: '50대',
    gender: '여',
    date: '2026.08.28',
    isSecret: false,
    password: '****',
    status: 'answered',
    content: '불면증으로 졸피뎀 계열 수면제를 반 알씩 먹다가 지금은 한 알을 다 먹어도 새벽 3시만 되면 깹니다. 낮에는 머리가 멍하고 기억력도 떨어지는 것 같아 약을 끊고 싶은데, 안 먹으면 밤을 꼴딱 새워 겁이 납니다. 한방 치료를 병행하면서 수면제를 줄여나갈 수 있을까요?',
    answer: '안녕하세요, 손지웅 대표원장입니다.\n\n수면제를 장기 복용하시다 보면 약물에 대한 내성이 생겨 수면 유지 시간이 짧아지고 낮 시간대 인지 피로감이 생길 수 있습니다. 여기서 가장 중요한 점은 **수면제를 절대로 하루아침에 갑자기 끊으시면 안 된다는 것**입니다. 급격한 중단은 심한 반동성 불면을 부릅니다.\n\n해아림한의원에서는 현재 복용 중이신 수면제를 유지하면서, 뇌의 과각성을 식히고 천연 멜라토닌 분비를 유도하는 맞춤 한약과 수면 혈자리 침구 치료를 시작합니다. 몸의 자연 수면 유도 능력이 서서히 회복되면, 처방 의사와 상의하여 약 용량을 3/4 ➔ 1/2 ➔ 1/4 단계적으로 줄여가며(테이퍼링) 최종적으로 약 없이 편안히 숙면을 취하실 수 있도록 도와드립니다.',
    answerDate: '2026.08.28'
  }
];

let mainJs = fs.readFileSync('assets/js/main.js', 'utf-8');

const startMarker = 'let currentInquiryFilter = \'all\';';
const endMarker = 'function filterInquiryCategory(cat) {';

const sIdx = mainJs.indexOf(startMarker);
const eIdx = mainJs.indexOf(endMarker);

if (sIdx !== -1 && eIdx !== -1) {
  const newInqLogic = `let currentInquiryFilter = 'all';
let currentInquirySearchQuery = '';
let currentOpenedInquiryId = null;
let currentPendingVerifyInquiryId = null;

// 4 Direct Doctor Answered Inquiries
const DOCTOR_ANSWERED_INQUIRIES = ${JSON.stringify(DOCTOR_ANSWERED_INQUIRIES, null, 2)};

function initOnlineInquiry() {
  const tbody = document.getElementById('inquiry-list-tbody');
  if (!tbody) return;
  renderInquiryList();
}

function getStoredInquiries() {
  let userInquiries = [];
  const stored = localStorage.getItem('healim_online_inquiries');
  if (stored) {
    try {
      userInquiries = JSON.parse(stored);
      if (!Array.isArray(userInquiries)) userInquiries = [];
    } catch (e) {
      userInquiries = [];
    }
  }

  // Filter out any duplicates if already in userInquiries
  const baseList = DOCTOR_ANSWERED_INQUIRIES.filter(baseItem => 
    !userInquiries.some(userItem => userItem.id === baseItem.id)
  );

  return [...userInquiries, ...baseList];
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

  mainJs = mainJs.substring(0, sIdx) + newInqLogic + mainJs.substring(eIdx);
  fs.writeFileSync('assets/js/main.js', mainJs, 'utf-8');
  console.log('Successfully preserved and restored the 4 doctor-answered inquiries in assets/js/main.js!');
} else {
  console.error('Could not find markers in assets/js/main.js');
}
