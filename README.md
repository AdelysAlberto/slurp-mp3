<h1 align="center">SLURP</h1>

<p align="center">
  <b>CLI Multiplataforma para descarga y conversión automatizada de canciones y playlists de Spotify a MP3</b><br>
  <i>Extracción instantánea, autodiagnóstico de dependencias (Windows, macOS, Linux) y terminal limpia sin saturación de logs</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/CLI-slurp-blueviolet?style=for-the-badge&logo=gnubash&logoColor=white" alt="slurp CLI" />
  <img src="https://img.shields.io/badge/Windows-Compatible-0078D6?style=for-the-badge&logo=windows&logoColor=white" alt="Windows" />
  <img src="https://img.shields.io/badge/macOS-Compatible-000000?style=for-the-badge&logo=apple&logoColor=white" alt="macOS" />
  <img src="https://img.shields.io/badge/Linux-Compatible-FCC624?style=for-the-badge&logo=linux&logoColor=black" alt="Linux" />
  <img src="https://img.shields.io/badge/Spotify-Playlists-1DB954?style=for-the-badge&logo=spotify&logoColor=white" alt="Spotify" />
  <img src="https://img.shields.io/badge/Node.js-18%2B-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge" alt="License" /></a>
</p>

---

## Overview

**Slurp** es una herramienta de terminal (`CLI`) creada para resolver de forma definitiva la descarga de música en formato MP3 de alta fidelidad (192 kbps estéreo, 44.1 kHz). 

Permite pasar directamente el enlace de cualquier playlist pública de Spotify, extrayendo las pistas y sus artistas sin requerir claves de API obligatorias, localizando automáticamente la mejor versión de audio en YouTube y procesando la conversión con una interfaz de terminal limpia (*Clean TTY*) y confirmación interactiva.

---

## Quick Install

### Opción A: Instalación Automática por Terminal (macOS y Linux)
Ejecute la siguiente instrucción en su terminal para clonar, configurar dependencias y registrar el comando global `slurp`:

```bash
curl -fsSL https://raw.githubusercontent.com/AdelysAlberto/slurp-mp3/main/install.sh | bash
```

### Opción B: Instalación en Windows (PowerShell)
Abra PowerShell y ejecute:

```powershell
irm https://raw.githubusercontent.com/AdelysAlberto/slurp-mp3/main/install.ps1 | iex
```

### Opción C: Clonación Manual desde Repositorio (Cualquier SO)
```bash
git clone https://github.com/AdelysAlberto/slurp-mp3.git
cd slurp-mp3
npm install
npm link
```

> **Requisito Base**: Únicamente requiere tener instalado [Node.js](https://nodejs.org/) (v18 o superior). Todas las dependencias adicionales del sistema operativo se autogestionan automáticamente.

---

## Por Qué Slurp es la Mejor Opción

La mayoría de scripts de descarga de música sufren de los mismos problemas: fallan en Windows, exigen instalar manualmente binarios complejos o inundan la pantalla con miles de líneas de logs de depuración incomprensibles. 

Slurp fue diseñado bajo los siguientes principios de ingeniería:

### 1. Terminal Limpia (Zero Log Flooding)
Los descargadores convencionales ejecutan `yt-dlp` o `ffmpeg` arrojando porcentajes, trazas y advertencias continuas que saturan la consola. Slurp intercepta los flujos estándar y renderiza **un único indicador de estado por canción**:
```
[ 1/50] ⏳ Descargando: "Patient Zero - Taylor Swift"...
[ 1/50] 🎙️  Convirtiendo a MP3: "Patient Zero - Taylor Swift"...
[ 1/50] ✅ "Patient Zero - Taylor Swift.mp3" listo
```

### 2. Extracción de Spotify Sin Fricción
Permite procesar listas de Spotify sin obligar al usuario a registrarse en Spotify Developer Dashboard para obtener tokens. Cuenta con un extractor público directo (*fallback resiliente*) y admite de forma opcional credenciales de API si se requiere consultar listas privadas o muy extensas.

### 3. Autodiagnóstico e Instalador Integrado (Doctor Engine)
Si su sistema operativo (Windows, macOS o Linux) carece del binario de `yt-dlp`, Slurp lo detecta en tiempo de ejecución, solicita autorización interactiva y:
- En **Windows**: Instala vía `winget`/`choco` o descarga directamente el binario portable oficial `yt-dlp.exe` en `./bin/`.
- En **macOS**: Instala mediante `brew` o provisiona el binario portable oficial.
- En **Linux**: Instala mediante `apt` o aprovisiona el binario compilado.
- **FFmpeg**: Se gestiona de forma transparente sin configuraciones en variables de entorno del sistema gracias al runtime integrado de `@ffmpeg-installer/ffmpeg`.

### 4. Resumen Previo con Puerta de Confirmación
Nunca descarga a ciegas. Slurp extrae los títulos, presenta una muestra legible de las pistas encontradas, el total detectado y solicita confirmación expresa `(s/n)` antes de consumir ancho de banda o almacenamiento.

---

## Usage Reference / Commands

Una vez instalado, el comando `slurp` queda disponible globalmente en su sistema:

### 1. Descarga Directa con Playlist de Spotify
Pase la URL completa o el ID de la lista con el flag `--spotify` (o el alias corto `-s`):

```bash
slurp --spotify https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
```

*O usando el alias corto:*
```bash
slurp -s 37i9dQZF1DXcBWIGoYBM5M
```

*O simplemente pasando la URL como primer argumento:*
```bash
slurp https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
```

### 2. Modo Interactivo (Menú Asistido)
Si ejecuta el comando sin argumentos, Slurp iniciará un menú interactivo:

```bash
slurp
```

```
========================================================
  ⚡ SLURP — MP3 Music Downloader [macOS]
========================================================

Selecciona el origen de las canciones:
  [1] Usar lista manual de 'songs-config.js'
  [2] Ingresar URL / ID de Playlist de Spotify

Elige una opción (1 o 2) [Default: 1]:
```

### 3. Modo Lista Manual
Si prefiere definir una lista propia de títulos sin depender de Spotify, agregue sus canciones en `songs-config.js`:

```javascript
export const SONGS = [
  "Bohemian Rhapsody - Queen",
  "Hotel California - Eagles",
  "Billie Jean - Michael Jackson"
];
```

Y ejecute:
```bash
slurp
```

### 4. Actualización Automática
Para actualizar Slurp a la última versión con un solo comando:

```bash
slurp update
# o
slurp upgrade
```

### 5. Diagnóstico de Salud del Sistema
Para validar que los binarios y códecs de su equipo estén listos:

```bash
slurp --doctor
```

---

## Configuration Reference

En el archivo `songs-config.js` puede personalizar los parámetros de descarga:

```javascript
export const CONFIG = {
  downloadPath: "./downloads",      // Carpeta de destino para los archivos MP3
  audioQuality: "192K",             // Calidad de audio (ej: 128K, 192K, 320K)
  delayBetweenDownloads: 2000,      // Pausa entre pistas en milisegundos (evita bloqueos)
  maxFilenameLength: 200,           // Longitud máxima de caracteres en nombres de archivo

  // Opcional: Credenciales oficiales de Spotify Developer
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID || "",
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || ""
  }
};
```

---

## Repository Architecture

```
slurp-mp3/
├── .gitignore            # Exclusión de descargas, binarios y node_modules
├── LICENSE               # Licencia MIT del proyecto
├── README.md             # Documentación oficial
├── doctor.js             # Motor de diagnóstico e instalación multiplataforma
├── install.ps1           # Script de despliegue automatizado para Windows (PowerShell)
├── install.sh            # Script de despliegue automatizado para Unix (macOS/Linux)
├── package.json          # Definición de paquete, comando CLI global 'slurp' y dependencias
├── song-downloader.js    # Núcleo de ejecución, conversión y CLI interactiva
├── songs-config.js       # Lista manual de canciones y opciones de configuración
└── spotify.js            # Extractor público y API de Spotify
```

---

## Author & Maintenance

Desarrollado y mantenido por **Adelys Alberto Belen** ([@AdelysAlberto](https://github.com/AdelysAlberto)), Software Engineer.

- Sitio web: [adalbeca.com](https://adalbeca.com)
- Contacto: `dev@adalbeca.com`

---

## License

Distribuido bajo licencia [MIT](LICENSE).
