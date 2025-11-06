import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MonthCalendar from "../components/MonthCalendar";
import { api, clearAuth } from "../api";

/** Utils tiempo */
function toMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function toHHMM(min) {
  const h = Math.floor(min / 60),
    m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Genera slots SOLO dentro del rango [start,end) con paso slotMinutes.
 * Solo añade los que CABEN COMPLETOS dentro del rango (start + slotMinutes <= end).
 */
function buildSlotsInRange(
  start,
  end,
  slotMinutes,
  apptsTimes = [],
  blocked = []
) {
  const out = [];
  const apptSet = new Set(apptsTimes);
  const blockedSet = new Set(blocked || []);
  const S = toMinutes(start),
    E = toMinutes(end);
  const step = Math.max(5, Number(slotMinutes) || 60);

  let t = S;
  while (t + step <= E) {
    const time = toHHMM(t);
    const reserved = apptSet.has(time);
    const blockedManual = !reserved && blockedSet.has(time);
    out.push({
      time,
      reserved,
      blocked: blockedManual,
      // Reservadas: checked=true (pero disabled), para evitar falsos avisos
      checked: reserved ? true : !blockedManual,
    });
    t += step;
  }
  return out;
}

export default function AdminHome() {
  const nav = useNavigate();

  // pestañas
  const [tab, setTab] = useState("calendar");

  // selección de día
  const [date, setDate] = useState("");
  const [isPast, setIsPast] = useState(false);

  // info del día
  const [dayInfo, setDayInfo] = useState(null); // {date, startTime, endTime, slotMinutes, isActive, blockedSlots}
  const [dayAppts, setDayAppts] = useState([]); // citas del día
  const [loadingDay, setLoadingDay] = useState(false);

  // editor (por rango)
  const [showDayForm, setShowDayForm] = useState(false);
  const [slotMinutes, setSlotMinutes] = useState(60);
  const [rangeStart, setRangeStart] = useState("09:00");
  const [rangeEnd, setRangeEnd] = useState("17:00");
  const [slots, setSlots] = useState([]);
  const [msg, setMsg] = useState("");

  // refrescar calendario
  const [reloadToken, setReloadToken] = useState(0);

  // CLIENTES
  const [clients, setClients] = useState([]);
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

  function logout() {
    clearAuth();
    nav("/", { replace: true });
  }

  useEffect(() => {
    if (tab === "clients") loadClients();
  }, [tab]);
  async function loadClients() {
    try {
      setClients(await api.listClients());
    } catch (e) {
      console.error(e);
    }
  }

  // ===== Seleccionar día: ahora muestra citas + horario automáticamente
  async function pickDay(d, meta = {}) {
    setDate(d);
    setIsPast(!!meta.isPast);
    setMsg("");
    setShowDayForm(false);
    setSlots([]);
    setLoadingDay(true);
    try {
      // disponibilidad del día
      const rng = await api.listAvailability(d, d);
      const info = Array.isArray(rng) ? rng.find((x) => x.date === d) : null;
      setDayInfo(info || null);

      // citas del día
      const list = await api.listAppointments(d);
      const apptsList = Array.isArray(list) ? list : [];
      setDayAppts(apptsList);

      // rango por defecto (si no hay, 09:00–17:00 y 60min)
      const start = info?.startTime || "09:00";
      const end = info?.endTime || "17:00";
      const step = info?.slotMinutes || 60;
      setRangeStart(start);
      setRangeEnd(end);
      setSlotMinutes(step);

      // normaliza horas de citas a HH:mm
      const apptTimes = apptsList.map((a) => (a.time || "").slice(0, 5));
      const blocked = info?.blockedSlots || [];
      setSlots(buildSlotsInRange(start, end, step, apptTimes, blocked));

      // muestra el panel a la derecha SIEMPRE (si es pasado, será read-only)
      setShowDayForm(true);
    } catch (e) {
      setDayInfo(null);
      setDayAppts([]);
      setSlots([]);
    } finally {
      setLoadingDay(false);
    }
  }

  // abrir editor (sigue disponible por si lo llamas desde otro sitio)
  function openFormForDay() {
    if (isPast) return;
    const info = dayInfo;
    const start = info?.startTime || rangeStart;
    const end = info?.endTime || rangeEnd;
    const step = info?.slotMinutes || slotMinutes;
    setRangeStart(start);
    setRangeEnd(end);
    setSlotMinutes(step);

    const apptTimes = dayAppts.map((a) => (a.time || "").slice(0, 5));
    const blocked = info?.blockedSlots || [];
    setSlots(buildSlotsInRange(start, end, step, apptTimes, blocked));
    setShowDayForm(true);
  }

  // regenerar slots al cambiar duración o rango
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
      slots.map((s, idx) => {
        if (idx !== i) return s;
        if (s.reserved) return s; // no se puede tocar
        return { ...s, checked: !s.checked };
      })
    );
  }

  function markAll(v) {
    setSlots(slots.map((s) => (s.reserved ? s : { ...s, checked: v })));
  }

  // Guardar: horario = rango; activo si hay alguna franja marcada (no reservada)
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

    // No cerrar si hay citas
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

      // refresca datos del día
      const rng = await api.listAvailability(date, date);
      const info = Array.isArray(rng) ? rng.find((x) => x.date === date) : null;
      setDayInfo(info || null);

      const list = await api.listAppointments(date);
      setDayAppts(Array.isArray(list) ? list : []);

      // reconstruye slots con lo recién guardado
      const apptTimes = (Array.isArray(list) ? list : []).map((a) =>
        (a.time || "").slice(0, 5)
      );
      setSlots(
        buildSlotsInRange(
          rangeStart,
          rangeEnd,
          slotMinutes,
          apptTimes,
          blockedSlots
        )
      );

      // 🔄 refresca calendario para ver el color del día
      setReloadToken((t) => t + 1);
    } catch (e) {
      setMsg(e.message);
    }
  }

  // ----- CRUD clientes -----
  async function createClient(e) {
    e.preventDefault();
    const c = await api.createClient(newClient);
    setClients([c, ...clients]);
    setNewClient({ firstName: "", lastName: "", phone: "", reason: "" });
  }
  function startEdit(c) {
    setEditingId(c._id);
    setEditForm({
      firstName: c.firstName || "",
      lastName: c.lastName || "",
      phone: c.phone || "",
      reason: c.reason || "",
    });
  }
  function cancelEdit() {
    setEditingId(null);
    setEditForm({ firstName: "", lastName: "", phone: "", reason: "" });
  }
  async function saveEdit(id) {
    setSavingEdit(true);
    try {
      const updated = await api.updateClient(id, editForm);
      setClients(clients.map((c) => (c._id === id ? updated : c)));
      cancelEdit();
    } catch (e) {
      alert(e.message);
    } finally {
      setSavingEdit(false);
    }
  }
  async function removeClient(id) {
    const ok = confirm(
      "¿Seguro que deseas borrar este cliente? También se eliminarán sus citas y pagos."
    );
    if (!ok) return;
    try {
      await api.deleteClient(id);
      setClients(clients.filter((c) => c._id !== id));
    } catch (e) {
      alert(e.message);
    }
  }

  const hasInfo = !!dayInfo;
  const activePreview = slots.some((s) => s.checked && !s.reserved);

  return (
    <>
      {/* 🔴 Cerrar sesión */}
      <div className="logout-box" onClick={logout}>
        <span>
          <svg xmlns="http://www3.org/2000/svg" viewBox="0 0 24 24">
            <path
              d="M16 13v-2H7V8l-5 4 5 4v-3h9zm3-10H5c-1.1 0-2 .9-2 
            2v6h2V5h14v14H5v-6H3v6c0 1.1.9 2 2 
            2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"
            />
          </svg>
          Salir
        </span>
      </div>

      {/* Pestañas */}
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
      </div>

      {/* ======== CALENDARIO ======== */}
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
                {!isPast && (
                  <>
                    {!hasInfo && (
                      <span className="pill">
                        Configura el día con el panel de la derecha
                      </span>
                    )}
                    {hasInfo && (
                      <span className="pill">
                        Edita la configuración en el panel
                      </span>
                    )}
                  </>
                )}
                {isPast && (
                  <span className="pill">Día pasado (solo lectura)</span>
                )}
              </div>
            )}

            {/* Citas SIEMPRE visibles al seleccionar el día */}
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
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayAppts.map((a) => (
                      <tr key={a._id}>
                        <td>{(a.time || "").slice(0, 5)}</td>
                        <td>
                          {a.clientId
                            ? `${a.clientId.firstName} ${a.clientId.lastName}`
                            : "—"}
                        </td>
                        <td>{a.clientId?.reason || "—"}</td>
                        <td>{a.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ======== EDITOR POR RANGO ======== */}
          {showDayForm && (
            <div className="card">
              <h3 style={{ marginBottom: 8 }}>
                {hasInfo ? "Editar día" : "Configurar día"}: {date || "—"}
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
                      {activePreview
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

                {/* Slots del rango */}
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
                  <p style={{ marginTop: 8, opacity: 0.85 }}>
                    Marca las horas que estarán disponibles. Sólo se generan
                    franjas que <strong>caben completas</strong> dentro del
                    rango.
                  </p>
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

      {/* ======== CLIENTES ======== */}
      {tab === "clients" && (
        <div className="card">
          <h3>Clientes</h3>
          <form onSubmit={createClient}>
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

          <table style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Motivo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const isEditing = editingId === c._id;
                return (
                  <tr key={c._id}>
                    <td>
                      {isEditing ? (
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
                      {isEditing ? (
                        <input
                          value={editForm.phone}
                          onChange={(e) =>
                            setEditForm({ ...editForm, phone: e.target.value })
                          }
                        />
                      ) : (
                        c.phone
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          value={editForm.reason}
                          onChange={(e) =>
                            setEditForm({ ...editForm, reason: e.target.value })
                          }
                        />
                      ) : (
                        c.reason || "—"
                      )}
                    </td>
                    <td>
                      {!isEditing ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button className="btn" onClick={() => startEdit(c)}>
                            Editar
                          </button>
                          <button
                            className="btn"
                            onClick={() => removeClient(c._id)}
                          >
                            Borrar
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            className="btn primary"
                            disabled={savingEdit}
                            onClick={() => saveEdit(c._id)}
                          >
                            Guardar
                          </button>
                          <button className="btn" onClick={cancelEdit}>
                            Cancelar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
