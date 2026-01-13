import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MonthCalendar from "../components/MonthCalendar";
import ChatBox from "../components/ChatBox";
import { api, clearAuth, graphqlRequest } from "../api";

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
function firstDayOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function lastDayOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ===== AdminHome ===== */
export default function AdminHome() {
  const nav = useNavigate();

  const [tab, setTab] = useState("calendar"); // calendar | clients | appointments | payments

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
  const [msg, setMsg] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  // Clientes
  const [clients, setClients] = useState([]);
  const [clientQuery, setClientQuery] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    reason: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [chatClient, setChatClient] = useState(null);

  // Nuevo cliente
  const [newClient, setNewClient] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    reason: "",
  });
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");

  // Ver citas (global)
  const [apptsAll, setApptsAll] = useState([]);
  const [personQuery, setPersonQuery] = useState("");
  const [filterDay, setFilterDay] = useState(""); // YYYY-MM-DD
  const [loadingAppts, setLoadingAppts] = useState(false);

  // ===== PAGOS (Orders) =====
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [ordersStatus, setOrdersStatus] = useState(""); // "" | "completed" | ...

  function logout() {
    clearAuth();
    nav("/", { replace: true });
  }

  /* ===== Data loaders ===== */
  async function loadClients() {
    try {
      const rows = await api.listClients();
      setClients(Array.isArray(rows) ? rows : []);
    } catch {}
  }

  // Carga citas del día o del mes, usando SOLO /availability y /appointments?date=
  async function loadApptsRange() {
    setLoadingAppts(true);
    try {
      let dates = [];

      if (filterDay) {
        // un solo día
        dates = [filterDay];
      } else {
        // todo el mes actual
        const now = new Date();
        const from = ymd(firstDayOfMonth(now));
        const to = ymd(lastDayOfMonth(now));

        // pedimos días activos y de ahí sacamos fechas
        const days = await api.listAvailability(from, to);
        dates = (days || []).map((d) => d?.date).filter(Boolean);
        // si por lo que sea no devuelve nada, recorremos el mes completo
        if (dates.length === 0) {
          const start = firstDayOfMonth(now);
          const end = lastDayOfMonth(now);
          const tmp = new Date(start);
          while (tmp <= end) {
            dates.push(ymd(tmp));
            tmp.setDate(tmp.getDate() + 1);
          }
        }
      }

      // pedir citas por cada día
      const chunks = await Promise.all(
        dates.map((d) =>
          api
            .listAppointments(d)
            .then((rows) => (Array.isArray(rows) ? rows : []))
            .catch(() => [])
        )
      );
      // aplanar, quitar canceladas y ordenar
      const flat = chunks
        .flat()
        .filter((a) => (a.status || "").toLowerCase() !== "cancelled")
        .sort((x, y) =>
          `${x.date} ${x.time || ""}`.localeCompare(`${y.date} ${y.time || ""}`)
        );

      setApptsAll(flat);
    } finally {
      setLoadingAppts(false);
    }
  }

  /* ===== Selección de día en calendario ===== */
  async function pickDay(d, meta = {}) {
    setDate(d);
    setIsPastDay(!!meta.isPast);
    setMsg("");
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

      const apptTimes = apptsList
        .filter((a) => (a.status || "").toLowerCase() !== "cancelled")
        .map((a) => (a.time || "").slice(0, 5));
      const blocked = info?.blockedSlots || [];
      setSlots(buildSlotsInRange(start, end, step, apptTimes, blocked));
    } catch (e) {
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

  /* ===== Cancelar cita ===== */
  async function cancelAppointment(appt) {
    if (!confirm("¿Cancelar esta cita?")) return;
    try {
      await api.updateAppointment(appt._id, { status: "cancelled" });
      setApptsAll((prev) => prev.filter((x) => x._id !== appt._id));
      setDayAppts((prev) => prev.filter((x) => x._id !== appt._id));
      if (date && appt.date === date)
        await pickDay(date, { isPast: isPastDay });
    } catch (e) {
      alert(e.message || "No se pudo cancelar la cita.");
    }
  }

  /* ===== Crear cliente ===== */
  async function createClient(e) {
    e.preventDefault();
    setCreateMsg("");
    const fn = newClient.firstName.trim();
    const ln = newClient.lastName.trim();
    const ph = newClient.phone.trim();

    if (!fn || !ln || !ph) {
      setCreateMsg("Nombre, apellidos y teléfono son obligatorios.");
      return;
    }

    try {
      setCreating(true);
      const created = await api.createClient({
        firstName: fn,
        lastName: ln,
        phone: ph,
        reason: newClient.reason.trim(),
      });
      setClients((prev) => [...prev, created]);
      setNewClient({ firstName: "", lastName: "", phone: "", reason: "" });
      setCreateMsg("Cliente añadido.");
    } catch (e) {
      setCreateMsg(e.message || "No se pudo crear el cliente.");
    } finally {
      setCreating(false);
    }
  }

  /* ===== Orders loader (GraphQL) ===== */
  async function loadOrders() {
    setLoadingOrders(true);
    setOrdersError("");
    try {
      const query = `
        query ($status: String) {
          allOrders(status: $status) {
            id
            total
            status
            createdAt
            appointments {
              date
              time
              status
              clientId {
                firstName
                lastName
              }
            }
          }
        }
      }
    `;

    const variables = {
      status: ordersStatus || null,
    };

      const data = await graphqlRequest(query, variables);
      setOrders(data?.allOrders || []);
    } catch (e) {
      setOrdersError(e.message || "Error cargando pedidos");
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }


  /* ===== Effects ===== */
  useEffect(() => {
    if (tab === "clients") loadClients();
    if (tab === "appointments") loadApptsRange();
    if (tab === "payments") loadOrders();
  }, [tab]); // eslint-disable-line

  /* Re-cargar cuando cambia el filtro de día en la vista Ver citas */
  useEffect(() => {
    if (tab === "appointments") loadApptsRange();
  }, [filterDay]); // eslint-disable-line

  /* Re-cargar pedidos al cambiar filtro de estado */
  useEffect(() => {
    if (tab === "payments") loadOrders();
  }, [ordersStatus]); // eslint-disable-line

  /* ===== Derivados ===== */
  const apptsFiltered = useMemo(() => {
    let list = [...apptsAll];
    if (personQuery.trim()) {
      const q = norm(personQuery);
      list = list.filter((a) => norm(getClientName(a)).includes(q));
    }
    return list;
  }, [apptsAll, personQuery]);

  const ordersFiltered = useMemo(() => {
  // Todos
  if (!ordersStatus) return orders;

  // Completed (status de Order)
  if (ordersStatus === "completed") {
    return orders.filter((o) => (o.status || "").toLowerCase() === "completed");
  }

  // Pending_payment (por status de Appointment)
  if (ordersStatus === "pending_payment") {
    return orders.filter((o) =>
      (o.appointments || []).some(
        (a) => (a.status || "").toLowerCase() === "pending_payment"
      )
    );
  }

  return orders;
}, [orders, ordersStatus]);


  return (
    <>
      <div className="topbar">
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
          <button
            className={`btn ${tab === "payments" ? "primary" : ""}`}
            onClick={() => setTab("payments")}
          >
            Pagos
          </button>
        </div>
        <div className="logout-box" onClick={logout}>
          <span>Salir</span>
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
              selectedDate={date}
            />

            {date && (
              <>
                <div style={{ marginTop: 12 }}>
                  <strong>Día seleccionado:</strong> {date}{" "}
                  {loadingDay ? "…" : ""}
                </div>

                <div style={{ marginTop: 12 }}>
                  <h4>Citas {date}</h4>
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
                          const isPaid =
                            (a.status || "").toLowerCase() === "paid";
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
                                  onChange={(e) =>
                                    togglePaid(a, e.target.checked)
                                  }
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Panel configuración del día */}
          {date && (
            <div className="card">
              <h3>Disponibilidad del día</h3>

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
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <strong>Franjas del día</strong>
                  <div className="slots" style={{ gap: 10, marginTop: 6 }}>
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

          {/* Formulario nuevo cliente */}
          <form onSubmit={createClient} style={{ marginBottom: 12 }}>
            <div className="row">
              <div>
                <label>Nombre*</label>
                <input
                  placeholder="Nombre"
                  value={newClient.firstName}
                  onChange={(e) =>
                    setNewClient({ ...newClient, firstName: e.target.value })
                  }
                />
              </div>
              <div>
                <label>Apellidos*</label>
                <input
                  placeholder="Apellidos"
                  value={newClient.lastName}
                  onChange={(e) =>
                    setNewClient({ ...newClient, lastName: e.target.value })
                  }
                />
              </div>
              <div>
                <label>Teléfono*</label>
                <input
                  placeholder="Teléfono"
                  value={newClient.phone}
                  onChange={(e) =>
                    setNewClient({ ...newClient, phone: e.target.value })
                  }
                />
              </div>
              <div style={{ minWidth: 220 }}>
                <label>Motivo</label>
                <input
                  placeholder="Motivo (opcional)"
                  value={newClient.reason}
                  onChange={(e) =>
                    setNewClient({ ...newClient, reason: e.target.value })
                  }
                />
              </div>
              <div style={{ alignSelf: "end" }}>
                <button className="btn primary" disabled={creating}>
                  Añadir
                </button>
              </div>
            </div>
            {createMsg && <p style={{ marginTop: 6 }}>{createMsg}</p>}
          </form>

          <div className="row" style={{ marginBottom: 8 }}>
            <div>
              <label>Buscar</label>
              <input
                placeholder="Nombre o apellidos…"
                value={clientQuery}
                onChange={(e) => setClientQuery(e.target.value)}
              />
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
                              onClick={() => setChatClient(c)}
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

          {chatClient && (
            <div style={{ marginTop: 12 }}>
              <h4>
                Chat con {chatClient.firstName} {chatClient.lastName}
              </h4>
              <ChatBox room={`client:${chatClient._id}`} />
              <div style={{ marginTop: 8 }}>
                <button className="btn" onClick={() => setChatClient(null)}>
                  Cerrar chat
                </button>
              </div>
            </div>
          )}
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
            <div style={{ alignSelf: "end" }}>
              <button
                className="btn"
                onClick={loadApptsRange}
                disabled={loadingAppts}
              >
                {loadingAppts ? "Cargando…" : "Actualizar"}
              </button>
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
                {apptsFiltered.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ opacity: 0.7, padding: 10 }}>
                      {loadingAppts
                        ? "Cargando…"
                        : "No hay citas (cambia el día o pulsa Actualizar)."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== PAGOS (ORDERS) ===== */}
      {tab === "payments" && (
        <div className="card">
          <h3>Pagos</h3>

          <div className="row" style={{ marginBottom: 8 }}>
            <div>
              <label>Estado</label>
              <select
                value={ordersStatus}
                onChange={(e) => setOrdersStatus(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="completed">completed</option>
                <option value="pending_payment">pending_payment</option>
              </select>
            </div>
            <div style={{ alignSelf: "end" }}>
              <button
                className="btn"
                onClick={loadOrders}
                disabled={loadingOrders}
              >
                {loadingOrders ? "Cargando…" : "Actualizar"}
              </button>
            </div>
          </div>

          {ordersError && <p style={{ color: "red" }}>{ordersError}</p>}

          {!loadingOrders && orders.length === 0 && (
            <p style={{ opacity: 0.8 }}>No hay pagos registrados.</p>
          )}

          {orders.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Citas</th>
                    <th>Total (€)</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersFiltered.map((o) => {
                    const firstClient = o.appointments
                      ?.map(a => a.clientId)
                      .find(Boolean);

                    const clientName = firstClient
                      ? `${firstClient.firstName} ${firstClient.lastName}`
                      : "—";

                    return (
                      <tr key={o.id}>
                        <td>
                          {o.createdAt
                            ? new Date(o.createdAt).toLocaleString()
                            : "—"}
                        </td>
                        <td>{clientName || "—"}</td>
                        <td>
                          {(o.appointments || []).map((a, idx) => (
                            <div key={idx}>
                              {a.date} {(a.time || "").slice(0, 5)}
                            </div>
                          ))}
                        </td>
                        <td>{o.total} €</td>
                        <td>{o.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
