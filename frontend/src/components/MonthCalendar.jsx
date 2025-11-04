import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../api'

function ymdLocal(date){
  const y = date.getFullYear()
  const m = String(date.getMonth()+1).padStart(2,'0')
  const d = String(date.getDate()).padStart(2,'0')
  return `${y}-${m}-${d}`
}

export default function MonthCalendar({ onPickDay }){
  const [monthStart, setMonthStart] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [activeDays, setActiveDays] = useState({})

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
    api.listAvailability(from, to).then(days=>{
      const map = {}
      days.forEach(d => { if (d.isActive) map[d.date] = true })
      setActiveDays(map)
    }).catch(()=>{})
  }, [year, month])

  const todayStr = ymdLocal(new Date())

  return (
    <div>
      <div className="header">
        <button className="btn" onClick={()=>setMonthStart(new Date(year, month-1, 1))}>◀</button>
        <h3>{startDay.toLocaleString('es-ES', { month:'long', year:'numeric' })}</h3>
        <button className="btn" onClick={()=>setMonthStart(new Date(year, month+1, 1))}>▶</button>
      </div>

      <div className="calendar">
        {['L','M','X','J','V','S','D'].map((d,i)=>(<div key={i} style={{opacity:.6, textAlign:'center'}}>{d}</div>))}
        {grid.map((d,i)=>{
          if (!d) return <div key={i} className="day muted" />
          const key = ymdLocal(d)
          const active = !!activeDays[key]
          const today = key === todayStr
          const cls = `day ${active?'active':'inactive'} ${today?'today':''}`
          return (
            <div key={i} className={cls} onClick={()=>onPickDay && onPickDay(key)}>
              {d.getDate()}
            </div>
          )
        })}
      </div>
    </div>
  )
}
