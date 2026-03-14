const BASE_URL = '/api';

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  getMe: () => request('/auth/me'),

  // Workspaces
  getWorkspaces: () => request('/workspaces'),
  createWorkspace: (body) => request('/workspaces', { method: 'POST', body }),
  getWorkspace: (id) => request(`/workspaces/${id}`),
  updateWorkspace: (id, body) =>
    request(`/workspaces/${id}`, { method: 'PATCH', body }),
  addMember: (workspaceId, body) =>
    request(`/workspaces/${workspaceId}/members`, { method: 'POST', body }),

  // Boards
  getBoards: (workspaceId) => request(`/workspaces/${workspaceId}/boards`),
  getBoardTemplates: (workspaceId) =>
    request(`/workspaces/${workspaceId}/boards/templates`),
  createBoard: (workspaceId, body) =>
    request(`/workspaces/${workspaceId}/boards`, { method: 'POST', body }),
  getBoard: (workspaceId, boardId) =>
    request(`/workspaces/${workspaceId}/boards/${boardId}`),
  updateBoard: (workspaceId, boardId, body) =>
    request(`/workspaces/${workspaceId}/boards/${boardId}`, {
      method: 'PATCH',
      body,
    }),
  deleteBoard: (workspaceId, boardId) =>
    request(`/workspaces/${workspaceId}/boards/${boardId}`, {
      method: 'DELETE',
    }),

  // Cards
  createCard: (workspaceId, boardId, body) =>
    request(`/workspaces/${workspaceId}/boards/${boardId}/cards`, {
      method: 'POST',
      body,
    }),
  updateCard: (workspaceId, boardId, cardId, body) =>
    request(`/workspaces/${workspaceId}/boards/${boardId}/cards/${cardId}`, {
      method: 'PATCH',
      body,
    }),
  moveCard: (workspaceId, boardId, cardId, body) =>
    request(
      `/workspaces/${workspaceId}/boards/${boardId}/cards/${cardId}/move`,
      { method: 'PATCH', body }
    ),
  deleteCard: (workspaceId, boardId, cardId) =>
    request(`/workspaces/${workspaceId}/boards/${boardId}/cards/${cardId}`, {
      method: 'DELETE',
    }),
  addComment: (workspaceId, boardId, cardId, body) =>
    request(
      `/workspaces/${workspaceId}/boards/${boardId}/cards/${cardId}/comments`,
      { method: 'POST', body }
    ),

  // Chat
  getMessages: (workspaceId, boardId, before) =>
    request(
      `/workspaces/${workspaceId}/boards/${boardId}/messages${before ? `?before=${before}` : ''}`
    ),
  sendMessage: (workspaceId, boardId, body) =>
    request(`/workspaces/${workspaceId}/boards/${boardId}/messages`, {
      method: 'POST',
      body,
    }),

  // Invite by email
  inviteMember: (workspaceId, body) =>
    request(`/workspaces/${workspaceId}/members`, { method: 'POST', body }),

  // Activity
  getActivities: (workspaceId, boardId, before) => {
    let url = `/workspaces/${workspaceId}/activity?limit=50`;
    if (boardId) url += `&boardId=${boardId}`;
    if (before) url += `&before=${before}`;
    return request(url);
  },

  // Notifications
  getNotifications: (unreadOnly) =>
    request(`/notifications${unreadOnly ? '?unreadOnly=true' : ''}`),
  markNotificationRead: (id) =>
    request(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () =>
    request('/notifications/read-all', { method: 'PATCH' }),

  // Search
  search: (q, workspaceId) => {
    let url = `/search?q=${encodeURIComponent(q)}`;
    if (workspaceId) url += `&workspaceId=${workspaceId}`;
    return request(url);
  },

  // Members lookup
  getWorkspaceMembers: (workspaceId) =>
    request(`/workspaces/${workspaceId}`),
};
