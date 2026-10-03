/**
 * Lista manual de canciones a descargar (si no usas una playlist de Spotify).
 * Formato recomendado: "Nombre de la canción - Nombre del artista"
 */
export const SONGS = [
  "Bohemian Rhapsody - Queen",
  "Hotel California - Eagles",
  "Billie Jean - Michael Jackson"
];

/**
 * Configuración general de descarga
 */
export const CONFIG = {
  downloadPath: "./downloads",
  audioQuality: "192K",
  delayBetweenDownloads: 2000, // Tiempo de espera en milisegundos entre descargas
  maxFilenameLength: 200,

  // Opcional: Credenciales oficiales de Spotify Developer (developer.spotify.com)
  // No son obligatorias para playlists públicas.
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID || "",
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || ""
  }
};
