import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MonthCalendar from "../components/MonthCalendar";
import { api, clearAuth } from "../api";

export default function AdminHome() {
  const nav = useNavigate();

  const [tab, setTab] = useState("calendar"); // 'calendar' | 'clients'

  // CALENDARIO / DÍA
  const [date, setDate] = useState("");
  const [isPast, setIsPast] = useState(false);
  const [showDayForm, setShowDayForm] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [slotMinutes, setSlotMinutes] = useState(60);
  const [isActive, setIsActive] = useState(true);
  const [msg, setMsg] = useState("");
  const [appts, setAppts] = useState([]);

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

  // Cerrar sesión
  function logout() {
    clearAuth();
    nav("/", { replace: true });
  }

  // Cargar clientes
  useEffect(() => {
    if (tab === "clients") loadClients();
  }, [tab]);
  async function loadClients() {
    try {
      const list = await api.listClients();
      setClients(list);
    } catch (e) {
      console.error(e);
    }
  }

  // Seleccionar día
  function pickDay(d, meta = {}) {
    setDate(d);
    setIsPast(!!meta.isPast);
    setMsg("");
    setAppts([]);
    setShowDayForm(!meta.isPast); // Si es pasado, no se abre el formulario
  }

  async function saveDay(e) {
    e.preventDefault();
    setMsg("");
    try {
      await api.setAvailability({
        date,
        startTime,
        endTime,
        slotMinutes: Number(slotMinutes),
        isActive,
      });
      setMsg("Día actualizado correctamente.");
    } catch (e) {
      setMsg(e.message);
    }
  }

  async function viewDayAppointments() {
    try {
      const list = await api.listAppointments(date);
      setAppts(list);
    } catch (e) {
      setMsg(e.message);
    }
  }

  // CRUD clientes
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
    const ok = confirm("¿Seguro que deseas borrar este cliente?");
    if (!ok) return;
    try {
      await api.deleteClient(id);
      setClients(clients.filter((c) => c._id !== id));
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <>
      {/* 🔴 Botón de cerrar sesión flotante */}
      <div className="logout-box" onClick={logout}>
        <span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path
              d="M16 13v-2H7V8l-5 4 5 4v-3h9zm3-10H5c-1.1 0-2 .9-2 
            2v6h2V5h14v14H5v-6H3v6c0 1.1.9 2 2 
            2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"
            />
          </svg>
          Salir
        </span>
      </div>

      {/* 🔹 Pestañas principales */}
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
            <MonthCalendar onPickDay={pickDay} adminMode={true} />

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
                </span>
                <button className="btn" onClick={viewDayAppointments}>
                  Ver citas del día
                </button>

                {/* Solo editar días futuros o de hoy */}
                {!isPast && (
                  <button
                    className="btn"
                    onClick={() => setShowDayForm((v) => !v)}
                  >
                    {showDayForm ? "Cerrar día" : "Abrir día"}
                  </button>
                )}

                {isPast && (
                  <span className="pill" title="No editable">
                    Día pasado (no editable)
                  </span>
                )}
              </div>
            )}

            {/* Mostrar citas */}
            {appts.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <h4>Citas {date}</h4>
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
                    {appts.map((a) => (
                      <tr key={a._id}>
                        <td>{a.time}</td>
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
              </div>
            )}
          </div>

          {/* Formulario de configuración (solo si no es pasado) */}
          {showDayForm && !isPast && (
            <div className="card">
              <h3>Configurar día: {date || "—"}</h3>
              <form onSubmit={saveDay}>
                <div className="row">
                  <div>
                    <label>Inicio</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Fin</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>
                <div className="row">
                  <div>
                    <label>Duración (min)</label>
                    <input
                      type="number"
                      value={slotMinutes}
                      onChange={(e) => setSlotMinutes(e.target.value)}
                    />
                  </div>
                  <div>
                    <label>Activo</label>
                    <select
                      value={isActive ? "1" : "0"}
                      onChange={(e) => setIsActive(e.target.value === "1")}
                    >
                      <option value="1">Sí</option>
                      <option value="0">No</option>
                    </select>
                  </div>
                </div>
                <button className="btn primary" disabled={!date}>
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
