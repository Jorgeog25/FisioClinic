import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MonthCalendar from "../components/MonthCalendar";
import ChatBox from "../components/ChatBox";
import { api, clearAuth, getUser } from "../api";

export default function ClientHome() {
  const nav = useNavigate();
  const [slots, setSlots] = useState([]);
  const [date, setDate] = useState("");
  const [msg, setMsg] = useState("");
  const [history, setHistory] = useState([]);

  const me = getUser();
  const myRoom = me?.clientId ? `client:${me.clientId}` : null;

  function logout() {
    clearAuth();
    nav("/", { replace: true });
  }

  // Manejo robusto: pase lo que pase, 'slots' será un array
  async function fetchSlots(day) {
    setDate(day);
    setMsg("");
    try {
      const res = await api.listSlots(day); // tu endpoint actual
      setSlots(Array.isArray(res) ? res : []);
    } catch (e) {
      setSlots([]);
      setMsg(e.message || "No se han podido cargar las horas.");
    }
  }

  async function bookSlot(time) {
    try {
      await api.createAppointment({ date, time });
      setMsg("Cita reservada correctamente");
      setSlots([]);
      const hist = await api.myHistory();
      setHistory(Array.isArray(hist) ? hist : []);
    } catch (e) {
      setMsg(e.message);
    }
  }

  useEffect(() => {
    api
      .myHistory()
      .then((h) => setHistory(Array.isArray(h) ? h : []))
      .catch(() => {});
  }, []);

  return (
    <>
      {/* Botón de cerrar sesión llamativo */}
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

      <div className="row">
        <div className="card">
          <h3>Pedir cita</h3>
          <MonthCalendar onPickDay={fetchSlots} adminMode={false} />

          {date && (
            <>
              <p style={{ marginTop: 10 }}>
                Horas disponibles el <strong>{date}</strong>
              </p>
              <div className="slots">
                {(!Array.isArray(slots) || slots.length === 0) && (
                  <p style={{ opacity: 0.7 }}>No hay horas disponibles.</p>
                )}
                {Array.isArray(slots) &&
                  slots.map((s, i) => (
                    <div
                      key={`${date}-${s}-${i}`}
                      className="slot free"
                      onClick={() => bookSlot(s)}
                    >
                      {s}
                    </div>
                  ))}
              </div>
              {msg && <p style={{ marginTop: 8 }}>{msg}</p>}
            </>
          )}
        </div>

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
              {history.map((a) => (
                <tr key={a._id}>
                  <td>{a.date}</td>
                  <td>{a.time}</td>
                  <td>{a.clientId?.reason || "—"}</td>
                  <td>{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chat con la clínica (sala propia del cliente) */}
      {myRoom && (
        <div style={{ marginTop: 16 }}>
          <ChatBox room={myRoom} title="Chat con la clínica" />
        </div>
      )}
    </>
  );
}
