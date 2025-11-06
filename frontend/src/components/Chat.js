// src/components/Chat.js
import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { getUser } from "../api"; // Función para obtener el usuario autenticado

// Configura la conexión de Socket.IO
const socket = io("http://localhost:4000");

const Chat = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState("");
  const user = getUser();  // Obtener el usuario autenticado

  useEffect(() => {
    // Escuchar los mensajes que llegan del servidor
    socket.on("receiveMessage", (data) => {
      setMessages((prevMessages) => [
        ...prevMessages,
        { user: data.user, message: data.message },
      ]);
    });

    // Escuchar el estado "escribiendo..."
    socket.on("typing", (data) => {
      setIsTyping(`${data.user} está escribiendo...`);
    });

    // Limpiar los listeners al desconectar
    return () => {
      socket.off("receiveMessage");
      socket.off("typing");
    };
  }, []);

  const handleMessageSend = () => {
    if (message.trim()) {
      socket.emit("sendMessage", { message, user: user?.firstName });
      setMessage(""); // Limpiar el campo de mensaje
    }
  };

  const handleTyping = () => {
    socket.emit("typing", { user: user?.firstName });
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className="message">
            <strong>{msg.user}</strong>: {msg.message}
          </div>
        ))}
      </div>

      {isTyping && <p>{isTyping}</p>}

      <div className="message-input">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyUp={handleTyping}
          placeholder="Escribe un mensaje..."
        />
        <button onClick={handleMessageSend}>Enviar</button>
      </div>
    </div>
  );
};

export default Chat;
