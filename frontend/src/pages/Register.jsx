import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api, saveAuth } from '../api'

export default function Register(){
  const [form, setForm] = useState({
    email: '', password: '',
    firstName:'', lastName:'', phone:'', reason:''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const nav = useNavigate()

  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(e){
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const { token, user } = await api.registerClient(form)
      saveAuth(token, user)
      nav(user.role === 'admin' ? '/admin' : '/client')
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="card" style={{maxWidth:520, margin:'0 auto'}}>
      <h3>Crear cuenta</h3>
      <form onSubmit={submit}>
        <label>Nombre</label>
        <input value={form.firstName} onChange={upd('firstName')} />
        <label>Apellidos</label>
        <input value={form.lastName} onChange={upd('lastName')} />
        <label>Teléfono</label>
        <input value={form.phone} onChange={upd('phone')} />
        <label>Motivo de consulta (opcional)</label>
        <input value={form.reason} onChange={upd('reason')} />

        <label>Email</label>
        <input type="email" value={form.email} onChange={upd('email')} />
        <label>Contraseña</label>
        <input type="password" value={form.password} onChange={upd('password')} />

        {error && <p style={{color:'#fca5a5'}}>{error}</p>}
        <button className="btn primary" disabled={loading}>{loading ? 'Creando...' : 'Crear cuenta'}</button>
      </form>
      <p style={{marginTop:12}}>¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
    </div>
  )
}
