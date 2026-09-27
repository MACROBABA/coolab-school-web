param(
  [string]$PublicLink = 'https://disk.yandex.com/d/6PcyNBX8EgAWxg'
)

$ErrorActionPreference = 'Stop'
$portfolioDirectory = Join-Path $PSScriptRoot '..\assets\portfolio'
$ffmpeg = 'C:\Users\Admin\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.2-full_build\bin\ffmpeg.exe'

if (-not (Test-Path $ffmpeg)) { throw 'FFmpeg tapılmadı.' }
New-Item -ItemType Directory -Path $portfolioDirectory -Force | Out-Null

$rootUri = 'https://cloud-api.yandex.net/v1/disk/public/resources?public_key=' + [uri]::EscapeDataString($PublicLink) + '&limit=100'
$folders = (Invoke-RestMethod -Uri $rootUri)._embedded.items | Where-Object type -eq 'dir'
$assetNames = @{
  'Asim' = 'asim'; 'Həcər' = 'hacar'; 'Mikayıl' = 'mikayil'; 'Muhsin' = 'muhsin'; 'Mustafa' = 'mustafa'
  'Seyyid' = 'seyyid'; 'Sədaqət' = 'sadaqat'; 'Vahid' = 'vahid'; 'Zeynəb' = 'zeyneb'; 'Zəhra' = 'zahra'
}

foreach ($folder in $folders) {
  $resourceUri = 'https://cloud-api.yandex.net/v1/disk/public/resources?public_key=' + [uri]::EscapeDataString($PublicLink) + '&path=' + [uri]::EscapeDataString($folder.path) + '&limit=100'
  $photo = (Invoke-RestMethod -Uri $resourceUri)._embedded.items |
    Where-Object { $_.type -eq 'file' -and $_.name -match '\.(jpg|jpeg|png|webp|heic)$' } |
    Sort-Object size -Descending |
    Select-Object -First 1

  if ($null -eq $photo) { Write-Warning "Foto tapılmadı: $($folder.name)"; continue }

  $folderName = $folder.name.Trim()
  $safeName = $assetNames[$folderName]
  if (-not $safeName) {
    $safeName = $folderName.Normalize([Text.NormalizationForm]::FormD) -replace '\p{Mn}', '' -replace '[^a-zA-Z0-9]+', '-'
    $safeName = $safeName.Trim('-').ToLowerInvariant()
  }
  $legacyNames = @{ 'h-c-r' = 'hacar'; 'mikay-l' = 'mikayil'; 's-daq-t' = 'sadaqat'; 'z-hra' = 'zahra'; 'zeyn-b' = 'zeyneb' }
  if ($legacyNames.ContainsKey($safeName)) { $safeName = $legacyNames[$safeName] }
  $temporaryFile = Join-Path $env:TEMP "coolab-portfolio-$safeName.jpg"
  $destination = Join-Path $portfolioDirectory "$safeName.webp"
  $previewUri = $photo.preview -replace 'size=S', 'size=XL'

  try {
    Invoke-WebRequest -Uri $previewUri -OutFile $temporaryFile
    & $ffmpeg -hide_banner -loglevel error -y -i $temporaryFile -vf "scale='min(1200,iw)':-2:flags=lanczos" -c:v libwebp -q:v 84 $destination | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "WebP çevirməsi alınmadı: $($photo.name)" }
    Write-Output "$($folder.name.Trim()): $($photo.name) -> $destination"
  }
  catch {
    Write-Warning "$($folder.name.Trim()) çevrilmədi: $($_.Exception.Message)"
  }
  finally {
    if (Test-Path $temporaryFile) { Remove-Item -LiteralPath $temporaryFile -Force }
  }
}
