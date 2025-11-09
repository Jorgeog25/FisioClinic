# 🧠 FisioClinic — Decisiones técnicas y por qué se tomaron (Frontend & Backend)

Este documento explica **las tecnologías elegidas** y **las decisiones de arquitectura** en FisioClinic, tanto en el **frontend** como en el **backend**, y por qué son adecuadas para este caso de uso (gestión de citas de una clínica).

---

## 🎨 Frontend (React + Vite)

### ¿Por qué React?
- **Componentización**: Pantallas (`Login`, `Register`, `ClientHome`, `AdminHome`) y componentes (`MonthCalendar`, `ChatBox`) reutilizables.
- **Estado con Hooks**: `useState`, `useEffect` facilitan sincronizar UI con datos (citas, disponibilidad, filtros).
- **Ecosistema maduro**: interoperabilidad con `react-router-dom`, `socket.io-client`, etc.

### ¿Por qué Vite?
- **Dev server ultra rápido** y HMR estable → mejora la productividad.
- **Configuración mínima**: ideal para proyectos que quieren empezar a rendir sin sobrecarga.

### React Router
- Navegación clara entre vistas (auth → cliente/admin). Mantiene la SPA simple y escalable.

### `styles.css` separado de `index.html`
- **Mantenibilidad** y consistencia visual: un único lugar para temas, colores, espaciados.
- Evita estilos en línea o duplicados; facilita refactor y dark/light modes futuros.

### `MonthCalendar.jsx`
- **UI declarativa**: genera una malla mensual derivada de fecha seleccionada.
- Estados visuales (activo, cerrado, pasado, hoy, seleccionado) ayudan a reducir errores de reserva.
- **Día seleccionado en morado**: feedback inmediato al usuario.
- **Reglas de negocio en UI**: días pasados en “solo lectura”.

### `ClientHome.jsx`
- Flujo **lineal y simple** de reserva: elegir día → elegir hora → confirmar.
- Historial de citas del cliente en la misma vista → reduce fricción y consultas.

### `AdminHome.jsx`
- División por **pestañas** (Calendario / Clientes / Ver citas) mejora foco y rendimiento (carga bajo demanda).
- **Cancelar ≠ borrar**: `status: "cancelled"` permite auditoría y libera la franja instantáneamente.
- Filtros de **búsqueda** (nombre, fecha) en “Ver citas” → productividad para el personal.
- **Chat integrado**: resolver dudas sin salir del panel.

### `ChatBox.jsx` (socket.io-client)
- Comunicación en tiempo real **cliente ↔ admin** con canales por usuario (`room=client:<id>`).
- Reduce llamadas REST y tiempos de espera para coordinación de citas.

### Capa `api.js`
- **Punto único de entrada** a la API REST; centraliza `fetch`, headers, token, manejo de errores.
- Facilita cambios globales (p. ej. renovar token, baseURL, logging).

---

## 🧩 Backend (Node.js + Express + MongoDB/Mongoose)

### ¿Por qué Node + Express?
- **Ligero y flexible** para APIs REST.
- Middlewares (auth, CORS, body parsing) plug-and-play.
- Ecosistema amplio (jwt, bcrypt, socket.io, etc.).

### ¿Por qué MongoDB (Mongoose)?
- Modelo de datos **documental** que encaja con citas y disponibilidad (documentos por día/cita).
- **Esquemas flexibles** para evolucionar status, notas clínicas, pagos.
- Mongoose aporta **validación** y **populate** (cliente ↔ cita).

### Arquitectura MVC (carpetas `controllers`, `models`, `routes`)
- **Separación de responsabilidades** y testabilidad.
- `appointment.controller.js`: lógica de negocio (crear, listar por fecha, actualizar estado).
- `appointment.routes.js`: define endpoints y aplica auth sin acoplarse a la lógica.

### Decisión clave: `PATCH` + `status: "cancelled"` (no `DELETE`)
- Conserva **historial** y evita incoherencias referenciales.
- Permite que la hora **vuelva a estar disponible** inmediatamente (front ignora canceladas).
- Auditable: puedes ver qué pasó y cuándo.

### Comprobación de colisiones al crear
```js
// Solo bloquea si NO está cancelada
{ date, time, status: { $ne: "cancelled" } }
```
- Evita falsos positivos por citas antiguas canceladas.
- Simplifica re-reservas del mismo hueco tras una cancelación.

### Semilla de admin (`createAdmin.js` + `npm run seed:admin`)
- **No hay endpoint público** para crear administradores.
- Minimiza riesgo: el rol admin **solo** se crea/actualiza desde el servidor con variables de entorno.
- Buenas prácticas de **seguridad operacional**.

### Autenticación y autorización (JWT + middleware `auth`)
- **JWT** reduce estado en servidor.
- Middleware protege rutas (`/appointments`, `/clients`) y valida rol según acción.
- **Front no decide roles**: cualquier `role` en el body se ignora o se valida en el servidor.

### Variables de entorno (`.env`)
- Aislan secretos (`JWT_SECRET`), infra (`MONGO_URI`) y credenciales de semilla (`ADMIN_*`).
- Permite mover el proyecto de **desarrollo** a **producción** sin cambios de código.

### Desarrollo más rápido
- `nodemon`: recarga automática del servidor.
- `concurrently` (o scripts combinados): levantar API y web con un solo comando (`dev:all`).

---

## 🔒 Seguridad aplicada (resumen)
- Registro público **siempre crea `role: "client"`** en backend.
- Rutas sensibles requieren **JWT + rol admin**.
- **Seed de admin** es la única vía para rol administrador.
- Cancelaciones no borran datos: mejor para auditoría y soporte.

---

## 🧭 Beneficios finales
- **Usabilidad**: UI centrada en el flujo de reserva, con estados visuales claros.
- **Mantenibilidad**: separación MVC, API centralizada, estilos únicos.
- **Escalabilidad**: sockets para tiempo real, Mongo flexible, React reusable.
- **Seguridad y gobierno**: roles estrictos, admin por semilla, auditoría con estados.