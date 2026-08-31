const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Target Single Region Rotation Pool
const TARGET_REGIONS = [
  '분당',
  '판교',
  '용인',
  '성남',
  '수지',
  '경기광주',
  '위례',
  '이천'
];

// 2. Disease Topic Library
const DISEASE_TEMPLATES = [
  {
    disease: '공황장애',
    category: 'panic',
    category_name: '공황·불안',
    titleSuffix: '갑작스러운 가슴 답답함과 숨막힘, 뇌 신경계의 경보 오류 바로잡기',
    subTitle: '예고 없이 찾아오는 공황발작, 편도체 과열 진정과 자율신경 치유',
    summary: '일상생활 중 갑자기 발생하는 가슴 두근거림, 호흡곤란, 어지럼증. 심장 이상이 아닌 뇌 편도체(Amygdala)의 과도한 공포 반응을 가라앉히는 맞춤 한방 치료법을 안내합니다.',
    hashtags: ['공황장애', '공황발작', '자율신경실조증', '불안장애치료', '한의원'],
    diagram: {
      parentText: '두뇌 편도체 (Amygdala)',
      parentSub: '공포·불안 감정 감지 및 신체 경보 중추',
      leftText: '편도체 과민 반응',
      leftSub: '교감신경 급격한 흥분\n\n▶ 가슴 두근거림·질식감\n▶ 과호흡 및 극심한 공포감',
      rightText: '해아림 안심(安心) 요법',
      rightSub: '뇌 신경 안정 & 기혈 순환\n\n▶ 편도체 진정 맞춤 한약\n▶ 자율신경 조절 침구치료',
      colorLeft: '#EF4444',
      colorRight: '#0EA5E9'
    }
  },
  {
    disease: '자율신경실조증',
    category: 'autonomic',
    category_name: '자율신경',
    titleSuffix: '원인 모를 어지럼증·가슴답답함·소화불량, 교감신경 불균형 바로잡기',
    subTitle: '검사상 이상 없는 만성 피로와 어지럼, 자율신경계 균형 회복',
    summary: '종합병원 여러 과를 다녀도 원인을 찾지 못하는 만성 피로, 어지럼증, 두근거림, 상열감. 자율신경계(교감·부교감) 불균형의 근본 원인과 한방 치유 원리를 설명합니다.',
    hashtags: ['자율신경실조증', '자율신경한의원', '어지럼증치료', '교감신경항진', '만성피로회복'],
    diagram: {
      parentText: '자율신경계 (Autonomic System)',
      parentSub: '교감신경(액셀) vs 부교감신경(브레이크)',
      leftText: '교감신경 과항진',
      leftSub: '만성 스트레스로 균형 붕괴\n\n▶ 가슴 답답함·상열감\n▶ 소화불량 및 만성 어지럼',
      rightText: '해아림 조율(調律) 케어',
      rightSub: '교감-부교감 밸런스 회복\n\n▶ 뇌파 안정 맞춤 탕약\n▶ 자율신경 침구 & 약침치료',
      colorLeft: '#F59E0B',
      colorRight: '#10B981'
    }
  },
  {
    disease: '틱장애',
    category: 'tic-adhd',
    category_name: '틱장애·소아신경',
    titleSuffix: '눈 깜빡임·음음 소리, 억지로 참게 하면 안 되는 이유와 두뇌 밸런스 치료법',
    subTitle: '스스로 조절하기 힘든 불필요한 움직임, 기저핵 기능 안정과 성장 케어',
    summary: '아이의 틱 증상(눈 깜빡임, 헛기침, 음음 소리), 혼내거나 지적하면 왜 더 악화될까요? 두뇌 기저핵의 미성숙과 신경계 과흥분을 다스리는 맞춤 한방 치료 원리를 소개합니다.',
    hashtags: ['틱장애', '소아신경한의원', '소아틱치료', '음성틱운동틱', '두뇌밸런스'],
    diagram: {
      parentText: '두뇌 기저핵 (Basal Ganglia)',
      parentSub: '운동 제어 및 불필요한 신호 필터링 중추',
      leftText: '기저핵 기능 미성숙',
      leftSub: '불필요한 동작 억제 실패\n\n▶ 눈 깜빡임·고개 털기\n▶ 킁킁·음음 음성틱 발생',
      rightText: '해아림 두뇌 밸런스 케어',
      rightSub: '뇌 신경계 흥분 안정\n\n▶ 뇌파·체질 맞춤 한약\n▶ 자율신경 조절 & 침구치료',
      colorLeft: '#F87171',
      colorRight: '#2DD4BF'
    }
  },
  {
    disease: '불면증',
    category: 'sleep',
    category_name: '수면·불면증',
    titleSuffix: '밤마다 뒤척이는 뇌의 과각성 상태, 수면제 의존 없이 자연 수면 리듬 되찾기',
    subTitle: '잠들기 힘든 입면장애와 잦은 각성, 뇌 과열 진정과 심신안정',
    summary: '잠들기까지 30분 이상 걸리고, 자다가 수시로 깨며, 아침에 일어나도 피로가 풀리지 않는 만성 불면증. 뇌 신경계의 과각성을 진정시키고 자연 수면 리듬을 회복하는 한방 치료법을 안내합니다.',
    hashtags: ['불면증', '수면장애한의원', '불면증극복', '수면제부작용극복', '만성피로회복'],
    diagram: {
      parentText: '수면 조절 중추 (Sleep Center)',
      parentSub: '시상하부 및 멜라토닌 분비 조절 시스템',
      leftText: '뇌 신경계 과각성 상태',
      leftSub: '교감신경 항진·긴장 지속\n\n▶ 30분 이상 입면 장애\n▶ 수면 유지 장애·조기 각성',
      rightText: '해아림 안심(安心) 수면치료',
      rightSub: '뇌 과열 진정·기혈 순환\n\n▶ 수면유도 맞춤 한약\n▶ 심신 안정 침구 & 생활요법',
      colorLeft: '#FB923C',
      colorRight: '#38BDF8'
    }
  },
  {
    disease: 'ADHD',
    category: 'tic-adhd',
    category_name: 'ADHD·집중력',
    titleSuffix: '산만하고 충동적인 아이, 훈육보다 전두엽 실행기능 강화가 먼저인 이유',
    subTitle: '주의력 결핍과 과잉행동, 전두엽 뇌기능 활성화로 바로잡기',
    summary: '주의가 산만하고 충동 조절이 어려운 소아 및 성인 ADHD. 전두엽 뇌기능 미성숙과 도파민 불균형을 다스리는 맞춤 한방 치료법을 안내합니다.',
    hashtags: ['ADHD', '소아신경', '성인ADHD치료', '집중력향상', '두뇌훈련'],
    diagram: {
      parentText: '두뇌 전두엽 (Prefrontal Cortex)',
      parentSub: '주의집중, 충동 억제 및 자기조절 중추',
      leftText: '전두엽 활성도 저하',
      leftSub: '도파민·노르에피네프린 불균형\n\n▶ 주의집중 유지 곤란\n▶ 충동 조절 및 과잉행동',
      rightText: '해아림 전두엽 활성 케어',
      rightSub: '뇌 신경망 연결 및 기혈 순환\n\n▶ 체질 맞춤 총명·안신 한약\n▶ 두뇌 밸런스 침구 & 뇌파훈련',
      colorLeft: '#F59E0B',
      colorRight: '#10B981'
    }
  },
  {
    disease: '다한증',
    category: 'hyperhidrosis',
    category_name: '다한증',
    titleSuffix: '긴장할 때마다 쏟아지는 손발 땀, 교감신경 과민과 자율신경 조절로 극복하기',
    subTitle: '사계절 축축한 손발과 겨드랑이 땀, 수승화강 체질 개선',
    summary: '사계절 내내 축축한 손발, 겨드랑이 땀과 보상성 다한증 걱정. 교감신경계의 과도한 흥분을 진정시키고 수승화강을 이루는 한방 다한증 치료 원리를 설명합니다.',
    hashtags: ['다한증', '수족다한증', '손땀치료', '교감신경항진', '체질개선'],
    diagram: {
      parentText: '체온 및 땀 조절 중추 (시상하부)',
      parentSub: '교감신경계 에크린 땀샘 조절 시스템',
      leftText: '교감신경 과민 반응',
      leftSub: '정서적 긴장 시 아세틸콜린 과다\n\n▶ 손·발·겨드랑이 국소 다한증\n▶ 상열감 및 심신 불안 가중',
      rightText: '해아림 수승화강(水昇火降)',
      rightSub: '상초 열감 해소 & 자율신경 안정\n\n▶ 땀샘 안정 맞춤 한약\n▶ 교감신경 완화 침구치료',
      colorLeft: '#EF4444',
      colorRight: '#0EA5E9'
    }
  },
  {
    disease: '과민성대장증후군',
    category: 'ibs',
    category_name: '과민성대장',
    titleSuffix: '긴장만 하면 화장실 직행, 장-뇌 축(Gut-Brain Axis) 불균형 치료법',
    subTitle: '스트레스성 복통과 설사, 장 신경계와 뇌 신경계 동시 안정',
    summary: '출근길, 시험 전, 미팅 직전 갑작스러운 복통과 잦은 가스·설사. 장과 뇌의 신경망 연결고리를 바로잡아 장 신경계를 안정시키는 맞춤 솔루션입니다.',
    hashtags: ['과민성대장증후군', '장질환한의원', '복통설사치료', '장뇌축치료', '위장질환'],
    diagram: {
      parentText: '장-뇌 축 (Gut-Brain Axis)',
      parentSub: '뇌 중추신경과 장 신경계(ENS)의 양방향 상호작용',
      leftText: '장 신경계 과민 상태',
      leftSub: '스트레스 신호가 장으로 전달\n\n▶ 장 연동운동 급격 과항진\n▶ 복통, 설사, 복부 팽만감',
      rightText: '해아림 장-뇌 조화 요법',
      rightSub: '자율신경 안정 & 비위 기운 보강\n\n▶ 장내 신경 안정 맞춤 한약\n▶ 복부 온침 및 순환 약침치료',
      colorLeft: '#F97316',
      colorRight: '#06B6D4'
    }
  },
  {
    disease: '두통·어지럼증',
    category: 'headache',
    category_name: '두통·어지럼',
    titleSuffix: '검사상 정상인데 지속되는 편두통과 멍함(브레인포그), 뇌혈류 개선 한방치료',
    subTitle: '진통제로 가라앉지 않는 만성 두통, 뇌 신경 피로 해소',
    summary: '진통제를 먹어도 반복되는 욱신거리는 편두통, 핑 도는 어지럼증. 뇌 주변 근육 긴장과 경동맥 뇌혈류 순환 장애를 해결하는 정밀 한방 치료 원리를 소개합니다.',
    hashtags: ['두통', '어지럼증한의원', '편두통치료', '브레인포그극복', '뇌혈류개선'],
    diagram: {
      parentText: '뇌 혈류 순환 및 뇌신경계',
      parentSub: '경추 신경근 & 뇌저동맥 혈류 조절 시스템',
      leftText: '뇌혈류 저하 및 신경 과민',
      leftSub: '경추 경결·교감신경 과긴장\n\n▶ 욱신거리는 박동성 편두통\n▶ 중심 잡기 힘든 비회전성 어지럼',
      rightText: '해아림 청뇌(淸腦) 순환치료',
      rightSub: '경추 이완 & 뇌혈관 순환 촉진\n\n▶ 두통 완화 맞춤 탕약\n▶ 경추 교정 추나 & 약침치료',
      colorLeft: '#EC4899',
      colorRight: '#3B82F6'
    }
  }
];

console.log('Daily Column Auto Publisher loaded. Total single-region targets:', TARGET_REGIONS.join(', '));
module.exports = { TARGET_REGIONS, DISEASE_TEMPLATES };
