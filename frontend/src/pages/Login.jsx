import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'   // 👈 añade Link aquí
import { api, saveAuth } from '../api'

export default function Login(){
  const [email, setEmail] = useState('admin@demo.com')
  const [password, setPassword] = useState('admin123')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const nav = useNavigate()

  async function submit(e){
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { token, user } = await api.login(email, password)
      saveAuth(token, user)
      nav(user.role === 'admin' ? '/admin' : '/client')
    } catch (e) {
      setError(e.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="card" style={{maxWidth:480, margin:'0 auto'}}>
      <h3>Iniciar sesión</h3>
      <form onSubmit={submit}>
        <label>Email</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="tucorreo@dominio.com" />
        <label>Contraseña</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" />
        {error && <p style={{color:'#fca5a5'}}>{error}</p>}
        <button className="btn primary" disabled={loading}>{loading?'Entrando...':'Entrar'}</button>
      </form>
      <p style={{marginTop:12}}>
        ¿No tienes cuenta? <Link to="/register">Crear cuenta</Link>
      </p>
      <p style={{color:'#94a3b8', marginTop:12}}>
        Usa un usuario existente en tu backend.
      </p>
    </div>
  )
}
