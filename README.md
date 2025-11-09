# FisioClinic

[Enlace Github](https://github.com/Jorgeog25/FisioClinic)

## Contexto

🩺 FisioClinic — Sistema de Gestión de Citas para Clínicas de Fisioterapia

FisioClinic es una aplicación web completa (Full Stack MERN) para la gestión de reservas de citas entre clientes y administradores de una clínica de fisioterapia.
Permite a los pacientes registrarse, reservar horas disponibles, chatear con la clínica y revisar su historial.
Los administradores pueden gestionar clientes, citas, disponibilidad diaria y pagos, todo desde un panel unificado.

## Tecnologías Principales

🔹**Frontend**

- React + Vite

- React Router para navegación entre vistas (Login, Register, ClientHome, AdminHome)

- Estado local con Hooks (useState, useEffect)

- Fetch API centralizado en /src/api.js

- CSS modularizado (styles.css)

**Componentes principales:**

- MonthCalendar.jsx → calendario dinámico con días activos, pasados, seleccionados (morado)

- ChatBox.jsx → chat cliente–administrador

- ClientHome.jsx → portal de reservas del cliente

- AdminHome.jsx → panel administrativo con control de citas, clientes y chat

🔹 **Backend**

- Node.js + Express

- MongoDB (Mongoose) para persistencia de datos

**Estructura MVC:**

- /controllers/appointment.controller.js

- /routes/appointment.routes.js

- /models/Appointment.js

- Autenticación JWT (middleware /middleware/auth.js)

- Dotenv para variables de entorno

- CORS + BodyParser habilitados

## Ejecución

### Preparación del Backend

```bash
cd backend
```

```bash
npm install
```

```bash
nano env
```

```bash
# Pegar esto
MONGODB_URI=mongodb://localhost:27017/fisio_clinic
JWT_SECRET=supersecret_development_key
PORT=4000

```

```bash
npm run seed:admin
```

### Preparación del Frontend

```bash
cd frontend
```

```bash
npm install
```

```bash
nano .env.development
```

```bash
# Pegar esto
VITE_API_URL=/api
```

### Ejecución Final

```bash
cd backend
npm run dev:all
```

## Contraseña del Admin por Defecto

Usuario: admin@demo.com
Contraseña: admin123

## Funcionalidad

### 👤 Cliente

#### 🔐 Autenticación

- **Inicio de sesión y registro** desde las pantallas `Login` y `Register`.
- El usuario siempre se registra como **cliente** (no puede asignarse rol de admin).

#### 🗓️ Reserva de citas

- Interfaz principal en `ClientHome.jsx` con un **calendario interactivo** (`MonthCalendar.jsx`).
- Los días activos aparecen resaltados; el día seleccionado se marca en **morado**.
- Al seleccionar una hora disponible, el cliente puede **confirmar la reserva**.
- Se muestra un mensaje de confirmación cuando la cita se guarda correctamente.

#### 📜 Historial de citas

- En la misma vista se listan las **citas activas y pasadas** del cliente.
- Cada cita muestra su fecha, hora y estado (reservada, pagada, cancelada).

#### 💬 Chat con la clínica

- Integración de `ChatBox.jsx` para **mensajería en tiempo real** con el administrador.
- Cada cliente tiene su propio canal de chat (`room=client:<id>`).

---

### 🧑‍💼 Administrador

#### 📅 Panel principal

- `AdminHome.jsx` organiza la interfaz en tres pestañas:
  1. **Calendario**
  2. **Clientes**
  3. **Ver citas**

#### 📆 Calendario

- Permite **configurar disponibilidad** diaria (inicio, fin, duración, franjas bloqueadas).
- Las citas reservadas aparecen marcadas como **ocupadas**.
- Posibilidad de **guardar cambios** de horarios por día.
- No se permite editar días pasados (modo solo lectura).

#### 👥 Gestión de clientes

- Sección “Ver clientes” muestra una tabla editable con:
  - Nombre, teléfono y motivo.
  - Botones de **Editar**, **Borrar** y **Chat**.
- Incluye un formulario para **añadir nuevos clientes** directamente.
- Chat integrado con cada cliente desde el botón correspondiente.

#### 📋 Ver citas

- Lista global de citas con filtros por **nombre** o **fecha**.
- Cada fila muestra día, hora, cliente, motivo, estado y pago.
- Permite:
  - Marcar una cita como **pagada ✓**.
  - **Cancelar citas** (la hora vuelve a estar disponible automáticamente).

---

### 🎨 Diseño y usabilidad

- Estilos centralizados en `styles.css`.
- Diseño responsive con tarjetas, botones y colores temáticos.
- Días activos, seleccionados, pasados y cerrados se diferencian visualmente.
- Botón flotante de **“Salir”** para cerrar sesión en cualquier momento.

---

## Tecnologías

[Tecnologías utilizadas y por qué](/docs/Tecnologias.md)
