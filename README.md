# Zenboard

Sistema de gestión de tareas y proyectos con calendario integrado, diseñado para maximizar la productividad y el seguimiento del tiempo.

## 🚀 Características

- **Gestión de Proyectos**: Organiza tus tareas por proyectos con acordeones expansibles
- **Calendario Integrado**: Visualiza y programa tus tareas en vistas diarias, semanales y mensuales
- **Drag & Drop**: Arrastra tareas dentro del calendario para reprogramarlas
- **Click para Programar**: Un solo click en una tarea sin fecha la agrega automáticamente al próximo domingo a las 6:00 AM
- **Seguimiento de Tiempo**: Registra tiempo invertido vs. tiempo estimado en cada proyecto
- **Subtareas**: Divide tareas complejas en pasos más pequeños
- **Estadísticas de Proyecto**: Visualiza tareas completadas/totales y tiempo invertido/estimado
- **Responsive**: Interfaz adaptativa con Tailwind CSS

## 🛠️ Tecnologías

### Frontend
- React 18
- TypeScript
- Vite
- TailwindCSS
- FullCalendar
- @dnd-kit/core
- React Query (TanStack Query)
- Shadcn/ui

### Backend
- Node.js
- Express
- TypeScript
- SQLite
- CORS

## 📁 Estructura del Proyecto

```
zenboard/
├── client/                 # Aplicación frontend
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   │   ├── Calendar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── ProjectAccordion.tsx
│   │   │   ├── TaskItem.tsx
│   │   │   └── ui/        # Componentes de UI (shadcn)
│   │   ├── hooks/         # Custom hooks
│   │   └── lib/           # Utilidades
│   └── package.json
│
├── server/                 # Aplicación backend
│   ├── src/
│   │   ├── index.ts       # Punto de entrada
│   │   ├── db/            # Base de datos
│   │   │   ├── index.ts
│   │   │   └── schema.sql
│   │   └── routes/        # Rutas de la API
│   │       ├── projects.ts
│   │       ├── tasks.ts
│   │       └── subtasks.ts
│   └── package.json
│
├── ecosystem.config.js     # Configuración PM2
├── nginx.conf             # Configuración Nginx
├── deploy.sh              # Script de despliegue
└── README.md
```

## 📋 Requisitos Previos

- Node.js 18+ 
- npm o yarn
- Git

## 🔧 Instalación

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd zenboard
```

### 2. Instalar dependencias del servidor

```bash
cd server
npm install
```

### 3. Instalar dependencias del cliente

```bash
cd ../client
npm install
```

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env` en la carpeta `server/` (opcional, valores por defecto disponibles):

```env
PORT=3001
```

### Base de Datos

La base de datos SQLite se inicializa automáticamente al arrancar el servidor por primera vez. El esquema se encuentra en `server/src/db/schema.sql`.

## 🚀 Uso

### Modo Desarrollo

#### Iniciar el servidor (en una terminal)

```bash
cd server
npm run dev
```

El servidor estará disponible en `http://localhost:3001`

#### Iniciar el cliente (en otra terminal)

```bash
cd client
npm run dev
```

El cliente estará disponible en `http://localhost:5173`

### Modo Producción

#### Build del cliente

```bash
cd client
npm run build
```

#### Build del servidor

```bash
cd server
npm run build
```

#### Ejecutar en producción

```bash
cd server
npm start
```

## 🌐 Despliegue

### Despliegue en VPS (Ubuntu/Debian)

#### 1. Instalar dependencias en el servidor

```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2
sudo npm install -g pm2

# Nginx
sudo apt-get install -y nginx
```

#### 2. Clonar y configurar el proyecto

```bash
git clone <url-del-repositorio> /var/www/zenboard
cd /var/www/zenboard
chmod +x deploy.sh
./deploy.sh
```

#### 3. Configurar Nginx

```bash
sudo cp nginx.conf /etc/nginx/sites-available/zenboard
sudo ln -s /etc/nginx/sites-available/zenboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 4. Configurar SSL (opcional pero recomendado)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d tudominio.com
```

#### 5. Iniciar con PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Script de Despliegue Automático

El proyecto incluye `deploy.sh` que automatiza:
- Limpieza de archivos previos
- Instalación de dependencias
- Build del frontend y backend
- Reinicio de PM2

```bash
./deploy.sh
```

## 📝 Uso de la Aplicación

### Crear un Proyecto

1. En la barra lateral, añade un nuevo proyecto
2. El proyecto aparecerá como un acordeón expandible

### Añadir Tareas

1. Dentro de un proyecto, añade tareas con nombre, descripción y duración estimada
2. Las tareas aparecerán en la lista del proyecto

### Programar Tareas

- **Opción 1**: Haz click en una tarea sin fecha para agregarla al próximo domingo a las 6:00 AM
- **Opción 2**: Arrastra una tarea dentro del calendario para reprogramarla

### Seguimiento de Tiempo

- Cada proyecto muestra estadísticas en formato: `Completadas/Total | Tiempo Invertido / Tiempo Estimado`
- Ejemplo: `5/13 | 2h 30m / 5h`

### Subtareas

- Añade subtareas a cualquier tarea para dividir el trabajo
- Marca subtareas como completadas individualmente

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo licencia privada.

## 🐛 Reporte de Bugs

Si encuentras algún bug, por favor abre un issue con:
- Descripción del problema
- Pasos para reproducirlo
- Comportamiento esperado vs. actual
- Capturas de pantalla (si aplica)

## 📧 Contacto

Para preguntas o soporte, contacta al equipo de desarrollo.
