#!/bin/bash

# Script para detener todos los servicios de VIN Tracker

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "========================================"
echo "  DETENIENDO VIN TRACKER"
echo "========================================"
echo ""

# Detener PostgreSQL
echo -e "${YELLOW}[INFO]${NC} Deteniendo PostgreSQL..."
podman stop vin-tracker-postgres 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}[OK]${NC} PostgreSQL detenido."
else
    echo -e "${YELLOW}[INFO]${NC} PostgreSQL no estaba corriendo."
fi

# Matar procesos en puertos
echo -e "${YELLOW}[INFO]${NC} Cerrando procesos de backend y frontend..."
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:3000 | xargs kill -9 2>/dev/null
echo -e "${GREEN}[OK]${NC} Procesos cerrados."

echo ""
echo "Todos los servicios han sido detenidos."
echo "Para iniciar nuevamente: ./start.sh"
echo ""
