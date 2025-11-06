import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MonthCalendar from "../components/MonthCalendar";
import { api, clearAuth } from "../api";

// ===== Utils =====
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function toHHMM(min) {
  const h = Math.floor(min / 60),
    m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function fmtDDMMYYYY(ymd) {
  if (!ymd) return "";
  const [Y, M, D] = ymd.split("-");
  return `${D}/${M}/${Y}`;
}
function todayYMD() {
  return new Date().toISOString().slice(0, 10);
}
// normaliza texto (sin acentos, minúsculas)
function norm(s) {
  return (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
// nombre del cliente desde la cita (tras normalización de api.js)
function getClientName(a) {
  const c = a?.clientId;
  if (!c) return "";
  const first = c.firstName || "";
  const last = c.lastName || "";
  return `${first} ${last}`.trim();
}

// Genera slots dentro del rango que caben completos
function buildSlotsInRange(
  start,
  end,
  slotMinutes,
  apptsTimes = [],
  blocked = []
) {
  const out = [],
    apptSet = new Set(apptsTimes),
    blockedSet = new Set(blocked || []);
  const S = toMinutes(start),
    E = toMinutes(end),
    step = Math.max(5, Number(slotMinutes) || 60);
  for (let t = S; t + step <= E; t += step) {
    const time = toHHMM(t);
    const reserved = apptSet.has(time);
    const blockedManual = !reserved && blockedSet.has(time);
    out.push({
      time,
      reserved,
      blocked: blockedManual,
      checked: reserved ? true : !blockedManual,
    });
  }
  return out;
}

// Normaliza estado visual en días pasados
function computeDisplayStatus(status, isPast) {
  const raw = (status || "").toString().trim().toLowerCase();
  const isPaid = /paid|pagad/.test(raw);
  const isCancelled = /cancel/.test(raw);
  if (isPast && !isPaid && !isCancelled) return "pending_payment";
  if (/pending|de pago/.test(raw)) return "pending_payment";
  if (/proce/.test(raw)) return "in_process";
  if (/reser/.test(raw)) return "reserved";
  if (/paid|pagad/.test(raw)) return "paid";
  if (/cancel/.test(raw)) return "cancelled";
  return raw || "reserved";
}

// Badge de estado
function StatusPill({ value, isPast }) {
  const key = computeDisplayStatus(value, isPast);
  const map = {
    reserved: { label: "Reservada", cls: "badge badge-reserved" },
    in_process: { label: "En proceso", cls: "badge badge-process" },
    pending_payment: { label: "Pendiente de pago", cls: "badge badge-pending" },
    paid: { label: "Pagada", cls: "badge badge-paid" },
    cancelled: { label: "Cancelada", cls: "badge badge-cancel" },
  };
  const { label, cls } = map[key] || map.reserved;
  return <span className={cls}>{label}</span>;
}

export default function AdminHome() {
  const nav = useNavigate();

  // Pestañas
  const [tab, setTab] = useState("calendar");

  // Día seleccionado
  const [date, setDate] = useState("");
  const [isPast, setIsPast] = useState(false);

  // Info del día + citas
  const [dayInfo, setDayInfo] = useState(null);
  const [dayAppts, setDayAppts] = useState([]);
  const [loadingDay, setLoadingDay] = useState(false);

  // Editor de rango
  const [showDayForm, setShowDayForm] = useState(false);
  const [slotMinutes, setSlotMinutes] = useState(60);
  const [rangeStart, setRangeStart] = useState("09:00");
  const [rangeEnd, setRangeEnd] = useState("17:00");
  const [slots, setSlots] = useState([]);
  const [msg, setMsg] = useState("");

  // Refresco calendario
  const [reloadToken, setReloadToken] = useState(0);

  // Clientes
  const [clients, setClients] = useState([]);
  const [clientQuery, setClientQuery] = useState("");
  const [newClient, setNewClient] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    reason: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    reason: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Citas globales
  const [apptsAll, setApptsAll] = useState([]);
  const [personQuery, setPersonQuery] = useState("");
  const [filterDay, setFilterDay] = useState("");

  // Cargar datos según pestaña
  useEffect(() => {
    if (tab === "clients") loadClients();
    if (tab === "appointments") loadApptsAll();
  }, [tab]);

  async function loadClients() {
    try {
      setClients(await api.listClients());
    } catch (e) {
      console.error(e);
    }
  }

  async function loadApptsAll() {
    try {
      // extremo amplio para traer todo
      const rows = await api.appointmentsSummary("1970-01-01", "2100-12-31");
      setApptsAll(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error(e);
      setApptsAll([]);
    }
  }

  function logout() {
    clearAuth();
    nav("/", { replace: true });
  }

  // Seleccionar día en calendario
  async function pickDay(d, meta = {}) {
    setDate(d);
    setIsPast(!!meta.isPast);
    setMsg("");
    setShowDayForm(false);
    setSlots([]);
    setLoadingDay(true);
    try {
      const rng = await api.listAvailability(d, d);
      const info = Array.isArray(rng) ? rng.find((x) => x.date === d) : null;
      setDayInfo(info || null);

      const list = await api.listAppointments(d);
      const apptsList = Array.isArray(list) ? list : [];
      setDayAppts(apptsList);

      const start = info?.startTime || "09:00";
      const end = info?.endTime || "17:00";
      const step = info?.slotMinutes || 60;
      setRangeStart(start);
      setRangeEnd(end);
      setSlotMinutes(step);

      const apptTimes = apptsList.map((a) => (a.time || "").slice(0, 5));
      const blocked = info?.blockedSlots || [];
      setSlots(buildSlotsInRange(start, end, step, apptTimes, blocked));
      setShowDayForm(true);
    } catch {
      setDayInfo(null);
      setDayAppts([]);
      setSlots([]);
    } finally {
      setLoadingDay(false);
    }
  }

  // Regenerar slots al cambiar duración o rango
  useEffect(() => {
    if (!showDayForm) return;
    const prev = new Map(slots.map((s) => [s.time, s.checked]));
    const apptTimes = dayAppts.map((a) => (a.time || "").slice(0, 5));
    const blocked = dayInfo?.blockedSlots || [];
    const next = buildSlotsInRange(
      rangeStart,
      rangeEnd,
      slotMinutes,
      apptTimes,
      blocked
    );
    setSlots(
      next.map((s) => ({
        ...s,
        checked: s.reserved
          ? true
          : prev.has(s.time)
          ? prev.get(s.time)
          : !s.blocked,
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotMinutes]);

  useEffect(() => {
    if (!showDayForm) return;
    if (toMinutes(rangeEnd) <= toMinutes(rangeStart)) return;
    const prev = new Map(slots.map((s) => [s.time, s.checked]));
    const apptTimes = dayAppts.map((a) => (a.time || "").slice(0, 5));
    const blocked = dayInfo?.blockedSlots || [];
    const next = buildSlotsInRange(
      rangeStart,
      rangeEnd,
      slotMinutes,
      apptTimes,
      blocked
    );
    setSlots(
      next.map((s) => ({
        ...s,
        checked: s.reserved
          ? true
          : prev.has(s.time)
          ? prev.get(s.time)
          : !s.blocked,
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeStart, rangeEnd]);

  function toggleSlot(i) {
    setSlots(
      slots.map((s, idx) =>
        idx !== i ? s : s.reserved ? s : { ...s, checked: !s.checked }
      )
    );
  }
  function markAll(v) {
    setSlots(slots.map((s) => (s.reserved ? s : { ...s, checked: v })));
  }

  async function saveDay(e) {
    e.preventDefault();
    if (!date) return;
    setMsg("");
    if (toMinutes(rangeEnd) <= toMinutes(rangeStart)) {
      setMsg("El rango debe tener fin mayor que el inicio.");
      return;
    }

    const checkedCount = slots.filter((s) => s.checked && !s.reserved).length;
    const willBeActive = checkedCount > 0;
    if (dayAppts.length > 0 && !willBeActive) {
      alert(`No puedes cerrar ${date}: hay ${dayAppts.length} cita(s).`);
      return;
    }

    const blockedSlots = slots
      .filter((s) => !s.reserved && !s.checked)
      .map((s) => s.time);
    try {
      await api.setAvailability({
        date,
        startTime: rangeStart,
        endTime: rangeEnd,
        slotMinutes: Number(slotMinutes),
        isActive: willBeActive,
        blockedSlots,
      });
      setMsg("Día actualizado correctamente.");
      setReloadToken((t) => t + 1);
    } catch (e) {
      setMsg(e.message);
    }
  }

  // Filtrado de "Ver clientes"
  const filteredClients = useMemo(() => {
    const q = norm(clientQuery);
    if (!q) return clients;
    return clients.filter((c) => {
      const full = norm(
        `${c.firstName || ""} ${c.lastName || ""} ${c.phone || ""} ${
          c.reason || ""
        }`
      );
      return full.includes(q);
    });
  }, [clients, clientQuery]);

  // Filtrado de "Ver citas" (robusto)
  const filteredAppts = useMemo(() => {
    const q = norm(personQuery);
    const d = (filterDay || "").trim(); // YYYY-MM-DD
    const data = (apptsAll || []).filter((a) => {
      if (q) {
        const full = norm(getClientName(a));
        if (!full.includes(q)) return false;
      }
      if (d && a?.date !== d) return false;
      return true;
    });
    return data.sort((x, y) =>
      `${x.date} ${x.time || ""}`.localeCompare(`${y.date} ${y.time || ""}`)
    );
  }, [apptsAll, personQuery, filterDay]);

  return (
    <>
      {/* Salir */}
      <div
        className="logout-box"
        onClick={() => {
          clearAuth();
          nav("/", { replace: true });
        }}
      >
        <span>Salir</span>
      </div>

      {/* Tabs */}
      <div className="nav" style={{ marginTop: 8 }}>
        <button
          className={`btn ${tab === "calendar" ? "primary" : ""}`}
          onClick={() => setTab("calendar")}
        >
          Calendario
        </button>
        <button
          className={`btn ${tab === "clients" ? "primary" : ""}`}
          onClick={() => setTab("clients")}
        >
          Ver clientes
        </button>
        <button
          className={`btn ${tab === "appointments" ? "primary" : ""}`}
          onClick={() => setTab("appointments")}
        >
          Ver citas
        </button>
      </div>

      {/* ===== CALENDARIO ===== */}
      {tab === "calendar" && (
        <div className="row">
          <div className="card">
            <h3>Calendario</h3>
            <MonthCalendar
              onPickDay={pickDay}
              adminMode={true}
              reloadToken={reloadToken}
            />

            {date && (
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <span>
                  Día seleccionado: <strong>{date}</strong>
                  {loadingDay ? " …" : ""}
                </span>
                {isPast ? (
                  <span className="pill">Día pasado (solo lectura)</span>
                ) : (
                  <span className="pill">
                    {dayInfo
                      ? "Edita la configuración en el panel"
                      : "Configura el día con el panel de la derecha"}
                  </span>
                )}
              </div>
            )}

            {/* Citas del día */}
            <div style={{ marginTop: 12 }}>
              <h4>Citas {date || ""}</h4>
              {dayAppts.length === 0 ? (
                <p style={{ opacity: 0.8 }}>No hay citas para este día.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Hora</th>
                      <th>Cliente</th>
                      <th>Motivo</th>
                      <th>Situación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayAppts.map((a) => {
                      const pastRow = date < todayYMD();
                      return (
                        <tr key={a._id}>
                          <td>{(a.time || "").slice(0, 5)}</td>
                          <td>{getClientName(a) || "—"}</td>
                          <td>{a.clientId?.reason || "—"}</td>
                          <td>
                            <StatusPill value={a.status} isPast={pastRow} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Editor del día */}
          {showDayForm && (
            <div className="card">
              <h3 style={{ marginBottom: 8 }}>
                {dayInfo ? "Editar día" : "Configurar día"}: {date || "—"}
                {isPast && (
                  <span className="pill" style={{ marginLeft: 8 }}>
                    Solo lectura
                  </span>
                )}
              </h3>

              <form onSubmit={saveDay}>
                <div className="row">
                  <div>
                    <label>Inicio</label>
                    <input
                      type="time"
                      value={rangeStart}
                      onChange={(e) => setRangeStart(e.target.value)}
                      disabled={isPast}
                    />
                  </div>
                  <div>
                    <label>Fin</label>
                    <input
                      type="time"
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(e.target.value)}
                      disabled={isPast}
                    />
                  </div>
                </div>

                <div className="row">
                  <div>
                    <label>Duración (min)</label>
                    <input
                      type="number"
                      value={slotMinutes}
                      min={5}
                      step={5}
                      onChange={(e) => setSlotMinutes(e.target.value)}
                      disabled={isPast}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      {[15, 30, 45, 60].map((n) => (
                        <button
                          type="button"
                          className="btn"
                          key={n}
                          onClick={() => setSlotMinutes(n)}
                          disabled={isPast}
                        >
                          {n} min
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label>Estado del día</label>
                    <div className="pill" style={{ padding: "10px 12px" }}>
                      {slots.some((s) => s.checked && !s.reserved)
                        ? "Activo (hay franjas marcadas)"
                        : "CERRADO (sin franjas marcadas)"}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => markAll(true)}
                      disabled={isPast}
                    >
                      Marcar todo (en rango)
                    </button>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => markAll(false)}
                      disabled={isPast}
                    >
                      Bloquear todo (en rango)
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  <h4 style={{ marginBottom: 8 }}>
                    Franjas {rangeStart}–{rangeEnd}
                  </h4>
                  <div className="slots" style={{ gap: 10 }}>
                    {slots.length === 0 && (
                      <p style={{ opacity: 0.7 }}>
                        No hay franjas que quepan con esta duración.
                      </p>
                    )}
                    {slots.map((s, i) => (
                      <label
                        key={s.time}
                        className="slot"
                        title={
                          s.reserved
                            ? "Hora reservada"
                            : s.checked
                            ? "Disponible"
                            : "Bloqueada"
                        }
                        style={{
                          borderColor: s.reserved
                            ? "#f97316"
                            : s.checked
                            ? "#22c55e"
                            : "#64748b",
                          background: s.reserved
                            ? "rgba(249,115,22,.12)"
                            : s.checked
                            ? "rgba(34,197,94,.10)"
                            : "rgba(100,116,139,.10)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          opacity: isPast ? 0.65 : 1,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={s.checked}
                          onChange={() => toggleSlot(i)}
                          disabled={s.reserved || isPast}
                        />
                        <span style={{ minWidth: 56, display: "inline-block" }}>
                          {s.time}
                        </span>
                        {s.reserved && (
                          <span style={{ fontSize: 12, color: "#f59e0b" }}>
                            ⛔ Hora reservada
                          </span>
                        )}
                        {!s.reserved && !s.checked && (
                          <span style={{ fontSize: 12, opacity: 0.8 }}>
                            🚫 Bloqueada
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  className="btn primary"
                  disabled={!date || isPast}
                  style={{ marginTop: 10 }}
                >
                  Guardar
                </button>
                {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
              </form>
            </div>
          )}
        </div>
      )}

      {/* ===== CLIENTES ===== */}
      {tab === "clients" && (
        <div className="card">
          <h3>Clientes</h3>

          <div className="row" style={{ marginBottom: 8 }}>
            <div>
              <label>Buscar</label>
              <input
                placeholder="Nombre, apellidos, teléfono o motivo…"
                value={clientQuery}
                onChange={(e) => setClientQuery(e.target.value)}
              />
            </div>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const c = await api.createClient(newClient);
              setClients([c, ...clients]);
              setNewClient({
                firstName: "",
                lastName: "",
                phone: "",
                reason: "",
              });
            }}
          >
            <div className="row">
              <div>
                <label>Nombre</label>
                <input
                  value={newClient.firstName}
                  onChange={(e) =>
                    setNewClient({ ...newClient, firstName: e.target.value })
                  }
                />
              </div>
              <div>
                <label>Apellidos</label>
                <input
                  value={newClient.lastName}
                  onChange={(e) =>
                    setNewClient({ ...newClient, lastName: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="row">
              <div>
                <label>Teléfono</label>
                <input
                  value={newClient.phone}
                  onChange={(e) =>
                    setNewClient({ ...newClient, phone: e.target.value })
                  }
                />
              </div>
              <div>
                <label>Motivo</label>
                <input
                  value={newClient.reason}
                  onChange={(e) =>
                    setNewClient({ ...newClient, reason: e.target.value })
                  }
                />
              </div>
            </div>
            <button className="btn">Añadir</button>
          </form>

          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Motivo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map((c) => {
                  const edit = editingId === c._id;
                  return (
                    <tr key={c._id}>
                      <td>
                        {edit ? (
                          <>
                            <input
                              value={editForm.firstName}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  firstName: e.target.value,
                                })
                              }
                            />
                            <input
                              value={editForm.lastName}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  lastName: e.target.value,
                                })
                              }
                            />
                          </>
                        ) : (
                          `${c.firstName} ${c.lastName}`
                        )}
                      </td>
                      <td>
                        {edit ? (
                          <input
                            value={editForm.phone}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                phone: e.target.value,
                              })
                            }
                          />
                        ) : (
                          c.phone || "—"
                        )}
                      </td>
                      <td>
                        {edit ? (
                          <input
                            value={editForm.reason}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                reason: e.target.value,
                              })
                            }
                          />
                        ) : (
                          c.reason || "—"
                        )}
                      </td>
                      <td>
                        {edit ? (
                          <>
                            <button
                              className="btn primary"
                              disabled={savingEdit}
                              onClick={async () => {
                                setSavingEdit(true);
                                try {
                                  const updated = await api.updateClient(
                                    c._id,
                                    editForm
                                  );
                                  setClients(
                                    clients.map((x) =>
                                      x._id === c._id ? updated : x
                                    )
                                  );
                                  setEditingId(null);
                                  setEditForm({
                                    firstName: "",
                                    lastName: "",
                                    phone: "",
                                    reason: "",
                                  });
                                } finally {
                                  setSavingEdit(false);
                                }
                              }}
                            >
                              Guardar
                            </button>
                            <button
                              className="btn"
                              onClick={() => {
                                setEditingId(null);
                                setEditForm({
                                  firstName: "",
                                  lastName: "",
                                  phone: "",
                                  reason: "",
                                });
                              }}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="btn"
                              onClick={() => {
                                setEditingId(c._id);
                                setEditForm({
                                  firstName: c.firstName || "",
                                  lastName: c.lastName || "",
                                  phone: c.phone || "",
                                  reason: c.reason || "",
                                });
                              }}
                            >
                              Editar
                            </button>
                            <button
                              className="btn"
                              onClick={async () => {
                                if (!confirm("¿Borrar este cliente?")) return;
                                await api.deleteClient(c._id);
                                setClients(
                                  clients.filter((x) => x._id !== c._id)
                                );
                              }}
                            >
                              Borrar
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== VER CITAS ===== */}
      {tab === "appointments" && (
        <div className="card">
          <h3>Ver citas</h3>

          <div className="row" style={{ marginBottom: 8 }}>
            <div>
              <label>Persona (filtra al escribir)</label>
              <input
                placeholder="Escribe nombre o apellidos…"
                value={personQuery}
                onChange={(e) => setPersonQuery(e.target.value)}
              />
            </div>
            <div>
              <label>Fecha</label>
              <input
                type="date"
                value={filterDay}
                onChange={(e) => setFilterDay(e.target.value)}
              />
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Día</th>
                  <th>Hora</th>
                  <th>Persona</th>
                  <th>Motivo</th>
                  <th>Situación</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppts.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ opacity: 0.8 }}>
                      Sin resultados para el filtro.
                    </td>
                  </tr>
                )}
                {filteredAppts.map((a) => {
                  const pastRow = (a.date || "") < todayYMD();
                  return (
                    <tr key={a._id}>
                      <td>{fmtDDMMYYYY(a.date)}</td>
                      <td>{(a.time || "").slice(0, 5)}</td>
                      <td>{getClientName(a) || "—"}</td>
                      <td>{a.clientId?.reason || "—"}</td>
                      <td>
                        <StatusPill value={a.status} isPast={pastRow} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
