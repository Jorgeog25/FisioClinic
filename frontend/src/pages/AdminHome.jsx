import React, { useEffect, useState } from "react";
import MonthCalendar from "../components/MonthCalendar";
import { api } from "../api";

export default function AdminHome() {
  const [tab, setTab] = useState("calendar"); // 'calendar' | 'clients'

  // CALENDARIO / DÍA
  const [date, setDate] = useState("");
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

  useEffect(() => {
    if (tab === "clients") loadClients();
  }, [tab]);
  async function loadClients() {
    const list = await api.listClients();
    setClients(list);
  }

  function pickDay(d) {
    setDate(d);
    setMsg("");
    setShowDayForm(true);
    setAppts([]);
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
      setMsg("Día actualizado.");
    } catch (e) {
      setMsg(e.message);
    }
  }

  async function viewDayAppointments() {
    const list = await api.listAppointments(date);
    setAppts(list);
  }

  async function createClient(e) {
    e.preventDefault();
    const c = await api.createClient(newClient);
    setClients([c, ...clients]);
    setNewClient({ firstName: "", lastName: "", phone: "", reason: "" });
  }

  // === Edición / Borrado de clientes ===
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

  return (
    <>
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
                }}
              >
                <span>
                  Día seleccionado: <strong>{date}</strong>
                </span>
                <button className="btn" onClick={viewDayAppointments}>
                  Ver citas del día
                </button>
                <button
                  className="btn"
                  onClick={() => setShowDayForm((v) => !v)}
                >
                  {showDayForm ? "Cerrar día" : "Abrir día"}
                </button>
              </div>
            )}

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

          {showDayForm && (
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

      {tab === "clients" && (
        <div className="card">
          <h3>Clientes</h3>
          {/* Alta rápida */}
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

          {/* Listado con acciones */}
          <table style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Motivo</th>
                <th style={{ width: 180 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const isEditing = editingId === c._id;
                return (
                  <tr key={c._id}>
                    <td>
                      {isEditing ? (
                        <div className="row">
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
                        </div>
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
                          value={editForm.reason || ""}
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
                            {savingEdit ? "Guardando..." : "Guardar"}
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
