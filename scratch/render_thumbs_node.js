const fs = require('fs');
const { execSync } = require('child_process');

const psCode = `
Add-Type -AssemblyName System.Drawing

function Create-Diagram-Thumbnail {
    param (
        [string]$outputPath,
        [string]$categoryTag,
        [string]$mainTitle,
        [string]$subTitle,
        [string]$parentBoxText,
        [string]$parentBoxSub,
        [string]$leftBoxText,
        [string]$leftBoxSub,
        [string]$rightBoxText,
        [string]$rightBoxSub,
        [string]$themeColorLeft,
        [string]$themeColorRight
    )

    $width = 800
    $height = 800
    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # 1. Background Gradient
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point(0, 0)),
        (New-Object System.Drawing.Point(0, $height)),
        ([System.Drawing.ColorTranslator]::FromHtml("#0A192F")),
        ([System.Drawing.ColorTranslator]::FromHtml("#172A45"))
    )
    $g.FillRectangle($bgBrush, 0, 0, $width, $height)

    # 2. Subtle grid or decorative circles
    $circlePen = New-Object System.Drawing.Pen(([System.Drawing.Color]::FromArgb(20, 255, 255, 255)), 1)
    $g.DrawEllipse($circlePen, -100, -100, 400, 400)
    $g.DrawEllipse($circlePen, 500, 400, 500, 500)

    # 3. Top Category Tag Pill
    $pillBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#006B70"))
    $pillRect = New-Object System.Drawing.Rectangle(60, 60, 250, 42)
    $g.FillRectangle($pillBrush, $pillRect)
    
    $tagFont = New-Object System.Drawing.Font("Malgun Gothic", 13, [System.Drawing.FontStyle]::Bold)
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $sfCenter = New-Object System.Drawing.StringFormat
    $sfCenter.Alignment = [System.Drawing.StringAlignment]::Center
    $sfCenter.LineAlignment = [System.Drawing.StringAlignment]::Center
    $g.DrawString($categoryTag, $tagFont, $whiteBrush, [System.Drawing.RectangleF]$pillRect, $sfCenter)

    # 4. Main Title & Subtitle
    $titleFont = New-Object System.Drawing.Font("Malgun Gothic", 26, [System.Drawing.FontStyle]::Bold)
    $subFont = New-Object System.Drawing.Font("Malgun Gothic", 14, [System.Drawing.FontStyle]::Regular)
    $lightGrayBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#94A3B8"))

    $g.DrawString($mainTitle, $titleFont, $whiteBrush, 60, 120)
    $g.DrawString($subTitle, $subFont, $lightGrayBrush, 60, 180)

    # 5. Diagram Box Container
    $containerBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(40, 255, 255, 255))
    $containerPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(80, 255, 255, 255), 1.5)
    $containerRect = New-Object System.Drawing.Rectangle(50, 230, 700, 420)
    $g.FillRectangle($containerBrush, $containerRect)
    $g.DrawRectangle($containerPen, $containerRect)

    # 5a. Top Parent Box
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
    $g.DrawString($parentBoxText, $pTitleFont, $whiteBrush, [System.Drawing.RectangleF]$pTitleRect, $sfCenter)
    $g.DrawString($parentBoxSub, $pSubFont, $cyanBrush, [System.Drawing.RectangleF]$pSubRect, $sfCenter)

    # 5b. Connecting Lines & Arrows
    $linePen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#94A3B8"), 2)
    $g.DrawLine($linePen, 400, 345, 400, 385)
    $g.DrawLine($linePen, 230, 385, 570, 385)
    $g.DrawLine($linePen, 230, 385, 230, 420)
    $g.DrawLine($linePen, 570, 385, 570, 420)

    # Left Arrow head
    $arrowLeft = @(
        (New-Object System.Drawing.Point(225, 415)),
        (New-Object System.Drawing.Point(235, 415)),
        (New-Object System.Drawing.Point(230, 425))
    )
    $g.FillPolygon($whiteBrush, $arrowLeft)

    # Right Arrow head
    $arrowRight = @(
        (New-Object System.Drawing.Point(565, 415)),
        (New-Object System.Drawing.Point(575, 415)),
        (New-Object System.Drawing.Point(570, 425))
    )
    $g.FillPolygon($whiteBrush, $arrowRight)

    # 5c. Left Child Box
    $leftBoxBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#1E293B"))
    $leftBoxPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml($themeColorLeft), 2)
    $leftRect = New-Object System.Drawing.Rectangle(80, 425, 300, 185)
    $g.FillRectangle($leftBoxBrush, $leftRect)
    $g.DrawRectangle($leftBoxPen, $leftRect)

    $boxTitleFont = New-Object System.Drawing.Font("Malgun Gothic", 15, [System.Drawing.FontStyle]::Bold)
    $boxDescFont = New-Object System.Drawing.Font("Malgun Gothic", 12, [System.Drawing.FontStyle]::Regular)
    $leftColorBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($themeColorLeft))

    $lTitleRect = New-Object System.Drawing.Rectangle(80, 445, 300, 30)
    $g.DrawString($leftBoxText, $boxTitleFont, $leftColorBrush, [System.Drawing.RectangleF]$lTitleRect, $sfCenter)

    $lDescRect = New-Object System.Drawing.Rectangle(95, 490, 270, 110)
    $sfDesc = New-Object System.Drawing.StringFormat
    $sfDesc.Alignment = [System.Drawing.StringAlignment]::Center
    $g.DrawString($leftBoxSub, $boxDescFont, $whiteBrush, [System.Drawing.RectangleF]$lDescRect, $sfDesc)

    # 5d. Right Child Box
    $rightBoxBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#1E293B"))
    $rightBoxPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml($themeColorRight), 2)
    $rightRect = New-Object System.Drawing.Rectangle(420, 425, 300, 185)
    $g.FillRectangle($rightBoxBrush, $rightRect)
    $g.DrawRectangle($rightBoxPen, $rightRect)

    $rightColorBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($themeColorRight))
    $rTitleRect = New-Object System.Drawing.Rectangle(420, 445, 300, 30)
    $g.DrawString($rightBoxText, $boxTitleFont, $rightColorBrush, [System.Drawing.RectangleF]$rTitleRect, $sfCenter)

    $rDescRect = New-Object System.Drawing.Rectangle(435, 490, 270, 110)
    $g.DrawString($rightBoxSub, $boxDescFont, $whiteBrush, [System.Drawing.RectangleF]$rDescRect, $sfDesc)

    # 6. Composite Official Healim Logo on Bottom Right
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

    # Save Bitmap
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Successfully created $outputPath"
}

# 1. Generate Column 3: Tic Disorder
Create-Diagram-Thumbnail \`
    -outputPath "static/images/blog/column-03-tic-bundang.jpg" \
    -categoryTag "분당 틱장애·소아신경" \
    -mainTitle "분당 틱장애 원인과 치료법" \
    -subTitle "눈 깜빡임·음음 소리, 억지로 참게 하면 안 되는 이유" \
    -parentBoxText "두뇌 기저핵 (Basal Ganglia)" \
    -parentBoxSub "운동 제어 및 불필요한 신호 필터링 중추" \
    -leftBoxText "기저핵 기능 미성숙" \
    -leftBoxSub "불필요한 동작 억제 실패\`n\`n▶ 눈 깜빡임·고개 털기\`n▶ 킁킁·음음 음성틱 발생" \
    -rightBoxText "해아림 두뇌 밸런스 케어" \
    -rightBoxSub "뇌 신경계 흥분 안정\`n\`n▶ 뇌파·체질 맞춤 한약\`n▶ 자율신경 조절 & 침구치료" \
    -themeColorLeft "#F87171" \
    -themeColorRight "#2DD4BF"

# 2. Generate Column 4: Sleep / Insomnia
Create-Diagram-Thumbnail \`
    -outputPath "static/images/blog/column-04-sleep-bundang.jpg" \
    -categoryTag "분당 불면증·수면클리닉" \
    -mainTitle "분당 불면증 원인과 회복" \
    -subTitle "밤마다 뒤척이는 뇌의 과각성, 자연 수면 리듬 되찾기" \
    -parentBoxText "수면 조절 중추 (Sleep Center)" \
    -parentBoxSub "시상하부 및 멜라토닌 분비 조절 시스템" \
    -leftBoxText "뇌 신경계 과각성 상태" \
    -leftBoxSub "교감신경 항진·긴장 지속\`n\`n▶ 30분 이상 입면 장애\`n▶ 수면 유지 장애·조기 각성" \
    -rightBoxText "해아림 안심(安心) 수면치료" \
    -rightBoxSub "뇌 과열 진정·기혈 순환\`n\`n▶ 수면유도 맞춤 한약\`n▶ 심신 안정 침구 & 생활요법" \
    -themeColorLeft "#FB923C" \
    -themeColorRight "#38BDF8"
`;

fs.writeFileSync('scratch/gen_thumbs.ps1', '\ufeff' + psCode, 'utf-8');
console.log('Saved scratch/gen_thumbs.ps1 with UTF-8 BOM');
try {
  const res = execSync('powershell.exe -ExecutionPolicy Bypass -File scratch/gen_thumbs.ps1', { encoding: 'utf-8' });
  console.log(res);
} catch (e) {
  console.error('Error running script:', e.stdout || e.message);
}
