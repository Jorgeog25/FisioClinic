import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";

// YYYY-MM-DD en hora local
function ymdLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function ymdNum(ymd) {
  return Number(ymd.replaceAll("-", ""));
}
const todayStr = ymdLocal(new Date());
const todayNum = ymdNum(todayStr);

export default function MonthCalendar({ onPickDay, adminMode = false }) {
  const [monthStart, setMonthStart] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [activeDays, setActiveDays] = useState({});

  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const startDay = new Date(year, month, 1);
  const endDay = new Date(year, month + 1, 0);

  const grid = useMemo(() => {
    const firstWeekday = (startDay.getDay() + 6) % 7; // L=0
    const daysInMonth = endDay.getDate();
    const cells = [];
    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [year, month]);

  useEffect(() => {
    const from = ymdLocal(new Date(year, month, 1));
    const to = ymdLocal(new Date(year, month + 1, 0));
    api
      .listAvailability(from, to)
      .then((days) => {
        const map = {};
        days.forEach((d) => {
          if (d.isActive) map[d.date] = true;
        });
        setActiveDays(map);
      })
      .catch(() => {});
  }, [year, month]);

  const todayStr = ymdLocal(new Date());
  const todayNum = ymdNum(todayStr);

  function handlePick(key, isPast) {
    if (isPast && !adminMode) return; // bloquea clic si es cliente
    onPickDay && onPickDay(key);
  }

  return (
    <div>
      <div className="header">
        <button
          className="btn"
          onClick={() => setMonthStart(new Date(year, month - 1, 1))}
        >
          ◀
        </button>
        <h3>
          {startDay.toLocaleString("es-ES", { month: "long", year: "numeric" })}
        </h3>
        <button
          className="btn"
          onClick={() => setMonthStart(new Date(year, month + 1, 1))}
        >
          ▶
        </button>
      </div>

      <div className="calendar">
        {["L", "M", "X", "J", "V", "S", "D"].map((d, i) => (
          <div key={i} className="dow">
            {d}
          </div>
        ))}

        {grid.map((d, i) => {
          if (!d) return <div key={i} className="day muted" />;

          const key = ymdLocal(d);
          const isActive = !!activeDays[key];
          const isToday = key === todayStr;
          const isPast = ymdNum(key) < todayNum;

          // 👇 Regla importante:
          // - Si es pasado → SOLO "closed" (no mezclar con "inactive" para evitar el gris)
          // - Si no es pasado → "active" o "inactive"
          let cls = "day";
          if (isPast) cls += " closed";
          else if (isActive) cls += " active";
          else cls += " inactive";
          if (isToday) cls += " today";

          return (
            <div
              key={i}
              className={cls}
              onClick={() => handlePick(key, isPast)}
              title={
                isPast
                  ? "Cerrado (día pasado)"
                  : isActive
                  ? "Día activo"
                  : "Día no activo"
              }
            >
              <span className="num">{d.getDate()}</span>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.8 }}>
        <span className="pill" style={{ marginRight: 8 }}>
          ● Azul = activo
        </span>
        <span className="pill" style={{ marginRight: 8 }}>
          ● Verde = hoy
        </span>
        <span className="pill" style={{ marginRight: 8 }}>
          ● Gris = no activo
        </span>
        <span className="pill">● “CERRADO” = día pasado</span>
      </div>
    </div>
  );
}
