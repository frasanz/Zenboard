#!/bin/bash

# Script de deploy para OVH
# Ejecutar en el servidor después de hacer git pull

echo "🚀 Iniciando deploy de Zenboard..."

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Build del proyecto
echo "🔨 Compilando proyecto..."
npm run build

# Reiniciar PM2
echo "♻️  Reiniciando servidor..."
pm2 reload ecosystem.config.js

echo "✅ Deploy completado!"
echo "📊 Estado del servidor:"
pm2 status
