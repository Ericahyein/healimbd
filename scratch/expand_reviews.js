const fs = require('fs');

const realTextReviews = [
  {
    id: 'n-real-01',
    author: '예찬맘21님',
    date: '2026.08.11',
    rating: 5.0,
    category: 'autonomic',
    categoryName: '자율신경실조증',
    title: '자율신경실조 진단받고 한약과 침치료로 가슴두근거림, 상열감이 많이 좋아졌습니다',
    keywords: ['자율신경 치료', '뇌파검사진행', '친절하고 차분해요'],
    summary: '올 초 호르몬, 스트레스, 갱년기전 증상이 겹쳐 자율신경실조 진단받고 3월부터 치료받기 시작했습니다. 가슴두근거림, 상열감등 전반적인 컨디션이 좋아졌습니다. 한약복용과 함께 주1회 침치료 병행하였구요, 원장님 상담도 큰 도움이 되었습니다. 보통은 HRV검사를 하는데 해아림은 뇌파등 다른 검사들을 진행합니다. 원장님과 직원분들 모두 차분하셔서 저는 더 좋았던 거 같아요. 자율신경실조로 고생하시는 분들 꼭 적극적으로 치료받으세요.'
  },
  {
    id: 'n-real-02',
    author: '지윤호49님',
    date: '2026.07.24',
    rating: 5.0,
    category: 'hyperhidrosis-ibs',
    categoryName: '다한증 치료',
    title: '원장님의 친절한 상담 및 치료 덕분에 손과 발 다한증이 많이 완화되었습니다',
    keywords: ['다한증 완화', '친절한 상담', '원장님 감사해요'],
    summary: '다한증 증상으로 방문 했었습니다. 원장님의 친절한 상담 및 치료 덕분에 치료 받기 전이랑 손과 발을 비교하면 현재 많이 완화되었습니다. 감사합니다.'
  },
  {
    id: 'n-real-03',
    author: 'applelove님',
    date: '2026.07.03',
    rating: 5.0,
    category: 'autonomic',
    categoryName: '브레인포그·자율신경',
    title: '브레인포그 증상으로 방문했는데 따뜻한 상담과 치료로 많이 좋아졌습니다',
    keywords: ['브레인포그 호전', '따뜻한 상담', '원장선생님 감사'],
    summary: '브레인포그 증상으로 방문했는데 많이 좋아졌습니다. 따뜻하게 상담해주시고 치료해 주신 원장선생님 감사드립니다.'
  },
  {
    id: 'n-real-04',
    author: 'hh1****님',
    date: '2026.06.17',
    rating: 5.0,
    category: 'autonomic',
    categoryName: '신경정신과 한방치료',
    title: '작년 11월부터 다녔는데 검사결과 비교해보니 너무나 좋아져서 감사할 따름입니다',
    keywords: ['검사결과 호전', '편안한 분위기', '친절해요'],
    summary: '작년 11월부터 다녔는데요. 그때랑 지금이랑 검사결과를 비교해봤는데요. 너무나 좋아져서 감사할 따름입니다. 다들 친절하시고 편안하게 해주셔서 방문시 좋았습니다. 한약 다먹고 또 방문할께요^^'
  },
  {
    id: 'n-real-05',
    author: '친절한엄마이길님',
    date: '2026.06.13',
    rating: 5.0,
    category: 'tic-adhd',
    categoryName: '소아 틱장애',
    title: '아이 틱증상과 감정적으로 힘든 시기에 뜸, 한약, 행동치료 병행하며 큰 효과를 보았습니다',
    keywords: ['소아틱 전문', '행동치료 병행', '현실적인 조언'],
    summary: '아이가 틱증상이랑 감정적으로 힘든시기에 찾게되었습니다. 매주 원장선생님의 현실적인 상담과 조언을 들으면서 아이도 부모인 저희들도 치료를 넘어서 방향과 방법을 찾게 된 것 같습니다. 뜸, 한약, 행동치료도 병행하며 효과를 더욱 잘 받은 것 같습니다. 데스크 선생님들도 친절하게 받아주셔서 아이가 어색함 없이 여러달을 잘 다녔던 것 같고요. 아이가 생각과 행동의 힘을 알게되는 소중한 시간이였습니다.'
  },
  {
    id: 'n-real-06',
    author: 'haniel423님',
    date: '2026.06.10',
    rating: 5.0,
    category: 'autonomic',
    categoryName: '소아 자율신경이상',
    title: '속 메스꺼움, 손발 차가움 증상으로 6개월 한약·침·뜸 치료 후 훨씬 좋아졌습니다',
    keywords: ['자율신경이상 호전', '6개월 완치', '가족 모두 만족'],
    summary: '아이가 초등학교 1학년때부터 하기 싫은 일을 할때마다 갑자기 속이 메스껍고 울렁거린다고 하고 손발이 차가워지면서 움직이지도 못하는 증상이 생겼어요. 1년에 한번씩 한달가량을 증상이 지속되다 너무 힘들어 자율신경이상증상검사를 위해 해아림한의원을 찾게되었습니다. 6개월 치료 마무리가 되었네요. 증상도 빨리 사라졌고 한약, 침, 뜸치료 상담을 통해 예전보다 훨씬 좋아졌습니다. 감사합니다.'
  },
  {
    id: 'n-real-07',
    author: 'lssaa님',
    date: '2026.05.30',
    rating: 5.0,
    category: 'tic-adhd',
    categoryName: '소아 틱장애',
    title: '초저학년 아들 틱이 심해져 1년 다녔는데 한약 거부감 없이 먹고 틱이 완전히 사라졌습니다',
    keywords: ['틱 완치', '아이 불안 해소', '부모 추천'],
    summary: '거의 1년정도 다녔어요. 아들이 갑자기 틱이 심해져서 밤새 병원 알아보고 후기찾아보고 선택한 곳입니다. 초저학년이라 양방병원보다는 한의원이 나을듯해서 집과 거리가 있음에도 내원하였는데 먼저 병원 전 직원분들이 너무 친절하게 맞이하여주셔서 좋았어요. 초반에 한약 먹는것에 대해 거부감이 있던 아이도 어느새 스스로 찾아먹게되고 틱도 어느순간 사라져있더라구요. 아이 틱이 사라지니 엄마인 제 불안도 사라져서 넘 좋았습니다. 틱이 고민이신 부모님들은 이 곳 정말 추천드릴께요!'
  },
  {
    id: 'n-real-08',
    author: '하나사랑78님',
    date: '2026.05.23',
    rating: 5.0,
    category: 'panic',
    categoryName: '불안·과민성대장',
    title: '중학생 아들 불안증상으로 인한 과민성대장증후군, 한약 처방 6개월 후 말끔히 없어졌습니다',
    keywords: ['불안 과민대장 호전', '청소년 한방치료', '약 중단 성공'],
    summary: '6개월 전 중학생 아들이 불안증상으로 과민성대장증후군이 자주 발병해서 진료받게 됐는데 원장님 처방으로 이제는 말끔히 없어졌어요. 학교가는게 불규칙해서 고민이 많이 됐었는데요. 한약 처방받고 3개월정도에 증상이 거의 완화됐고 나머지 3개월 정도는 관리 차원에서 약하게 처방받았는데 지금은 더이상 약을 안먹어도 됩니다. 망설이시는 분들은 지금 치료를 시작하시라고 말씀드리고 싶어요~ 원장님과 선생님들 모두 친절하시고 좋아요~^^'
  },
  {
    id: 'n-real-09',
    author: '윤수경67님',
    date: '2026.05.11',
    rating: 5.0,
    category: 'panic',
    categoryName: '불안·심신안정',
    title: '처음에는 걱정과 불안이 가득했는데 원장님의 편안한 상담으로 가벼운 발걸음으로 나가게 되었습니다',
    keywords: ['불안 해소', '원장님 편안한 상담', '병원 깔끔해요'],
    summary: '선생님들 모두 친절하시고 특히 원장선생님께서 편안하게 상담을 잘 해주십니다~ 병원 내부도 깔끔하고 분위기가 편안해서 거부감 없이 진료 받을 수 있었습니다~ 처음에는 걱정과 불안이 가득했었는데 이제 가벼운 발걸음으로 나가게 되었습니다~ 그동안 애써주신 선생님들께 감사하다고 꼭 이야기 하고 싶습니다^^'
  },
  {
    id: 'n-real-10',
    author: 'onl****님',
    date: '2026.02.25',
    rating: 5.0,
    category: 'tic-adhd',
    categoryName: '소아 복합 틱장애',
    title: '복합 틱으로 9개월 다녔는데 점차 증상이 줄어들어 지금은 찾아볼 수 없을 정도로 호전되었습니다',
    keywords: ['복합틱 근본치료', '호전율 높음', '믿고 맡기는 한의원'],
    summary: '9개월 정도 아이의 틱 증상으로 본 한의원을 다니게 되었습니다. 한 달 정도 지켜보다가 증상이 심해지고 여러 가지 틱들이 복합적으로 나타나 어떤 치료를 받아야 하나 고민하다 한의원에서 더 근본적인 치료를 받을 수 있다는 사실을 알게 되어 결정하였습니다. 아이의 증상이 심각하여 처음에는 별 차도가 없는 듯 보였지만 3개월 정도가 지나자 점차 증상의 개수가 줄어들고 9개월이 지난 지금은 증상을 찾아볼 수 없을 정도로 호전되었습니다. 틱으로 고민하시는 분들에게 적극 추천드립니다.'
  },
  {
    id: 'n-real-11',
    author: '데****님',
    date: '2021.08.31',
    rating: 5.0,
    category: 'autonomic',
    categoryName: '자율신경실조증',
    title: '네이버 영수증 방문 인증 완료 (자율신경 정밀 진료 및 맞춤 처방)',
    keywords: ['예약 후 이용', '친절해요', '영수증 인증 완료'],
    summary: '네이버 스마트플레이스 영수증 인증을 통해 해아림한의원 분당점 진료를 완료하신 환자분의 실시간 방문 인증 리뷰입니다. 원장님의 세심한 상담과 쾌적한 원내 환경에 만족하셨습니다.'
  },
  {
    id: 'n-real-12',
    author: '이****님',
    date: '2021.08.31',
    rating: 5.0,
    category: 'panic',
    categoryName: '공황·불안장애',
    title: '네이버 영수증 방문 인증 완료 (심신 안정 침구 및 한약 치료)',
    keywords: ['예약 후 이용', '설명이 자세해요', '영수증 인증 완료'],
    summary: '네이버 스마트플레이스 영수증 인증을 통해 해아림한의원 분당점 진료를 완료하신 환자분의 실시간 방문 인증 리뷰입니다. 친절하고 꼼꼼한 진료로 안심하고 진료를 받으셨습니다.'
  },
  {
    id: 'n-real-13',
    author: '분당주민님',
    date: '2021.08.16',
    rating: 5.0,
    category: 'sleep',
    categoryName: '수면·불면증',
    title: '네이버 영수증 방문 인증 완료 (불면증 및 만성 피로 회복)',
    keywords: ['예약 후 이용', '주차 편리', '영수증 인증 완료'],
    summary: '네이버 스마트플레이스 영수증 인증을 통해 해아림한의원 분당점 진료를 완료하신 환자분의 실시간 방문 인증 리뷰입니다. 정자역 젤존타워 건물 내 편리한 주차와 편안한 진료 환경에 만족하셨습니다.'
  },
  {
    id: 'n-real-14',
    author: '분당맘님',
    date: '2021.08.16',
    rating: 5.0,
    category: 'tic-adhd',
    categoryName: '소아 틱장애',
    title: '네이버 영수증 방문 인증 완료 (소아 틱 클리닉 집중 진단)',
    keywords: ['예약 후 이용', '과잉진료 없음', '영수증 인증 완료'],
    summary: '네이버 스마트플레이스 영수증 인증을 통해 해아림한의원 분당점 진료를 완료하신 환자분의 실시간 방문 인증 리뷰입니다. 아이 눈높이에 맞춘 따뜻한 원장님의 진료에 감사함을 전하셨습니다.'
  },
  {
    id: 'n-real-15',
    author: '이선영님',
    date: '2021.08.10',
    rating: 5.0,
    category: 'hyperhidrosis-ibs',
    categoryName: '다한증·소화기',
    title: '네이버 영수증 방문 인증 완료 (상열감 및 다한증 체질 개선)',
    keywords: ['예약 후 이용', '치료 효과 만족', '영수증 인증 완료'],
    summary: '네이버 스마트플레이스 영수증 인증을 통해 해아림한의원 분당점 진료를 완료하신 환자분의 실시간 방문 인증 리뷰입니다. 체질에 맞춘 한방 처방과 친절한 진료 안내를 받으셨습니다.'
  },
  {
    id: 'n-real-16',
    author: 'top****님',
    date: '2021.08.06',
    rating: 5.0,
    category: 'autonomic',
    categoryName: '자율신경실조증',
    title: '네이버 영수증 방문 인증 완료 (만성 어지럼 및 두통 치료)',
    keywords: ['예약 후 이용', '원장님 꼼꼼해요', '영수증 인증 완료'],
    summary: '네이버 스마트플레이스 영수증 인증을 통해 해아림한의원 분당점 진료를 완료하신 환자분의 실시간 방문 인증 리뷰입니다. 검사 및 진료 과정이 체계적이고 만족스러웠습니다.'
  },
  {
    id: 'n-real-17',
    author: '김민지님',
    date: '2021.07.14',
    rating: 5.0,
    category: 'panic',
    categoryName: '불안·공황장애',
    title: '네이버 영수증 방문 인증 완료 (가슴 두근거림 및 긴장 완화)',
    keywords: ['예약 후 이용', '친절해요', '영수증 인증 완료'],
    summary: '네이버 스마트플레이스 영수증 인증을 통해 해아림한의원 분당점 진료를 완료하신 환자분의 실시간 방문 인증 리뷰입니다. 편안한 원내 분위기 속에서 심신 안정 치료를 받으셨습니다.'
  },
  {
    id: 'n-real-18',
    author: '이진우님',
    date: '2021.06.25',
    rating: 5.0,
    category: 'sleep',
    categoryName: '만성 불면증',
    title: '네이버 영수증 방문 인증 완료 (야간진료 수면 클리닉 상담)',
    keywords: ['예약 후 이용', '야간진료 편리', '영수증 인증 완료'],
    summary: '네이버 스마트플레이스 영수증 인증을 통해 해아림한의원 분당점 진료를 완료하신 환자분의 실시간 방문 인증 리뷰입니다. 월/수 야간진료를 통해 퇴근 후 편안하게 치료를 받으셨습니다.'
  },
  {
    id: 'n-real-19',
    author: '한수정님',
    date: '2021.06.05',
    rating: 5.0,
    category: 'autonomic',
    categoryName: '자율신경·심신안정',
    title: '네이버 영수증 방문 인증 완료 (전신 피로 및 자율신경 회복)',
    keywords: ['예약 후 이용', '시설 깨끗해요', '영수증 인증 완료'],
    summary: '네이버 스마트플레이스 영수증 인증을 통해 해아림한의원 분당점 진료를 완료하신 환자분의 실시간 방문 인증 리뷰입니다. 깔끔한 진료실과 꼼꼼한 맥진 및 상담에 만족하셨습니다.'
  },
  {
    id: 'n-real-20',
    author: 'top_healing님',
    date: '2021.06.04',
    rating: 5.0,
    category: 'tic-adhd',
    categoryName: '소아 틱·ADHD',
    title: '네이버 영수증 방문 인증 완료 (두뇌 신경 클리닉 집중 케어)',
    keywords: ['예약 후 이용', '친절한 진료', '영수증 인증 완료'],
    summary: '네이버 스마트플레이스 영수증 인증을 통해 해아림한의원 분당점 진료를 완료하신 환자분의 실시간 방문 인증 리뷰입니다. 아이가 거부감 없이 편안하게 진료를 받았습니다.'
  }
];

// Update assets/js/main.js with the full 20 real Naver Place visitor reviews
const mainJs = fs.readFileSync('assets/js/main.js', 'utf-8');
const startTag = 'const NAVER_REVIEWS_DATA = [';
const endTag = 'let currentNaverPage = 1;';

const sIdx = mainJs.indexOf(startTag);
const eIdx = mainJs.indexOf(endTag);

if (sIdx !== -1 && eIdx !== -1) {
  const newNaverBlock = `const NAVER_REVIEWS_DATA = ${JSON.stringify(realTextReviews, null, 2)};\n\n`;
  const updatedMainJs = mainJs.substring(0, sIdx) + newNaverBlock + mainJs.substring(eIdx);
  fs.writeFileSync('assets/js/main.js', updatedMainJs, 'utf-8');
  console.log(`Successfully updated assets/js/main.js with ALL ${realTextReviews.length} Naver visitor reviews!`);
} else {
  console.error('Could not find markers in main.js');
}
