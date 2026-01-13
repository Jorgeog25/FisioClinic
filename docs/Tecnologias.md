# 🧠 FisioClinic --- Decisiones técnicas y por qué se tomaron (Frontend & Backend)

Este documento explica **las tecnologías elegidas** y **las decisiones
de arquitectura** en FisioClinic, tanto en el **frontend** como en el
**backend**, y por qué son adecuadas para este caso de uso (gestión de
citas de una clínica).

------------------------------------------------------------------------

## 🎨 Frontend (React + Vite)

### ¿Por qué React?

-   **Componentización**: Pantallas (`Login`, `Register`, `ClientHome`,
    `AdminHome`) y componentes (`MonthCalendar`, `ChatBox`)
    reutilizables.
-   **Estado con Hooks**: `useState`, `useEffect` sincronizan UI con
    datos (citas, disponibilidad, filtros).
-   **Ecosistema maduro**: integración con `react-router-dom`,
    `socket.io-client`.

### ¿Por qué Vite?

-   **Dev server ultra rápido** y HMR estable.
-   **Configuración mínima** → productividad desde el primer día.

### React Router

-   Navegación clara entre vistas (auth → cliente/admin).
-   Guards basados en rol (`admin | client`) para evitar estados
    inválidos.

### `styles.css` separado

-   Un único punto de estilos → mantenibilidad y consistencia.
-   Facilita refactors y futuros temas.

### `MonthCalendar.jsx`

-   UI declarativa con estados visuales claros.
-   Reglas de negocio en UI: días pasados en solo lectura.
-   Día seleccionado resaltado para feedback inmediato.

### `ClientHome.jsx`

-   Flujo lineal de reserva: día → hora → confirmar.
-   Historial integrado para reducir fricción.

### `AdminHome.jsx`

-   Pestañas (Calendario / Clientes / Ver citas / Pagos) → foco y carga
    bajo demanda.
-   Cancelar ≠ borrar (`status: "cancelled"`).
-   Búsqueda por nombre y fecha.
-   Chat en tiempo real integrado.
-   **Gestión de roles**: el admin puede cambiar entre `client` y
    `admin`.
-   Protección contra roles inválidos (no existe `user`).

### `ChatBox.jsx`

-   Comunicación en tiempo real cliente ↔ admin con Socket.IO.
-   Rooms por cliente (`client:<id>`).

### Capa `api.js`

-   Punto único de entrada REST.
-   Centraliza token, errores y baseURL.
-   Facilita añadir nuevos endpoints (ej. cambio de rol).

------------------------------------------------------------------------

## 🧩 Backend (Node.js + Express + MongoDB/Mongoose)

### Node + Express

-   API ligera y flexible.
-   Middleware reusable (auth, roles, CORS).

### MongoDB + Mongoose

-   Modelo documental ideal para citas y disponibilidad.
-   `populate` para relaciones (`Order → Appointment → Client`).
-   Esquemas flexibles para pagos y estados.

### Arquitectura MVC

-   Separación clara: `models`, `controllers`, `routes`.
-   Facilita mantenimiento y testeo.

### Decisión clave: estados en vez de borrado

-   `PATCH` + `status: "cancelled"` en citas.
-   Conserva historial y evita inconsistencias.

### Prevención de colisiones

-   Solo se bloquean citas no canceladas.
-   Permite re-reservar huecos liberados.

### Gestión de roles (decisión crítica)

-   Roles válidos: **solo `admin` y `client`**.
-   Eliminado `user` para evitar estados inválidos.
-   El rol vive únicamente en `User`.
-   El admin puede cambiar roles desde el panel.
-   Protección: un admin no puede dejar el sistema en un estado
    inconsistente.

### Autenticación y autorización

-   JWT stateless.
-   Middleware `auth` + `requireRole`.
-   El frontend nunca decide el rol.

### Pagos (Orders + GraphQL)

-   Pagos del admin vienen de **Orders**, no de Payment directo.
-   Query `allOrders` protegida para admin.
-   Uso de `populate` profundo:
    -   `Order → appointments → clientId`.
-   `timestamps: true` en `Order` para fechas fiables.
-   Frontend defensivo ante datos incompletos.

### GraphQL

-   Usado para operaciones complejas (pagos agregados).
-   REST se mantiene para operaciones CRUD simples.

### Variables de entorno

-   Separan secretos y config por entorno.
-   Facilitan despliegue seguro.

### Semilla de admin

-   No existe endpoint público para crear admins.
-   Admin solo vía seed (`npm run seed:admin`).

------------------------------------------------------------------------

## 🔒 Seguridad aplicada

-   Registro público siempre crea `client`.
-   Rutas sensibles protegidas por rol.
-   Roles estrictos evitan pantallas en blanco.
-   Datos nunca se borran → auditoría completa.

------------------------------------------------------------------------

## 🧭 Beneficios finales

-   **Usabilidad**: flujos claros y feedback visual.
-   **Mantenibilidad**: arquitectura limpia y consistente.
-   **Escalabilidad**: sockets, GraphQL, Mongo flexible.
-   **Seguridad**: control estricto de roles y accesos.