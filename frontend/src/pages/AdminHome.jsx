import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MonthCalendar from "../components/MonthCalendar";
import ChatBox from "../components/ChatBox";
import { api, clearAuth } from "../api";

/* ===== Utils ===== */
function toMinutes(hhmm = "00:00") {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function toHHMM(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function isPastDateTime(date, time = "23:59") {
  if (!date) return false;
  const [Y, M, D] = date.split("-").map(Number);
  const [h, m] = (time || "00:00").slice(0, 5).split(":").map(Number);
  const dt = new Date(Y, M - 1, D, h, m, 0, 0);
  return dt.getTime() < Date.now();
}
function fmtDDMMYYYY(date) {
  if (!date) return "";
  const [Y, M, D] = date.split("-").map(Number);
  return `${String(D).padStart(2, "0")}/${String(M).padStart(2, "0")}/${Y}`;
}
function norm(s) {
  return (s ?? "")
    .toString()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
function getClientName(a) {
  const c = a?.clientId;
  if (!c) return "";
  return `${c.firstName || ""} ${c.lastName || ""}`.trim();
}
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
  const S = toMinutes(start);
  const E = toMinutes(end);
  const step = Math.max(5, Number(slotMinutes) || 60);

  for (let t = S; t + step <= E; t += step) {
    const time = toHHMM(t);
    const reserved = apptSet.has(time);
    const isBlocked = blockedSet.has(time);
    out.push({
      time,
      reserved,
      blocked: isBlocked && !reserved,
      checked: reserved ? true : !isBlocked,
    });
  }
  return out;
}

/* ===== AdminHome ===== */
export default function AdminHome() {
  const nav = useNavigate();

  const [tab, setTab] = useState("calendar"); // calendar | clients | appointments

  // Día seleccionado
  const [date, setDate] = useState("");
  const [isPastDay, setIsPastDay] = useState(false);
  const [loadingDay, setLoadingDay] = useState(false);
  const [dayInfo, setDayInfo] = useState(null);
  const [dayAppts, setDayAppts] = useState([]);
  const [slots, setSlots] = useState([]);
  const [rangeStart, setRangeStart] = useState("09:00");
  const [rangeEnd, setRangeEnd] = useState("17:00");
  const [slotMinutes, setSlotMinutes] = useState(60);
  const [showDayForm, setShowDayForm] = useState(false);
  const [msg, setMsg] = useState("");
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

  // Ver citas (global)
  const [apptsAll, setApptsAll] = useState([]);
  const [personQuery, setPersonQuery] = useState("");
  const [filterDay, setFilterDay] = useState("");

  function logout() {
    clearAuth();
    nav("/", { replace: true });
  }

  /* ===== Data loaders ===== */
  async function loadClients() {
    try {
      const rows = await api.listClients();
      setClients(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error(e);
    }
  }
  async function loadApptsAll() {
    try {
      const rows = await api.appointmentsSummary("1970-01-01", "2100-12-31");
      setApptsAll(Array.isArray(rows) ? rows : []);
    } catch (e) {
      console.error(e);
      setApptsAll([]);
    }
  }

  /* ===== Selección de día en calendario ===== */
  async function pickDay(d, meta = {}) {
    setDate(d);
    setIsPastDay(!!meta.isPast);
    setMsg("");
    setShowDayForm(false);
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

      // Ignoramos canceladas (por robustez, aunque ahora las borres)
      const apptTimes = apptsList
        .filter((a) => (a.status || "").toLowerCase() !== "cancelled")
        .map((a) => (a.time || "").slice(0, 5));
      const blocked = info?.blockedSlots || [];
      setSlots(buildSlotsInRange(start, end, step, apptTimes, blocked));
      setShowDayForm(true);
    } catch (e) {
      console.error(e);
      setMsg(e.message || "No se ha podido cargar el día.");
    } finally {
      setLoadingDay(false);
    }
  }

  /* ===== Guardar disponibilidad del día ===== */
  async function saveDay(e) {
    e.preventDefault();
    if (!date) return;
    setMsg("");
    if (toMinutes(rangeEnd) <= toMinutes(rangeStart)) {
      setMsg("El rango debe terminar después del inicio.");
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
      setMsg("Día actualizado.");
      setReloadToken((x) => x + 1);
    } catch (e) {
      setMsg(e.message || "No se han podido guardar los cambios.");
    }
  }

  /* ===== Pagado ✓ ===== */
  async function togglePaid(appt, checked) {
    const nextStatus = checked
      ? "paid"
      : isPastDateTime(appt.date, appt.time)
      ? "pending_payment"
      : "reserved";
    try {
      const updated = await api.updateAppointment(appt._id, {
        status: nextStatus,
      });
      const status = updated?.status || nextStatus;

      setApptsAll((prev) =>
        prev.map((a) => (a._id === appt._id ? { ...a, status } : a))
      );
      setDayAppts((prev) =>
        prev.map((a) => (a._id === appt._id ? { ...a, status } : a))
      );
    } catch (e) {
      alert(e.message || "No se pudo actualizar el estado.");
    }
  }

  /* ===== Cancelar = borrar cita ===== */
  async function cancelAppointment(appt) {
    if (!confirm("¿Cancelar esta cita?")) return;
    try {
      await api.deleteAppointment(appt._id); // borrar en BD
      setApptsAll((prev) => prev.filter((x) => x._id !== appt._id));
      setDayAppts((prev) => prev.filter((x) => x._id !== appt._id));

      // Si el calendario está en ese día, recomputar slots para que la franja quede libre
      if (date && appt.date === date) {
        await pickDay(date, { isPast: isPastDay });
      }
    } catch (e) {
      alert(e.message || "No se pudo cancelar la cita.");
    }
  }

  /* ===== Effects ===== */
  useEffect(() => {
    if (tab === "clients") loadClients();
    if (tab === "appointments") loadApptsAll();
  }, [tab]);

  /* ===== Derivados ===== */
  const apptsFiltered = useMemo(() => {
    let list = [...apptsAll];
    if (personQuery.trim()) {
      const q = norm(personQuery);
      list = list.filter((a) => norm(getClientName(a)).includes(q));
    }
    if (filterDay) {
      list = list.filter((a) => (a.date || "").startsWith(filterDay));
    }
    return list.sort((x, y) =>
      `${x.date} ${x.time || ""}`.localeCompare(`${y.date} ${y.time || ""}`)
    );
  }, [apptsAll, personQuery, filterDay]);

  return (
    <>
      <div className="topbar">
        <div className="logout-box" onClick={logout}>
          <span>Salir</span>
        </div>

        <div className="tabs">
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
              selectedDate={date} // pinta el morado en el día escogido
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
                {isPastDay ? (
                  <span className="pill">Día pasado (solo lectura)</span>
                ) : dayInfo ? (
                  <span className="pill">
                    Edita la configuración en el panel
                  </span>
                ) : (
                  <span className="pill">
                    Configura el día con el panel de la derecha
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
                      <th>Pagado ✓</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayAppts.map((a) => {
                      const isPaid = (a.status || "").toLowerCase() === "paid";
                      return (
                        <tr key={a._id}>
                          <td>{(a.time || "").slice(0, 5)}</td>
                          <td>{getClientName(a) || "—"}</td>
                          <td>{a.clientId?.reason || "—"}</td>
                          <td>{a.status || "—"}</td>
                          <td>
                            <input
                              type="checkbox"
                              checked={isPaid}
                              onChange={(e) => togglePaid(a, e.target.checked)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Panel de configuración del día */}
          {date && (
            <div className="card">
              <h3 style={{ marginBottom: 8 }}>
                {dayInfo
                  ? "Editar disponibilidad del día"
                  : "Configurar disponibilidad del día"}
              </h3>

              <form onSubmit={saveDay}>
                <div className="row">
                  <div>
                    <label>Inicio</label>
                    <input
                      type="time"
                      value={rangeStart}
                      onChange={(e) => setRangeStart(e.target.value)}
                      disabled={isPastDay}
                    />
                  </div>
                  <div>
                    <label>Fin</label>
                    <input
                      type="time"
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(e.target.value)}
                      disabled={isPastDay}
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
                      disabled={isPastDay}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      {[15, 30, 45, 60].map((n) => (
                        <button
                          type="button"
                          className="btn"
                          key={n}
                          onClick={() => setSlotMinutes(n)}
                          disabled={isPastDay}
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

                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 6,
                    }}
                  >
                    <strong>Franjas del día</strong>
                    <button
                      className="btn"
                      type="button"
                      onClick={() =>
                        setSlots((prev) =>
                          prev.map((s) =>
                            s.reserved ? s : { ...s, checked: true }
                          )
                        )
                      }
                      disabled={isPastDay}
                    >
                      Marcar todo
                    </button>
                    <button
                      className="btn"
                      type="button"
                      onClick={() =>
                        setSlots((prev) =>
                          prev.map((s) =>
                            s.reserved ? s : { ...s, checked: false }
                          )
                        )
                      }
                      disabled={isPastDay}
                    >
                      Desmarcar todo
                    </button>
                  </div>

                  <div className="slots" style={{ gap: 10 }}>
                    {slots.map((s) => (
                      <label
                        key={`${date}-${s.time}`}
                        className={`slot ${
                          s.reserved ? "busy" : s.checked ? "free" : "blocked"
                        }`}
                        style={{
                          cursor:
                            s.reserved || isPastDay ? "not-allowed" : "pointer",
                        }}
                      >
                        <input
                          type="checkbox"
                          disabled={s.reserved || isPastDay}
                          checked={s.checked}
                          onChange={() =>
                            setSlots((prev) =>
                              prev.map((x) =>
                                x.time === s.time
                                  ? { ...x, checked: !x.checked }
                                  : x
                              )
                            )
                          }
                        />
                        <span style={{ minWidth: 56, display: "inline-block" }}>
                          {s.time}
                        </span>
                        {s.reserved && (
                          <span style={{ fontSize: 12, opacity: 0.8 }}>
                            ✅ Reservada
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
                  disabled={!date || isPastDay}
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
                placeholder="Nombre o apellidos…"
                value={clientQuery}
                onChange={(e) => setClientQuery(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }} />
            <div>
              <label>Nuevo cliente</label>
              <div className="row">
                <input
                  placeholder="Nombre"
                  value={newClient.firstName}
                  onChange={(e) =>
                    setNewClient({ ...newClient, firstName: e.target.value })
                  }
                />
                <input
                  placeholder="Apellidos"
                  value={newClient.lastName}
                  onChange={(e) =>
                    setNewClient({ ...newClient, lastName: e.target.value })
                  }
                />
              </div>
              <div className="row">
                <input
                  placeholder="Teléfono"
                  value={newClient.phone}
                  onChange={(e) =>
                    setNewClient({ ...newClient, phone: e.target.value })
                  }
                />
                <input
                  placeholder="Motivo"
                  value={newClient.reason}
                  onChange={(e) =>
                    setNewClient({ ...newClient, reason: e.target.value })
                  }
                />
              </div>
              <button
                className="btn"
                onClick={async () => {
                  const created = await api.createClient(newClient);
                  setClients((prev) => [...prev, created]);
                  setNewClient({
                    firstName: "",
                    lastName: "",
                    phone: "",
                    reason: "",
                  });
                }}
              >
                Añadir
              </button>
            </div>
          </div>

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
              {clients
                .filter((c) => {
                  const q = norm(clientQuery);
                  if (!q) return true;
                  return norm(`${c.firstName} ${c.lastName}`).includes(q);
                })
                .map((c) => {
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
                              className="btn"
                              disabled={savingEdit}
                              onClick={async () => {
                                try {
                                  setSavingEdit(true);
                                  await api.updateClient(c._id, editForm);
                                  setClients((prev) =>
                                    prev.map((x) =>
                                      x._id === c._id
                                        ? { ...x, ...editForm }
                                        : x
                                    )
                                  );
                                  setEditingId(null);
                                } finally {
                                  setSavingEdit(false);
                                }
                              }}
                            >
                              Guardar
                            </button>
                            <button
                              className="btn"
                              onClick={() => setEditingId(null)}
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
                                setClients((prev) =>
                                  prev.filter((x) => x._id !== c._id)
                                );
                              }}
                            >
                              Borrar
                            </button>
                            <button
                              className="btn"
                              onClick={() => {
                                /* opcional chat */
                              }}
                              title="Chat"
                            >
                              Chat
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
      )}

      {/* ===== VER CITAS ===== */}
      {tab === "appointments" && (
        <div className="card">
          <h3>Ver citas</h3>

          <div className="row" style={{ marginBottom: 8 }}>
            <div>
              <label>Persona</label>
              <input
                placeholder="Nombre o apellidos…"
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

          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Día</th>
                  <th>Hora</th>
                  <th>Persona</th>
                  <th>Motivo</th>
                  <th>Situación</th>
                  <th>Pagado ✓</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {apptsFiltered.map((a) => {
                  const isPaid = (a.status || "").toLowerCase() === "paid";
                  return (
                    <tr key={a._id}>
                      <td>{fmtDDMMYYYY(a.date)}</td>
                      <td>{(a.time || "").slice(0, 5)}</td>
                      <td>{getClientName(a) || "—"}</td>
                      <td>{a.clientId?.reason || "—"}</td>
                      <td>{a.status || "—"}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={isPaid}
                          onChange={(e) => togglePaid(a, e.target.checked)}
                          title="Marcar como pagado"
                        />
                      </td>
                      <td>
                        <button
                          className="btn"
                          onClick={() => cancelAppointment(a)}
                        >
                          Cancelar
                        </button>
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
