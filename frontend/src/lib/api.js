const API_BASE = '/api';

async function fetchApi(endpoint, options = {}) {
  const headers = { ...options.headers };
  
  // Add auth token if available
  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
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
  getByShareCode: (shareCode) => fetchApi(`/leagues/share/${shareCode}`),
  getByUsername: (username) => fetchApi(`/users/${username}/leagues`),
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
  getByLeague: (leagueId) => fetchApi(`/leagues/${leagueId}/teams`),
  create: (data) => fetchApi('/teams', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/teams/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/teams/${id}`, { method: 'DELETE' }),
  uploadLogo: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE}/teams/${id}/logo`, {
      method: 'POST',
      headers,
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
  getBracketMatch: (id) => fetchApi(`/games/${id}/bracket-match`),
  // Heartbeat for controller health monitoring
  sendHeartbeat: (id) => fetchApi(`/games/${id}/heartbeat`, { method: 'POST' }),
  checkHeartbeat: (id) => fetchApi(`/games/${id}/heartbeat/check`),
  stopHeartbeat: (id) => fetchApi(`/games/${id}/heartbeat`, { method: 'DELETE' }),
};

// Bracket API
export const bracketApi = {
  get: (id) => fetchApi(`/brackets/${id}`),
  getByShareCode: (code) => fetchApi(`/brackets/share/${code}`),
  create: (data) => fetchApi('/brackets', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/brackets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateMatch: (matchId, data) => fetchApi(`/brackets/matches/${matchId}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/brackets/${id}`, { method: 'DELETE' }),
  uploadFinalsLogo: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE}/brackets/${id}/finals-logo`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Upload failed');
    }
    return response.json();
  },
  deleteFinalsLogo: (id) => fetchApi(`/brackets/${id}/finals-logo`, { method: 'DELETE' }),
};

// Scoreboard API
export const scoreboardApi = {
  getAll: () => fetchApi('/scoreboards'),
  get: (id) => fetchApi(`/scoreboards/${id}`),
  getByShareCode: (code) => fetchApi(`/scoreboards/share/${code}`),
  create: (data) => fetchApi('/scoreboards', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/scoreboards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/scoreboards/${id}`, { method: 'DELETE' }),
  uploadLogo: async (id, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE}/scoreboards/${id}/logo`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Upload failed');
    }
    return response.json();
  },
  deleteLogo: (id) => fetchApi(`/scoreboards/${id}/logo`, { method: 'DELETE' }),
  addPlayer: (scoreboardId, data) => fetchApi(`/scoreboards/${scoreboardId}/players`, { method: 'POST', body: JSON.stringify(data) }),
  updatePlayer: (playerId, data) => fetchApi(`/scoreboards/players/${playerId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePlayer: (playerId) => fetchApi(`/scoreboards/players/${playerId}`, { method: 'DELETE' }),
};

// Standalone Game API (games not tied to a league)
export const standaloneGameApi = {
  getAll: () => fetchApi('/standalone-games'),
  get: (id) => fetchApi(`/standalone-games/${id}`),
  getByShareCode: (code) => fetchApi(`/standalone-games/share/${code}`),
  create: (data) => fetchApi('/standalone-games', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchApi(`/standalone-games/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => fetchApi(`/standalone-games/${id}`, { method: 'DELETE' }),
  sendHeartbeat: (id) => fetchApi(`/standalone-games/${id}/heartbeat`, { method: 'POST' }),
  checkHeartbeat: (id) => fetchApi(`/standalone-games/${id}/heartbeat`),
  uploadLogo: async (gameId, team, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_BASE}/standalone-games/${gameId}/logo/${team}`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Upload failed' }));
      throw new Error(error.detail || 'Upload failed');
    }
    return response.json();
  },
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
