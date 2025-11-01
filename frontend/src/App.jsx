import React from 'react'
import { Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import ClientHome from './pages/ClientHome'
import AdminHome from './pages/AdminHome'
import { clearAuth, getUser } from './api'
import Register from './pages/Register'   

function Nav() {
  const user = getUser()
  const nav = useNavigate()
  return (
    <div className="container">
      <div className="header">
        <h2>Fisio Clinic</h2>
        <div className="nav">
          {user?.role === 'admin' && <Link className="pill" to="/admin">Admin</Link>}
          {user?.role === 'client' && <Link className="pill" to="/client">Mi área</Link>}
          {!user && <Link className="pill" to="/login">Login</Link>}
          {user && <button className="btn" onClick={()=>{clearAuth(); nav('/login')}}>Salir</button>}
        </div>
      </div>
    </div>
  )
}

function Protected({ children, role }) {
  const user = getUser()
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) return <Navigate to="/" replace />
  return children
}

export default function App(){
  return (
    <>
      <Nav/>
      <div className="container">
        <Routes>
          <Route path="/" element={<Home/>} />
          <Route path="/register" element={<Register/>} />
          <Route path="/login" element={<Login/>} />
          <Route path="/client" element={<Protected role="client"><ClientHome/></Protected>} />
          <Route path="/admin" element={<Protected role="admin"><AdminHome/></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </>
  )
}

function Home(){
  const user = getUser()
  return (
    <div className="card">
      <h3>Bienvenido a la clínica</h3>
      <p>Accede para gestionar tus citas o la agenda de la clínica.</p>
      <div className="nav">
        {!user && <Link className="btn primary" to="/login">Entrar</Link>}
        {user?.role === 'client' && <Link className="btn primary" to="/client">Ir a mi área</Link>}
        {user?.role === 'admin' && <Link className="btn primary" to="/admin">Ir a Admin</Link>}
        {!user && <Link className="btn" to="/register">Crear cuenta</Link>}
      </div>
    </div>
  )
}
