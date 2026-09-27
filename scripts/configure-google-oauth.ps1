param(
    [string]$LocalRedirectUri = 'https://localhost:7103/signin-google',
    [string]$ProductionRedirectUri = 'https://coolabschool.az/signin-google'
)

$ErrorActionPreference = 'Stop'
$projectPath = 'D:\CoolabSchoolApi\CoolabSchool\CoolabSchool'

if (-not (Test-Path (Join-Path $projectPath 'CoolabSchool.csproj'))) {
    throw "Backend project tapılmadı: $projectPath"
}

Write-Host 'Coolab School Google ilə giriş ayarları.' -ForegroundColor Cyan
Write-Host 'Google Cloud Console-dan aldığınız OAuth Client ID-ni daxil edin.' -ForegroundColor Yellow
$clientId = Read-Host 'Google Client ID'

if ([string]::IsNullOrWhiteSpace($clientId)) {
    throw 'Google Client ID boş ola bilməz.'
}

$clientId = $clientId.Trim()
if ($clientId -notmatch '\.apps\.googleusercontent\.com$') {
    throw 'Google Client ID düzgün görünmür. Console-dakı tam Client ID-ni kopyalayın; o .apps.googleusercontent.com ilə bitir.'
}

Write-Host 'Google Client Secret-i yapışdırın. Yazarkən ekranda görünməyəcək.' -ForegroundColor Yellow
$secureSecret = Read-Host 'Google Client Secret' -AsSecureString
$secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureSecret)

try {
    $clientSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)

    if ([string]::IsNullOrWhiteSpace($clientSecret)) {
        throw 'Google Client Secret boş ola bilməz.'
    }

    $clientSecret = $clientSecret.Trim()
    if ($clientSecret.Length -lt 16) {
        throw 'Google Client Secret düzgün görünmür. Console-dakı tam Client Secret-i kopyalayın.'
    }

    Push-Location $projectPath
    try {
        dotnet user-secrets set 'Authentication:Google:ClientId' $clientId
        dotnet user-secrets set 'Authentication:Google:ClientSecret' $clientSecret
    }
    finally {
        Pop-Location
    }

    Write-Host ''
    Write-Host 'Hazırdır. Client Secret layihə fayllarına və Git-ə yazılmadı.' -ForegroundColor Green
    Write-Host 'Google Cloud Console-da bu Redirect URI-lərin əlavə edildiyini yoxlayın:' -ForegroundColor Green
    Write-Host " - $LocalRedirectUri"
    Write-Host " - $ProductionRedirectUri"
    Write-Host 'Sonra Visual Studio-da tətbiqi dayandırıb (Shift+F5) F5 ilə yenidən başladın.' -ForegroundColor Green
}
finally {
    if ($secretPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
    }
}
