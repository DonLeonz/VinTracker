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
- **Importar VINs** — Carga masiva desde `.txt` con previsualización antes de confirmar
- **Ver registros** — Tablas filtradas por fecha, estado, búsqueda y repeticiones
- **Visualización plana** — Vista compacta del inventario
- **Verificación** — Diagnóstico de duplicados dentro de cada tabla y entre tablas
- **Papelera** — Eliminación suave (soft delete) con restauración individual o masiva
- **Exportar** — Descarga `.txt` de VINs sin registrar, con filtro de fecha
- **Indicador de BD** — Estado de conexión en tiempo real

## Inicio rápido

```bash
# Levantar todo con Docker
./start.sh

# Detener
./stop.sh
```

El script `start.sh` levanta la base de datos, aplica las migraciones automáticamente y arranca el backend y el frontend.

| Servicio | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001/api |

## Configuración manual

### Backend

```bash
cd backend
cp .env.example .env   # ajustar credenciales si es necesario
npm install
node server.js
```

### Frontend

```bash
cd frontend
cp .env.example .env   # ajustar VITE_API_URL si el backend corre en otro puerto
npm install
npm run dev
```

## Base de datos

```bash
# Crear base de datos desde cero
bash setup-db.sh

# Backup manual
cd backend && node create_backup.js

# Restaurar backup
cd backend && node restore_backup.js
# o restaurar desde un archivo específico:
cd backend && node restore_backup.js backup_2026-01-31T12-00-00.json
```

Ver [backend/README_BACKUP.md](backend/README_BACKUP.md) para detalles sobre el sistema de backup.

## Migraciones

Las migraciones se aplican automáticamente al arrancar. Para aplicarlas manualmente:

| Migración | Descripción |
|-----------|-------------|
| `001_initial_schema.sql` | Esquema inicial |
| `002_add_soft_delete.sql` | Campos `deleted` y `deleted_at` |
| `003_add_unique_vin.sql` | Índice único parcial por VIN activo |

## Lógica de negocio

- **Delivery**: un VIN no se repite; si ya existe y está registrado se omite
- **Service**: un VIN puede repetirse; cada repetición incrementa `repeat_count`
- **Soft delete**: eliminar mueve a la papelera; los VINs eliminados pueden re-añadirse
- **Unicidad**: índice parcial `WHERE deleted = false` garantiza unicidad solo entre registros activos
