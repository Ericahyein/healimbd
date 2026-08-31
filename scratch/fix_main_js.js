const fs = require('fs');

const AUTHENTIC_4_DOCTOR_INQUIRIES = [
  {
    id: "inq-user-04",
    category: "autonomic",
    disease: "자율신경실조증",
    title: "자율신경실조증 때문에 증상이 여러 가지로 나타날 수 있나요?",
    author: "익명",
    region: "분당",
    age: "40대",
    gender: "여",
    date: "2026.08.31",
    isSecret: false,
    password: "****",
    status: "answered",
    content: "어지럼증과 가슴 두근거림이 있어 내과와 이비인후과를 다녀왔는데 검사 결과는 정상이라고 합니다. 그런데 소화불량도 심하고, 얼굴로 열이 확 올랐다가 손발은 차가워지며 식은땀이 나는 등 증상이 온몸에 걸쳐 여러 가지로 나타납니다. 이런 복합적인 증상들이 전부 자율신경실조증 하나 때문에 생길 수 있는 건가요?",
    answer: "안녕하세요, 손지웅 대표원장입니다.\\n\\n네, 맞습니다. 환자분께서 겪고 계신 어지럼, 두근거림, 상열하한, 소화장애, 식은땀은 모두 '자율신경실조증'의 대표적인 전신 복합 증상들입니다.\\n\\n자율신경계는 우리 몸의 혈압, 심장박동, 체온, 소화, 땀 분비 등 생명 유지 기능을 24시간 무의식적으로 조절하는 시스템입니다. 액셀(교감신경)과 브레이크(부교감신경)의 균형이 깨지면 특정 장기 하나가 아닌 전신에 걸쳐 동시다발적인 이상 신호가 발생하게 됩니다.\\n\\n종합병원 검사(내시경, MRI 등)는 신체의 구조적 파괴나 질병을 찾는 검사이므로, 기능적 조절 장애인 자율신경실조증은 검사상 정상으로 나오는 경우가 대부분입니다.\\n\\n한의학에서는 이를 상초의 열을 내리고 하초를 따뜻하게 하는 '수승화강(水昇火降)' 치료로 다스립니다. 교감신경의 과흥분을 가라앉히고 오장육부의 기혈 순환을 돕는 맞춤 탕약과 자율신경 안정 침구 치료를 통해 여러 증상들을 한 번에 근본적으로 회복하실 수 있습니다.",
    answerDate: "2026.08.31"
  },
  {
    id: "inq-user-03",
    category: "adhd",
    disease: "ADHD·집중력",
    title: "adhd 때문에 아이가 실수가 너무 많아요",
    author: "익명",
    region: "성남",
    age: "초등학생",
    gender: "남",
    date: "2026.08.31",
    isSecret: false,
    password: "****",
    status: "answered",
    content: "초등학생 아들이 평소에 덜렁거리고 준비물을 자주 빠뜨리며, 시험을 볼 때도 문제를 끝까지 읽지 않고 틀리는 실수가 너무 많습니다. 선생님께도 수업 시간에 멍하니 있거나 딴짓을 한다는 지적을 받는데 ADHD 증상일까요? 아이를 혼내도 그때뿐인데 한방 치료로 실수를 줄이고 집중력을 높일 수 있는지 궁금합니다.",
    answer: "안녕하세요, 손지웅 대표원장입니다. 어머님께서 답답하고 속상하셨을 마음이 전해집니다.\\n\\n적어주신 모습은 전형적인 ADHD의 '주의력 결핍형(inattentive type)' 양상에 해당합니다. 과잉행동이 두드러지지 않더라도, 주의 집중을 유지하고 계획을 실행하는 두뇌 전두엽(Prefrontal Cortex)의 성숙도가 또래에 비해 지연되어 세부적인 것에 주의를 기울이지 못하고 실수를 연발하게 되는 것입니다.\\n\\n이때 아이를 혼내거나 다그치면 아이의 자존감이 크게 떨어지고 학습에 대한 거부감만 커지게 됩니다. 이는 아이의 의지나 성격 탓이 아닌 신경학적 기능 미성숙이기 때문입니다.\\n\\n해아림한의원에서는 뇌기능 및 주의집중도 검사를 통해 아이의 두뇌 발달 상태를 평가하고, 전두엽으로의 기혈 순환과 도파민 밸런스를 돕는 총명·안신 한약 처방과 두뇌 훈련을 진행합니다. 아이의 식욕 부진이나 수면 장애 등 양약 부작용 걱정 없이 스스로 주의를 조절하고 실수를 줄여나갈 수 있도록 돕고 있습니다.",
    answerDate: "2026.08.31"
  },
  {
    id: "inq-user-02",
    category: "sleep",
    disease: "수면·불면증",
    title: "불면증이 오래가면 어떻게 치료해야 하나요?",
    author: "익명",
    region: "용인",
    age: "직장인",
    gender: "남",
    date: "2026.08.31",
    isSecret: false,
    password: "****",
    status: "answered",
    content: "직장 생활을 하면서 불면증이 시작된 지 6개월이 넘었습니다. 침대에 누워도 1~2시간 동안 잡생각 때문에 잠이 오지 않고, 어렵게 잠들어도 사소한 소리에 깨서 아침까지 멍합니다. 수면유도제를 계속 먹기에는 내성이나 의존성이 걱정되는데, 이렇게 만성화된 불면증은 한방에서 어떤 원리로 치료하는지 알고 싶습니다.",
    answer: "안녕하세요, 손지웅 대표원장입니다.\\n\\n불면증이 6개월 이상 지속되면 낮 동안의 피로, 집중력 저하뿐만 아니라 ‘오늘 밤에도 못 자면 어쩌지’ 하는 수면 예기불안이 생겨 뇌가 더 각성되는 악순환에 빠지게 됩니다.\\n\\n만성 불면증의 핵심 원인은 뇌 신경계의 과각성(Hyperarousal)과 자율신경계(교감신경 항진 및 부교감신경 저하)의 불균형입니다. 몸은 쉬고 싶어 하지만, 뇌의 시상하부와 각성 중추가 꺼지지 않는 것입니다.\\n\\n해아림한의원에서는 수면제처럼 인위적으로 뇌를 진정시키는 것이 아니라:\\n1. 청뇌·안신 맞춤 한약: 심장과 간의 불필요한 열을 내리고 뇌파를 이완시켜 천연 멜라토닌 분비를 촉진합니다.\\n2. 수면 혈자리 침구 요법: 백회혈, 신문혈 등을 자극하여 교감신경의 긴장을 낮추고 깊은 서파수면(숙면)을 유도합니다.\\n3. 수면 위생 습관 교정: 뇌의 수면 리듬을 재설정하는 행동 요법을 함께 안내합니다.\\n\\n약물 의존 없이 스스로 잠드는 뇌의 자연 치유력을 되찾으실 수 있으니 편안히 상담받아보시기 바랍니다.",
    answerDate: "2026.08.31"
  },
  {
    id: "inq-user-01",
    category: "tic",
    disease: "틱장애·뚜렛",
    title: "틱장애가 심해지는 이유가 뭘까요?",
    author: "익명",
    region: "분당",
    age: "초등학생",
    gender: "남",
    date: "2026.08.31",
    isSecret: false,
    password: "****",
    status: "answered",
    content: "초등학교에 다니는 아이가 틱 증상이 나타난 지 좀 되었는데, 최근 들어 증상이 더 심해지고 있습니다. 눈 깜빡임뿐만 아니라 목을 꺾거나 헛기침하는 소리까지 더 잦아졌어요. 스트레스나 피로 때문인지, 아니면 계절이나 환경 변화 때문인지 틱장애가 갑자기 심해지는 원인과 한방에서는 이를 어떻게 치료하고 관리해야 하는지 궁금합니다.",
    answer: "안녕하세요, 해아림한의원 대표원장 손지웅입니다.\\n\\n아이가 틱 증상으로 힘들어하고 증상이 심해져 부모님께서도 걱정이 많으셨겠습니다.\\n\\n틱장애는 증상이 좋아졌다가 나빠지기를 반복하는 ‘왁싱 앤 웨이닝(Waxing & Waning)’ 특성을 지닙니다. 틱이 갑자기 심해지는 주된 원인은 다음과 같습니다:\\n\\n1. 심리적 스트레스 및 긴장감: 새 학기, 시험, 낯선 환경 적응, 부모나 선생님의 지적\\n2. 육체적 피로 및 수면 부족: 늦은 취침 시간, 면역력 저하, 과도한 학업량\\n3. 시각적 과자극: 스마트폰, 유튜브, 게임 등 미디어의 과도한 시청으로 인한 뇌 흥분\\n4. 두뇌 기저핵의 신경 불균형: 운동 신호를 걸러내는 기저핵의 기능이 일시적으로 저하\\n\\n한의학에서는 틱의 악화를 뇌 신경계의 열(熱)과 담음(痰飮), 기혈 불균형으로 진단합니다. 해아림한의원에서는 과열된 뇌 신경계를 진정시키는 체질 맞춤 한약 처방과 두뇌 밸런스를 바로잡는 침구 요법, 가정 내 생활관리 코칭을 통해 증상의 악화를 막고 근본적인 뇌 자생력을 길러드립니다. 아이에게 절대 틱을 지적하거나 참으라고 하지 마시고 편안한 마음으로 내원하셔서 진료를 받아보시길 권합니다.",
    answerDate: "2026.08.31"
  }
];

let mainJs = fs.readFileSync('assets/js/main.js', 'utf-8');

const sMarker = 'let currentInquiryFilter = \'all\';';
const eMarker = 'function filterInquiryCategory(cat) {';

const sIdx = mainJs.indexOf(sMarker);
const eIdx = mainJs.indexOf(eMarker);

if (sIdx !== -1 && eIdx !== -1) {
  const codeBlock = `let currentInquiryFilter = 'all';
let currentInquirySearchQuery = '';
let currentOpenedInquiryId = null;
let currentPendingVerifyInquiryId = null;

// ==========================================================================
// FIREBASE REAL-TIME CLOUD DATABASE SETUP & CONFIG
// ==========================================================================
let db = null;
let isFirebaseConnected = false;

// Default Firebase Configuration (Customizable via Admin or Code)
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

function initFirebase() {
  if (typeof firebase === 'undefined') {
    console.log('Firebase SDK not loaded on this page (using local database).');
    return;
  }

  try {
    const config = getFirebaseConfig();
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(config);
    }
    db = firebase.firestore();
    isFirebaseConnected = true;
    console.log('🔥 Firebase Cloud Firestore Initialized Successfully!');
    
    // Listen to real-time updates from Cloud Firestore
    listenToCloudInquiries();
  } catch (err) {
    console.warn('Firebase connection notice (falling back to permanent base dataset):', err.message);
    isFirebaseConnected = false;
  }
}

function listenToCloudInquiries() {
  if (!db) return;
  try {
    db.collection('online_inquiries').orderBy('date', 'desc')
      .onSnapshot((snapshot) => {
        const cloudItems = [];
        snapshot.forEach(doc => {
          cloudItems.push({ id: doc.id, ...doc.data() });
        });
        if (cloudItems.length > 0) {
          localStorage.setItem('healim_cloud_inquiries', JSON.stringify(cloudItems));
          renderInquiryList();
        }
      }, (error) => {
        console.warn('Cloud Firestore stream notice:', error.message);
      });
  } catch (e) {}
}

// 4 Permanent Base Doctor-Answered Inquiries (Guaranteed on all devices)
const PERMANENT_BASE_INQUIRIES = ${JSON.stringify(AUTHENTIC_4_DOCTOR_INQUIRIES, null, 2)};

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

  // Filter out base duplicates
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

  mainJs = mainJs.substring(0, sIdx) + codeBlock + mainJs.substring(eIdx);
  fs.writeFileSync('assets/js/main.js', mainJs, 'utf-8');
  console.log('Fixed syntax and updated assets/js/main.js successfully!');
}
