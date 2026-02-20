#!/bin/bash

# Script de inicio para VIN Tracker en Linux con Podman
# Actualizado para CachyOS + Hyprland + Kitty

# Detectar si se ejecutó desde GUI (sin terminal interactiva)
if [ -z "$VIN_TRACKER_LAUNCHED" ] && [ ! -t 0 ]; then
    # Se ejecutó desde GUI, abrir en terminal Kitty
    export VIN_TRACKER_LAUNCHED=1
    SCRIPT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/$(basename "${BASH_SOURCE[0]}")"
    kitty -e /bin/bash "$SCRIPT_PATH"
    exit 0
fi

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Titulo
clear
echo "========================================"
echo "  VIN TRACKER V2 - INICIO AUTOMATICO"
echo "========================================"
echo ""

# Variables
POSTGRES_CONTAINER="vin-tracker-postgres"
POSTGRES_PORT=5432
POSTGRES_DB="vin_tracker"
POSTGRES_USER="vintracker"
POSTGRES_PASSWORD="vintracker2024"
BACKEND_PORT=3001
FRONTEND_PORT=3000

# Obtener directorio del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Función para verificar si un puerto está en uso
port_in_use() {
    lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1
}

# Función para matar proceso en un puerto
kill_port() {
    local port=$1
    echo -e "${YELLOW}[INFO]${NC} Cerrando procesos en puerto $port..."
    lsof -ti:$port | xargs kill -9 2>/dev/null
    echo -e "${GREEN}[OK]${NC} Puerto $port liberado."
}

# [1/7] Verificar Node.js
echo -e "${BLUE}[1/7]${NC} Verificando Node.js..."
if ! command_exists node; then
    echo -e "${RED}[ERROR]${NC} Node.js no está instalado!"
    echo "Por favor instala Node.js:"
    echo "  sudo pacman -S nodejs npm"
    exit 1
fi
echo -e "${GREEN}[OK]${NC} Node.js $(node --version) instalado."

# [2/7] Verificar Podman
echo -e "${BLUE}[2/7]${NC} Verificando Podman..."
if ! command_exists podman; then
    echo -e "${RED}[ERROR]${NC} Podman no está instalado!"
    echo "Por favor instala Podman:"
    echo "  sudo pacman -S podman podman-compose"
    exit 1
fi
echo -e "${GREEN}[OK]${NC} Podman $(podman --version | cut -d' ' -f3) instalado."

# [3/7] Gestionar PostgreSQL con Podman
echo -e "${BLUE}[3/7]${NC} Gestionando PostgreSQL con Podman..."

# Limpiar contenedores fallidos o en mal estado
if podman ps -a --format "{{.Names}}" | grep -q "^${POSTGRES_CONTAINER}$"; then
    CONTAINER_STATUS=$(podman ps -a --filter "name=^${POSTGRES_CONTAINER}$" --format "{{.Status}}")
    
    # Si el contenedor está en estado "Created" o "Exited", eliminarlo
    if echo "$CONTAINER_STATUS" | grep -qE "Created|Exited"; then
        echo -e "${YELLOW}[INFO]${NC} Limpiando contenedor PostgreSQL en mal estado..."
        podman rm -f $POSTGRES_CONTAINER >/dev/null 2>&1
        
        # Liberar el puerto si está ocupado
        if port_in_use $POSTGRES_PORT; then
            echo -e "${YELLOW}[INFO]${NC} Liberando puerto $POSTGRES_PORT..."
            # Matar procesos conmon huérfanos
            sudo pkill -f "conmon.*$POSTGRES_CONTAINER" 2>/dev/null
            lsof -ti:$POSTGRES_PORT | xargs sudo kill -9 2>/dev/null
            sleep 2
        fi
    fi
fi

# Verificar si el contenedor existe y está corriendo
if podman ps --format "{{.Names}}" | grep -q "^${POSTGRES_CONTAINER}$"; then
    echo -e "${GREEN}[OK]${NC} PostgreSQL ya está corriendo."
elif podman ps -a --format "{{.Names}}" | grep -q "^${POSTGRES_CONTAINER}$"; then
    # El contenedor existe pero no está corriendo, iniciarlo
    echo -e "${YELLOW}[INFO]${NC} Iniciando contenedor PostgreSQL existente..."
    podman start $POSTGRES_CONTAINER
    echo -e "${GREEN}[OK]${NC} PostgreSQL iniciado."
    sleep 3
else
    # Verificar que el puerto esté libre antes de crear el contenedor
    if port_in_use $POSTGRES_PORT; then
        echo -e "${YELLOW}[INFO]${NC} Puerto $POSTGRES_PORT ocupado, liberando..."
        sudo pkill -f "conmon.*postgres" 2>/dev/null
        lsof -ti:$POSTGRES_PORT | xargs sudo kill -9 2>/dev/null
        sleep 2
    fi
    
    # Crear nuevo contenedor
    echo -e "${YELLOW}[INFO]${NC} Creando nuevo contenedor PostgreSQL..."
    if podman run -d \
        --name $POSTGRES_CONTAINER \
        -e POSTGRES_USER=$POSTGRES_USER \
        -e POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
        -e POSTGRES_DB=$POSTGRES_DB \
        -p $POSTGRES_PORT:5432 \
        -v vin-tracker-pgdata:/var/lib/postgresql/data \
        docker.io/library/postgres:16-alpine >/dev/null 2>&1; then
        
        echo -e "${GREEN}[OK]${NC} Contenedor PostgreSQL creado."
        echo -e "${YELLOW}[INFO]${NC} Esperando a que PostgreSQL inicie..."
        sleep 5
        
        # Verificar que el contenedor esté corriendo
        if ! podman ps --format "{{.Names}}" | grep -q "^${POSTGRES_CONTAINER}$"; then
            echo -e "${RED}[ERROR]${NC} El contenedor PostgreSQL no se inició correctamente."
            podman logs $POSTGRES_CONTAINER 2>/dev/null | tail -n 10
            exit 1
        fi
        
        # Inicializar la base de datos
        echo -e "${YELLOW}[INFO]${NC} Inicializando esquema de base de datos..."
        if [ -f "$BACKEND_DIR/db/schema.sql" ]; then
            podman exec -i $POSTGRES_CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DB < "$BACKEND_DIR/db/schema.sql"
            echo -e "${GREEN}[OK]${NC} Esquema inicializado."
            
            # Aplicar migraciones si existen
            if [ -d "$BACKEND_DIR/db/migrations" ]; then
                echo -e "${YELLOW}[INFO]${NC} Aplicando migraciones..."
                for migration in "$BACKEND_DIR/db/migrations"/*.sql; do
                    if [ -f "$migration" ]; then
                        echo "  - Aplicando $(basename "$migration")..."
                        podman exec -i $POSTGRES_CONTAINER psql -U $POSTGRES_USER -d $POSTGRES_DB < "$migration" 2>/dev/null
                    fi
                done
                echo -e "${GREEN}[OK]${NC} Migraciones aplicadas."
            fi
        fi
    else
        echo -e "${RED}[ERROR]${NC} No se pudo crear el contenedor PostgreSQL."
        exit 1
    fi
fi

# Verificar conexión a PostgreSQL
echo -e "${YELLOW}[INFO]${NC} Verificando conexión a PostgreSQL..."
if podman exec $POSTGRES_CONTAINER pg_isready -U $POSTGRES_USER >/dev/null 2>&1; then
    echo -e "${GREEN}[OK]${NC} PostgreSQL está listo."
else
    echo -e "${RED}[ERROR]${NC} No se puede conectar a PostgreSQL."
    exit 1
fi

# [4/7] Crear archivo .env si no existe
echo -e "${BLUE}[4/7]${NC} Configurando variables de entorno..."
if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo -e "${YELLOW}[INFO]${NC} Creando archivo .env..."
    cat > "$BACKEND_DIR/.env" << EOF
DB_HOST=localhost
DB_PORT=$POSTGRES_PORT
DB_DATABASE=$POSTGRES_DB
DB_USER=$POSTGRES_USER
DB_PASSWORD=$POSTGRES_PASSWORD
PORT=$BACKEND_PORT
EOF
    echo -e "${GREEN}[OK]${NC} Archivo .env creado."
else
    echo -e "${GREEN}[OK]${NC} Archivo .env ya existe."
fi

# [5/7] Verificar puertos y cerrar procesos previos si existen
echo -e "${BLUE}[5/7]${NC} Verificando puertos..."
if port_in_use $BACKEND_PORT; then
    echo -e "${YELLOW}[INFO]${NC} Puerto $BACKEND_PORT ocupado, cerrando proceso previo..."
    kill_port $BACKEND_PORT
fi
if port_in_use $FRONTEND_PORT; then
    echo -e "${YELLOW}[INFO]${NC} Puerto $FRONTEND_PORT ocupado, cerrando proceso previo..."
    kill_port $FRONTEND_PORT
fi
# Cerrar ventanas de Kitty previas si existen
pkill -f "vin-backend-start.sh" 2>/dev/null
pkill -f "vin-frontend-start.sh" 2>/dev/null
sleep 1
if port_in_use $BACKEND_PORT; then
    kill_port $BACKEND_PORT
fi
if port_in_use $FRONTEND_PORT; then
    kill_port $FRONTEND_PORT
fi
sleep 1

# [6/7] Iniciar Backend
echo -e "${BLUE}[6/7]${NC} Iniciando Backend..."
cd "$BACKEND_DIR"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[INFO]${NC} Instalando dependencias del backend..."
    npm install
fi

# Crear script temporal para backend
cat > /tmp/vin-backend-start.sh << 'BACKEND_EOF'
#!/bin/bash
cd "$1"
echo "===== BACKEND SERVER ====="
echo "Puerto: 3001"
echo ""
npm run dev
exec bash
BACKEND_EOF
chmod +x /tmp/vin-backend-start.sh

# Iniciar backend en ventana de Kitty
echo -e "${GREEN}[OK]${NC} Iniciando servidor backend en puerto $BACKEND_PORT..."
kitty --title "VIN-Tracker-Backend" -e /tmp/vin-backend-start.sh "$BACKEND_DIR" &

sleep 2

# [7/7] Iniciar Frontend
echo -e "${BLUE}[7/7]${NC} Iniciando Frontend..."
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[INFO]${NC} Instalando dependencias del frontend..."
    npm install
fi

# Crear script temporal para frontend
cat > /tmp/vin-frontend-start.sh << 'FRONTEND_EOF'
#!/bin/bash
cd "$1"
echo "===== FRONTEND APP ====="
echo "Puerto: 3000"
echo ""
npm run dev
exec bash
FRONTEND_EOF
chmod +x /tmp/vin-frontend-start.sh

# Iniciar frontend en ventana de Kitty
echo -e "${GREEN}[OK]${NC} Iniciando aplicación web en puerto $FRONTEND_PORT..."
kitty --title "VIN-Tracker-Frontend" -e /tmp/vin-frontend-start.sh "$FRONTEND_DIR" &

sleep 3
# Mensaje final
echo ""
echo "========================================"
echo "  SISTEMA INICIADO CORRECTAMENTE!"
echo "========================================"
echo ""
echo -e "${GREEN}✓ Backend:${NC}  http://localhost:$BACKEND_PORT ${BLUE}(Terminal abierta)${NC}"
echo -e "${GREEN}✓ Frontend:${NC} http://localhost:$FRONTEND_PORT ${BLUE}(Terminal abierta)${NC}"
echo -e "${GREEN}✓ PostgreSQL:${NC} localhost:$POSTGRES_PORT"
echo ""
echo -e "${YELLOW}💡 Consejo:${NC} Las terminales del Backend y Frontend están abiertas."
echo "   Puedes ver los logs en tiempo real ahí."
echo ""
echo "Credenciales PostgreSQL:"
echo "  Usuario: $POSTGRES_USER"
echo "  Password: $POSTGRES_PASSWORD"
echo "  Base de datos: $POSTGRES_DB"
echo ""

# Abrir navegador automáticamente con Brave
sleep 2
echo -e "${BLUE}[INFO]${NC} Abriendo navegador..."
brave "http://localhost:$FRONTEND_PORT" >/dev/null 2>&1 &

echo -e "${BLUE}[INFO]${NC} Sistema listo para usar!"
echo ""
echo "========================================"
echo -e "${YELLOW}Presiona ENTER para DETENER todos los servicios${NC}"
echo "========================================"
read -r

# Detener servicios
echo ""
echo -e "${YELLOW}[DETENIENDO]${NC} Cerrando aplicación..."

# Matar procesos de Node en los puertos
echo -e "${BLUE}[1/4]${NC} Deteniendo Backend y Frontend..."
if port_in_use $BACKEND_PORT; then
    kill_port $BACKEND_PORT
fi
if port_in_use $FRONTEND_PORT; then
    kill_port $FRONTEND_PORT
fi

# Cerrar ventanas de Kitty
echo -e "${BLUE}[2/3]${NC} Cerrando ventanas de Kitty..."
pkill -f "vin-backend-start.sh" 2>/dev/null
pkill -f "vin-frontend-start.sh" 2>/dev/null

# Limpiar archivos temporales
echo -e "${BLUE}[3/3]${NC} Limpiando archivos temporales..."
rm -f /tmp/vin-tracker-backend.pid /tmp/vin-tracker-frontend.pid 2>/dev/null
rm -f /tmp/vin-backend-start.sh /tmp/vin-frontend-start.sh 2>/dev/null

echo -e "${GREEN}[OK]${NC} Backend, Frontend y ventanas cerradas."

# Preguntar si detener PostgreSQL
echo ""
echo -e "${BLUE}[OPCIONAL]${NC} ¿Detener también PostgreSQL? (y/N):"
read -r -n 1 stop_postgres
echo ""

if [[ "$stop_postgres" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}[INFO]${NC} Deteniendo contenedor PostgreSQL..."
    podman stop $POSTGRES_CONTAINER 2>/dev/null
    echo -e "${GREEN}[OK]${NC} PostgreSQL detenido."
else
    echo -e "${BLUE}[INFO]${NC} PostgreSQL sigue ejecutándose en segundo plano."
fi

echo ""
echo -e "${BLUE}[FINALIZADO]${NC} Limpieza completada."
echo -e "${GREEN}✅ Todos los servicios han sido detenidos.${NC}"
echo ""