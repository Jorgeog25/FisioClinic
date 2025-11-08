import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { api, getUser } from "../api";

const SOCKET_URL = "http://localhost:4000";
let __socket;
function getSocket() {
  if (!__socket) {
    // Puedes pasar el token si quieres validar en el servidor:
    const token = window.sessionStorage.getItem("token");
    __socket = io(SOCKET_URL, { autoConnect: true, auth: { token } });
  }
  return __socket;
}

export default function ChatBox({ room, title = "Chat", onClose }) {
  const me = getUser();
  const socket = getSocket();
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState("");
  const [typingInfo, setTypingInfo] = useState("");
  const [usersOnline, setUsersOnline] = useState([]); // ['Nombre 1', 'Nombre 2']
  const scrollRef = useRef(null);

  const myName =
    (me?.firstName || me?.lastName
      ? `${me.firstName || ""} ${me.lastName || ""}`.trim()
      : me?.email) || "Usuario";

  // Cargar historial la primera vez y unirse a la sala
  useEffect(() => {
    let mounted = true;

    async function boot() {
      try {
        const hist = await api.chatHistory(room, 100);
        if (mounted)
          setMessages(
            hist.map((h) => ({
              user: h.userName,
              text: h.text,
              createdAt: h.createdAt,
            }))
          );
      } catch {
        // sin historial
      }
      socket.emit("joinRoom", { room, user: myName });
    }
    boot();

    function onReceive(data) {
      if (data?.room !== room) return;
      setMessages((prev) => [
        ...prev,
        { user: data.userName || data.user, text: data.text || data.message },
      ]);
    }
    function onTyping(data) {
      if (data?.room !== room) return;
      setTypingInfo(`${data.user} está escribiendo…`);
      const t = setTimeout(() => setTypingInfo(""), 1200);
      return () => clearTimeout(t);
    }
    function onPresence(data) {
      if (data?.room !== room) return;
      setUsersOnline(Array.isArray(data.users) ? data.users : []);
    }

    socket.on("receiveMessage", onReceive);
    socket.on("typing", onTyping);
    socket.on("presence", onPresence);

    return () => {
      mounted = false;
      socket.emit("leaveRoom", { room });
      socket.off("receiveMessage", onReceive);
      socket.off("typing", onTyping);
      socket.off("presence", onPresence);
    };
  }, [room, socket, myName]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function send() {
    const txt = msg.trim();
    if (!txt) return;
    socket.emit("sendMessage", { room, message: txt, user: myName });
    setMsg("");
  }
  function typing() {
    socket.emit("typing", { room, user: myName });
  }

  const headerRight = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span
        className="pill"
        title={usersOnline.join(", ") || "Sin usuarios conectados"}
        style={{ background: "rgba(34,197,94,.1)", borderColor: "#16a34a" }}
      >
        ● {usersOnline.length} en línea
      </span>
      {onClose && (
        <button className="btn" onClick={onClose}>
          Cerrar
        </button>
      )}
    </div>
  );

  return (
    <div
      className={onClose ? "card modal-card" : "card"}
      style={onClose ? { width: "min(720px, 90vw)" } : {}}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}
      >
        <h3 style={{ margin: 0 }}>{title}</h3>
        {headerRight}
      </div>

      <div
        ref={scrollRef}
        style={{
          marginTop: 8,
          maxHeight: onClose ? 320 : 220,
          overflowY: "auto",
          padding: 10,
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
