#!/bin/bash

# Script para configurar PostgreSQL con Podman y restaurar backup
# Uso: ./setup-db.sh [archivo_backup.json]

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

POSTGRES_CONTAINER="vin-tracker-postgres"
POSTGRES_PORT=5432
POSTGRES_DB="vin_tracker"
POSTGRES_USER="vintracker"
POSTGRES_PASSWORD="vintracker2024"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

# Función para verificar si un puerto está en uso
port_in_use() {
    lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1
}

echo "========================================"
echo "  CONFIGURACIÓN DE BASE DE DATOS"
echo "========================================"
echo ""

# Verificar Podman
if ! command -v podman >/dev/null 2>&1; then
    echo -e "${RED}[ERROR]${NC} Podman no está instalado!"
    echo "Instala Podman: sudo pacman -S podman podman-compose"
    exit 1
fi

# Verificar Node.js
if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}[ERROR]${NC} Node.js no está instalado!"
    echo "Instala Node.js: sudo pacman -S nodejs npm"
    exit 1
fi

echo -e "${BLUE}[1/6]${NC} Deteniendo contenedor anterior si existe..."
podman stop $POSTGRES_CONTAINER 2>/dev/null
podman rm -f $POSTGRES_CONTAINER 2>/dev/null

# Limpiar procesos conmon huérfanos
sudo pkill -f "conmon.*$POSTGRES_CONTAINER" 2>/dev/null

# Liberar el puerto si está ocupado
if port_in_use $POSTGRES_PORT; then
    echo -e "${YELLOW}[INFO]${NC} Liberando puerto $POSTGRES_PORT..."
    sudo pkill -f "conmon.*postgres" 2>/dev/null
    lsof -ti:$POSTGRES_PORT | xargs sudo kill -9 2>/dev/null
    sleep 2
fi

echo -e "${GREEN}[OK]${NC} Listo."

echo -e "${BLUE}[2/6]${NC} Creando nuevo contenedor PostgreSQL..."
if podman run -d \
    --name $POSTGRES_CONTAINER \
    -e POSTGRES_USER=$POSTGRES_USER \
    -e POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
    -e POSTGRES_DB=$POSTGRES_DB \
    -p $POSTGRES_PORT:5432 \
    -v vin-tracker-pgdata:/var/lib/postgresql/data \
    docker.io/library/postgres:16-alpine >/dev/null 2>&1; then
    
    echo -e "${GREEN}[OK]${NC} Contenedor creado."
else
    echo -e "${RED}[ERROR]${NC} No se pudo crear el contenedor."
    echo -e "${YELLOW}[INFO]${NC} Intentando diagnosticar el problema..."
    
    # Verificar si el puerto sigue ocupado
    if port_in_use $POSTGRES_PORT; then
        echo -e "${RED}[ERROR]${NC} El puerto $POSTGRES_PORT sigue ocupado."
        echo "Proceso usando el puerto:"
        sudo lsof -i :$POSTGRES_PORT
    fi
    
    exit 1
fi

echo -e "${YELLOW}[INFO]${NC} Esperando a que PostgreSQL inicie..."
sleep 7

# Verificar que PostgreSQL esté listo
echo -e "${BLUE}[3/6]${NC} Verificando conexión a PostgreSQL..."
for i in {1..30}; do
    if podman exec $POSTGRES_CONTAINER pg_isready -U $POSTGRES_USER >/dev/null 2>&1; then
        echo -e "${GREEN}[OK]${NC} PostgreSQL está listo."
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}[ERROR]${NC} PostgreSQL no respondió a tiempo."
        echo -e "${YELLOW}[INFO]${NC} Logs del contenedor:"
        podman logs $POSTGRES_CONTAINER | tail -n 20
        exit 1
    fi
    echo -n "."
    sleep 1
done
echo ""

echo -e "${BLUE}[4/6]${NC} Inicializando esquema de base de datos..."
if [ -f "$BACKEND_DIR/db/schema.sql" ]; then
    if podman exec -i $POSTGRES_CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DB < "$BACKEND_DIR/db/schema.sql" 2>&1 | grep -v "NOTICE"; then
        echo -e "${GREEN}[OK]${NC} Esquema creado."
    else
        echo -e "${RED}[ERROR]${NC} Error al crear el esquema."
        exit 1
    fi
else
    echo -e "${RED}[ERROR]${NC} No se encontró schema.sql en $BACKEND_DIR/db/"
    exit 1
fi

echo -e "${BLUE}[5/6]${NC} Aplicando migraciones..."
if [ -d "$BACKEND_DIR/db/migrations" ]; then
    MIGRATION_COUNT=0
    for migration in "$BACKEND_DIR/db/migrations"/*.sql; do
        if [ -f "$migration" ]; then
            echo "  - Aplicando $(basename "$migration")..."
            podman exec -i $POSTGRES_CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DB < "$migration" 2>/dev/null || true
            MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
        fi
    done
    
    if [ $MIGRATION_COUNT -eq 0 ]; then
        echo -e "${YELLOW}[INFO]${NC} No hay migraciones para aplicar."
    else
        echo -e "${GREEN}[OK]${NC} $MIGRATION_COUNT migración(es) aplicada(s)."
    fi
else
    echo -e "${YELLOW}[INFO]${NC} No existe el directorio de migraciones."
fi

echo -e "${BLUE}[6/6]${NC} Restaurando backup..."

# Buscar archivo de backup
BACKUP_FILE=""
if [ ! -z "$1" ]; then
    BACKUP_FILE="$1"
elif [ -f "$BACKEND_DIR/data_backup.json" ]; then
    BACKUP_FILE="$BACKEND_DIR/data_backup.json"
else
    # Buscar el backup más reciente
    LATEST_BACKUP=$(ls -t "$BACKEND_DIR"/backup_*.json 2>/dev/null | head -1)
    if [ ! -z "$LATEST_BACKUP" ]; then
        BACKUP_FILE="$LATEST_BACKUP"
    fi
fi

if [ -z "$BACKUP_FILE" ]; then
    echo -e "${YELLOW}[INFO]${NC} No se encontró ningún archivo de backup."
    echo -e "${YELLOW}[INFO]${NC} Base de datos lista pero vacía."
else
    # Convertir a ruta absoluta
    if [[ "$BACKUP_FILE" != /* ]]; then
        BACKUP_FILE="$(cd "$(dirname "$BACKUP_FILE")" 2>/dev/null && pwd)/$(basename "$BACKUP_FILE")"
    fi
    
    if [ ! -f "$BACKUP_FILE" ]; then
        echo -e "${RED}[ERROR]${NC} El archivo de backup no existe: $BACKUP_FILE"
    else
        echo -e "${YELLOW}[INFO]${NC} Usando backup: $(basename "$BACKUP_FILE")"
        
        # Crear .env temporal si no existe
        if [ ! -f "$BACKEND_DIR/.env" ]; then
            echo -e "${YELLOW}[INFO]${NC} Creando archivo .env..."
            cat > "$BACKEND_DIR/.env" << EOF
DB_HOST=localhost
DB_PORT=$POSTGRES_PORT
DB_DATABASE=$POSTGRES_DB
DB_USER=$POSTGRES_USER
DB_PASSWORD=$POSTGRES_PASSWORD
EOF
        fi
        
        cd "$BACKEND_DIR"
        
        # Instalar dependencias si es necesario
        if [ ! -d "node_modules" ]; then
            echo -e "${YELLOW}[INFO]${NC} Instalando dependencias..."
            npm install --silent
        fi
        
        # Ejecutar restore
        if [ -f "restore_backup.js" ]; then
            node restore_backup.js "$BACKUP_FILE"
            
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}[OK]${NC} Backup restaurado exitosamente."
            else
                echo -e "${RED}[ERROR]${NC} Error al restaurar el backup."
                echo -e "${YELLOW}[INFO]${NC} Puedes intentar restaurarlo manualmente:"
                echo "  cd backend && node restore_backup.js $BACKUP_FILE"
            fi
        else
            echo -e "${YELLOW}[INFO]${NC} No se encontró restore_backup.js"
            echo -e "${YELLOW}[INFO]${NC} Restauración de backup omitida."
        fi
    fi
fi

echo ""
echo "========================================"
echo "  CONFIGURACIÓN COMPLETADA"
echo "========================================"
echo ""
echo -e "${GREEN}PostgreSQL:${NC} localhost:$POSTGRES_PORT"
echo -e "${GREEN}Base de datos:${NC} $POSTGRES_DB"
echo -e "${GREEN}Usuario:${NC} $POSTGRES_USER"
echo -e "${GREEN}Password:${NC} $POSTGRES_PASSWORD"
echo ""
echo "Comandos útiles:"
echo "  - Conectar: podman exec -it $POSTGRES_CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DB"
echo "  - Ver logs: podman logs $POSTGRES_CONTAINER"
echo "  - Detener: podman stop $POSTGRES_CONTAINER"
echo "  - Iniciar: podman start $POSTGRES_CONTAINER"
echo "  - Eliminar: podman rm -f $POSTGRES_CONTAINER"
echo ""
echo "Para iniciar la aplicación, ejecuta: ./start.sh"
echo ""