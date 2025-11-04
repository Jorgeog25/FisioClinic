const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

function token() {
  return localStorage.getItem('token') || '';
}

async function request(path, { method='GET', body, headers } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token() ? { 'Authorization': 'Bearer ' + token() } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    const text = await res.text().catch(()=>'');
    let err;
    try { err = JSON.parse(text) } catch { err = { error: text || res.statusText } }
    throw new Error(err.error || (err.errors && err.errors[0]?.msg) || 'Error');
  }
  return res.json();
}

export const api = {
  // auth
  login: (email, password) => request('/auth/login', { method:'POST', body:{ email, password } }),
  me: () => request('/auth/me'),
  registerClient: (payload) => request('/auth/register-client', { method:'POST', body: payload }),


  // availability
  listAvailability: (from, to) => request(`/availability${from&&to?`?from=${from}&to=${to}`:''}`),
  setAvailability: (payload) => request('/availability', { method:'POST', body: payload }),
  daySlots: (date) => request(`/availability/${date}/slots`),

  // clients
  listClients: () => request('/clients'),
  createClient: (payload) => request('/clients', { method:'POST', body: payload }),
  clientDetail: (id) => request(`/clients/${id}`),
  myHistory: () => request('/clients/me/history'),
  updateClient: (id, payload) => request(`/clients/${id}`, { method:'PUT', body: payload }),     // 👈 nuevo
  deleteClient: (id) => request(`/clients/${id}`, { method:'DELETE' }),

  // appointments
  book: (payload) => request('/appointments', { method:'POST', body: payload }),
  listAppointments: (date) => request(`/appointments${date?`?date=${date}`:''}`),
  myAppointments: () => request('/appointments/me'),

  // payments
  createPayment: (payload) => request('/payments', { method:'POST', body: payload }),
  paymentsByClient: (clientId) => request(`/payments/client/${clientId}`),
};

export function saveAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}
export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
export function getUser() {
  const raw = localStorage.getItem('user');
  try { return JSON.parse(raw) } catch { return null }
}
