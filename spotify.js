/**
 * Spotify Playlist & Track Extractor
 * Soporta API oficial (Client Credentials) y extracción pública directa.
 */

// Extrae tipo e ID de una URL o URI de Spotify
export const parseSpotifyUrl = (input) => {
  if (!input || typeof input !== "string") return null;

  const trimmed = input.trim();

  // Caso: URI tipo spotify:playlist:ID o spotify:track:ID
  const uriMatch = trimmed.match(/^spotify:(playlist|album|track):([a-zA-Z0-9]+)/i);
  if (uriMatch) {
    return { type: uriMatch[1].toLowerCase(), id: uriMatch[2] };
  }

  // Caso: URL tipo https://open.spotify.com/playlist/ID?si=...
  const urlMatch = trimmed.match(/open\.spotify\.com\/(playlist|album|track)\/([a-zA-Z0-9]+)/i);
  if (urlMatch) {
    return { type: urlMatch[1].toLowerCase(), id: urlMatch[2] };
  }

  // Caso: ID alfanumérico directo (asumimos playlist por defecto)
  if (/^[a-zA-Z0-9]{22}$/.test(trimmed)) {
    return { type: "playlist", id: trimmed };
  }

  return null;
};

// Obtiene token oficial de Spotify usando Client Credentials Flow
const getSpotifyApiToken = async (clientId, clientSecret) => {
  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: params
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error de autenticación Spotify (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data.access_token;
};

// Extrae pistas vía Spotify Web API oficial
const fetchTracksViaApi = async (type, id, token) => {
  const songs = [];
  let playlistName = "";

  if (type === "playlist") {
    // Obtener detalles de la playlist
    const metaRes = await fetch(`https://api.spotify.com/v1/playlists/${id}?fields=name`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (metaRes.ok) {
      const meta = await metaRes.json();
      playlistName = meta.name;
    }

    // Paginación de canciones (100 por petición)
    let nextUrl = `https://api.spotify.com/v1/playlists/${id}/tracks?limit=100`;
    while (nextUrl) {
      const res = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error(`Error al consultar tracks de Spotify (${res.status})`);
      }

      const data = await res.json();
      for (const item of data.items || []) {
        const track = item?.track;
        if (track && track.name) {
          const artists = (track.artists || []).map((a) => a.name).join(", ");
          songs.push(artists ? `${track.name} - ${artists}` : track.name);
        }
      }

      nextUrl = data.next;
    }
  } else if (type === "album") {
    const metaRes = await fetch(`https://api.spotify.com/v1/albums/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (metaRes.ok) {
      const meta = await metaRes.json();
      playlistName = meta.name;
      for (const track of meta.tracks?.items || []) {
        const artists = (track.artists || []).map((a) => a.name).join(", ");
        songs.push(artists ? `${track.name} - ${artists}` : track.name);
      }
    }
  } else if (type === "track") {
    const res = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const track = await res.json();
      playlistName = track.name;
      const artists = (track.artists || []).map((a) => a.name).join(", ");
      songs.push(artists ? `${track.name} - ${artists}` : track.name);
    }
  }

  return { name: playlistName, songs };
};

// Extrae pistas vía Spotify Embed (sin necesidad de credenciales)
const fetchTracksViaEmbed = async (type, id) => {
  const embedUrl = `https://open.spotify.com/embed/${type}/${id}`;
  const response = await fetch(embedUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
  });

  if (!response.ok) {
    throw new Error(`No se pudo obtener la página de la playlist en Spotify (${response.status})`);
  }

  const html = await response.text();
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.*?)<\/script>/);

  if (!match) {
    throw new Error("No se pudo extraer la información pública de Spotify. Intenta configurar las credenciales de API.");
  }

  const data = JSON.parse(match[1]);
  const entity = data.props?.pageProps?.state?.data?.entity;

  if (!entity || !Array.isArray(entity.trackList)) {
    throw new Error("Formato de playlist no reconocido o playlist vacía/privada.");
  }

  const playlistName = entity.name || "Playlist de Spotify";
  const songs = entity.trackList
    .map((item) => {
      const title = item.title || "";
      const artist = item.subtitle || "";
      return artist ? `${title} - ${artist}` : title;
    })
    .filter((s) => s.trim().length > 0);

  return { name: playlistName, songs };
};

/**
 * Función principal para extraer títulos de Spotify
 */
export const getSpotifyTracks = async (input, credentials = {}) => {
  const parsed = parseSpotifyUrl(input);
  if (!parsed) {
    throw new Error("La URL o ID de Spotify ingresada no es válida.");
  }

  const { clientId, clientSecret } = credentials;

  // Si se proporcionaron credenciales oficiales de Spotify
  if (clientId && clientSecret) {
    try {
      const token = await getSpotifyApiToken(clientId, clientSecret);
      return await fetchTracksViaApi(parsed.type, parsed.id, token);
    } catch (apiErr) {
      console.warn(`⚠️ Error con credenciales oficiales (${apiErr.message}). Intentando método directo...`);
    }
  }

  // Fallback: Extracción directa de Embed
  return await fetchTracksViaEmbed(parsed.type, parsed.id);
};
