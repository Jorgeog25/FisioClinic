import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register' // <-- 1. ¡IMPORTA EL COMPONENTE DE REGISTRO!
import ClientHome from './pages/ClientHome'
import AdminHome from './pages/AdminHome'
import { getUser, clearAuth, touchActivity, lastActivity } from './api'

const IDLE_MS = 5 * 60 * 1000 // 5 minutos

function Protected({ children, role }) {
  const user = getUser()
  if (!user) return <Navigate to="/" replace />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const nav = useNavigate()

  // ... (Watchdog y useEffect inicial no se modifican) ...

  return (
    <div className="container">
      <Routes>
        {/* Login como raíz */}
        <Route path="/" element={<Login />} />

        {/* ¡NUEVA RUTA DE REGISTRO! */}
        <Route path="/register" element={<Register />} />

        {/* Cliente */}
        <Route
          path="/client"
          element={<Protected role="client"><ClientHome/></Protected>}
        />

        {/* Admin */}
        <Route
          path="/admin"
          element={<Protected role="admin"><AdminHome/></Protected>}
        />

        {/* Cualquier otra ruta => login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}