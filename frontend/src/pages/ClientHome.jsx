import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import MonthCalendar from "../components/MonthCalendar";
import { api, clearAuth, getUser } from "../api";
import { io } from "socket.io-client";

/* ===== Chat (mismo que admin) ===== */
const SOCKET_URL = "http://localhost:4000";
let __socket;
function getSocket() {
  if (!__socket) __socket = io(SOCKET_URL, { autoConnect: true });
  return __socket;
}
function ChatBox({ room, title = "Chat" }) {
  const me = getUser();
  const socket = getSocket();
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState("");
  const [typingInfo, setTypingInfo] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    function onReceive(data) {
      if (data?.room !== room) return;
      setMessages((prev) => [...prev, { user: data.user, text: data.message }]);
    }
    function onTyping(data) {
      if (data?.room !== room) return;
      setTypingInfo(`${data.user} está escribiendo…`);
      const t = setTimeout(() => setTypingInfo(""), 1200);
      return () => clearTimeout(t);
    }
    socket.on("receiveMessage", onReceive);
    socket.on("typing", onTyping);
    return () => {
      socket.off("receiveMessage", onReceive);
      socket.off("typing", onTyping);
    };
  }, [room, socket]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const displayName =
    (me?.firstName || me?.lastName
      ? `${me.firstName || ""} ${me.lastName || ""}`.trim()
      : me?.email) || "Usuario";

  function send() {
    const txt = msg.trim();
    if (!txt) return;
    socket.emit("sendMessage", { room, message: txt, user: displayName });
    setMsg("");
  }
  function typing() {
    socket.emit("typing", { room, user: displayName });
  }

  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h4 style={{ marginTop: 0 }}>{title}</h4>
      <div
        ref={scrollRef}
        style={{
          maxHeight: 220,
          overflowY: "auto",
          padding: 8,
          border: "1px solid #1f2937",
          borderRadius: 10,
          background: "#0b1220",
        }}
      >
        {messages.length === 0 && (
          <p style={{ opacity: 0.7, margin: 0 }}>No hay mensajes aún.</p>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 8, lineHeight: 1.2 }}>
            <strong style={{ color: "#93c5fd" }}>{m.user}:</strong>{" "}
            <span>{m.text}</span>
          </div>
        ))}
      </div>
      {typingInfo && (
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
          {typingInfo}
        </div>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={(e) => {
            typing();
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Escribe un mensaje…"
          style={{ flex: 1 }}
        />
        <button className="btn primary" onClick={send}>
          Enviar
        </button>
      </div>
    </div>
  );
}

export default function ClientHome() {
  const nav = useNavigate();
  const me = getUser(); // para la sala del chat por cliente
  const myRoom = me?.clientId ? `client:${me.clientId}` : null;

  const [slots, setSlots] = useState([]);
  const [date, setDate] = useState("");
  const [msg, setMsg] = useState("");
  const [history, setHistory] = useState([]);

  function logout() {
    clearAuth();
    nav("/", { replace: true });
  }

  async function fetchSlots(day) {
    setDate(day);
    setMsg("");
    try {
      const res = await api.listSlots(day);
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
      setHistory(hist);
    } catch (e) {
      setMsg(e.message);
    }
  }

  useEffect(() => {
    api
      .myHistory()
      .then(setHistory)
      .catch(() => {});
  }, []);

  return (
    <>
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

          {/* Chat por cliente (misma sala que abre el admin desde “Ver clientes”) */}
          {myRoom && <ChatBox room={myRoom} title="Chat con la clínica" />}
        </div>
      </div>
    </>
  );
}
