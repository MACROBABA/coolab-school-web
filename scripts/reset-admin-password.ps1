param(
  [string]$Email = "admin@coolab.local"
)

$ErrorActionPreference = "Stop"
$project = "D:\CoolabSchoolApi\CoolabSchool\CoolabSchool"
$password = Read-Host "Yeni administrator şifrəsi" -AsSecureString
$confirm = Read-Host "Şifrəni təkrar yazın" -AsSecureString

$toPlainText = {
  param([Security.SecureString]$Value)
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try { [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

$plainPassword = & $toPlainText $password
$plainConfirmation = & $toPlainText $confirm
if ($plainPassword -ne $plainConfirmation) { throw "Şifrələr eyni deyil." }
if ($plainPassword.Length -lt 12) { throw "Şifrə ən azı 12 simvol olmalıdır." }

Push-Location $project
try {
  dotnet user-secrets set "BootstrapAdmin:Email" $Email
  dotnet user-secrets set "BootstrapAdmin:ResetPassword" $plainPassword
  dotnet build -p:OutputPath=bin\AdminPasswordRecovery\ | Out-Host
  $server = Start-Process dotnet -ArgumentList @("exec", "$project\bin\AdminPasswordRecovery\CoolabSchool.dll") -PassThru -WindowStyle Hidden
  Start-Sleep -Seconds 4
  if ($server.HasExited) { throw "Administrator şifrəsi yenilənmədi. Server başlanğıcında xəta yarandı." }
  Stop-Process -Id $server.Id -Force
}
finally {
  dotnet user-secrets remove "BootstrapAdmin:ResetPassword" 2>$null
  $plainPassword = $null
  $plainConfirmation = $null
  Pop-Location
}

Write-Host "Administrator şifrəsi yeniləndi. İndi Visual Studio-da F5 edin." -ForegroundColor Green
