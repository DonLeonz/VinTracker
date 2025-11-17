# 🚗 VIN Tracker System v2

Sistema profesional de seguimiento de VINs con React + Vite, Node.js + Express y PostgreSQL 16.

## 🎨 Características

- ✅ Validación de VINs de 17 caracteres
- 🔄 Detección de VINs repetidos (solo en registrados)
- 📦 Gestión separada de Delivery y Service
- 🎯 Interfaz responsive con diseño negro/blanco/dorado
- ⬆️ Botón flotante de scroll-to-top
- ✏️ Edición y eliminación de registros
- 📊 Exportación de datos a TXT
- 🔍 Filtros por fecha y estado de registro

## 📋 Requisitos Previos

- Node.js (v16 o superior)
- PostgreSQL 16
- Git Bash o terminal compatible

## 🎯 Uso de la Aplicación

### Agregar VIN

1. Escribe o pega el VIN en el campo de entrada
2. Selecciona el tipo (Delivery o Service)
3. El sistema valida automáticamente que tenga 17 caracteres
4. Convierte automáticamente "O" a "0"
5. Detecta si ya existe (solo entre VINs registrados)

### Gestionar Registros

- **Ver/Ocultar tabla**: Click en el título con la flecha
- **Filtrar por fecha**: Selecciona una fecha en el filtro
- **Filtrar por estado**: Elige entre Todos/Registrados/No Registrados
- **Marcar como registrado**: Click en el badge de estado (❌/✅)
- **Editar VIN**: Click en el botón ✏️
- **Eliminar VIN**: Click en el botón 🗑️

### Acciones Masivas

- **Registrar Todos**: Marca todos los VINs del tipo como registrados
- **Desregistrar Todos**: Desmarca todos los VINs del tipo
- **Ver Todos**: Limpia los filtros aplicados

### Exportar Datos

- **Exportar Sin Registrar**: Exporta todos los VINs no registrados (ambos tipos)
- **Export. Delivery**: Exporta solo VINs de Delivery no registrados
- **Export. Service**: Exporta solo VINs de Service no registrados

Los archivos se descargan automáticamente como archivos de texto (.txt)

## 🛠️ Estructura del Proyecto

```
vin-tracker-v2/
├── backend/
│   ├── controllers/
│   │   └── vinController.js      # Lógica de negocio
│   ├── db/
│   │   ├── config.js              # Configuración PostgreSQL
│   │   └── schema.sql             # Esquema de base de datos
│   ├── routes/
│   │   └── vinRoutes.js           # Rutas API
│   ├── scripts/
│   │   └── migrate.js             # Script de migración
│   ├── data/                      # Archivos de backup
│   ├── .env                       # Variables de entorno
│   ├── server.js                  # Servidor Express
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── VinInput.jsx       # Input de VIN
│   │   │   ├── VinTable.jsx       # Tabla con registros
│   │   │   ├── Filters.jsx        # Filtros y exportación
│   │   │   └── ScrollToTop.jsx    # Botón scroll
│   │   ├── services/
│   │   │   └── api.js             # Cliente API (Axios)
│   │   ├── styles/
│   │   │   ├── theme.css          # Tema base UIkit
│   │   │   └── custom.css         # Estilos personalizados
│   │   ├── utils/
│   │   │   └── helpers.js         # Funciones auxiliares
│   │   ├── App.jsx                # Componente principal
│   │   └── main.jsx               # Punto de entrada
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── START.bat                      # Script de inicio automático
├── SETUP_DATABASE.bat             # Configuración de BD
├── MIGRATE_DATA.bat               # Migración de datos
└── README.md
```

## 📡 API Endpoints

### GET
- `GET /api/vins/records?date=&registered=` - Obtener todos los registros
- `GET /api/vins/export/:type?date=` - Exportar datos a TXT

### POST
- `POST /api/vins/add` - Agregar nuevo VIN
  ```json
  { "vin": "1HGBH41JXMN109186", "type": "delivery" }
  ```
- `POST /api/vins/add-repeated` - Incrementar contador de repetición
  ```json
  { "id": 1, "type": "delivery" }
  ```
- `POST /api/vins/update` - Actualizar VIN
  ```json
  { "id": 1, "type": "delivery", "vin": "NEW_VIN_HERE" }
  ```
- `POST /api/vins/delete` - Eliminar VIN
  ```json
  { "id": 1, "type": "delivery" }
  ```
- `POST /api/vins/toggle-registered` - Cambiar estado de registro
  ```json
  { "id": 1, "type": "delivery" }
  ```
- `POST /api/vins/register-all` - Registrar todos
  ```json
  { "type": "delivery" }
  ```
- `POST /api/vins/unregister-all` - Desregistrar todos
  ```json
  { "type": "delivery" }
  ```

## 🎨 Tema y Diseño

El diseño está basado en el proyecto Coffee-Shop-SPA con:

### Colores
- **Dorado**: #D4A762 (principal)
- **Dorado Claro**: #F5D98D (hover/highlights)
- **Dorado Oscuro**: #B8935A (sombras)
- **Negro Primario**: #1E1E1E (fondo)
- **Negro Secundario**: #2C2C2C (cards)
- **Negro Terciario**: #3A3A3A (hover)

### Responsive
- **Desktop**: > 960px (diseño completo)
- **Tablet**: 640px - 960px (ajustes de spacing)
- **Mobile**: < 640px (layout vertical, botones más pequeños)

**Desarrollado con ❤️ usando React + Vite + Node.js + PostgreSQL**
