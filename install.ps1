# PowerShell installer for Slurp (Windows)
$ErrorActionPreference = "Stop"

Write-Host "⚡ Instalando Slurp (MP3 Music Downloader)..." -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Node.js (v18+) no está instalado. Descárgalo desde https://nodejs.org" -ForegroundColor Red
    exit 1
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Error: Git no está instalado." -ForegroundColor Red
    exit 1
}

$targetDir = Join-Path $HOME ".slurp"

if (Test-Path $targetDir) {
    Write-Host "🔄 Actualizando Slurp..." -ForegroundColor Yellow
    Set-Location $targetDir
    git pull origin main
} else {
    Write-Host "📦 Clonando repositorio en $targetDir..." -ForegroundColor Yellow
    git clone https://github.com/AdelysAlberto/slurp.git $targetDir
    Set-Location $targetDir
}

Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow
npm install --silent

Write-Host "🔗 Registrando comando global 'slurp'..." -ForegroundColor Yellow
npm link --silent

Write-Host "`n🎉 ¡Slurp instalado correctamente en Windows!" -ForegroundColor Green
Write-Host "Uso: slurp --spotify <URL_SPOTIFY> o simplemente: slurp" -ForegroundColor Cyan
