import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MonthCalendar from "../components/MonthCalendar";
import ChatBox from "../components/ChatBox";
import { api, clearAuth, getUser } from "../api";

// ===== Utils =====
function toMinutes(hhmm) {
  const [h, m] = (hhmm || "00:00").split(":").map(Number);
  return h * 60 + m;
}
function toHHMM(min) {
  const h = Math.floor(min / 60),
    m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function isPastDateTime(date, time) {
  if (!date) return false;
  const now = new Date();
  const [Y, M, D] = date.split("-").map(Number);
  const [h, m] = (time || "00:00").slice(0, 5).split(":").map(Number);
  const dt = new Date(Y, M - 1, D, h, m, 0, 0);
  return dt.getTime() < now.getTime();
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
    if (!reserved && !isBlocked) out.push(time);
  }
  return out;
}

export default function ClientHome() {
  const nav = useNavigate();

  const [date, setDate] = useState("");
  const [slots, setSlots] = useState([]); // array de strings "HH:MM"
  const [selectedTime, setSelectedTime] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const [history, setHistory] = useState([]);

  const me = getUser();
  const myRoom = me?.clientId ? `client:${me.clientId}` : null;

  function logout() {
    clearAuth();
    nav("/", { replace: true });
  }

  // Carga historial al entrar
  useEffect(() => {
    api
      .myHistory()
      .then((h) => setHistory(Array.isArray(h) ? h : []))
      .catch(() => {});
  }, []);

  // Cargar huecos del día seleccionado usando las mismas APIs que Admin
  async function fetchSlots(day) {
    setDate(day);
    setMsg("");
    setSelectedTime("");
    setSlots([]);
    if (!day) return;

    setLoading(true);
    try {
      // 1) Disponibilidad del día
      const avail = await api.listAvailability(day, day);
      const info = Array.isArray(avail)
        ? avail.find((x) => x.date === day)
        : null;

      // Si no hay configuración para el día -> no hay horas
      if (!info || info.isActive === false) {
        setSlots([]);
        return;
      }

      const start = info.startTime || "09:00";
      const end = info.endTime || "17:00";
      const step = info.slotMinutes || 60;
      const blocked = info.blockedSlots || [];

      // 2) Citas ya reservadas de ese día
      const appts = await api.listAppointments(day);
      const apptTimes = (Array.isArray(appts) ? appts : [])
        .filter((a) => (a.status || "").toLowerCase() !== "cancelled") // 👈 ignora canceladas
        .map((a) => (a.time || "").slice(0, 5));

      // 3) Construir huecos libres
      let free = buildSlotsInRange(start, end, step, apptTimes, blocked);

      // 4) Si el día es hoy, filtra horas ya pasadas
      free = free.filter((t) => !isPastDateTime(day, t));

      setSlots(free);
    } catch (e) {
      setMsg(e.message || "No se han podido cargar las horas.");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }

  async function confirmBooking() {
    if (!date || !selectedTime) return;
    setMsg("");
    try {
      const user = getUser(); // viene de tu api.js
      await api.createAppointment({
        date,
        time: selectedTime,
        clientId: user?.clientId, // 👈 obligatorio si el backend aún lo exige
      });
      setMsg("Cita reservada correctamente.");
      setSelectedTime("");
      await fetchSlots(date); // recarga huecos
      const hist = await api.myHistory();
      setHistory(Array.isArray(hist) ? hist : []);
    } catch (e) {
      setMsg(e.message || "No se ha podido crear la cita.");
    }
  }

  // Etiqueta auxiliar
  const emptyLabel = useMemo(() => {
    if (loading) return "Cargando horas…";
    return "No hay horas disponibles.";
  }, [loading]);

  return (
    <>
      {/* Botón salir */}
      <div className="logout-box" onClick={logout}>
        <span>Salir</span>
      </div>

      <div className="row">
        {/* Pedir cita */}
        <div className="card">
          <h3>Pedir cita</h3>
          <MonthCalendar
            onPickDay={fetchSlots}
            adminMode={false}
            selectedDate={date}
          />

          {date && (
            <div style={{ marginTop: 10 }}>
              <p>
                Horas disponibles el <strong>{date}</strong>
              </p>

              {/* Lista de horas como radios + botón Confirmar */}
              <div className="slots" style={{ gap: 10 }}>
                {(!Array.isArray(slots) || slots.length === 0) && (
                  <p style={{ opacity: 0.7 }}>{emptyLabel}</p>
                )}

                {Array.isArray(slots) &&
                  slots.map((t) => (
                    <label
                      key={`${date}-${t}`}
                      className="slot free"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        cursor: "pointer",
                      }}
                      onClick={() => setSelectedTime(t)}
                    >
                      <input
                        type="radio"
                        name="slot"
                        checked={selectedTime === t}
                        onChange={() => setSelectedTime(t)}
                      />
                      <span style={{ minWidth: 56, display: "inline-block" }}>
                        {t}
                      </span>
                    </label>
                  ))}
              </div>

              <button
                className="btn primary"
                style={{ marginTop: 10 }}
                disabled={!date || !selectedTime}
                onClick={confirmBooking}
                title={
                  selectedTime
                    ? `Reservar ${selectedTime}`
                    : "Selecciona una hora"
                }
              >
                Confirmar reserva
              </button>

              {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
            </div>
          )}
        </div>

        {/* Mis citas */}
        <div className="card">
          <h3>Mis citas</h3>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Motivo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {(history || []).map((a) => (
                <tr key={a._id}>
                  <td>{a.date}</td>
                  <td>{(a.time || "").slice(0, 5)}</td>
                  <td>{a.clientId?.reason || "—"}</td>
                  <td>{a.status || "reservado"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chat con la clínica */}
      {myRoom && (
        <div style={{ marginTop: 16 }}>
          <ChatBox room={myRoom} title="Chat con la clínica" />
        </div>
      )}
    </>
  );
}
