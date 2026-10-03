#!/usr/bin/env node

import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { spawn, execSync } from "child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { CONFIG, SONGS } from "./songs-config.js";
import { getSpotifyTracks, parseSpotifyUrl } from "./spotify.js";
import { ensureDependencies, detectOS, downloadStandaloneBinary } from "./doctor.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DOWNLOADS_PATH = CONFIG.downloadPath || "./downloads";

// Prepara carpeta de descargas
if (!existsSync(DOWNLOADS_PATH)) {
  mkdirSync(DOWNLOADS_PATH, { recursive: true });
}

// Obtener versión desde package.json
const getVersion = () => {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf8"));
    return pkg.version || "1.3.0";
  } catch (_) {
    return "1.3.0";
  }
};

// Sanitizar nombres de archivo para compatibilidad en sistemas operativos (Windows, macOS, Linux)
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, CONFIG.maxFilenameLength || 200);
};

// Actualiza una línea limpia en la terminal (sin llenar el TTY de spam)
const updateLine = (text) => {
  if (process.stdout.isTTY) {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(text);
  } else {
    console.log(text);
  }
};

const commitLine = (text) => {
  if (process.stdout.isTTY) {
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
  }
  console.log(text);
};

// Descarga individual usando yt-dlp con auto-recuperación ante 403
const downloadSong = async (ytDlpBin, songTitle, index, total, retried = false) => {
  const prefix = `[${String(index + 1).padStart(String(total).length, " ")}/${total}]`;
  const sanitizedTitle = sanitizeFilename(songTitle);
  const outputTemplate = `${DOWNLOADS_PATH}/${sanitizedTitle}.%(ext)s`;
  const searchQuery = `ytsearch1:${songTitle}`;

  updateLine(`${prefix} ⏳ Descargando: "${songTitle}"...`);

  try {
    await new Promise((resolve, reject) => {
      const isWin = process.platform === "win32";
      const ytdlp = spawn(
        ytDlpBin,
        [
          "-x",
          "--audio-format", "best",
          "--audio-quality", CONFIG.audioQuality || "192K",
          "--no-warnings",
          "--quiet",
          "-o", outputTemplate,
          searchQuery
        ],
        { shell: isWin }
      );

      let errorOutput = "";

      ytdlp.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      ytdlp.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(errorOutput.trim() || `Código de salida ${code}`));
        }
      });

      ytdlp.on("error", (err) => {
        reject(new Error(`Error ejecutando yt-dlp: ${err.message}`));
      });
    });

    // Conversión a MP3 para este archivo específico
    updateLine(`${prefix} 🎙️  Convirtiendo a MP3: "${songTitle}"...`);
    await convertSingleTrackToMp3(sanitizedTitle);

    commitLine(`${prefix} ✅ "${songTitle}.mp3" listo`);
    return { success: true, bin: ytDlpBin };
  } catch (error) {
    if (error.message.includes("403") && !retried) {
      commitLine(`${prefix} ⚠️  Detectado bloqueo HTTP 403 de YouTube. Actualizando motor de descarga automáticamente...`);
      try {
        const updatedBin = await downloadStandaloneBinary(detectOS().platform);
        return await downloadSong(updatedBin, songTitle, index, total, true);
      } catch (updateErr) {
        commitLine(`${prefix} ❌ No se pudo auto-actualizar el motor: ${updateErr.message}`);
      }
    }

    commitLine(`${prefix} ❌ Error en "${songTitle}": ${error.message.split("\n")[0]}`);
    return { success: false, bin: ytDlpBin };
  }
};

// Convierte el archivo descargado a MP3 y elimina el formato intermedio
const convertSingleTrackToMp3 = async (sanitizedTitle) => {
  const files = readdirSync(DOWNLOADS_PATH).filter((f) =>
    f.startsWith(sanitizedTitle) && /\.(webm|m4a|opus|ogg)$/i.test(f)
  );

  for (const file of files) {
    const inputPath = join(DOWNLOADS_PATH, file);
    const outputPath = join(DOWNLOADS_PATH, `${sanitizedTitle}.mp3`);

    await new Promise((resolve, reject) => {
      const ffmpeg = spawn(ffmpegInstaller.path, [
        "-i", inputPath,
        "-vn",
        "-ab", CONFIG.audioQuality ? `${CONFIG.audioQuality.toLowerCase().replace("k", "")}k` : "192k",
        "-ar", "44100",
        "-ac", "2",
        "-y",
        "-loglevel", "error",
        outputPath
      ]);

      let errorOutput = "";

      ffmpeg.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      ffmpeg.on("close", (code) => {
        if (code === 0) {
          try {
            rmSync(inputPath);
          } catch (_) {}
          resolve();
        } else {
          reject(new Error(`ffmpeg falló: ${errorOutput}`));
        }
      });

      ffmpeg.on("error", (err) => {
        reject(new Error(`ffmpeg error: ${err.message}`));
      });
    });
  }
};

// Actualización automática desde git
const handleUpdate = () => {
  console.log("\n" + "=".repeat(56));
  console.log("  🔄 SLURP — Actualizador del Sistema");
  console.log("=".repeat(56));

  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const candidates = [__dirname, join(homeDir, ".slurp")];
  const repoDir = candidates.find((d) => existsSync(join(d, ".git")));

  if (!repoDir) {
    console.error("❌ No se encontró la instalación local de Slurp para actualizar.");
    process.exit(1);
  }

  try {
    console.log(`📦 Obteniendo últimos cambios de GitHub en ${repoDir}...`);
    execSync("git pull origin main", { cwd: repoDir, stdio: "inherit" });
    console.log("📦 Verificando dependencias...");
    execSync("npm install --silent", { cwd: repoDir, stdio: "inherit" });
    console.log("🔗 Registrando última versión global...");
    execSync(`npm install -g "${repoDir}" --silent`, { stdio: "inherit" });
    console.log("\n🎉 ¡Slurp se ha actualizado correctamente a la última versión!\n");
  } catch (err) {
    console.error(`\n❌ Error durante la actualización: ${err.message}`);
    process.exit(1);
  }
};

const showHelp = () => {
  console.log(`
Uso de Slurp (v${getVersion()}):
  slurp                                   Modo interactivo (menú guiado)
  slurp --spotify <URL_O_ID>              Descargar playlist de Spotify
  slurp -s <URL_O_ID>                     Alias corto para Spotify
  slurp <URL_O_ID>                        Detección automática de Spotify
  slurp update, upgrade, --update         Actualizar Slurp a la última versión
  slurp --doctor                          Verificar dependencias del sistema
  slurp --version, -v                     Mostrar versión instalada
  slurp --help, -h                        Mostrar esta ayuda

Ejemplos:
  slurp --spotify https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
  slurp -s 37i9dQZF1DXcBWIGoYBM5M
  slurp update
  slurp
`);
};

// Flujo interactivo y CLI
const run = async () => {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    return;
  }

  if (args.includes("--version") || args.includes("-v") || args[0] === "version") {
    console.log(`slurp v${getVersion()}`);
    return;
  }

  if (args[0] === "update" || args[0] === "upgrade" || args.includes("--update")) {
    handleUpdate();
    return;
  }

  const osInfo = detectOS();
  console.log("\n" + "=".repeat(56));
  console.log(`  ⚡ SLURP (v${getVersion()}) — MP3 Music Downloader [${osInfo.name}]`);
  console.log("=".repeat(56));

  // 1. Diagnóstico de dependencias
  const ytDlpBin = await ensureDependencies();

  if (args.includes("--doctor")) {
    console.log("✅ Todas las dependencias e integraciones de Slurp están operativas.");
    return;
  }

  const rl = readline.createInterface({ input, output });

  try {
    let songList = [];
    let sourceName = "";

    // Detección de banderas CLI: --spotify o -s
    let spotifyArg = null;
    const sIndex = args.findIndex((a) => a === "--spotify" || a === "-s");
    if (sIndex !== -1 && args[sIndex + 1]) {
      spotifyArg = args[sIndex + 1];
    } else if (args[0] && !args[0].startsWith("-") && parseSpotifyUrl(args[0])) {
      spotifyArg = args[0];
    }

    if (spotifyArg) {
      console.log(`\n🔗 Procesando enlace de Spotify: ${spotifyArg}`);
      updateLine("⏳ Conectando con Spotify y extrayendo canciones...");
      const result = await getSpotifyTracks(spotifyArg, CONFIG.spotify || {});
      sourceName = `Spotify (${result.name})`;
      songList = result.songs;
      commitLine(`✅ Playlist obtenida: "${result.name}"`);
    } else {
      console.log("\nSelecciona el origen de las canciones:");
      console.log("  [1] Usar lista manual de 'songs-config.js'");
      console.log("  [2] Ingresar URL / ID de Playlist de Spotify\n");

      const option = (await rl.question("Elige una opción (1 o 2) [Default: 1]: ")).trim();

      if (option === "2") {
        const spotifyUrl = (await rl.question("\nPega la URL o ID de la playlist de Spotify: ")).trim();
        if (!spotifyUrl) {
          console.log("❌ No se proporcionó ninguna URL. Proceso cancelado.");
          rl.close();
          return;
        }

        updateLine("⏳ Conectando con Spotify y extrayendo canciones...");
        const result = await getSpotifyTracks(spotifyUrl, CONFIG.spotify || {});
        sourceName = `Spotify: ${result.name}`;
        songList = result.songs;
        commitLine(`✅ Playlist obtenida: "${result.name}"`);
      } else {
        sourceName = "Archivo local (songs-config.js)";
        songList = (SONGS || [])
          .map((s) => (typeof s === "string" ? s.trim() : ""))
          .filter((s) => s.length > 0);
      }
    }

    if (songList.length === 0) {
      console.log("\n⚠️  No se encontraron canciones para procesar.");
      rl.close();
      return;
    }

    // Resumen inicial
    console.log("\n" + "─".repeat(56));
    console.log(`📋 Origen:               ${sourceName}`);
    console.log(`🎶 Canciones detectadas: ${songList.length} pista(s)`);
    console.log("─".repeat(56));

    console.log("\nMuestra de canciones a descargar:");
    const previewCount = Math.min(5, songList.length);
    for (let i = 0; i < previewCount; i++) {
      console.log(`  ${i + 1}. ${songList[i]}`);
    }
    if (songList.length > 5) {
      console.log(`  ... y ${songList.length - 5} canción(es) más.`);
    }

    // Pregunta de confirmación
    const confirm = (await rl.question(`\n¿Deseas iniciar la descarga de estas ${songList.length} canciones? (s/n) [s]: `)).trim().toLowerCase();
    rl.close();

    if (confirm === "n" || confirm === "no") {
      console.log("\n🛑 Descarga cancelada por el usuario.");
      return;
    }

    console.log("\n🚀 Iniciando proceso de descarga y conversión a MP3...");
    console.log(`📁 Carpeta de destino: ${DOWNLOADS_PATH}\n`);

    let successCount = 0;
    let errorCount = 0;

    let currentBin = ytDlpBin;

    for (let i = 0; i < songList.length; i++) {
      const song = songList[i];
      const result = await downloadSong(currentBin, song, i, songList.length);

      if (result.bin) {
        currentBin = result.bin;
      }

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }

      // Pausa configurable entre canciones
      if (i < songList.length - 1) {
        const delay = CONFIG.delayBetweenDownloads || 2000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    console.log("\n" + "=".repeat(56));
    console.log("📊 Resumen de Descarga:");
    console.log(`   ✅ Descargadas exitosamente: ${successCount}`);
    console.log(`   ❌ Descargas fallidas:      ${errorCount}`);
    console.log(`   📁 Carpeta:                  ${DOWNLOADS_PATH}`);
    console.log("=".repeat(56) + "\n");
  } catch (err) {
    rl.close();
    console.error(`\n💥 Error en el proceso: ${err.message}`);
    process.exit(1);
  }
};

run();
