import React, { useEffect, useMemo, useState } from "react";
import { api } from "../api";

// ======== Utils ========
function ymdLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function ymdNum(ymd) {
  return Number(ymd.replaceAll("-", ""));
}

// ======== Componente ========
export default function MonthCalendar({
  onPickDay,
  adminMode = false,
  reloadToken = 0,
  selectedDate = "", // 👈 NUEVO: fecha seleccionada (YYYY-MM-DD)
}) {
  const [monthStart, setMonthStart] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [activeDays, setActiveDays] = useState({});
  const [pastWithAppts, setPastWithAppts] = useState({});

  const today = new Date();
  const todayStr = ymdLocal(today);
  const todayNum = ymdNum(todayStr);

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

  // Cargar disponibilidad + resumen de citas (solo admin)
  useEffect(() => {
    const from = ymdLocal(new Date(year, month, 1));
    const to = ymdLocal(new Date(year, month + 1, 0));

    api
      .listAvailability(from, to)
      .then((days) => {
        const map = {};
        (days || []).forEach((d) => {
          if (d.isActive) map[d.date] = true;
        });
        setActiveDays(map);
      })
      .catch(() => setActiveDays({}));

    if (adminMode) {
      api
        .appointmentsSummary(from, to)
        .then((map) => setPastWithAppts(map || {}))
        .catch(() => setPastWithAppts({}));
    } else {
      setPastWithAppts({});
    }
  }, [year, month, adminMode, reloadToken]);

  function handlePick(key, isPast) {
    if (isPast && !adminMode) return;
    onPickDay && onPickDay(key, { isPast });
  }

  // 🔘 Botón para volver al mes y día actual
  function goToday() {
    const now = new Date();
    setMonthStart(new Date(now.getFullYear(), now.getMonth(), 1));
    onPickDay && onPickDay(ymdLocal(now), { isPast: false });
  }

  return (
    <div>
      <div
        className="header"
        style={{
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            className="btn"
            onClick={() => setMonthStart(new Date(year, month - 1, 1))}
          >
            ◀
          </button>
          <h3 style={{ margin: "0 8px" }}>
            {startDay.toLocaleString("es-ES", {
              month: "long",
              year: "numeric",
            })}
          </h3>
          <button
            className="btn"
            onClick={() => setMonthStart(new Date(year, month + 1, 1))}
          >
            ▶
          </button>
        </div>
        {/* 🔘 Botón Hoy */}
        <button
          onClick={goToday}
          className="btn"
          style={{
            fontSize: "0.85rem",
            padding: "6px 10px",
            background: "#22c55e",
            borderColor: "#16a34a",
            color: "#fff",
            fontWeight: 600,
          }}
          title="Volver al día de hoy"
        >
          Hoy
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
          const hadAppts = isPast && pastWithAppts[key] > 0;
          const isSelected = selectedDate && key === selectedDate; // 👈 NUEVO

          let cls = "day";
          if (hadAppts) cls += " past-appts";
          else if (isPast) cls += " closed";
          else if (isActive) cls += " active";
          else cls += " inactive";
          if (isToday) cls += " today";
          if (isSelected) cls += " selected"; // 👈 NUEVO

          const title = hadAppts
            ? "Día pasado con citas"
            : isPast
            ? "Cerrado (día pasado)"
            : isActive
            ? "Día activo"
            : "Día no activo";

          return (
            <div
              key={i}
              className={cls}
              title={title}
              onClick={() => handlePick(key, isPast)}
              data-day={key}
            >
              <span className="num">{d.getDate()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
