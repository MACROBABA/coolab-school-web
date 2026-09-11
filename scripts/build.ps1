$ErrorActionPreference = 'Stop'

$outputDirectory = Join-Path $PSScriptRoot '..\dist'
$sourceDirectory = Join-Path $PSScriptRoot '..\assets'

if (Test-Path -LiteralPath $outputDirectory) {
  Remove-Item -LiteralPath $outputDirectory -Recurse -Force
}
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $PSScriptRoot '..\index.html') -Destination (Join-Path $outputDirectory 'index.html') -Force
Copy-Item -LiteralPath $sourceDirectory -Destination (Join-Path $outputDirectory 'assets') -Recurse -Force
