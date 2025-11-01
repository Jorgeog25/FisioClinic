import React, { useEffect, useState } from 'react'
import MonthCalendar from '../components/MonthCalendar'
import { api, getUser } from '../api'

export default function ClientHome(){
  const user = getUser()
  const [pickedDate, setPickedDate] = useState(null)
  const [slots, setSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [myHistory, setMyHistory] = useState(null)
  const [msg, setMsg] = useState('')

  useEffect(()=>{
    api.myHistory().then(setMyHistory).catch(()=>{})
  }, [])

  async function fetchSlots(date){
    setPickedDate(date)
    setLoadingSlots(true)
    setMsg('')
    try {
      const res = await api.daySlots(date)
      setSlots(res.slots || [])
      if (!res.active) setMsg('Este día no está activo.')
    } catch(e){ setSlots([]) } finally { setLoadingSlots(false) }
  }

  async function book(time){
    try {
      await api.book({ clientId: user.clientId, date: pickedDate, time })
      setMsg('¡Cita reservada!')
      const res = await api.daySlots(pickedDate)
      setSlots(res.slots || [])
    } catch(e){ setMsg(e.message) }
  }

  return (
    <div className="row">
      <div className="card">
        <h3>Pedir cita</h3>
        <MonthCalendar onPickDay={fetchSlots}/>
        {pickedDate && <p>Día seleccionado: <strong>{pickedDate}</strong></p>}
        {loadingSlots? <p>Cargando horas...</p> :
          <div className="slots">
            {slots.length===0 ? <p>{msg||'No hay horas libres.'}</p> :
              slots.map(t=>(<button key={t} className="slot free" onClick={()=>book(t)}>{t}</button>))
            }
          </div>
        }
      </div>
      <div className="card">
        <h3>Mi historial</h3>
        {!myHistory ? <p>Cargando...</p> :
          <>
            <h4>Datos</h4>
            <p><strong>{myHistory.client.firstName} {myHistory.client.lastName}</strong> · {myHistory.client.phone}</p>
            <p>Motivo: {myHistory.client.reason||'—'}</p>
            <h4>Citas</h4>
            <table>
              <thead><tr><th>Fecha</th><th>Hora</th><th>Estado</th></tr></thead>
              <tbody>
                {myHistory.history.map(a=>(
                  <tr key={a._id}><td>{a.date}</td><td>{a.time}</td><td>{a.status}</td></tr>
                ))}
              </tbody>
            </table>
            <h4>Pagos</h4>
            <table>
              <thead><tr><th>Fecha</th><th>Método</th><th>Importe</th><th>Estado</th></tr></thead>
              <tbody>
                {myHistory.payments.map(p=>(
                  <tr key={p._id}><td>{new Date(p.createdAt).toLocaleDateString()}</td><td>{p.method}</td><td>{p.amount} €</td><td>{p.status}</td></tr>
                ))}
              </tbody>
            </table>
          </>
        }
      </div>
    </div>
  )
}
