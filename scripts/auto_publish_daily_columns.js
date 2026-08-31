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

// 2. Disease Topic Library with 3-line Hook Text for Thumbnails
const DISEASE_TEMPLATES = [
  {
    disease: '공황장애',
    category: 'panic',
    category_name: '공황·불안',
    bgImage: 'static/images/clinics/clinic-panic.jpg',
    line1: '가슴 두근거림',
    line2: '호흡곤란·불안감',
    titleSuffix: '갑작스러운 가슴 답답함과 숨막힘, 뇌 신경계의 경보 오류 바로잡기',
    summary: '일상생활 중 갑자기 발생하는 가슴 두근거림, 호흡곤란, 어지럼증. 심장 이상이 아닌 뇌 편도체(Amygdala)의 과도한 공포 반응을 가라앉히는 맞춤 한방 치료법을 안내합니다.',
    hashtags: ['공황장애', '공황발작', '자율신경실조증', '불안장애치료', '한의원']
  },
  {
    disease: '자율신경실조증',
    category: 'autonomic',
    category_name: '자율신경',
    bgImage: 'static/images/clinics/clinic-autonomic.jpg',
    line1: '원인모를',
    line2: '어지럼증, 소화불량',
    titleSuffix: '원인 모를 어지럼증·가슴답답함·소화불량, 교감신경 불균형 바로잡기',
    summary: '종합병원 여러 과를 다녀도 원인을 찾지 못하는 만성 피로, 어지럼증, 두근거림, 상열감. 자율신경계(교감·부교감) 불균형의 근본 원인과 한방 치유 원리를 설명합니다.',
    hashtags: ['자율신경실조증', '자율신경한의원', '어지럼증치료', '교감신경항진', '만성피로회복']
  },
  {
    disease: '틱장애',
    category: 'tic-adhd',
    category_name: '틱장애·소아신경',
    bgImage: 'static/images/clinics/clinic-tic.jpg',
    line1: '눈 깜빡임·음음 소리',
    line2: '참지 못하는 헛기침',
    titleSuffix: '눈 깜빡임·음음 소리, 억지로 참게 하면 안 되는 이유와 두뇌 밸런스 치료법',
    summary: '아이의 틱 증상(눈 깜빡임, 헛기침, 음음 소리), 혼내거나 지적하면 왜 더 악화될까요? 두뇌 기저핵의 미성숙과 신경계 과흥분을 다스리는 맞춤 한방 치료 원리를 소개합니다.',
    hashtags: ['틱장애', '소아신경한의원', '소아틱치료', '음성틱운동틱', '두뇌밸런스']
  },
  {
    disease: '불면증',
    category: 'sleep',
    category_name: '수면·불면증',
    bgImage: 'static/images/clinics/clinic-sleep.jpg',
    line1: '밤마다 뒤척이고',
    line2: '새벽에 자꾸 깨는',
    titleSuffix: '밤마다 뒤척이는 뇌의 과각성 상태, 수면제 의존 없이 자연 수면 리듬 되찾기',
    summary: '잠들기까지 30분 이상 걸리고, 자다가 수시로 깨며, 아침에 일어나도 피로가 풀리지 않는 만성 불면증. 뇌 신경계의 과각성을 진정시키고 자연 수면 리듬을 회복하는 한방 치료법을 안내합니다.',
    hashtags: ['불면증', '수면장애한의원', '불면증극복', '수면제부작용극복', '만성피로회복']
  },
  {
    disease: 'ADHD',
    category: 'tic-adhd',
    category_name: 'ADHD·집중력',
    bgImage: 'static/images/clinics/clinic-adhd.jpg',
    line1: '산만하고 충동적인',
    line2: '집중하기 힘든 아이',
    titleSuffix: '산만하고 충동적인 아이, 훈육보다 전두엽 실행기능 강화가 먼저인 이유',
    summary: '주의가 산만하고 충동 조절이 어려운 소아 및 성인 ADHD. 전두엽 뇌기능 미성숙과 도파민 불균형을 다스리는 맞춤 한방 치료법을 안내합니다.',
    hashtags: ['ADHD', '소아신경', '성인ADHD치료', '집중력향상', '두뇌훈련']
  },
  {
    disease: '다한증',
    category: 'hyperhidrosis',
    category_name: '다한증',
    bgImage: 'static/images/clinics/clinic-hyperhidrosis.jpg',
    line1: '긴장하면 쏟아지는',
    line2: '손발 땀·겨드랑이 땀',
    titleSuffix: '긴장할 때마다 쏟아지는 손발 땀, 교감신경 과민과 자율신경 조절로 극복하기',
    summary: '사계절 내내 축축한 손발, 겨드랑이 땀과 보상성 다한증 걱정. 교감신경계의 과도한 흥분을 진정시키고 수승화강을 이루는 한방 다한증 치료 원리를 설명합니다.',
    hashtags: ['다한증', '수족다한증', '손땀치료', '교감신경항진', '체질개선']
  },
  {
    disease: '과민성대장증후군',
    category: 'ibs',
    category_name: '과민성대장',
    bgImage: 'static/images/clinics/clinic-ibs.jpg',
    line1: '긴장만 하면 배 아프고',
    line2: '수시로 화장실 직행',
    titleSuffix: '긴장만 하면 화장실 직행, 장-뇌 축(Gut-Brain Axis) 불균형 치료법',
    summary: '출근길, 시험 전, 미팅 직전 갑작스러운 복통과 잦은 가스·설사. 장과 뇌의 신경망 연결고리를 바로잡아 장 신경계를 안정시키는 맞춤 솔루션입니다.',
    hashtags: ['과민성대장증후군', '장질환한의원', '복통설사치료', '장뇌축치료', '위장질환']
  },
  {
    disease: '두통·어지럼증',
    category: 'headache',
    category_name: '두통·어지럼',
    bgImage: 'static/images/clinics/clinic-anxiety.jpg',
    line1: '검사상 정상인데',
    line2: '지속되는 두통·어지럼',
    titleSuffix: '검사상 정상인데 지속되는 편두통과 멍함(브레인포그), 뇌혈류 개선 한방치료',
    summary: '진통제를 먹어도 반복되는 욱신거리는 편두통, 핑 도는 어지럼증. 뇌 주변 근육 긴장과 경동맥 뇌혈류 순환 장애를 해결하는 정밀 한방 치료 원리를 소개합니다.',
    hashtags: ['두통', '어지럼증한의원', '편두통치료', '브레인포그극복', '뇌혈류개선']
  }
];

// Helper to generate exact sample-style thumbnail
function generateSampleThumbnail(bgImage, outputPath, line1, line2, line3RegionDisease) {
  const psScript = `
Add-Type -AssemblyName System.Drawing

[int]$w = 800
[int]$h = 800
$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# 1. Background Photo
if (Test-Path "${bgImage}") {
    $bg = [System.Drawing.Image]::FromFile((Resolve-Path "${bgImage}").Path)
    $g.DrawImage($bg, 0, 0, $w, $h)
    $bg.Dispose()
} else {
    $darkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#1E293B"))
    $g.FillRectangle($darkBrush, 0, 0, $w, $h)
}

# 2. Dark Overlay
$dimBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(100, 0, 0, 0))
$g.FillRectangle($dimBrush, 0, 0, $w, $h)

# 3. Inner Neon Green Border
$borderPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#00FF66"), 4)
$g.DrawRectangle($borderPen, 18, 18, 764, 764)

function Draw-Outlined-Text {
    param ([string]$text, [float]$fontSize, [string]$colorHex, [float]$yCenter)
    $font = New-Object System.Drawing.Font("Malgun Gothic", $fontSize, [System.Drawing.FontStyle]::Bold)
    $fillBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($colorHex))
    $strokePen = New-Object System.Drawing.Pen([System.Drawing.Color]::Black, 8)
    $strokePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $rect = New-Object System.Drawing.RectangleF(0.0, $yCenter - 50.0, 800.0, 100.0)

    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddString($text, $font.FontFamily, [int][System.Drawing.FontStyle]::Bold, $fontSize * 1.333333, $rect, $sf)

    $shadowMatrix = New-Object System.Drawing.Drawing2D.Matrix
    $shadowMatrix.Translate(4.0, 4.0)
    $shadowPath = $path.Clone()
    $shadowPath.Transform($shadowMatrix)
    $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 0, 0, 0))
    $g.FillPath($shadowBrush, $shadowPath)

    $g.DrawPath($strokePen, $path)
    $g.FillPath($fillBrush, $path)

    $path.Dispose()
    $shadowPath.Dispose()
    $shadowMatrix.Dispose()
    $font.Dispose()
    $fillBrush.Dispose()
    $strokePen.Dispose()
}

# 3 Lines: Yellow, White, Neon Green
Draw-Outlined-Text -text "${line1}" -fontSize 46.0 -colorHex "#FFEA00" -yCenter 255.0
Draw-Outlined-Text -text "${line2}" -fontSize 52.0 -colorHex "#FFFFFF" -yCenter 365.0
Draw-Outlined-Text -text "${line3RegionDisease}" -fontSize 56.0 -colorHex "#00FF66" -yCenter 480.0

# 4. Healim Official Logo on Bottom Right
$logoPath = "static/images/healim-logo-white-text.png"
if (Test-Path $logoPath) {
    $logoBmp = [System.Drawing.Image]::FromFile((Resolve-Path $logoPath).Path)
    $logoW = 185
    $logoH = [int]($logoBmp.Height * ($logoW / $logoBmp.Width))
    $logoX = 800 - $logoW - 35
    $logoY = 800 - $logoH - 30
    $g.DrawImage($logoBmp, $logoX, $logoY, $logoW, $logoH)
    $logoBmp.Dispose()
}

$bmp.Save("${outputPath}", [System.Drawing.Imaging.ImageFormat]::Jpeg)
$g.Dispose()
$bmp.Dispose()
`;

  const scriptPath = path.join(__dirname, `temp_thumb_${Date.now()}.ps1`);
  fs.writeFileSync(scriptPath, '\ufeff' + psScript, 'utf-8');
  execSync(`powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}"`, { encoding: 'utf-8' });
  fs.unlinkSync(scriptPath);
}

module.exports = { TARGET_REGIONS, DISEASE_TEMPLATES, generateSampleThumbnail };
