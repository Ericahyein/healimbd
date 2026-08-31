const fs = require('fs');
const { execSync } = require('child_process');

const psScript = `
Add-Type -AssemblyName System.Drawing

function Create-Thumbnail-Sample-Style {
    param (
        [string]$bgImagePath,
        [string]$outputPath,
        [string]$line1Text,
        [string]$line2Text,
        [string]$line3Text,
        [string]$logoPath = "static/images/healim-logo-white-text.png"
    )

    [int]$w = 800
    [int]$h = 800
    $bmp = New-Object System.Drawing.Bitmap($w, $h)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # 1. Draw Background Image
    if (Test-Path $bgImagePath) {
        $bg = [System.Drawing.Image]::FromFile((Resolve-Path $bgImagePath).Path)
        $g.DrawImage($bg, 0, 0, $w, $h)
        $bg.Dispose()
    } else {
        $darkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#1E293B"))
        $g.FillRectangle($darkBrush, 0, 0, $w, $h)
    }

    # 2. Dark Vignette / Contrast Overlay
    $dimBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(100, 0, 0, 0))
    $g.FillRectangle($dimBrush, 0, 0, $w, $h)

    # 3. Inner Neon Green Border (Exact match to sample media_1788161716679.png)
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#00FF66"), 4)
    $g.DrawRectangle($borderPen, 18, 18, 764, 764)

    # Helper function to draw outlined 3D text
    function Draw-Outlined-Text {
        param (
            [string]$text,
            [float]$fontSize,
            [string]$colorHex,
            [float]$yCenter
        )

        $font = New-Object System.Drawing.Font("Malgun Gothic", $fontSize, [System.Drawing.FontStyle]::Bold)
        $fillBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml($colorHex))
        $strokePen = New-Object System.Drawing.Pen([System.Drawing.Color]::Black, 8)
        $strokePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

        $sf = New-Object System.Drawing.StringFormat
        $sf.Alignment = [System.Drawing.StringAlignment]::Center
        $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

        [float]$rectY = $yCenter - 50.0
        $rect = New-Object System.Drawing.RectangleF(0.0, $rectY, 800.0, 100.0)

        # Draw path for outline
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        [int]$style = [int][System.Drawing.FontStyle]::Bold
        [float]$emSize = $fontSize * 1.333333
        $path.AddString($text, $font.FontFamily, $style, $emSize, $rect, $sf)
        
        # Shadow offset
        $shadowMatrix = New-Object System.Drawing.Drawing2D.Matrix
        $shadowMatrix.Translate(4.0, 4.0)
        $shadowPath = $path.Clone()
        $shadowPath.Transform($shadowMatrix)
        $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 0, 0, 0))
        $g.FillPath($shadowBrush, $shadowPath)

        # Outer Stroke
        $g.DrawPath($strokePen, $path)
        # Inner Fill
        $g.FillPath($fillBrush, $path)

        $path.Dispose()
        $shadowPath.Dispose()
        $shadowMatrix.Dispose()
        $font.Dispose()
        $fillBrush.Dispose()
        $strokePen.Dispose()
    }

    # 4. Draw 3 Lines of Text
    # Line 1: Bright Yellow
    Draw-Outlined-Text -text $line1Text -fontSize 46.0 -colorHex "#FFEA00" -yCenter 255.0

    # Line 2: Crisp White
    Draw-Outlined-Text -text $line2Text -fontSize 52.0 -colorHex "#FFFFFF" -yCenter 365.0

    # Line 3: Vibrant Neon Green
    Draw-Outlined-Text -text $line3Text -fontSize 56.0 -colorHex "#00FF66" -yCenter 480.0

    # 5. Composite Official Healim Logo on Bottom Right
    if (Test-Path $logoPath) {
        $logoBmp = [System.Drawing.Image]::FromFile((Resolve-Path $logoPath).Path)
        $logoW = 185
        $logoH = [int]($logoBmp.Height * ($logoW / $logoBmp.Width))
        $logoX = 800 - $logoW - 35
        $logoY = 800 - $logoH - 30
        $g.DrawImage($logoBmp, $logoX, $logoY, $logoW, $logoH)
        $logoBmp.Dispose()
    }

    # Save Bitmap
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Successfully generated: $outputPath"
}

# 1. Panic (분당 공황장애)
Create-Thumbnail-Sample-Style \`
    -bgImagePath "static/images/clinics/clinic-panic.jpg" \
    -outputPath "static/images/blog/column-01-panic-bundang.jpg" \
    -line1Text "가슴 두근거림" \
    -line2Text "호흡곤란·불안감" \
    -line3Text "분당 공황장애"

# 2. Autonomic (분당 자율신경실조증)
Create-Thumbnail-Sample-Style \`
    -bgImagePath "static/images/clinics/clinic-autonomic.jpg" \
    -outputPath "static/images/blog/column-02-autonomic-bundang.jpg" \
    -line1Text "원인모를" \
    -line2Text "어지럼증, 소화불량" \
    -line3Text "분당 자율신경실조증"

# 3. Tic (판교 틱장애)
Create-Thumbnail-Sample-Style \`
    -bgImagePath "static/images/clinics/clinic-tic.jpg" \
    -outputPath "static/images/blog/column-03-tic-pangyo.jpg" \
    -line1Text "눈 깜빡임·음음 소리" \
    -line2Text "참지 못하는 헛기침" \
    -line3Text "판교 틱장애"

# Also save bundang-tic for backward link compatibility
Create-Thumbnail-Sample-Style \`
    -bgImagePath "static/images/clinics/clinic-tic.jpg" \
    -outputPath "static/images/blog/column-03-tic-bundang.jpg" \
    -line1Text "눈 깜빡임·음음 소리" \
    -line2Text "참지 못하는 헛기침" \
    -line3Text "판교 틱장애"

# 4. Sleep (수지 불면증)
Create-Thumbnail-Sample-Style \`
    -bgImagePath "static/images/clinics/clinic-sleep.jpg" \
    -outputPath "static/images/blog/column-04-sleep-suji.jpg" \
    -line1Text "밤마다 뒤척이고" \
    -line2Text "새벽에 자꾸 깨는" \
    -line3Text "수지 불면증"

# Also save bundang-sleep for backward link compatibility
Create-Thumbnail-Sample-Style \`
    -bgImagePath "static/images/clinics/clinic-sleep.jpg" \
    -outputPath "static/images/blog/column-04-sleep-bundang.jpg" \
    -line1Text "밤마다 뒤척이고" \
    -line2Text "새벽에 자꾸 깨는" \
    -line3Text "수지 불면증"
`;

fs.writeFileSync('scratch/render_clean_sample_thumbs.ps1', '\ufeff' + psScript, 'utf-8');
console.log('Saved scratch/render_clean_sample_thumbs.ps1');
try {
  const out = execSync('powershell.exe -ExecutionPolicy Bypass -File scratch/render_clean_sample_thumbs.ps1', { encoding: 'utf-8' });
  console.log(out);
} catch (e) {
  console.error('Error:', e.stdout || e.message);
}
