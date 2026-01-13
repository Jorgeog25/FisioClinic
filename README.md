# FisioClinic

[Enlace Github](https://github.com/Jorgeog25/FisioClinic)

## Contexto

🩺 FisioClinic --- Sistema de Gestión de Citas para Clínicas de
Fisioterapia

FisioClinic es una aplicación web completa (Full Stack MERN) para la
gestión de reservas de citas entre clientes y administradores de una
clínica de fisioterapia. Permite a los pacientes registrarse, reservar
horas disponibles, chatear con la clínica y revisar su historial. Los
administradores pueden gestionar clientes, citas, disponibilidad diaria
y pagos, todo desde un panel unificado.

## Tecnologías Principales

🔹**Frontend**

-   React + Vite
-   React Router para navegación entre vistas (Login, Register,
    ClientHome, AdminHome)
-   Estado local con Hooks (useState, useEffect)
-   Fetch API centralizado en /src/api.js
-   CSS modularizado (styles.css)

**Componentes principales:**

-   MonthCalendar.jsx → calendario dinámico con días activos, pasados,
    seleccionados (morado)
-   ChatBox.jsx → chat cliente--administrador
-   ClientHome.jsx → portal de reservas del cliente
-   AdminHome.jsx → panel administrativo con control de citas, clientes
    y chat

🔹 **Backend**

-   Node.js + Express
-   MongoDB (Mongoose) para persistencia de datos

**Estructura MVC:**

-   /controllers/appointment.controller.js
-   /routes/appointment.routes.js
-   /models/Appointment.js
-   Autenticación JWT (middleware /middleware/auth.js)
-   Dotenv para variables de entorno
-   CORS + BodyParser habilitados

## Ejecución

### Preparación del Backend

``` bash
cd backend
npm install
nano env
```

``` bash
MONGODB_URI=mongodb://localhost:27017/fisio_clinic
JWT_SECRET=supersecret_development_key
PORT=4000
```

``` bash
npm run seed:admin
```

### Preparación del Frontend

``` bash
cd frontend
npm install
nano .env.development
```

``` bash
VITE_API_URL=/api
```

### Ejecución Final

``` bash
cd backend
npm run dev:all
```

## Contraseña del Admin por Defecto

Usuario: admin@demo.com\
Contraseña: admin123

## Funcionalidad

### 👤 Cliente

#### 🔐 Autenticación

-   Inicio de sesión y registro desde Login y Register.
-   El usuario siempre se registra como cliente.

#### 🗓️ Reserva de citas

-   Calendario interactivo con selección visual.
-   Confirmación inmediata de la reserva.

#### 📜 Historial de citas

-   Listado de citas activas y pasadas con estado.

#### 💬 Chat con la clínica

-   Chat en tiempo real por canal dedicado.

------------------------------------------------------------------------

### 🧑‍💼 Administrador

#### 📅 Panel principal

-   Pestañas: Calendario, Clientes, Ver citas y Pagos.

#### 👥 Gestión de clientes

-   Edición, borrado, chat y **gestión de roles (client/admin)**.

#### 📋 Ver citas

-   Filtros por nombre y fecha.
-   Pago y cancelación de citas.

#### 💳 Pagos

-   Vista de pagos basada en Orders.
-   Datos agregados por GraphQL (allOrders).
-   Relación Order → Appointment → Client.

------------------------------------------------------------------------

## 🧠 Decisiones técnicas añadidas

### Gestión de roles

-   Solo existen los roles `admin` y `client`.
-   Eliminado `user` para evitar estados inválidos.
-   Cambio de rol disponible solo para administradores.

### Pagos con Orders + GraphQL

-   Orders como fuente de verdad para pagos.
-   Populate profundo en backend.
-   Frontend defensivo ante datos incompletos.

### Estados en vez de borrado

-   Las citas no se eliminan, se cancelan.
-   Mantiene historial y coherencia.

------------------------------------------------------------------------

## Tecnologías

[Tecnologías utilizadas y por qué](/docs/Tecnologias.md)