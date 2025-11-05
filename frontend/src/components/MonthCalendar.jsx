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

export default function MonthCalendar({ onPickDay, adminMode=false, reloadToken=0, onDayMutated }) {
  const [monthStart, setMonthStart] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [activeDays, setActiveDays] = useState({})
  const [pastWithAppts, setPastWithAppts] = useState({}) // días pasados con citas

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

  // Carga disponibilidad + resumen de citas (admin) cada vez que cambie mes o reloadToken
  useEffect(()=>{
    const from = ymdLocal(new Date(year, month, 1))
    const to = ymdLocal(new Date(year, month+1, 0))

    api.listAvailability(from, to).then(days=>{
      const map = {}
      ;(days||[]).forEach(d => { if (d.isActive) map[d.date] = true })
      setActiveDays(map)
    }).catch(()=>setActiveDays({}))

    if (adminMode) {
      api.appointmentsSummary(from, to).then(map=>{
        setPastWithAppts(map || {})
      }).catch(()=> setPastWithAppts({}))
    } else {
      setPastWithAppts({})
    }
  }, [year, month, adminMode, reloadToken])

  // Permite que el padre marque/unmarque un día sin recargar todo
  useEffect(()=>{
    if (!onDayMutated) return
    // el padre pasará una función para mutar; aquí nada
  }, [onDayMutated])

  const todayStr = ymdLocal(new Date())
  const todayNum = ymdNum(todayStr)

  function handlePick(key, isPast){
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
          const hadAppts = isPast && pastWithAppts[key] > 0

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
              data-day={key}
            >
              <span className="num">{d.getDate()}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
