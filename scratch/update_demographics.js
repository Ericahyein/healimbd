const fs = require('fs');

let mainJs = fs.readFileSync('assets/js/main.js', 'utf-8');

// 1. Add formatAuthorInfo helper if not present
const helperFunc = `// Author demographic formatter with legacy nickname fallback
function formatAuthorInfo(item) {
  if (!item) return '익명';
  if (item.region && item.ageText && item.gender) {
    const genderText = (item.gender === 'male' || item.gender === '남') ? '남' : ((item.gender === 'female' || item.gender === '여') ? '여' : item.gender);
    return \`\${item.region} · \${item.ageText} · \${genderText}\`;
  }
  if (item.nickname) {
    return item.nickname;
  }
  return '익명';
}
`;

// Update PERMANENT_BASE_INQUIRIES
const updatedBaseInquiries = `const PERMANENT_BASE_INQUIRIES = [
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
    "answer": "안녕하세요, 손지웅 대표원장입니다.\\n\\n네, 맞습니다. 환자분께서 겪고 계신 어지럼, 두근거림, 상열하한, 소화장애, 식은땀은 모두 '자율신경실조증'의 대표적인 전신 복합 증상들입니다.\\n\\n자율신경계는 우리 몸의 혈압, 심장박동, 체온, 소화, 땀 분비 등 생명 유지 기능을 24시간 무의식적으로 조절하는 시스템입니다. 액셀(교감신경)과 브레이크(부교감신경)의 균형이 깨지면 특정 장기 하나가 아닌 전신에 걸쳐 동시다발적인 이상 신호가 발생하게 됩니다.\\n\\n종합병원 검사(내시경, MRI 등)는 신체의 구조적 파괴나 질병을 찾는 검사이므로, 기능적 조절 장애인 자율신경실조증은 검사상 정상으로 나오는 경우가 대부분입니다.\\n\\n한의학에서는 이를 상초의 열을 내리고 하초를 따뜻하게 하는 '수승화강(水昇火降)' 치료로 다스립니다. 교감신경의 과흥분을 가라앉히고 오장육부의 기혈 순환을 돕는 맞춤 탕약과 자율신경 안정 침구 치료를 통해 여러 증상들을 한 번에 근본적으로 회복하실 수 있습니다.",
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
    "answer": "안녕하세요, 손지웅 대표원장입니다. 어머님께서 답답하고 속상하셨을 마음이 전해집니다.\\n\\n적어주신 모습은 전형적인 ADHD의 '주의력 결핍형(inattentive type)' 양상에 해당합니다. 과잉행동이 두드러지지 않더라도, 주의 집중을 유지하고 계획을 실행하는 두뇌 전두엽(Prefrontal Cortex)의 성숙도가 또래에 비해 지연되어 세부적인 것에 주의를 기울이지 못하고 실수를 연발하게 되는 것입니다.\\n\\n이때 아이를 혼내거나 다그치면 아이의 자존감이 크게 떨어지고 학습에 대한 거부감만 커지게 됩니다. 이는 아이의 의지나 성격 탓이 아닌 신경학적 기능 미성숙이기 때문입니다.\\n\\n해아림한의원에서는 뇌기능 및 주의집중도 검사를 통해 아이의 두뇌 발달 상태를 평가하고, 전두엽으로의 기혈 순환과 도파민 밸런스를 돕는 총명·안신 한약 처방과 두뇌 훈련을 진행합니다. 아이의 식욕 부진이나 수면 장애 등 양약 부작용 걱정 없이 스스로 주의를 조절하고 실수를 줄여나갈 수 있도록 돕고 있습니다.",
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
    "answer": "안녕하세요, 손지웅 대표원장입니다.\\n\\n불면증이 6개월 이상 지속되면 낮 동안의 피로, 집중력 저하뿐만 아니라 ‘오늘 밤에도 못 자면 어쩌지’ 하는 수면 예기불안이 생겨 뇌가 더 각성되는 악순환에 빠지게 됩니다.\\n\\n만성 불면증의 핵심 원인은 뇌 신경계의 과각성(Hyperarousal)과 자율신경계(교감신경 항진 및 부교감신경 저하)의 불균형입니다. 몸은 쉬고 싶어 하지만, 뇌의 시상하부와 각성 중추가 꺼지지 않는 것입니다.\\n\\n해아림한의원에서는 수면제처럼 인위적으로 뇌를 진정시키는 것이 아니라:\\n1. 청뇌·안신 맞춤 한약: 심장과 간의 불필요한 열을 내리고 뇌파를 이완시켜 천연 멜라토닌 분비를 촉진합니다.\\n2. 수면 혈자리 침구 요법: 백회혈, 신문혈 등을 자극하여 교감신경의 긴장을 낮추고 깊은 서파수면(숙면)을 유도합니다.\\n3. 수면 위생 습관 교정: 뇌의 수면 리듬을 재설정하는 행동 요법을 함께 안내합니다.\\n\\n약물 의존 없이 스스로 잠드는 뇌의 자연 치유력을 되찾으실 수 있으니 편안히 상담받아보시기 바랍니다.",
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
    "answer": "안녕하세요, 해아림한의원 대표원장 손지웅입니다.\\n\\n아이가 틱 증상으로 힘들어하고 증상이 심해져 부모님께서도 걱정이 많으셨겠습니다.\\n\\n틱장애는 증상이 좋아졌다가 나빠지기를 반복하는 ‘왁싱 앤 웨이닝(Waxing & Waning)’ 특성을 지닙니다. 틱이 갑자기 심해지는 주된 원인은 다음과 같습니다:\\n\\n1. 심리적 스트레스 및 긴장감: 새 학기, 시험, 낯선 환경 적응, 부모나 선생님의 지적\\n2. 육체적 피로 및 수면 부족: 늦은 취침 시간, 면역력 저하, 과도한 학업량\\n3. 시각적 과자극: 스마트폰, 유튜브, 게임 등 미디어의 과도한 시청으로 인한 뇌 흥분\\n4. 두뇌 기저핵의 신경 불균형: 운동 신호를 걸러내는 기저핵의 기능이 일시적으로 저하\\n\\n한의학에서는 틱의 악화를 뇌 신경계의 열(熱)과 담음(痰飮), 기혈 불균형으로 진단합니다. 해아림한의원에서는 과열된 뇌 신경계를 진정시키는 체질 맞춤 한약 처방과 두뇌 밸런스를 바로잡는 침구 요법, 가정 내 생활관리 코칭을 통해 증상의 악화를 막고 근본적인 뇌 자생력을 길러드립니다. 아이에게 절대 틱을 지적하거나 참으라고 하지 마시고 편안한 마음으로 내원하셔서 진료를 받아보시길 권합니다.",
    "answerDate": "2026.08.31"
  }
];`;

mainJs = mainJs.replace(/const PERMANENT_BASE_INQUIRIES = \[[\s\S]*?\];/, updatedBaseInquiries);

// Update listenToCloudInquiries mapping
mainJs = mainJs.replace(
  /cloudItems\.push\({\s*id: doc\.id,[\s\S]*?date: dateStr\s*}\);/,
  `cloudItems.push({
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
          });`
);

// Update renderInquiryList
mainJs = mainJs.replace(
  /const cleanNickname = escapeHtml\(item\.nickname \|\| '익명'\);/,
  `const authorInfo = formatAuthorInfo(item);
    const cleanNickname = escapeHtml(authorInfo);`
);

// Update handleInquirySearch
mainJs = mainJs.replace(
  /\(item\.nickname && item\.nickname\.toLowerCase\(\)\.includes\(q\)\)/,
  `(item.nickname && item.nickname.toLowerCase().includes(q)) ||
      (item.region && item.region.toLowerCase().includes(q)) ||
      (item.ageText && item.ageText.toLowerCase().includes(q))`
);

// Update openInquiryDetailModal author display
mainJs = mainJs.replace(
  /if \(nicknameEl\) nicknameEl\.textContent = inquiry\.nickname \|\| '익명';/,
  `const authorEl = document.getElementById('view-inq-author') || nicknameEl;
  if (authorEl) authorEl.textContent = formatAuthorInfo(inquiry);
  if (nicknameEl && nicknameEl !== authorEl) nicknameEl.textContent = formatAuthorInfo(inquiry);`
);

// Update handleInquirySubmit
const updatedHandleInquirySubmit = `async function handleInquirySubmit(e) {
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
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="ph-bold ph-paper-plane-tilt"></i> <span>상담글 등록하기</span>'; }
    return;
  }

  if (!ageText || ageText.length < 1 || ageText.length > 20) {
    alert('나이를 1자 이상 20자 이하로 입력해주세요. (예: 35세 또는 30대)');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="ph-bold ph-paper-plane-tilt"></i> <span>상담글 등록하기</span>'; }
    return;
  }

  if (!['male', 'female'].includes(gender)) {
    alert('성별을 올바르게 선택해주세요.');
    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="ph-bold ph-paper-plane-tilt"></i> <span>상담글 등록하기</span>'; }
    return;
  }

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
    try {
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
}`;

mainJs = mainJs.replace(/async function handleInquirySubmit\(e\) \{[\s\S]*?renderInquiryList\(\);\s*\}/, updatedHandleInquirySubmit);

// Update listenToAdminInquiries mapping
mainJs = mainJs.replace(
  /adminInquiriesCache\.push\({\s*id: doc\.id,[\s\S]*?date: dateStr\s*}\);/,
  `adminInquiriesCache.push({
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
        });`
);

// Update renderAdminInquiries search
mainJs = mainJs.replace(
  /i\.nickname\.toLowerCase\(\)\.includes\(currentAdminSearch\)/,
  `(i.nickname && i.nickname.toLowerCase().includes(currentAdminSearch)) ||
      (i.region && i.region.toLowerCase().includes(currentAdminSearch)) ||
      (i.ageText && i.ageText.toLowerCase().includes(currentAdminSearch))`
);

// Update renderAdminInquiries author display
mainJs = mainJs.replace(
  /const safeNick = escapeHtml\(item\.nickname\);/,
  `const safeNick = escapeHtml(formatAuthorInfo(item));`
);

// Update openAdminDoctorReplyModal author display
mainJs = mainJs.replace(
  /if \(nickEl\) nickEl\.textContent = '작성자: ' \+ item\.nickname;/,
  `const authorEl = document.getElementById('admin-modal-q-author') || nickEl;
  if (authorEl) authorEl.textContent = '작성자: ' + formatAuthorInfo(item);
  if (nickEl && nickEl !== authorEl) nickEl.textContent = '작성자: ' + formatAuthorInfo(item);`
);

if (!mainJs.includes('function formatAuthorInfo(')) {
  mainJs = helperFunc + mainJs;
}

fs.writeFileSync('assets/js/main.js', mainJs, 'utf-8');
console.log('Successfully updated assets/js/main.js with Region/Age/Gender schema and backward compatibility!');
