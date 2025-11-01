# Fisio Clinic Frontend (React + Vite)

Frontend mínimo para la clínica de fisioterapia. Requiere el backend levantado (por defecto en `http://localhost:4000`).

## Instalación
```bash
cd frontend
npm install
npm run dev
```

Cambia la URL del backend en `.env.development` si es necesario:
```
VITE_API_URL=http://localhost:4000/api
```

## Rutas
- `/login`: acceso con email/contraseña (usa usuarios del backend).
- `/client`: área del paciente. Pedir cita (calendario con días activos) y ver historial.
- `/admin`: área admin. Definir días activos/horario, gestionar clientes y listar citas.

## Notas
- El frontend guarda el JWT en `localStorage`.
- El calendario marca los **días activos** con un estilo más llamativo.
- Al seleccionar un día, se muestran **horas disponibles** y se reserva en un clic.
