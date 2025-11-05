import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, saveAuth, getUser } from '../api'

export default function Login(){
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const nav = useNavigate()

  useEffect(()=>{
    const u = getUser()
    if (u) nav(u.role === 'admin' ? '/admin' : '/client', { replace:true })
  }, [])

  async function submit(e){
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { token, user } = await api.login(email.trim(), password)
      saveAuth(token, user)
      nav(user.role === 'admin' ? '/admin' : '/client', { replace:true })
    } catch (e) {
      setError(e.message || 'Error de acceso')
    } finally { setLoading(false) }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1 className="brand">Fisio Clinic</h1>
        <p className="subtitle">Accede para gestionar tus citas o la agenda</p>

        <form onSubmit={submit} className="form">
          <label>Email</label>
          <input
            value={email}
            onChange={e=>setEmail(e.target.value)}
            placeholder="tucorreo@dominio.com"
            autoFocus
          />

          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={e=>setPassword(e.target.value)}
            placeholder="••••••••"
          />

          {error && <p className="error">{error}</p>}
          <button className="btn primary full" disabled={loading}>
            {loading ? 'Entrando…' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="cta-register">
          <span>¿Aún no tienes cuenta?</span>
          <Link to="/register" className="btn cta">Crear cuenta</Link>
        </div>
      </div>
    </div>
  )
}
