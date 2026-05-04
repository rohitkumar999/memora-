const API_ROOT = '/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_ROOT}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

export const api = {
  login(payload) {
    return request('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
  },
  register(payload) {
    return request('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
  },
  me() {
    return request('/auth/me');
  },
  logout() {
    return request('/auth/logout', { method: 'POST' });
  },
  dashboard(date) {
    const query = date ? `?date=${date}` : '';
    return request(`/dashboard${query}`);
  },
  topics() {
    return request('/topics');
  },
  createTopic(payload) {
    return request('/topics', { method: 'POST', body: JSON.stringify(payload) });
  },
  markTopicDone(id) {
    return request(`/topics/${id}/mark-done`, { method: 'POST' });
  },
  undoLastTopicStudy() {
    return request('/topics/undo-last-study', { method: 'POST' });
  },
  reminders() {
    return request('/reminders');
  },
  teamMembers() {
    return request('/team-members');
  },
  teamMember(id) {
    return request(`/team-members/${id}`);
  },
  markReminderDone(id) {
    return request(`/reminders/${id}/done`, { method: 'POST' });
  },
  undoReminder(id) {
    return request(`/reminders/${id}/undo`, { method: 'POST' });
  },
  undoLastReminderAction() {
    return request('/reminders/undo-last', { method: 'POST' });
  },
};
