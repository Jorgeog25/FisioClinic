import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Login from './pages/Login'
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

  // Al montar: si hay usuario en esta pestaña, redirige; si no, deja en login
  useEffect(() => {
    const u = getUser()
    if (u) {
      nav(u.role === 'admin' ? '/admin' : '/client', { replace: true })
    }
  }, [])

  // Watchdog de inactividad (5 min) + listeners de actividad
  useEffect(() => {
    const bump = () => touchActivity()
    // registra actividad del usuario
    window.addEventListener('click', bump)
    window.addEventListener('keydown', bump)
    window.addEventListener('mousemove', bump)
    window.addEventListener('touchstart', bump)
    window.addEventListener('scroll', bump, { passive: true })

    // inicia contador ahora
    touchActivity()

    const t = setInterval(() => {
      const ts = lastActivity()
      if (!ts) return
      if (Date.now() - ts > IDLE_MS) {
        clearInterval(t)
        clearAuth()
        nav('/', { replace: true })
      }
    }, 15 * 1000) // comprueba cada 15s

    return () => {
      window.removeEventListener('click', bump)
      window.removeEventListener('keydown', bump)
      window.removeEventListener('mousemove', bump)
      window.removeEventListener('touchstart', bump)
      window.removeEventListener('scroll', bump)
      clearInterval(t)
    }
  }, [nav])

  return (
    <div className="container">
      <Routes>
        {/* Login como raíz */}
        <Route path="/" element={<Login />} />

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
