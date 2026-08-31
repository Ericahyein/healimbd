const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Disease topics catalog for Healim Bundang
const TOPICS = [
  {
    slug: 'bundang-adhd-concentration-treatment',
    category: 'tic-adhd',
    category_name: 'ADHD·집중력',
    category_tag: '분당 ADHD·집중력',
    mainTitle: '분당 ADHD 원인과 두뇌치료',
    subTitle: '산만함과 충동성, 전두엽 뇌기능 활성화로 바로잡기',
    title: '[분당 ADHD] 산만하고 충동적인 아이, 훈육보다 전두엽 실행기능 강화가 먼저인 이유',
    summary: '주의가 산만하고 충동 조절이 어려운 소아 및 성인 ADHD. 전두엽 뇌기능 미성숙과 도파민 불균형을 다스리는 분당 해아림한의원의 맞춤 한방 치료법을 안내합니다.',
    hashtags: ['분당ADHD', '분당소아신경', '성인ADHD치료', '집중력향상', '정자역한의원', '두뇌훈련'],
    keywords: ['분당 ADHD', '분당 ADHD 한의원', '소아 ADHD 치료', '성인 ADHD 검사', '정자역 집중력 클리닉'],
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
    slug: 'bundang-hyperhidrosis-sweat-control',
    category: 'hyperhidrosis',
    category_name: '다한증',
    category_tag: '분당 다한증·수족다한증',
    mainTitle: '분당 다한증 원인과 체질개선',
    subTitle: '긴장하면 쏟아지는 손발 땀, 교감신경 과민과 상열감 치료',
    title: '[분당 다한증] 긴장할 때마다 쏟아지는 손발 땀, 교감신경 과민과 자율신경 조절로 극복하기',
    summary: '사계절 내내 축축한 손발, 겨드랑이 땀과 보상성 다한증 걱정. 교감신경계의 과도한 흥분을 진정시키고 수승화강을 이루는 한방 다한증 치료 원리를 설명합니다.',
    hashtags: ['분당다한증', '분당수족다한증', '손땀치료', '교감신경항진', '정자역한의원', '체질개선'],
    keywords: ['분당 다한증', '분당 수족다한증 한의원', '다한증 한방치료', '보상성 다한증', '정자역 다한증 클리닉'],
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
    slug: 'bundang-ibs-gut-brain-axis-treatment',
    category: 'ibs',
    category_name: '과민성대장',
    category_tag: '분당 과민성대장증후군',
    mainTitle: '분당 과민대장 원인과 회복',
    subTitle: '스트레스 받으면 복통·설사, 장-뇌 축(Gut-Brain) 다스리기',
    title: '[분당 과민성대장증후군] 긴장만 하면 화장실 직행, 장-뇌 축(Gut-Brain Axis) 불균형 치료법',
    summary: '출근길, 시험 전, 미팅 직전 갑작스러운 복통과 잦은 가스·설사. 장과 뇌의 신경망 연결고리를 바로잡아 장 신경계를 안정시키는 분당 해아림한의원의 맞춤 솔루션입니다.',
    hashtags: ['분당과민성대장증후군', '분당장질환한의원', '복통설사치료', '장뇌축치료', '정자역한의원', '위장질환'],
    keywords: ['분당 과민성대장증후군', '분당 과민대장 한의원', '신경성 장염 치료', '가스형 복부팽만', '정자역 위장한의원'],
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
    slug: 'bundang-headache-dizziness-neurology',
    category: 'headache',
    category_name: '두통·어지럼',
    category_tag: '분당 두통·어지럼증',
    mainTitle: '분당 두통·어지럼 원인치료',
    subTitle: 'MRI상 이상 없는 찌릿한 편두통·어지럼, 뇌 혈류와 뇌신경 안정',
    title: '[분당 두통·어지럼증] 검사상 정상인데 지속되는 편두통과 멍함(브레인포그), 뇌혈류 개선 한방치료',
    summary: '진통제를 먹어도 반복되는 욱신거리는 편두통, 핑 도는 어지럼증. 뇌 주변 근육 긴장과 경동맥 뇌혈류 순환 장애를 해결하는 분당 해아림한의원의 정밀 한방 치료 원리를 소개합니다.',
    hashtags: ['분당두통', '분당어지럼증한의원', '편두통치료', '브레인포그극복', '정자역한의원', '뇌혈류개선'],
    keywords: ['분당 두통', '분당 어지럼증 한의원', '만성 편두통 치료', '긴장성 두통', '정자역 두통 클리닉'],
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

function generateThumbnail(topic, outputPath) {
  const psCode = `
Add-Type -AssemblyName System.Drawing

$width = 800
$height = 800
$bmp = New-Object System.Drawing.Bitmap($width, $height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point(0, 0)),
    (New-Object System.Drawing.Point(0, $height)),
    ([System.Drawing.ColorTranslator]::FromHtml("#0A192F")),
    ([System.Drawing.ColorTranslator]::FromHtml("#172A45"))
)
$g.FillRectangle($bgBrush, 0, 0, $width, $height)

$pillBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#006B70"))
$pillRect = New-Object System.Drawing.Rectangle(60, 60, 260, 42)
$g.FillRectangle($pillBrush, $pillRect)

$tagFont = New-Object System.Drawing.Font("Malgun Gothic", 13, [System.Drawing.FontStyle]::Bold)
$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
$sfCenter = New-Object System.Drawing.StringFormat
$sfCenter.Alignment = [System.Drawing.StringAlignment]::Center
$sfCenter.LineAlignment = [System.Drawing.StringAlignment]::Center
$g.DrawString("${topic.category_tag}", $tagFont, $whiteBrush, [System.Drawing.RectangleF]$pillRect, $sfCenter)

$titleFont = New-Object System.Drawing.Font("Malgun Gothic", 26, [System.Drawing.FontStyle]::Bold)
$subFont = New-Object System.Drawing.Font("Malgun Gothic", 14, [System.Drawing.FontStyle]::Regular)
$lightGrayBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#94A3B8"))

$g.DrawString("${topic.mainTitle}", $titleFont, $whiteBrush, 60, 120)
$g.DrawString("${topic.subTitle}", $subFont, $lightGrayBrush, 60, 180)

$containerBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 255, 255, 255))
$containerPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(80, 255, 255, 255), 1.5)
$containerRect = New-Object System.Drawing.Rectangle(50, 230, 700, 420)
$g.FillRectangle($containerBrush, $containerRect)
$g.DrawRectangle($containerPen, $containerRect)

$parentBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#1E293B"))
$parentPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#38BDF8"), 2)
$parentRect = New-Object System.Drawing.Rectangle(180, 260, 440, 85)
$g.FillRectangle($parentBrush, $parentRect)
$g.DrawRectangle($parentPen, $parentRect)

$pTitleFont = New-Object System.Drawing.Font("Malgun Gothic", 16, [System.Drawing.FontStyle]::Bold)
$pSubFont = New-Object System.Drawing.Font("Malgun Gothic", 12, [System.Drawing.FontStyle]::Regular)
$cyanBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#38BDF8"))

$pTitleRect = New-Object System.Drawing.Rectangle(180, 272, 440, 30)
$pSubRect = New-Object System.Drawing.Rectangle(180, 304, 440, 30)
$g.DrawString("${topic.diagram.parentText}", $pTitleFont, $whiteBrush, [System.Drawing.RectangleF]$pTitleRect, $sfCenter)
$g.DrawString("${topic.diagram.parentSub}", $pSubFont, $cyanBrush, [System.Drawing.RectangleF]$pSubRect, $sfCenter)

$linePen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#94A3B8"), 2)
$g.DrawLine($linePen, 400, 345, 400, 385)
$g.DrawLine($linePen, 230, 385, 570, 385)
$g.DrawLine($linePen, 230, 385, 230, 420)
$g.DrawLine($linePen, 570, 385, 570, 420)

$arrowLeft = @(
    (New-Object System.Drawing.Point(225, 415)),
    (New-Object System.Drawing.Point(235, 415)),
    (New-Object System.Drawing.Point(230, 425))
)
$g.FillPolygon($whiteBrush, $arrowLeft)

$arrowRight = @(
    (New-Object System.Drawing.Point(565, 415)),
    (New-Object System.Drawing.Point(575, 415)),
    (New-Object System.Drawing.Point(570, 425))
)
$g.FillPolygon($whiteBrush, $arrowRight)

$leftBoxBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#1E293B"))
$leftBoxPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("${topic.diagram.colorLeft}"), 2)
$leftRect = New-Object System.Drawing.Rectangle(80, 425, 300, 185)
$g.FillRectangle($leftBoxBrush, $leftRect)
$g.DrawRectangle($leftBoxPen, $leftRect)

$boxTitleFont = New-Object System.Drawing.Font("Malgun Gothic", 15, [System.Drawing.FontStyle]::Bold)
$boxDescFont = New-Object System.Drawing.Font("Malgun Gothic", 12, [System.Drawing.FontStyle]::Regular)
$leftColorBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("${topic.diagram.colorLeft}"))

$lTitleRect = New-Object System.Drawing.Rectangle(80, 445, 300, 30)
$g.DrawString("${topic.diagram.leftText}", $boxTitleFont, $leftColorBrush, [System.Drawing.RectangleF]$lTitleRect, $sfCenter)

$lDescRect = New-Object System.Drawing.Rectangle(95, 490, 270, 110)
$sfDesc = New-Object System.Drawing.StringFormat
$sfDesc.Alignment = [System.Drawing.StringAlignment]::Center
$g.DrawString("${topic.diagram.leftSub.replace(/\n/g, '`n')}", $boxDescFont, $whiteBrush, [System.Drawing.RectangleF]$lDescRect, $sfDesc)

$rightBoxBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#1E293B"))
$rightBoxPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("${topic.diagram.colorRight}"), 2)
$rightRect = New-Object System.Drawing.Rectangle(420, 425, 300, 185)
$g.FillRectangle($rightBoxBrush, $rightRect)
$g.DrawRectangle($rightBoxPen, $rightRect)

$rightColorBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("${topic.diagram.colorRight}"))
$rTitleRect = New-Object System.Drawing.Rectangle(420, 445, 300, 30)
$g.DrawString("${topic.diagram.rightText}", $boxTitleFont, $rightColorBrush, [System.Drawing.RectangleF]$rTitleRect, $sfCenter)

$rDescRect = New-Object System.Drawing.Rectangle(435, 490, 270, 110)
$g.DrawString("${topic.diagram.rightSub.replace(/\n/g, '`n')}", $boxDescFont, $whiteBrush, [System.Drawing.RectangleF]$rDescRect, $sfDesc)

$logoPath = "static/images/healim-logo-white-text.png"
if (Test-Path $logoPath) {
    $logoBmp = [System.Drawing.Image]::FromFile((Resolve-Path $logoPath).Path)
    $logoW = 160
    $logoH = [int]($logoBmp.Height * ($logoW / $logoBmp.Width))
    $logoX = $width - $logoW - 50
    $logoY = $height - $logoH - 45
    $g.DrawImage($logoBmp, $logoX, $logoY, $logoW, $logoH)
    $logoBmp.Dispose()
}

$bmp.Save("${outputPath}", [System.Drawing.Imaging.ImageFormat]::Jpeg)
$g.Dispose()
$bmp.Dispose()
`;

  const scriptPath = path.join(__dirname, `temp_gen_${topic.slug}.ps1`);
  fs.writeFileSync(scriptPath, '\ufeff' + psCode, 'utf-8');
  execSync(`powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}"`, { encoding: 'utf-8' });
  fs.unlinkSync(scriptPath);
}

function generateMarkdown(topic, dateStr, imageRelPath) {
  return `---
title: "${topic.title}"
date: ${dateStr}
category: "${topic.category}"
category_name: "${topic.category_name}"
author: "손지웅 대표원장"
image: "${imageRelPath}"
summary: "${topic.summary}"
hashtags:
${topic.hashtags.map(h => `  - "${h}"`).join('\n')}
keywords:
${topic.keywords.map(k => `  - "${k}"`).join('\n')}
---

<div class="column-key-summary-box">
  <div class="summary-header">
    <i class="ph-fill ph-lightbulb"></i> 핵심 요약
  </div>
  <p class="summary-text">
    <strong>${topic.category_name}</strong> 치료의 핵심은 겉으로 드러나는 증상만을 억누르는 것이 아니라, <strong>${topic.diagram.parentText}의 기능적 불균형과 자율신경계 과흥분</strong>을 안정시키는 근본적인 두뇌-신체 통합 치유에 있습니다.<br>
    분당 해아림한의원에서는 뇌파 검사 및 체질별 맞춤 한약과 침구 요법을 통해 내 몸이 스스로 균형을 유지할 수 있도록 돕습니다.
  </p>
</div>

## 1. 분당 지역 환자분들이 겪으시는 주요 증상과 고민

${topic.summary}

많은 환자분들께서 초기 증상을 단순 피로나 일시적인 현상으로 넘기시다가 증상이 만성화된 후 내원하십니다.

---

## 2. 신경학적 발생 원인 및 신경계 시스템 분석

<div class="diagram-compare-container">
<div class="diagram-compare-title">
<i class="ph-bold ph-scales"></i> ${topic.category_name} 신경계 시스템 조절 메커니즘
</div>
<div class="diagram-compare-grid">
<!-- 원인 상태 카드 -->
<div class="diagram-card sympathetic">
<div class="card-header">
<div class="card-icon"><i class="ph-bold ph-warning-circle"></i></div>
<div>
<h4 class="card-title">${topic.diagram.leftText}</h4>
<span class="card-tag tag-sym">불균형 상태</span>
</div>
</div>
<ul class="card-points">
<li><strong>신경계 과흥분:</strong> 뇌 자율신경 불균형으로 인한 신체 증상 지속</li>
<li><strong>스트레스 저항도 저하:</strong> 사소한 자극에도 쉽게 증상이 발현</li>
</ul>
</div>

<!-- 치유 상태 카드 -->
<div class="diagram-card parasympathetic">
<div class="card-header">
<div class="card-icon"><i class="ph-bold ph-shield-check"></i></div>
<div>
<h4 class="card-title">${topic.diagram.rightText}</h4>
<span class="card-tag tag-para">균형 회복</span>
</div>
</div>
<ul class="card-points">
<li><strong>두뇌 안정화:</strong> 뇌파 및 신경전달물질의 자연스러운 균형 회복</li>
<li><strong>전신 기혈 순환:</strong> 체질에 맞춘 맞춤 한방 치료로 재발 방지</li>
</ul>
</div>
</div>
</div>

---

## 3. 분당 해아림한의원의 맞춤 한방 치유 솔루션

1. **정밀 두뇌 및 자율신경 진단:** 뇌파(EEG) 검사 및 신경 기능 평가를 통한 객관적 원인 분석
2. **청뇌(淸腦)·안신(安心) 맞춤 한약:** 뇌 신경 세포의 피로를 덜어주고 자율신경을 조절하는 개인별 탕약 처방
3. **심신 안정 침구 요법:** 기혈 순환을 촉진하고 신체 긴장을 이완시키는 비침습 맞춤 치료

---

## 4. 대표원장 진료 소견

몸과 마음은 서로 긴밀하게 연결되어 있습니다. 증상 너머의 근본 원인을 살피고 환자 한 분 한 분의 건강한 일상 회복을 위해 정성을 다해 진료하겠습니다.
`;
}

console.log('Daily Column Auto Publisher module loaded.');
module.exports = { TOPICS, generateThumbnail, generateMarkdown };
