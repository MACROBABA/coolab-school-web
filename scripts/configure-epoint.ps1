param(
    [string]$ApiBaseUrl = "https://epoint.az/api/1"
)

$ErrorActionPreference = "Stop"
$backendProject = "D:\CoolabSchoolApi\CoolabSchool\CoolabSchool"

if (-not (Test-Path (Join-Path $backendProject "CoolabSchool.csproj"))) {
    throw "CoolabSchool backend layihəsi tapılmadı: $backendProject"
}

Write-Host "Coolab School Epoint ödəniş qapısı sazlaması" -ForegroundColor Cyan
$publicKey = Read-Host "Epoint Public Key (tacir identifikatoru)"
$privateKey = Read-Host "Epoint Private Key (gizli API açarı)" -AsSecureString
$publicBaseUrl = Read-Host "Saytın canlı HTTPS ünvanı (məsələn https://coolabschool.az)"

if ([string]::IsNullOrWhiteSpace($publicKey) -or [string]::IsNullOrWhiteSpace($publicBaseUrl)) {
    throw "Public Key və canlı sayt ünvanı tələb olunur."
}

$privateKeyText = [System.Net.NetworkCredential]::new("", $privateKey).Password
if ([string]::IsNullOrWhiteSpace($privateKeyText)) { throw "Private Key tələb olunur." }
if ($publicBaseUrl -notmatch '^https://') { throw "Canlı sayt ünvanı https:// ilə başlamalıdır." }

Push-Location $backendProject
try {
    dotnet user-secrets set "Epoint:PublicKey" $publicKey
    dotnet user-secrets set "Epoint:PrivateKey" $privateKeyText
    dotnet user-secrets set "Epoint:ApiBaseUrl" $ApiBaseUrl
    dotnet user-secrets set "Epoint:PublicBaseUrl" $publicBaseUrl.TrimEnd('/')
}
finally {
    Pop-Location
}

Write-Host "Epoint açarları təhlükəsiz sirr yaddaşına yazıldı. Private Key layihə fayllarına əlavə edilmədi." -ForegroundColor Green
