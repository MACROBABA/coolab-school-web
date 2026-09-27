param(
  [string]$PublicLink = 'https://disk.yandex.com/d/J6b950SU33Fwbg'
)

$ErrorActionPreference = 'Stop'
$mediaDirectory = Join-Path $PSScriptRoot '..\assets\media'
$ffmpeg = 'C:\Users\Admin\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.2-full_build\bin\ffmpeg.exe'

if (-not (Test-Path $ffmpeg)) { throw 'FFmpeg tapılmadı.' }
New-Item -ItemType Directory -Path $mediaDirectory -Force | Out-Null

$folders = [ordered]@{
  '3d-pen' = 0
  'book-club' = 1
  'tours' = 2
  'design' = 3
  'robotics' = 4
  'summer-school' = 5
  'family-day' = 6
  'camp' = 7
  'social' = 8
}

$rootUri = 'https://cloud-api.yandex.net/v1/disk/public/resources?public_key=' + [uri]::EscapeDataString($PublicLink) + '&limit=100'
$directories = (Invoke-RestMethod -Uri $rootUri)._embedded.items
foreach ($entry in $folders.GetEnumerator()) {
  $directory = $directories[[int]$entry.Value]
  if ($null -eq $directory -or $directory.type -ne 'dir') { Write-Warning "Media qovluğu tapılmadı: $($entry.Key)"; continue }
  $metadataUri = 'https://cloud-api.yandex.net/v1/disk/public/resources?public_key=' + [uri]::EscapeDataString($PublicLink) + '&path=' + [uri]::EscapeDataString($directory.path) + '&limit=100'
  $resources = Invoke-RestMethod -Uri $metadataUri
  $photo = $resources._embedded.items |
    Where-Object { $_.type -eq 'file' -and $_.name -match '\.(jpg|jpeg|png|heic)$' } |
    Sort-Object size -Descending |
    Select-Object -First 1

  if ($null -eq $photo) { Write-Warning "Foto tapılmadı: $($entry.Value)"; continue }

  $temporaryFile = Join-Path $env:TEMP ("coolab-$($entry.Key).jpg")
  $destination = Join-Path $mediaDirectory "$($entry.Key).webp"
  $previewUri = $photo.preview -replace 'size=S', 'size=XL'
  try {
    Invoke-WebRequest -Uri $previewUri -OutFile $temporaryFile
    & $ffmpeg -hide_banner -loglevel error -y -i $temporaryFile -vf "scale='min(1600,iw)':-2:flags=lanczos" -c:v libwebp -q:v 82 $destination | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "WebP çevirməsi alınmadı: $($photo.name)" }
  }
  finally {
    if (Test-Path $temporaryFile) { Remove-Item -LiteralPath $temporaryFile -Force }
  }
  Write-Output "$($entry.Key): $($photo.name) -> $destination"
}
