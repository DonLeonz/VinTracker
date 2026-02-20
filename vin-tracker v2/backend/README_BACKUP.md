# 💾 Scripts de Backup y Restauración

## Archivos Generados

### ✅ Backup completado exitosamente

Se han creado los siguientes archivos de backup:

1. **backup_YYYY-MM-DDTHH-MM-SS.json** - Backup con timestamp
2. **data_backup.json** - Backup por defecto

### 📊 Datos respaldados:
- **Delivery records**: 221 registros
- **Service records**: 836 registros  
- **Total**: 1,057 registros

---

## 🚀 Uso Rápido

### Crear un nuevo backup
```bash
node create_backup.js
```

### Restaurar backup
```bash
# Restaurar desde data_backup.json
node restore_backup.js

# Restaurar desde un archivo específico
node restore_backup.js backup_2026-01-31T12-30-45.json
```

---

## 📁 Archivos importantes a guardar

Antes de cambiar de sistema operativo, asegúrate de copiar:

```
✅ backend/backup_*.json          (Todos los backups con fecha)
✅ backend/data_backup.json       (Backup por defecto)
✅ backend/db/schema.sql          (Estructura de la base de datos)
✅ backend/db/migrations/         (Scripts de migración)
✅ MIGRACION_LINUX.md             (Guía completa de migración)
```

---

## 📝 Estructura del Backup

El archivo JSON contiene:

```json
{
  "metadata": {
    "created_at": "2026-01-31T...",
    "database": "vin_tracker",
    "version": "2.0",
    "description": "Backup completo..."
  },
  "delivery": [ /* 221 registros */ ],
  "service": [ /* 836 registros */ ]
}
```

Cada registro incluye:
- `id`: ID único
- `vin`: Número VIN
- `char_count`: Cantidad de caracteres
- `registered`: Estado de registro
- `repeat_count`: Cantidad de repeticiones
- `last_registered_at`: Última vez registrado
- `created_at`: Fecha de creación
- `updated_at`: Fecha de actualización
- `deleted`: Si está en papelera
- `deleted_at`: Fecha de eliminación

---

## 🔒 Seguridad

### Múltiples copias
Guarda el backup en varios lugares:
- 💾 USB/Disco externo
- ☁️ Nube (Google Drive, Dropbox, OneDrive)
- 📧 Email a ti mismo
- 💻 Otro ordenador en red

### Verificación
Verifica que el archivo JSON sea válido:
```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('./data_backup.json', 'utf8')).metadata)"
```

---

## 📖 Documentación adicional

Consulta **MIGRACION_LINUX.md** para la guía completa paso a paso de cómo:
1. Instalar PostgreSQL en Linux
2. Configurar el entorno
3. Restaurar todos los datos
4. Verificar que todo funcione correctamente

---

## ⚠️ Importante

- ✅ El backup incluye TODOS los datos (incluso los eliminados)
- ✅ Los timestamps se conservan exactamente
- ✅ La restauración detecta duplicados y los omite
- ✅ Es seguro ejecutar la restauración múltiples veces

---

## 🆘 Soporte

Si tienes problemas durante la migración:
1. Verifica que PostgreSQL esté corriendo: `psql --version`
2. Verifica que Node.js esté instalado: `node --version`
3. Revisa el archivo `.env` en la carpeta backend
4. Consulta la sección de "Solución de problemas" en MIGRACION_LINUX.md
