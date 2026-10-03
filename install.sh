#!/usr/bin/env bash
set -e

echo "⚡ Instalando Slurp (MP3 Music Downloader)..."

TARGET_DIR="$HOME/.slurp"

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Error: Node.js (v18+) no está instalado. Por favor instálalo desde https://nodejs.org"
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "❌ Error: Git no está instalado."
  exit 1
fi

if [ -d "$TARGET_DIR" ]; then
  echo "🔄 Actualizando Slurp en $TARGET_DIR..."
  cd "$TARGET_DIR"
  git fetch origin main
  git reset --hard origin/main
else
  echo "📦 Clonando repositorio en $TARGET_DIR..."
  git clone https://github.com/AdelysAlberto/slurp-mp3.git "$TARGET_DIR"
  cd "$TARGET_DIR"
fi

echo "📦 Instalando dependencias de Node.js..."
npm install --silent

echo "📦 Descargando último motor descarga"
mkdir -p "$TARGET_DIR/bin"
OS="$(uname -s)"
if [ "$OS" = "Darwin" ]; then
  curl -L -s https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos -o "$TARGET_DIR/bin/yt-dlp"
else
  curl -L -s https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o "$TARGET_DIR/bin/yt-dlp"
fi
chmod +x "$TARGET_DIR/bin/yt-dlp"

echo "🔗 Registrando comando global 'slurp'..."
npm install -g "$TARGET_DIR" --silent || npm link --silent

echo ""
echo "🎉 ¡Slurp instalado correctamente"
echo "Uso: slurp --spotify <URL_SPOTIFY> o simplemente: slurp"
