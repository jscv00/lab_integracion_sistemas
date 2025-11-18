#!/bin/bash

# Script de configuración automática para macOS
# Configura PostgreSQL y crea la base de datos

echo "🚀 Iniciando configuración de base de datos Mi Huerta..."
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar si PostgreSQL está instalado
echo "🔍 Verificando instalación de PostgreSQL..."
if ! command -v psql &> /dev/null; then
    echo -e "${RED}❌ PostgreSQL no está instalado${NC}"
    echo ""
    echo "Instalando PostgreSQL con Homebrew..."
    if ! command -v brew &> /dev/null; then
        echo -e "${RED}❌ Homebrew no está instalado${NC}"
        echo "Por favor instala Homebrew primero: https://brew.sh"
        exit 1
    fi
    brew install postgresql@15
else
    echo -e "${GREEN}✅ PostgreSQL está instalado${NC}"
fi

# Iniciar servicio de PostgreSQL
echo ""
echo "🔄 Iniciando servicio de PostgreSQL..."
brew services start postgresql@15 2>/dev/null || brew services start postgresql 2>/dev/null
sleep 2

# Verificar si el servicio está corriendo
if brew services list | grep -q "postgresql.*started"; then
    echo -e "${GREEN}✅ PostgreSQL está corriendo${NC}"
else
    echo -e "${YELLOW}⚠️  Intentando iniciar PostgreSQL de otra forma...${NC}"
    pg_ctl -D /opt/homebrew/var/postgresql@15 start 2>/dev/null || pg_ctl -D /usr/local/var/postgresql start 2>/dev/null
    sleep 2
fi

# Crear base de datos
echo ""
echo "📦 Creando base de datos 'dev_db'..."
createdb -U $USER dev_db 2>/dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Base de datos creada${NC}"
else
    echo -e "${YELLOW}⚠️  La base de datos ya existe o hubo un problema${NC}"
fi

# Ejecutar script de inicialización
echo ""
echo "🔧 Ejecutando script de inicialización..."
psql -U $USER -d dev_db -f setup-database.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Tablas creadas exitosamente${NC}"
else
    echo -e "${RED}❌ Error al crear tablas${NC}"
    exit 1
fi

# Actualizar archivo .env para usar el usuario actual
echo ""
echo "⚙️  Actualizando configuración..."
cat > .env << EOF
PGHOST=localhost
PGPORT=5432
PGDATABASE=dev_db
PGUSER=$USER
PGPASSWORD=
EOF

echo -e "${GREEN}✅ Archivo .env actualizado${NC}"

# Instalar dependencias de Node.js
echo ""
echo "📦 Instalando dependencias de Node.js..."
npm install

# Probar conexión
echo ""
echo "🧪 Probando conexión a la base de datos..."
node test-connection.js

echo ""
echo -e "${GREEN}✨ ¡Configuración completada!${NC}"
echo ""
echo "Para iniciar el servidor:"
echo "  cd backend"
echo "  npm start"
echo ""
echo "Para ver la base de datos:"
echo "  psql -d dev_db"
