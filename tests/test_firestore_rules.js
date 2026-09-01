const fs = require('fs');

/**
 * Firestore Security Rules & XSS Sanitization Unit Test Suite
 */

const ALLOWED_CATEGORIES = [
  'tic', 'adhd', 'panic', 'anxiety', 'sleep',
  'autonomic', 'hyperhidrosis', 'ibs', 'headache',
  'depression', 'child', 'fatigue', 'etc'
];

function evaluateFirestoreRules({ action, path, auth, requestData, resourceData, requestTime }) {
  const isOnlineInquiry = path.startsWith('online_inquiries/');
  const isAdminDoc = path.startsWith('admins/');

  // Helper isAdmin: Custom Claim or admins/{uid} document
  const isAdmin = Boolean(auth != null && (
    (auth.token && auth.token.admin === true) ||
    (auth.adminDocs && Array.isArray(auth.adminDocs) && auth.adminDocs.includes(auth.uid))
  ));

  function isValidCategory(cat) {
    return ALLOWED_CATEGORIES.includes(cat);
  }

  // Helper isStatusAnswerConsistent
  function isStatusAnswerConsistent(reqData, resData, reqTime) {
    // Case A: status == 'pending'
    if (reqData.status === 'pending') {
      if ('answer' in reqData || 'answeredAt' in reqData) return false;
      return true;
    }

    // Case B: status == 'answered'
    if (reqData.status === 'answered') {
      if (!('answer' in reqData) || typeof reqData.answer !== 'string') return false;
      if (reqData.answer.length < 1 || reqData.answer.length > 5000) return false;
      if (!('answeredAt' in reqData)) return false;

      // Transition pending -> answered requires request.time
      if (resData.status === 'pending') {
        if (reqData.answeredAt !== reqTime) return false;
      } else {
        // Editing already answered post requires preserving existing answeredAt
        if (reqData.answeredAt !== resData.answeredAt) return false;
      }
      return true;
    }

    return false;
  }

  // Helper isCreateValid
  function isCreateValid(data, time) {
    if (!data) return false;
    const allowedCreateKeys = ['nickname', 'title', 'content', 'category', 'status', 'createdAt'];
    const keys = Object.keys(data);

    // 1. Only allowed keys (No redundant id or private fields)
    if (!keys.every(k => allowedCreateKeys.includes(k))) return false;

    // 2. status must strictly be 'pending'
    if (data.status !== 'pending') return false;

    // 3. String length & type limits
    if (typeof data.nickname !== 'string' || data.nickname.length < 1 || data.nickname.length > 30) return false;
    if (typeof data.title !== 'string' || data.title.length < 2 || data.title.length > 100) return false;
    if (typeof data.content !== 'string' || data.content.length < 5 || data.content.length > 3000) return false;

    // 4. Category whitelist
    if (!isValidCategory(data.category)) return false;

    // 5. createdAt == request.time
    if (data.createdAt !== time) return false;

    // 6. Prohibit answer / answeredAt / updatedAt / admin fields on creation
    if ('answer' in data || 'answeredAt' in data || 'updatedAt' in data ||
        'admin' in data || 'isAdmin' in data || 'role' in data || 'answeredBy' in data) {
      return false;
    }

    return true;
  }

  // Helper isUpdateValid
  function isUpdateValid(data, existing, time) {
    if (!data || !existing) return false;
    const allowedUpdateKeys = ['nickname', 'title', 'content', 'category', 'status', 'createdAt', 'answer', 'answeredAt', 'updatedAt'];
    const keys = Object.keys(data);

    // 1. Must only contain strictly allowed update keys
    if (!keys.every(k => allowedUpdateKeys.includes(k))) return false;

    // 2. Immutable createdAt
    if (data.createdAt !== existing.createdAt) return false;

    // 3. Status must be pending or answered
    if (!['pending', 'answered'].includes(data.status)) return false;

    // 4. Base fields validation
    if (typeof data.nickname !== 'string' || data.nickname.length < 1 || data.nickname.length > 30) return false;
    if (typeof data.title !== 'string' || data.title.length < 2 || data.title.length > 100) return false;
    if (typeof data.content !== 'string' || data.content.length < 5 || data.content.length > 3000) return false;
    if (!isValidCategory(data.category)) return false;

    // 5. Status & Answer consistency
    if (!isStatusAnswerConsistent(data, existing, time)) return false;

    // 6. updatedAt must be serverTimestamp (request.time)
    if (data.updatedAt !== time) return false;

    return true;
  }

  // Route matches
  if (isOnlineInquiry) {
    if (action === 'read') return true;
    if (action === 'create') return isCreateValid(requestData, requestTime);
    if (action === 'update') return isAdmin && isUpdateValid(requestData, resourceData, requestTime);
    if (action === 'delete') return isAdmin;
  }

  if (isAdminDoc) {
    const adminId = path.split('/')[1];
    if (action === 'read') return auth != null && auth.uid === adminId;
    return false;
  }

  return false;
}

// XSS Sanitizer test function (identical to frontend escapeHtml)
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

console.log('🧪 Starting Comprehensive Firestore Rules & Frontend Safety Test Suite...\n');

const createTime = '2026-08-31T10:00:00Z';
const answerTime = '2026-08-31T11:00:00Z';
const editTime   = '2026-08-31T12:00:00Z';

const pendingDoc = {
  nickname: '분당맘',
  category: 'tic',
  title: '아이 틱증상 질문입니다',
  content: '아이가 눈을 깜빡이는데 한방 치료가 가능한가요?',
  status: 'pending',
  createdAt: createTime
};

const answeredDoc = {
  ...pendingDoc,
  status: 'answered',
  answer: '안녕하세요, 손지웅 대표원장입니다. 틱 증상은 뇌 기저핵의...',
  answeredAt: answerTime,
  updatedAt: answerTime
};

const testCases = [
  // 1. anonymous 정상 질문 생성 성공
  {
    name: '1. [ALLOW] anonymous 정상 질문 생성 성공 (create with valid pending schema)',
    params: {
      action: 'create',
      path: 'online_inquiries/inq_101',
      auth: null,
      requestTime: createTime,
      requestData: {
        nickname: '송파직장인',
        category: 'autonomic',
        title: '어지럼증과 가슴 두근거림 문의',
        content: '종합병원 검사에서 이상이 없는데 자율신경실조증일까요?',
        status: 'pending',
        createdAt: createTime
      }
    },
    expected: true
  },
  // 2. anonymous answer 필드 포함 생성 실패
  {
    name: '2. [DENY] anonymous answer 필드 포함 생성 실패 (unauthorized answer injection)',
    params: {
      action: 'create',
      path: 'online_inquiries/inq_102',
      auth: null,
      requestTime: createTime,
      requestData: {
        nickname: '공격자',
        category: 'panic',
        title: '공황 질문',
        content: '질문 본문입니다.',
        status: 'pending',
        answer: '조작된 원장 답변 주입 시도',
        createdAt: createTime
      }
    },
    expected: false
  },
  // 3. anonymous status=answered 생성 실패
  {
    name: '3. [DENY] anonymous status=answered 생성 실패 (unauthorized status tamper)',
    params: {
      action: 'create',
      path: 'online_inquiries/inq_103',
      auth: null,
      requestTime: createTime,
      requestData: {
        nickname: '방문자',
        category: 'sleep',
        title: '불면증 질문',
        content: '수면제 질문입니다.',
        status: 'answered',
        createdAt: createTime
      }
    },
    expected: false
  },
  // 4. anonymous 기존 질문 update 실패
  {
    name: '4. [DENY] anonymous 기존 질문 update 실패 (anonymous update forbidden)',
    params: {
      action: 'update',
      path: 'online_inquiries/inq_101',
      auth: null,
      requestTime: answerTime,
      resourceData: pendingDoc,
      requestData: { ...pendingDoc, answer: '익명 답변', updatedAt: answerTime }
    },
    expected: false
  },
  // 5. anonymous delete 실패
  {
    name: '5. [DENY] anonymous delete 실패 (anonymous delete forbidden)',
    params: {
      action: 'delete',
      path: 'online_inquiries/inq_101',
      auth: null
    },
    expected: false
  },
  // 6. admin pending → answered 성공 (answeredAt == request.time)
  {
    name: '6. [ALLOW] admin pending → answered 성공 (first answer with serverTimestamp answeredAt & updatedAt)',
    params: {
      action: 'update',
      path: 'online_inquiries/inq_101',
      auth: { uid: 'admin_son', token: { admin: true } },
      requestTime: answerTime,
      resourceData: pendingDoc,
      requestData: {
        ...pendingDoc,
        status: 'answered',
        answer: '안녕하세요, 손지웅 대표원장입니다. 자율신경실조증은...',
        answeredAt: answerTime,
        updatedAt: answerTime
      }
    },
    expected: true
  },
  // 7. answered 상태에는 answer/answeredAt 존재 검증 (누락 시 실패)
  {
    name: '7. [DENY] admin이 status="answered"로 바꾸면서 answer/answeredAt을 누락하면 실패',
    params: {
      action: 'update',
      path: 'online_inquiries/inq_101',
      auth: { uid: 'admin_son', token: { admin: true } },
      requestTime: answerTime,
      resourceData: pendingDoc,
      requestData: {
        ...pendingDoc,
        status: 'answered',
        updatedAt: answerTime
        // Missing answer and answeredAt!
      }
    },
    expected: false
  },
  // 8. admin answer 수정 성공 (기존 answeredAt 유지, updatedAt만 갱신)
  {
    name: '8. [ALLOW] admin answer 수정 성공 (preserves existing answeredAt, updates updatedAt to serverTimestamp)',
    params: {
      action: 'update',
      path: 'online_inquiries/inq_101',
      auth: { uid: 'admin_son', token: { admin: true } },
      requestTime: editTime,
      resourceData: answeredDoc,
      requestData: {
        ...answeredDoc,
        answer: '안녕하세요, 손지웅 대표원장입니다. (답변 보완 내용 추가)',
        answeredAt: answerTime, // Preserved original answeredAt
        updatedAt: editTime     // New serverTimestamp
      }
    },
    expected: true
  },
  // 9. 기존 createdAt 변경 실패 (불변성 위반)
  {
    name: '9. [DENY] 기존 createdAt 변경 실패 (immutable createdAt violation)',
    params: {
      action: 'update',
      path: 'online_inquiries/inq_101',
      auth: { uid: 'admin_son', token: { admin: true } },
      requestTime: answerTime,
      resourceData: pendingDoc,
      requestData: {
        ...pendingDoc,
        createdAt: '2020-01-01T00:00:00Z', // Tampered!
        status: 'answered',
        answer: '답변 내용',
        answeredAt: answerTime,
        updatedAt: answerTime
      }
    },
    expected: false
  },
  // 10. updatedAt이 serverTimestamp가 아니면 실패
  {
    name: '10. [DENY] updatedAt이 serverTimestamp(request.time)가 아니면 실패',
    params: {
      action: 'update',
      path: 'online_inquiries/inq_101',
      auth: { uid: 'admin_son', token: { admin: true } },
      requestTime: answerTime,
      resourceData: pendingDoc,
      requestData: {
        ...pendingDoc,
        status: 'answered',
        answer: '답변 내용',
        answeredAt: answerTime,
        updatedAt: '2021-05-05T00:00:00Z' // Invalid timestamp!
      }
    },
    expected: false
  },
  // 11. XSS 입력 방어 검증 (HTML Escaping Test)
  {
    name: '11. [SAFETY] XSS 악성 스크립트 입력이 HTML Escaping 처리되어 안전하게 변환되는지 검증',
    testFn: () => {
      const maliciousPayload = '<script>alert("XSS")</script><img src="x" onerror="stealCookie()">';
      const sanitized = escapeHtml(maliciousPayload);
      const isSafe = !sanitized.includes('<script>') && 
                     !sanitized.includes('<img') && 
                     sanitized.includes('&lt;script&gt;') && 
                     sanitized.includes('&lt;img') && 
                     sanitized.includes('&quot;');
      return isSafe;
    },
    expected: true
  }
];

let passedCount = 0;
let failedCount = 0;

testCases.forEach((tc) => {
  let result;
  if (tc.testFn) {
    result = tc.testFn();
  } else {
    result = evaluateFirestoreRules(tc.params);
  }

  const isPass = result === tc.expected;
  if (isPass) {
    passedCount++;
    console.log('✅ PASS: ' + tc.name);
  } else {
    failedCount++;
    console.error('❌ FAIL: ' + tc.name + ' (Expected: ' + tc.expected + ', Got: ' + result + ')');
  }
});

console.log(`\n==================================================`);
console.log(`📊 Total Tests: ${testCases.length} | Passed: ${passedCount} | Failed: ${failedCount}`);
console.log(`==================================================`);

if (failedCount === 0) {
  console.log('🎉 ALL 11 REQUIRED SECURITY & BEHAVIOR TESTS PASSED 100%!');
} else {
  process.exit(1);
}
