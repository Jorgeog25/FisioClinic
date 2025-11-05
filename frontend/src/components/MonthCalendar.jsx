import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../api'

// YYYY-MM-DD local
function ymdLocal(date){
  const y = date.getFullYear()
  const m = String(date.getMonth()+1).padStart(2,'0')
  const d = String(date.getDate()).padStart(2,'0')
  return `${y}-${m}-${d}`
}
function ymdNum(ymd){ return Number(ymd.replaceAll('-', '')) }

export default function MonthCalendar({ onPickDay, adminMode=false }){
  const [monthStart, setMonthStart] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [activeDays, setActiveDays] = useState({})
  const [pastWithAppts, setPastWithAppts] = useState({}) // 👈 días con citas

  const year = monthStart.getFullYear()
  const month = monthStart.getMonth()
  const startDay = new Date(year, month, 1)
  const endDay = new Date(year, month + 1, 0)

  const grid = useMemo(()=>{
    const firstWeekday = (startDay.getDay()+6)%7 // L=0
    const daysInMonth = endDay.getDate()
    const cells = []
    for(let i=0;i<firstWeekday;i++) cells.push(null)
    for(let d=1; d<=daysInMonth; d++) cells.push(new Date(year, month, d))
    while(cells.length % 7 !== 0) cells.push(null)
    return cells
  }, [year, month])

  useEffect(()=>{
    const from = ymdLocal(new Date(year, month, 1))
    const to = ymdLocal(new Date(year, month+1, 0))

    // disponibilidad (activos) para todo el mes
    api.listAvailability(from, to).then(days=>{
      const map = {}
      days.forEach(d => { if (d.isActive) map[d.date] = true })
      setActiveDays(map)
    }).catch(()=>{})

    // resumen de citas del mes (solo admin) para pintar granate días pasados con citas
    if (adminMode) {
      api.appointmentsSummary(from, to).then(map=>{
        setPastWithAppts(map || {})
      }).catch(()=> setPastWithAppts({}))
    } else {
      setPastWithAppts({})
    }
  }, [year, month, adminMode])

  const todayStr = ymdLocal(new Date())
  const todayNum = ymdNum(todayStr)

  function handlePick(key, isPast){
    // Clientes: no permitir días pasados. Admin: sí, para ver citas.
    if (isPast && !adminMode) return;
    onPickDay && onPickDay(key, { isPast })
  }

  return (
    <div>
      <div className="header">
        <button className="btn" onClick={()=>setMonthStart(new Date(year, month-1, 1))}>◀</button>
        <h3>{startDay.toLocaleString('es-ES', { month:'long', year:'numeric' })}</h3>
        <button className="btn" onClick={()=>setMonthStart(new Date(year, month+1, 1))}>▶</button>
      </div>

      <div className="calendar">
        {['L','M','X','J','V','S','D'].map((d,i)=>(<div key={i} className="dow">{d}</div>))}
        {grid.map((d,i)=>{
          if (!d) return <div key={i} className="day muted" />

          const key = ymdLocal(d)
          const isActive = !!activeDays[key]
          const isToday  = key === todayStr
          const isPast   = ymdNum(key) < todayNum
          const hadAppts = isPast && pastWithAppts[key] > 0  // 👈 citas ese día

          // PRIORIDAD de clases:
          // 1) Pasado con citas => granate
          // 2) Pasado sin citas => cerrado (rojo)
          // 3) Futuro/actual => active/inactive normal
          let cls = 'day'
          if (hadAppts)           cls += ' past-appts'
          else if (isPast)        cls += ' closed'
          else if (isActive)      cls += ' active'
          else                    cls += ' inactive'
          if (isToday)            cls += ' today'

          const title = hadAppts
            ? 'Día pasado con citas'
            : (isPast ? 'Cerrado (día pasado)' : (isActive ? 'Día activo' : 'Día no activo'))

          return (
            <div
              key={i}
              className={cls}
              title={title}
              onClick={()=>handlePick(key, isPast)}
            >
              <span className="num">{d.getDate()}</span>
            </div>
          )
        })}
      </div>

      <div style={{marginTop:10, fontSize:12, opacity:.8}}>
        <span className="pill" style={{marginRight:8}}>● Azul = activo</span>
        <span className="pill" style={{marginRight:8}}>● Verde = hoy</span>
        <span className="pill" style={{marginRight:8}}>● Gris = no activo</span>
        <span className="pill" style={{marginRight:8}}>● Rojo = cerrado (pasado)</span>
        <span className="pill">● Granate = pasado con citas</span>
      </div>
    </div>
  )
}
