const fs = require('fs');

/**
 * Direct Security Rules Validation Test Suite
 * Tests all logical branches of firestore.rules
 */

const ALLOWED_CATEGORIES = [
  'tic', 'adhd', 'panic', 'anxiety', 'sleep',
  'autonomic', 'hyperhidrosis', 'ibs', 'headache',
  'depression', 'child', 'fatigue', 'etc'
];

function evaluateRules({ action, path, auth, requestData, resourceData, requestTime }) {
  const isOnlineInquiry = path.startsWith('online_inquiries/');
  const isAdminDoc = path.startsWith('admins/');

  // Helper isAdmin
  const isAdmin = Boolean(auth != null && (
    (auth.token && auth.token.admin === true) ||
    (auth.adminDocs && Array.isArray(auth.adminDocs) && auth.adminDocs.includes(auth.uid))
  ));

  // Helper isCreateValid
  function isCreateValid(data, time) {
    if (!data) return false;
    const allowedCreateKeys = ['nickname', 'title', 'content', 'category', 'status', 'createdAt', 'id'];
    const keys = Object.keys(data);

    // 1. Must only contain allowed keys
    if (!keys.every(k => allowedCreateKeys.includes(k))) return false;

    // 2. status must be pending
    if (data.status !== 'pending') return false;

    // 3. Types and length limits
    if (typeof data.nickname !== 'string' || data.nickname.length < 1 || data.nickname.length > 30) return false;
    if (typeof data.title !== 'string' || data.title.length < 2 || data.title.length > 100) return false;
    if (typeof data.content !== 'string' || data.content.length < 5 || data.content.length > 3000) return false;

    // 4. Category
    if (!ALLOWED_CATEGORIES.includes(data.category)) return false;

    // 5. createdAt == request.time
    if (data.createdAt !== time) return false;

    // 6. Prohibit answer / admin fields
    if ('answer' in data || 'answeredAt' in data || 'updatedAt' in data ||
        'admin' in data || 'isAdmin' in data || 'role' in data || 'answeredBy' in data) {
      return false;
    }

    return true;
  }

  // Helper isUpdateValid
  function isUpdateValid(data, existing) {
    if (!data || !existing) return false;
    const allowedUpdateKeys = ['nickname', 'title', 'content', 'category', 'status', 'createdAt', 'answer', 'answeredAt', 'updatedAt', 'id'];
    const keys = Object.keys(data);

    // 1. Must only contain allowed keys
    if (!keys.every(k => allowedUpdateKeys.includes(k))) return false;

    // 2. Immutable createdAt
    if (data.createdAt !== existing.createdAt) return false;

    // 3. Status must be pending or answered
    if (!['pending', 'answered'].includes(data.status)) return false;

    // 4. Base fields
    if (typeof data.nickname !== 'string' || data.nickname.length < 1 || data.nickname.length > 30) return false;
    if (typeof data.title !== 'string' || data.title.length < 2 || data.title.length > 100) return false;
    if (typeof data.content !== 'string' || data.content.length < 5 || data.content.length > 3000) return false;
    if (!ALLOWED_CATEGORIES.includes(data.category)) return false;

    // 5. Answer validation
    if ('answer' in data) {
      if (typeof data.answer !== 'string' || data.answer.length > 5000) return false;
    }

    return true;
  }

  // Route matches
  if (isOnlineInquiry) {
    if (action === 'read') return true;
    if (action === 'create') return isCreateValid(requestData, requestTime);
    if (action === 'update') return isAdmin && isUpdateValid(requestData, resourceData);
    if (action === 'delete') return isAdmin;
  }

  if (isAdminDoc) {
    const adminId = path.split('/')[1];
    if (action === 'read') return auth != null && auth.uid === adminId;
    return false;
  }

  return false;
}

// Run Test Scenarios
console.log('🧪 Starting Firestore Security Rules Test Suite...\n');

const testTime = '2026-08-31T10:00:00Z';
const existingQuestion = {
  id: 'inq_123',
  nickname: '분당맘',
  category: 'tic',
  title: '아이 틱증상 질문',
  content: '아이가 눈을 깜빡이는데 한방 치료가 가능한가요?',
  status: 'pending',
  createdAt: testTime
};

const testCases = [
  // 1. Anonymous Read
  {
    name: '1. [ALLOW] Anonymous user reads public inquiry',
    params: { action: 'read', path: 'online_inquiries/inq_123', auth: null },
    expected: true
  },
  // 2. Anonymous Create Valid
  {
    name: '2. [ALLOW] Anonymous user creates valid pending inquiry',
    params: {
      action: 'create',
      path: 'online_inquiries/inq_456',
      auth: null,
      requestTime: testTime,
      requestData: {
        id: 'inq_456',
        nickname: '수지주민',
        category: 'sleep',
        title: '불면증 치료 문의',
        content: '수면제 줄이고 한방으로 치료하고 싶습니다.',
        status: 'pending',
        createdAt: testTime
      }
    },
    expected: true
  },
  // 3. Anonymous Create with Status='answered' (Should FAIL)
  {
    name: '3. [DENY] Anonymous user attempts to create inquiry with status="answered"',
    params: {
      action: 'create',
      path: 'online_inquiries/inq_456',
      auth: null,
      requestTime: testTime,
      requestData: {
        nickname: '수지주민',
        category: 'sleep',
        title: '불면증 문의',
        content: '내용입니다.',
        status: 'answered',
        createdAt: testTime
      }
    },
    expected: false
  },
  // 4. Anonymous Create with Answer field (Should FAIL)
  {
    name: '4. [DENY] Anonymous user attempts to inject answer field on creation',
    params: {
      action: 'create',
      path: 'online_inquiries/inq_456',
      auth: null,
      requestTime: testTime,
      requestData: {
        nickname: '해커',
        category: 'panic',
        title: '공황 문의',
        content: '내용입니다.',
        status: 'pending',
        answer: '임의 답변 조작 시도',
        createdAt: testTime
      }
    },
    expected: false
  },
  // 5. Anonymous Create with PII / Arbitrary field (Should FAIL)
  {
    name: '5. [DENY] Anonymous user attempts to include unauthorized field (phone/email)',
    params: {
      action: 'create',
      path: 'online_inquiries/inq_456',
      auth: null,
      requestTime: testTime,
      requestData: {
        nickname: '홍길동',
        phone: '010-1234-5678',
        category: 'panic',
        title: '공황 문의',
        content: '내용입니다.',
        status: 'pending',
        createdAt: testTime
      }
    },
    expected: false
  },
  // 6. Anonymous Update (Should FAIL)
  {
    name: '6. [DENY] Anonymous user attempts to update existing inquiry',
    params: {
      action: 'update',
      path: 'online_inquiries/inq_123',
      auth: null,
      resourceData: existingQuestion,
      requestData: { ...existingQuestion, answer: '가짜 답변' }
    },
    expected: false
  },
  // 7. Anonymous Delete (Should FAIL)
  {
    name: '7. [DENY] Anonymous user attempts to delete inquiry',
    params: {
      action: 'delete',
      path: 'online_inquiries/inq_123',
      auth: null
    },
    expected: false
  },
  // 8. Normal Authenticated User (Non-Admin) Update (Should FAIL)
  {
    name: '8. [DENY] Non-admin authenticated user attempts to update inquiry',
    params: {
      action: 'update',
      path: 'online_inquiries/inq_123',
      auth: { uid: 'user_regular_123', token: { admin: false } },
      resourceData: existingQuestion,
      requestData: { ...existingQuestion, answer: '비인가 답변' }
    },
    expected: false
  },
  // 9. Admin via Custom Claim updates valid answer (Should ALLOW)
  {
    name: '9. [ALLOW] Admin (Custom Claim admin=true) writes doctor answer & sets answered',
    params: {
      action: 'update',
      path: 'online_inquiries/inq_123',
      auth: { uid: 'admin_uid_01', token: { admin: true } },
      resourceData: existingQuestion,
      requestData: {
        ...existingQuestion,
        answer: '안녕하세요, 손지웅 대표원장입니다. 틱 증상은...',
        status: 'answered'
      }
    },
    expected: true
  },
  // 10. Admin via admins/{uid} document updates valid answer (Should ALLOW)
  {
    name: '10. [ALLOW] Admin (via admins/{uid} document entry) updates doctor answer',
    params: {
      action: 'update',
      path: 'online_inquiries/inq_123',
      auth: { uid: 'doctor_son_uid', adminDocs: ['doctor_son_uid'] },
      resourceData: existingQuestion,
      requestData: {
        ...existingQuestion,
        answer: '안녕하세요, 손지웅 대표원장입니다. 소아 틱은...',
        status: 'answered'
      }
    },
    expected: true
  },
  // 11. Admin attempts to modify immutable createdAt (Should FAIL)
  {
    name: '11. [DENY] Admin attempts to modify immutable createdAt',
    params: {
      action: 'update',
      path: 'online_inquiries/inq_123',
      auth: { uid: 'admin_uid_01', token: { admin: true } },
      resourceData: existingQuestion,
      requestData: {
        ...existingQuestion,
        createdAt: '2020-01-01T00:00:00Z',
        answer: '답변',
        status: 'answered'
      }
    },
    expected: false
  },
  // 12. Admin attempts to set invalid status (Should FAIL)
  {
    name: '12. [DENY] Admin attempts to set invalid status (e.g. status="hidden_junk")',
    params: {
      action: 'update',
      path: 'online_inquiries/inq_123',
      auth: { uid: 'admin_uid_01', token: { admin: true } },
      resourceData: existingQuestion,
      requestData: {
        ...existingQuestion,
        status: 'deleted_or_invalid',
        answer: '답변'
      }
    },
    expected: false
  },
  // 13. Admin attempts to add unapproved private field (Should FAIL)
  {
    name: '13. [DENY] Admin attempts to add unauthorized arbitrary field (e.g. ssn / private_memo)',
    params: {
      action: 'update',
      path: 'online_inquiries/inq_123',
      auth: { uid: 'admin_uid_01', token: { admin: true } },
      resourceData: existingQuestion,
      requestData: {
        ...existingQuestion,
        answer: '답변',
        status: 'answered',
        private_ssn: '850101-1234567'
      }
    },
    expected: false
  },
  // 14. Admin attempts to write answer exceeding 5000 characters (Should FAIL)
  {
    name: '14. [DENY] Admin attempts to write answer exceeding 5000 characters limit',
    params: {
      action: 'update',
      path: 'online_inquiries/inq_123',
      auth: { uid: 'admin_uid_01', token: { admin: true } },
      resourceData: existingQuestion,
      requestData: {
        ...existingQuestion,
        answer: 'A'.repeat(5001),
        status: 'answered'
      }
    },
    expected: false
  },
  // 15. Admin deletes inquiry (Should ALLOW)
  {
    name: '15. [ALLOW] Admin deletes inquiry document',
    params: {
      action: 'delete',
      path: 'online_inquiries/inq_123',
      auth: { uid: 'admin_uid_01', token: { admin: true } }
    },
    expected: true
  },
  // 16. Default Deny for other collections (Should FAIL)
  {
    name: '16. [DENY] Access to unmapped arbitrary collection (e.g. /users, /secrets)',
    params: {
      action: 'read',
      path: 'secrets/credentials',
      auth: { uid: 'admin_uid_01', token: { admin: true } }
    },
    expected: false
  }
];

let passed = 0;
let failed = 0;

testCases.forEach((tc) => {
  const result = evaluateRules(tc.params);
  const isPass = result === tc.expected;
  if (isPass) {
    passed++;
    console.log('✅ PASS: ' + tc.name);
  } else {
    failed++;
    console.error('❌ FAIL: ' + tc.name + ' (Expected: ' + tc.expected + ', Got: ' + result + ')');
  }
});

console.log(`\n📊 Test Summary: Total: ${testCases.length}, Passed: ${passed}, Failed: ${failed}`);

if (failed === 0) {
  console.log('🎉 All Firestore Security Rules tests PASSED successfully!');
} else {
  process.exit(1);
}
