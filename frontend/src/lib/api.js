const API_BASE = '/api';

async function fetchApi(endpoint, options = {}) {
  const headers = { ...options.headers };
  
  // Only add Content-Type for requests with a body
  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const error = await response.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      // Response wasn't JSON
    }
    throw new Error(errorMessage);
  }
  
  // For 204 No Content, return null immediately
  if (response.status === 204) {
    return null;
  }
  
  // Try to parse as JSON
  try {
    const text = await response.text();
    if (!text || text.trim() === '') {
      return null;
    }
    return JSON.parse(text);
  } catch (e) {
    console.error('Failed to parse JSON response:', e);
    return null;
  }
}

// League API
export const leagueApi = {
  getAll: () => fetchApi('/leagues'),
  get: (id) => fetchApi(`/leagues/${id}`),
  create: (data) => fetchApi('/leagues', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/leagues/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/leagues/${id}`, { method: 'DELETE' }),
  getTeams: (id) => fetchApi(`/leagues/${id}/teams`),
  getStandings: (id) => fetchApi(`/leagues/${id}/standings`),
  getGames: (id) => fetchApi(`/leagues/${id}/games`),
  getBrackets: (id) => fetchApi(`/leagues/${id}/brackets`),
};

// Team API
export const teamApi = {
  create: (data) => fetchApi('/teams', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/teams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/teams/${id}`, { method: 'DELETE' }),
  uploadLogo: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/teams/${id}/logo`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Upload failed');
    }
    return response.json();
  },
  deleteLogo: (id) => fetchApi(`/teams/${id}/logo`, { method: 'DELETE' }),
};

// Game API
export const gameApi = {
  get: (id) => fetchApi(`/games/${id}`),
  getByShareCode: (code) => fetchApi(`/games/share/${code}`),
  create: (data) => fetchApi('/games', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/games/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/games/${id}`, { method: 'DELETE' }),
};

// Bracket API
export const bracketApi = {
  get: (id) => fetchApi(`/brackets/${id}`),
  getByShareCode: (code) => fetchApi(`/brackets/share/${code}`),
  create: (data) => fetchApi('/brackets', { method: 'POST', body: JSON.stringify(data) }),
  updateMatch: (matchId, data) => fetchApi(`/brackets/matches/${matchId}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/brackets/${id}`, { method: 'DELETE' }),
};

// Scoreboard API
export const scoreboardApi = {
  getAll: () => fetchApi('/scoreboards'),
  get: (id) => fetchApi(`/scoreboards/${id}`),
  getByShareCode: (code) => fetchApi(`/scoreboards/share/${code}`),
  create: (data) => fetchApi('/scoreboards', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/scoreboards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/scoreboards/${id}`, { method: 'DELETE' }),
  addPlayer: (scoreboardId, data) => fetchApi(`/scoreboards/${scoreboardId}/players`, { method: 'POST', body: JSON.stringify(data) }),
  updatePlayer: (playerId, data) => fetchApi(`/scoreboards/players/${playerId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePlayer: (playerId) => fetchApi(`/scoreboards/players/${playerId}`, { method: 'DELETE' }),
};

// WebSocket helper
export function createWebSocket(type, shareCode, onMessage) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/${type}/${shareCode}`;
  
  const ws = new WebSocket(wsUrl);
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    onMessage(data);
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
  
  return ws;
}
