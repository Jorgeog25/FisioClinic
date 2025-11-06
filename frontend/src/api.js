const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const STORAGE = window.sessionStorage;

const LAST_ACTIVITY_KEY = "lastActivity";
const TOKEN_KEY = "token";
const USER_KEY = "user";

export function saveAuth(token, user) {
  STORAGE.setItem(TOKEN_KEY, token);
  STORAGE.setItem(USER_KEY, JSON.stringify(user));
  touchActivity();
}
export function clearAuth() {
  STORAGE.removeItem(TOKEN_KEY);
  STORAGE.removeItem(USER_KEY);
  STORAGE.removeItem(LAST_ACTIVITY_KEY);
}
export function getUser() {
  try {
    const raw = STORAGE.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function touchActivity() { STORAGE.setItem(LAST_ACTIVITY_KEY, String(Date.now())); }
export function lastActivity() { const v = STORAGE.getItem(LAST_ACTIVITY_KEY); return v ? Number(v) : 0; }

async function request(path, { method = "GET", body, headers } = {}) {
  touchActivity();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(STORAGE.getItem(TOKEN_KEY) ? { Authorization: "Bearer " + STORAGE.getItem(TOKEN_KEY) } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) { clearAuth(); window.location.replace("/"); return; }
  if (!res.ok) {
    let msg = res.statusText;
    try { const data = await res.json(); msg = data.error || data.message || data.errors?.[0]?.msg || msg; } catch {}
    throw new Error(msg);
  }
  try { return await res.json(); } catch { return null; }
}

/* ===== Normalización tolerante ===== */
function toHHMM(s) {
  if (!s) return s;
  if (typeof s === "number") { const h=Math.floor(s/60), m=s%60; return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`; }
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s.slice(0,5);
  if (/^\d{2}:\d{2}$/.test(s)) return s;
  const d = new Date(s); if (!isNaN(+d)) { const h=d.getHours(), m=d.getMinutes(); return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`; }
  return s;
}
function normalizeClientShape(a){
  if (a?.clientId && (a.clientId.firstName || a.clientId.lastName || a.clientId.reason)) {
    return { _id:a.clientId._id||a.clientId.id, firstName:a.clientId.firstName||"", lastName:a.clientId.lastName||"", reason:a.clientId.reason||"" };
  }
  if (a?.client) {
    const c=a.client, name=c.name||c.fullName||"", [first,...rest]=name.split(/\s+/);
    return { _id:c._id||c.id, firstName:c.firstName||first||"", lastName:c.lastName||rest.join(" ")||"", reason:c.reason||c.motive||c.notes||"" };
  }
  if (a?.clientName) { const p=String(a.clientName).trim().split(/\s+/); return { firstName:p[0]||"", lastName:p.slice(1).join(" "), reason:a.reason||"" }; }
  return a?.clientId || null;
}
function normalizeAppointment(a){
  const clientId = normalizeClientShape(a);
  return { _id:a._id||a.id, date:a.date, time:toHHMM(a.time), status:a.status||a.state||"reserved", clientId };
}
function extractArray(payload){
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload!=="object") return [];
  return payload.appointments || payload.items || payload.data || payload.rows || payload.result || [];
}

export const api = {
  // auth
  login: (email, password) => request("/auth/login", { method:"POST", body:{ email, password } }),
  me: () => request("/auth/me"),
  registerClient: (payload) => request("/auth/register-client", { method:"POST", body: payload }),

  // availability
  listAvailability: async (from,to) => {
    const url = from&&to ? `/availability?from=${from}&to=${to}` : from ? `/availability?from=${from}&to=${from}` : `/availability`;
    const r = await request(url); return Array.isArray(r) ? r : [];
  },
  setAvailability: (payload) => request("/availability", { method:"POST", body: payload }),

  // appointments
  listAppointments: async (date) => {
    const r = await request(`/appointments?date=${date}`); return extractArray(r).map(normalizeAppointment);
  },
  createAppointment: (payload) => request("/appointments", { method:"POST", body: payload }),
  updateAppointment: (id, payload) => request(`/appointments/${id}`, { method:"PATCH", body: payload }), // 👈 NUEVO
  myHistory: async () => { const r = await request("/appointments/me"); return extractArray(r).map(normalizeAppointment); },
  appointmentsSummary: async (from,to) => {
    const r = await request(`/appointments/summary?from=${from}&to=${to}&populate=1`);
    return extractArray(r).map(normalizeAppointment);
  },

  // clients
  listClients: () => request("/clients"),
  createClient: (payload) => request("/clients", { method:"POST", body: payload }),
  updateClient: (id, payload) => request(`/clients/${id}`, { method:"PUT", body: payload }),
  deleteClient: (id) => request(`/clients/${id}`, { method:"DELETE" }),
};
