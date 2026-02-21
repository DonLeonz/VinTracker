# VIN Tracker v2

Sistema de gestión y seguimiento de números VIN (Vehicle Identification Number) para control de vehículos de entrega y servicio.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite, UIkit 3, Axios |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL 16 |
| Infraestructura | Docker / Podman |

## Funcionalidades

- **Agregar VINs** — Ingreso manual con conversión automática O→0 y validación de 17 caracteres
- **Importar VINs** — Carga masiva desde `.txt` con previsualización en dos fases antes de confirmar
- **Ver registros** — Tablas filtradas por fecha, estado, búsqueda y repeticiones
- **Visualización plana** — Vista compacta del inventario completo
- **Verificación** — Diagnóstico de duplicados dentro de cada tabla y entre tablas
- **Papelera** — Eliminación suave (soft delete) con restauración individual o masiva
- **Exportar** — Descarga `.txt` de VINs sin registrar, con filtro de fecha
- **Indicador de BD** — Estado de conexión en tiempo real

## Configuración

### Backend

```bash
cd backend
cp .env.example .env   # editar con tus credenciales reales
npm install
node server.js
```

Variables de entorno necesarias (ver `backend/.env.example`):

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DB_HOST` | Host de PostgreSQL | `localhost` |
| `DB_PORT` | Puerto de PostgreSQL | `5432` |
| `DB_DATABASE` | Nombre de la base de datos | `vin_tracker` |
| `DB_USER` | Usuario de PostgreSQL | `vintracker` |
| `DB_PASSWORD` | Contraseña de PostgreSQL | — |
| `PORT` | Puerto del backend | `3001` |

### Frontend

```bash
cd frontend
cp .env.example .env   # ajustar VITE_API_URL si el backend corre en otro puerto
npm install
npm run dev
```

| Servicio | URL por defecto |
|---------|-----------------|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/api |

## Base de datos

```bash
# Backup manual
cd backend && node create_backup.js

# Restaurar backup
cd backend && node restore_backup.js

# Restaurar desde un archivo específico
cd backend && node restore_backup.js backup_2026-01-31T12-00-00.json
```

## Migraciones

Las migraciones se aplican automáticamente al arrancar el backend. Para aplicarlas manualmente, ejecutarlas en orden con `psql`:

| Migración | Descripción |
|-----------|-------------|
| `001_rename_last_repeated_at.sql` | Renombra columna de fecha de última repetición |
| `002_add_soft_delete.sql` | Añade campos `deleted` y `deleted_at` (papelera) |
| `003_add_unique_vin.sql` | Índice único parcial por VIN activo (`WHERE deleted = false`) |

## API Endpoints

### GET

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/vins/records?date=&registered=` | Obtener todos los registros activos |
| `GET /api/vins/check?vin=&type=` | Verificar si un VIN ya existe |
| `GET /api/vins/export?type=&date=` | Exportar VINs sin registrar a TXT |
| `GET /api/vins/verification` | Diagnóstico de duplicados entre tablas |
| `GET /api/vins/trash` | Obtener registros eliminados (papelera) |

### POST

| Endpoint | Descripción | Body |
|----------|-------------|------|
| `POST /api/vins/add` | Agregar nuevo VIN | `{ vin, type }` |
| `POST /api/vins/add-repeated` | Incrementar contador de repetición | `{ id, type }` |
| `POST /api/vins/update` | Actualizar VIN | `{ id, type, vin }` |
| `POST /api/vins/delete` | Mover a papelera (soft delete) | `{ id, type }` |
| `POST /api/vins/toggle-registered` | Cambiar estado de registro | `{ id, type }` |
| `POST /api/vins/register-all` | Registrar todos los VINs de un tipo | `{ type }` |
| `POST /api/vins/unregister-all` | Desregistrar todos los VINs de un tipo | `{ type }` |
| `POST /api/vins/delete-all` | Mover todos a papelera | `{ type }` |
| `POST /api/vins/restore` | Restaurar VIN de la papelera | `{ id, type }` |
| `POST /api/vins/restore-all` | Restaurar todos los VINs de la papelera | `{ type }` |
| `POST /api/vins/empty-trash` | Vaciar papelera permanentemente | `{ type }` |

## Lógica de negocio

- **Delivery**: un VIN no se repite; si ya existe y está registrado se omite
- **Service**: un VIN puede repetirse; cada repetición incrementa `repeat_count`
- **Soft delete**: eliminar mueve a la papelera; los VINs eliminados pueden re-añadirse sin conflicto
- **Unicidad**: el índice parcial `WHERE deleted = false` garantiza unicidad solo entre registros activos
