# ============================================================================
  PUBLICA EL PORTAL EN GITHUB
   ----------------------------------------------------------------------------
  Sube los cambios del portal al repositorio de GitHub. A partir de aquí, cada
  vez que edite el portal y quiera actualizar el sitio, ejecute:

      powershell -ExecutionPolicy Bypass -File scripts/subir-a-github.ps1

  La primera vez le pedirá usuario y un token de GitHub (Péguelo en el campo
  "contraseña"). El token queda guardado cifrado en el Administrador de
  credenciales de Windows, así que no lo tiene que escribir otra vez.

  Qué necesita el token (Settings → Developer settings → Personal access
  tokens → Fine-grained tokens → Generate):
      · Repository access: Only select repositories -> taberna-magallanes
      · Permissions -> Repository permissions -> Contents: Read and write
   ============================================================================ */
param(
  [string]$Rama = 'main',
  [string]$Mensaje = ''
)

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz

$git = (Get-Command git -ErrorAction SilentlyContinue)
if (-not $git) {
  $rutaGit = 'C:\Program Files\Git\cmd\git.exe'
  if (Test-Path $rutaGit) { $git = $rutaGit } else {
    Write-Host "No se encontro Git. Instale con: winget install --id Git.Git -e" -ForegroundColor Red
    exit 1
  }
}
$git = $git.Source

Write-Host "`n=== PUBLICAR EN GITHUB ===" -ForegroundColor Cyan

# 1 · Comprobar que hay cambios
$estado = & $git status --porcelain
if (-not $estado) {
  Write-Host "No hay cambios nuevos: todo está igual que en GitHub." -ForegroundColor Green
  Write-Host "Si acaba de editar el portal y quiere actualizar el sitio," -ForegroundColor Yellow
  Write-Host "recuerde copiar el HTML publicado sobre publicar\index.html y regenerar" -ForegroundColor Yellow
  Write-Host "publicar\data.json (npm run data) antes de volver a ejecutar esto." -ForegroundColor Yellow
  exit 0
}

# 2 · Preparar el commit
if (-not $Mensaje) {
  $Mensaje = "Actualizacion del portal: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}
& $git add -A
& $git commit -m $Mensaje
if ($LASTEXITCODE -ne 0) { Write-Host "No se pudo crear el commit." -ForegroundColor Red; exit 1 }

# 3 · Empujar
$url = (& $git remote get-url origin 2>$null)
if (-not $url) {
  $cuenta = Read-Host "Usuario de GitHub (sin el @)"
  $url = "https://$cuenta@github.com/$cuenta/taberna-magallanes.git"
  & $git remote add origin $url
  Write-Host "Remoto creado: $url" -ForegroundColor Cyan
}

Write-Host "`nSubiendo a GitHub..." -ForegroundColor Cyan
& $git push -u origin $Rama

if ($LASTEXITCODE -eq 0) {
  Write-Host "`nListo. GitHub Pages publicara el portal solo." -ForegroundColor Green
  Write-Host "Mire el progreso en: https://github.com/$((& $git remote get-url origin) -replace '.*github.com[:/]', '' -replace '\.git$', '')/actions" -ForegroundColor Green
} else {
  Write-Host "`nNo se pudo subir. Si pide usuario o contrasena:" -ForegroundColor Yellow
  Write-Host "  · usuario: su usuario de GitHub" -ForegroundColor Yellow
  Write-Host "  · contrasena: pegue el TOKEN (no la contrasena normal)" -ForegroundColor Yellow
}
