const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api'
const STORAGE = window.sessionStorage  // 👈 sesión por pestaña

const LAST_ACTIVITY_KEY = 'lastActivity'
const TOKEN_KEY = 'token'
const USER_KEY = 'user'

export function saveAuth(token, user){
  STORAGE.setItem(TOKEN_KEY, token)
  STORAGE.setItem(USER_KEY, JSON.stringify(user))
  touchActivity()
}
export function clearAuth(){
  STORAGE.removeItem(TOKEN_KEY)
  STORAGE.removeItem(USER_KEY)
  STORAGE.removeItem(LAST_ACTIVITY_KEY)
}
export function getUser(){
  try {
    const raw = STORAGE.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
export function touchActivity(){
  STORAGE.setItem(LAST_ACTIVITY_KEY, String(Date.now()))
}
export function lastActivity(){
  const v = STORAGE.getItem(LAST_ACTIVITY_KEY)
  return v ? Number(v) : 0
}

async function request(path, { method='GET', body, headers } = {}){
  // cada petición cuenta como actividad
  touchActivity()

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(STORAGE.getItem(TOKEN_KEY) ? { 'Authorization': 'Bearer ' + STORAGE.getItem(TOKEN_KEY) } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  })

  if (res.status === 401) {
    clearAuth()
    window.location.replace('/')
    return
  }

  if (!res.ok){
    let msg = res.statusText
    try {
      const data = await res.json()
      msg = data.error || data.message || data.errors?.[0]?.msg || msg
    } catch {}
    throw new Error(msg)
  }

  return res.json()
}

export const api = {
  // auth
  login: (email, password) => request('/auth/login', { method:'POST', body:{ email, password } }),
  me: () => request('/auth/me'),
  registerClient: (payload) => request('/auth/register-client', { method:'POST', body: payload }),

  // availability
  listAvailability: (from, to) => request(`/availability?from=${from}&to=${to}`),
  setAvailability: (payload) => request('/availability', { method:'POST', body: payload }),
  listSlots: async (date) => {
    const r = await request(`/availability/${date}/slots`)
    if (Array.isArray(r)) return r
    if (r && Array.isArray(r.slots)) return r.slots
    return []
  },

  // appointments
  listAppointments: (date) => request(`/appointments?date=${date}`),
  createAppointment: (payload) => request('/appointments', { method:'POST', body: payload }),
  myHistory: () => request('/appointments/me'),
  appointmentsSummary: (from, to) => request(`/appointments/summary?from=${from}&to=${to}`),

  // clients
  listClients: () => request('/clients'),
  createClient: (payload) => request('/clients', { method:'POST', body: payload }),
  updateClient: (id, payload) => request(`/clients/${id}`, { method:'PUT', body: payload }),
  deleteClient: (id) => request(`/clients/${id}`, { method:'DELETE' }),
}
