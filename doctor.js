import { execSync, spawn } from "child_process";
import { existsSync, mkdirSync, chmodSync, createWriteStream } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BIN_DIR = join(__dirname, "bin");

// Detecta el sistema operativo
export const detectOS = () => {
  const p = process.platform;
  if (p === "win32") return { platform: "win32", name: "Windows", isWindows: true };
  if (p === "darwin") return { platform: "darwin", name: "macOS", isMac: true };
  return { platform: "linux", name: "Linux", isLinux: true };
};

// Verifica si un comando existe en el PATH del sistema
const isCommandInPath = (command) => {
  try {
    const isWin = process.platform === "win32";
    const checkCmd = isWin ? `where ${command}` : `which ${command}`;
    execSync(checkCmd, { stdio: "ignore" });
    return true;
  } catch (_) {
    return false;
  }
};

// Obtiene la ruta ejecutable de yt-dlp (local en bin/ o global en PATH)
export const resolveYtDlpBinary = () => {
  const isWin = process.platform === "win32";
  const localBinary = join(BIN_DIR, isWin ? "yt-dlp.exe" : "yt-dlp");

  if (existsSync(localBinary)) {
    return localBinary;
  }

  if (isCommandInPath("yt-dlp")) {
    return "yt-dlp";
  }

  return null;
};

// Descarga directa del ejecutable oficial de GitHub Releases (Fallback 100% portable)
const downloadStandaloneBinary = async (platform) => {
  if (!existsSync(BIN_DIR)) {
    mkdirSync(BIN_DIR, { recursive: true });
  }

  let downloadUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp";
  let targetFile = join(BIN_DIR, "yt-dlp");

  if (platform === "win32") {
    downloadUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe";
    targetFile = join(BIN_DIR, "yt-dlp.exe");
  } else if (platform === "darwin") {
    downloadUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos";
    targetFile = join(BIN_DIR, "yt-dlp");
  }

  console.log(`⬇️  Descargando binario portable oficial desde GitHub (${platform})...`);

  const response = await fetch(downloadUrl);
  if (!response.ok) {
    throw new Error(`Error descargando binario: HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { writeFileSync } = await import("fs");
  writeFileSync(targetFile, buffer);

  if (platform !== "win32") {
    chmodSync(targetFile, 0o755);
  }

  console.log(`✅ Binario portable instalado en: ${targetFile}`);
  return targetFile;
};

// Asistente interactivo de diagnóstico e instalación
export const ensureDependencies = async () => {
  const osInfo = detectOS();
  let ytDlpPath = resolveYtDlpBinary();

  if (ytDlpPath) {
    return ytDlpPath;
  }

  console.log("\n" + "─".repeat(56));
  console.log(`🔍 Diagnóstico del Sistema [${osInfo.name}]`);
  console.log("⚠️  'yt-dlp' no se encuentra instalado en su equipo.");
  console.log("─".repeat(56));

  const rl = readline.createInterface({ input, output });
  const answer = (
    await rl.question(
      `¿Desea instalar 'yt-dlp' automáticamente para ${osInfo.name}? (s/n) [s]: `
    )
  ).trim().toLowerCase();
  rl.close();

  if (answer === "n" || answer === "no") {
    console.log(
      "\n❌ No se puede continuar sin yt-dlp. Por favor instálelo manualmente y vuelva a ejecutar."
    );
    process.exit(1);
  }

  console.log("\n⚙️  Iniciando instalación automática...");

  try {
    if (osInfo.isWindows) {
      if (isCommandInPath("winget")) {
        console.log("📦 Instalando con winget...");
        execSync("winget install yt-dlp --silent --accept-source-agreements --accept-package-agreements", { stdio: "inherit" });
      } else if (isCommandInPath("choco")) {
        console.log("📦 Instalando con Chocolatey...");
        execSync("choco install yt-dlp -y", { stdio: "inherit" });
      } else {
        await downloadStandaloneBinary("win32");
      }
    } else if (osInfo.isMac) {
      if (isCommandInPath("brew")) {
        console.log("📦 Instalando con Homebrew...");
        execSync("brew install yt-dlp", { stdio: "inherit" });
      } else {
        await downloadStandaloneBinary("darwin");
      }
    } else {
      if (isCommandInPath("apt")) {
        console.log("📦 Instalando con apt...");
        execSync("sudo apt update && sudo apt install -y yt-dlp", { stdio: "inherit" });
      } else {
        await downloadStandaloneBinary("linux");
      }
    }

    ytDlpPath = resolveYtDlpBinary();
    if (!ytDlpPath) {
      // Fallback final: descargar binario portable
      ytDlpPath = await downloadStandaloneBinary(osInfo.platform);
    }

    console.log("🎉 'yt-dlp' listo para usarse.\n");
    return ytDlpPath;
  } catch (error) {
    console.warn(`⚠️ Ocurrió un inconveniente con el gestor del sistema: ${error.message}`);
    console.log("Intentando descarga directa del binario portable oficial...");
    return await downloadStandaloneBinary(osInfo.platform);
  }
};
