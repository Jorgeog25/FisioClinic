import React, { useEffect, useState } from 'react'
import MonthCalendar from '../components/MonthCalendar'
import { api } from '../api'

export default function AdminHome(){
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('17:00')
  const [slotMinutes, setSlotMinutes] = useState(60)
  const [isActive, setIsActive] = useState(true)
  const [msg, setMsg] = useState('')
  const [clients, setClients] = useState([])
  const [newClient, setNewClient] = useState({ firstName:'', lastName:'', phone:'', reason:'' })
  const [apptDate, setApptDate] = useState('')
  const [appts, setAppts] = useState([])

  function pickDay(d){ setDate(d) }

  async function saveDay(e){
    e.preventDefault()
    setMsg('')
    try {
      await api.setAvailability({ date, startTime, endTime, slotMinutes:Number(slotMinutes), isActive })
      setMsg('Día actualizado.')
    } catch(e){ setMsg(e.message) }
  }

  useEffect(()=>{ api.listClients().then(setClients).catch(()=>{}) }, [])

  async function createClient(e){
    e.preventDefault()
    try {
      const c = await api.createClient(newClient)
      setClients([c, ...clients]); setNewClient({ firstName:'', lastName:'', phone:'', reason:'' })
    } catch(e){ alert(e.message) }
  }

  async function loadAppts(){
    const list = await api.listAppointments(apptDate || undefined)
    setAppts(list)
  }

  return (
    <div className="row">
      <div className="card">
        <h3>Calendario (definir días activos y horario)</h3>
        <MonthCalendar onPickDay={pickDay} />
        <form onSubmit={saveDay}>
          <p>Día seleccionado: <strong>{date || '—'}</strong></p>
          <div className="row">
            <div>
              <label>Inicio</label>
              <input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} />
            </div>
            <div>
              <label>Fin</label>
              <input type="time" value={endTime} onChange={e=>setEndTime(e.target.value)} />
            </div>
          </div>
          <div className="row">
            <div>
              <label>Duración (min)</label>
              <input type="number" value={slotMinutes} onChange={e=>setSlotMinutes(e.target.value)} />
            </div>
            <div>
              <label>Activo</label>
              <select value={isActive?'1':'0'} onChange={e=>setIsActive(e.target.value==='1')}>
                <option value="1">Sí</option>
                <option value="0">No</option>
              </select>
            </div>
          </div>
          <button className="btn primary" disabled={!date}>Guardar</button>
          {msg && <p style={{marginTop:8}}>{msg}</p>}
        </form>
      </div>

      <div className="card">
        <h3>Clientes</h3>
        <form onSubmit={createClient}>
          <div className="row">
            <div><label>Nombre</label><input value={newClient.firstName} onChange={e=>setNewClient({...newClient, firstName:e.target.value})}/></div>
            <div><label>Apellidos</label><input value={newClient.lastName} onChange={e=>setNewClient({...newClient, lastName:e.target.value})}/></div>
          </div>
          <div className="row">
            <div><label>Teléfono</label><input value={newClient.phone} onChange={e=>setNewClient({...newClient, phone:e.target.value})}/></div>
            <div><label>Motivo</label><input value={newClient.reason} onChange={e=>setNewClient({...newClient, reason:e.target.value})}/></div>
          </div>
          <button className="btn">Añadir</button>
        </form>
        <table style={{marginTop:12}}>
          <thead><tr><th>Nombre</th><th>Teléfono</th><th>Motivo</th></tr></thead>
          <tbody>
            {clients.map(c=>(<tr key={c._id}><td>{c.firstName} {c.lastName}</td><td>{c.phone}</td><td>{c.reason||'—'}</td></tr>))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{gridColumn:'1 / span 2'}}>
        <h3>Citas</h3>
        <div className="row">
          <div>
            <label>Filtrar por fecha (YYYY-MM-DD)</label>
            <input value={apptDate} onChange={e=>setApptDate(e.target.value)} placeholder="2025-11-01" />
          </div>
          <div style={{display:'flex', alignItems:'end'}}>
            <button className="btn" onClick={loadAppts} type="button">Cargar</button>
          </div>
        </div>
        <table style={{marginTop:12}}>
          <thead><tr><th>Fecha</th><th>Hora</th><th>Cliente</th><th>Estado</th></tr></thead>
          <tbody>
            {appts.map(a=>(<tr key={a._id}><td>{a.date}</td><td>{a.time}</td><td>{a.clientId}</td><td>{a.status}</td></tr>))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
