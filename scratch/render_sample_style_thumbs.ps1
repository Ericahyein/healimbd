
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

    $width = 800
    $height = 800
    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # 1. Draw Background Image
    if (Test-Path $bgImagePath) {
        $bg = [System.Drawing.Image]::FromFile((Resolve-Path $bgImagePath).Path)
        $g.DrawImage($bg, 0, 0, $width, $height)
        $bg.Dispose()
    } else {
        $darkBrush = New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml("#1E293B"))
        $g.FillRectangle($darkBrush, 0, 0, $width, $height)
    }

    # 2. Dark Vignette / Contrast Overlay
    $dimBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(110, 0, 0, 0))
    $g.FillRectangle($dimBrush, 0, 0, $width, $height)

    # 3. Inner Neon Green Border (as in user sample image)
    $borderPen = New-Object System.Drawing.Pen([System.Drawing.ColorTranslator]::FromHtml("#00E676"), 4)
    $borderRect = New-Object System.Drawing.Rectangle(20, 20, $width - 40, $height - 40)
    $g.DrawRectangle($borderPen, $borderRect)

    # Helper function to draw text with heavy black stroke / shadow
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

        $rect = New-Object System.Drawing.RectangleF(0, $yCenter - 50, $width, 100)

        # Draw drop shadow
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $path.AddString($text, $font.FontFamily, [int]$font.Style, $fontSize * 1.333, $rect, $sf)
        
        # Shadow offset
        $shadowMatrix = New-Object System.Drawing.Drawing2D.Matrix
        $shadowMatrix.Translate(4, 4)
        $shadowPath = $path.Clone()
        $shadowPath.Transform($shadowMatrix)
        $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(180, 0, 0, 0))
        $g.FillPath($shadowBrush, $shadowPath)

        # Outer Stroke
        $g.DrawPath($strokePen, $path)
        # Inner Fill
        $g.FillPath($fillBrush, $path)

        $path.Dispose()
        $shadowPath.Dispose()
    }

    # 4. Draw 3 Lines of Text (Matching User Sample media_1788161716679.png)
    # Line 1: Bright Yellow (#FFE600)
    Draw-Outlined-Text -text $line1Text -fontSize 46 -colorHex "#FFEA00" -yCenter 260

    # Line 2: Crisp White (#FFFFFF)
    Draw-Outlined-Text -text $line2Text -fontSize 52 -colorHex "#FFFFFF" -yCenter 370

    # Line 3: Vibrant Neon Green (#00E676)
    Draw-Outlined-Text -text $line3Text -fontSize 56 -colorHex "#00FF66" -yCenter 485

    # 5. Composite Official Healim Logo on Bottom Right
    if (Test-Path $logoPath) {
        $logoBmp = [System.Drawing.Image]::FromFile((Resolve-Path $logoPath).Path)
        $logoW = 180
        $logoH = [int]($logoBmp.Height * ($logoW / $logoBmp.Width))
        $logoX = $width - $logoW - 40
        $logoY = $height - $logoH - 35
        $g.DrawImage($logoBmp, $logoX, $logoY, $logoW, $logoH)
        $logoBmp.Dispose()
    }

    # Save Bitmap
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Successfully generated: $outputPath"
}

# Generate all 4 thumbnails strictly in sample style
# 1. Panic
Create-Thumbnail-Sample-Style `
    -bgImagePath "static/images/clinics/clinic-panic.jpg"     -outputPath "static/images/blog/column-01-panic-bundang.jpg"     -line1Text "가슴 두근거림"     -line2Text "호흡곤란·불안감"     -line3Text "분당 공황장애"

# 2. Autonomic
Create-Thumbnail-Sample-Style `
    -bgImagePath "static/images/clinics/clinic-autonomic.jpg"     -outputPath "static/images/blog/column-02-autonomic-bundang.jpg"     -line1Text "원인모를"     -line2Text "어지럼증, 소화불량"     -line3Text "분당 자율신경실조증"

# 3. Tic
Create-Thumbnail-Sample-Style `
    -bgImagePath "static/images/clinics/clinic-tic.jpg"     -outputPath "static/images/blog/column-03-tic-pangyo.jpg"     -line1Text "눈 깜빡임·음음 소리"     -line2Text "참지 못하는 헛기침"     -line3Text "판교 틱장애"

# 4. Sleep
Create-Thumbnail-Sample-Style `
    -bgImagePath "static/images/clinics/clinic-sleep.jpg"     -outputPath "static/images/blog/column-04-sleep-suji.jpg"     -line1Text "밤마다 뒤척이고"     -line2Text "새벽에 자꾸 깨는"     -line3Text "수지 불면증"
