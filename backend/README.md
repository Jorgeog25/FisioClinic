# Fisio Clinic API

API Node/Express + MongoDB con JWT para una clínica de fisioterapia.

## Requisitos
- Node 18+
- MongoDB 6+ (local o Atlas)

## Instalación
```bash
cd backend
cp .env.example .env
# edita .env con tus valores
npm install
npm run dev
```

La API arranca en `http://localhost:${PORT || 4000}`.

## Modelos
- **User**: { email, password, role: 'admin'|'client', clientId? }
- **Client**: { firstName, lastName, phone, reason, notes }
- **Availability**: { date:'YYYY-MM-DD', startTime:'HH:mm', endTime:'HH:mm', slotMinutes }
- **Appointment**: { clientId, date, time, durationMinutes, status, notes }
- **Payment**: { clientId, appointmentId, amount, method, status }

> Pagos se relacionan por `appointmentId` (una sesión ⇄ un pago).

## Endpoints principales

### Auth
- `POST /api/auth/register` (admin o público) body: { email, password, role?, firstName?, lastName?, phone?, reason? }
- `POST /api/auth/login` body: { email, password }
- `GET /api/auth/me` (Bearer token)

### Clientes (admin)
- `GET /api/clients`
- `POST /api/clients` body: { firstName, lastName, phone, reason, notes? }
- `GET /api/clients/:id` → { client, history, payments }
- `PUT /api/clients/:id`
- `GET /api/clients/me/history` (cliente logado)

### Disponibilidad / Calendario
- `POST /api/availability` (admin) body: { date, startTime, endTime, slotMinutes?, isActive? }
- `GET /api/availability?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /api/availability/:date/slots` → slots libres de ese día

### Citas
- `POST /api/appointments` (cliente/admin) body: { clientId, date, time }
- `GET /api/appointments?date=YYYY-MM-DD` (admin)
- `GET /api/appointments/me` (cliente)
- `PUT /api/appointments/:id` (admin) body: { status?, notes? }

### Pagos (admin)
- `POST /api/payments` body: { clientId, appointmentId, amount, method, status? }
- `GET /api/payments/client/:clientId`

## Flujo esperado

**Admin**
1. Define días activos y horario con `POST /api/availability` (1h = slotMinutes 60).
2. Consulta citas por fecha y marca *completed/cancelled*. Opcional: registra pago.

**Cliente**
1. Inicia sesión, ve su historial (`/clients/me/history`).
2. Pide cita:
   - Pide `GET /api/availability` para pintar calendario con días `isActive`.
   - Al elegir día, consulta `GET /api/availability/:date/slots` y muestra horas libres.
   - Confirma con `POST /api/appointments`.

## Notas de seguridad
- Usa HTTPS en producción.
- Cambia `JWT_SECRET` y acorta expiración si lo necesitas.
- Aplica CORS según tu frontend.

## Próximos pasos (sugeridos)
- Rate limiting, logs persistentes, test e2e.
- Roles más granulares (recepción).
- Webhooks/notificaciones email/WhatsApp para recordatorios.
