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
  git pull origin main || true
else
  echo "📦 Clonando repositorio en $TARGET_DIR..."
  git clone https://github.com/AdelysAlberto/slurp-mp3.git "$TARGET_DIR"
  cd "$TARGET_DIR"
fi

echo "📦 Instalando dependencias de Node.js..."
npm install --silent

echo "🔗 Registrando comando global 'slurp'..."
npm install -g "$TARGET_DIR" --silent || npm link --silent

echo ""
echo "🎉 ¡Slurp instalado correctamente!"
echo "Uso: slurp --spotify <URL_SPOTIFY> o simplemente: slurp"
