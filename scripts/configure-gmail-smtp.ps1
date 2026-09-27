param(
    [string]$EmailAddress = 'coolabschool@gmail.com',
    [string]$SenderName = 'Coolab School',
    [string]$PublicBaseUrl = 'https://localhost:7103'
)

$ErrorActionPreference = 'Stop'
$projectPath = 'D:\CoolabSchoolApi\CoolabSchool\CoolabSchool'
$settingsPath = Join-Path $projectPath 'appsettings.Local.json'

if (-not (Test-Path (Join-Path $projectPath 'CoolabSchool.csproj'))) {
    throw "Backend project tapılmadı: $projectPath"
}

Write-Host 'Coolab School e-poçt göndərişini quraşdırırıq.' -ForegroundColor Cyan
Write-Host 'Google-un verdiyi 16 simvolun hamısını Ctrl+V ilə yapışdırın; özünüz * yazmayın.' -ForegroundColor Yellow

$appPassword = $null
for ($attempt = 1; $attempt -le 3; $attempt++) {
    $securePassword = Read-Host 'Google App Password' -AsSecureString
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

    try {
        $candidate = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
        $candidate = $candidate -replace '\s', ''
    }
    finally {
        if ($passwordPointer -ne [IntPtr]::Zero) {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
        }
    }

    if ($candidate -cmatch '^[A-Za-z0-9]{16}$') {
        $appPassword = $candidate
        break
    }

    Write-Host "Daxil edilən parol $($candidate.Length) simvoldur. Google App Password 16 hərf/rəqəm olmalıdır. Heç nə saxlanmadı." -ForegroundColor Red
}

if ($null -eq $appPassword) {
    throw '3 cəhddən sonra quraşdırma dayandırıldı. Google App Password-u yenidən yaradıb tam kopyalayın.'
}

try {

    $settings = if (Test-Path $settingsPath) {
        Get-Content -LiteralPath $settingsPath -Raw | ConvertFrom-Json
    }
    else {
        [pscustomobject]@{}
    }

    $emailSettings = [pscustomobject][ordered]@{
        Host = 'smtp.gmail.com'
        Port = 587
        UseSsl = $true
        UserName = $EmailAddress
        Password = $appPassword
        FromAddress = $EmailAddress
        FromName = $SenderName
        PublicBaseUrl = $PublicBaseUrl
    }
    $settings | Add-Member -MemberType NoteProperty -Name Email -Value $emailSettings -Force
    $settings | ConvertTo-Json -Depth 12 | Set-Content -LiteralPath $settingsPath -Encoding utf8

    Write-Host ''
    Write-Host 'Hazırdır. E-poçt ayarları yalnız appsettings.Local.json faylında saxlanır və Git-ə yazılmır.' -ForegroundColor Green
    Write-Host 'İndi Visual Studio-da tətbiqi dayandırıb (Shift+F5) yenidən F5 ilə başladın.' -ForegroundColor Green
}
finally {
    $appPassword = $null
}
