# ⚡ Zyncro CRM

CRM moderno y minimalista diseñado para la gestión centralizada de WhatsApp Business API. Construido con **Astro 5**, **React**, **Tailwind CSS v4** y **Supabase**.

## 🚀 Stack Tecnológico

- **Frontend:** Astro (SSR Mode), React (Islas de interactividad).
- **Estilos:** Tailwind CSS v4 (Configuración CSS-First con OKLCH).
- **Backend/Auth:** Supabase (Auth con Cookies & RLS).
- **Infraestructura:** Vercel (Serverless).

## 🛠️ Requisitos Previos

- Node.js v20+
- pnpm (`npm install -g pnpm`)
- Una cuenta en Supabase.

## 🏁 Guía de Inicio

### 1. Instalación
```bash
pnpm install
```

### 2. Configuración de Entorno
Crea un archivo .env en la raíz basado en tus credenciales de Supabase:
```bash
PUBLIC_SUPABASE_URL="[https://tu-proyecto.supabase.co](https://tu-proyecto.supabase.co)"
PUBLIC_SUPABASE_ANON_KEY="tu-anon-key-larga"
```
### 3. Base de Datos
Ejecuta el script SQL ubicado en `docs/schema.sql` en el editor SQL de tu panel de Supabase para crear las tablas y políticas de seguridad.
### 4. Desarrollo
Inicia el servidor local:
```bash
  pnpm dev
```
La aplicación correrá en `http://localhost:4321`.

## 📂 Estructura Clave

- `src/pages/`: Rutas de la aplicación (Login, Dashboard).
- `src/middleware.ts`: "El Portero". Protege las rutas y gestiona sesiones.
- `src/lib/supabase.ts`: Cliente de conexión (Configurado para Cookies en el navegador).
- `src/styles/global.css`: Tema de Tailwind v4 y variables OKLCH.
- `docs/`: Documentación de arquitectura y esquemas SQL.

## 🔐 Autenticación (Importante)
Este proyecto usa **Cookies** para la sesión (no LocalStorage).
- El Login (`src/components/auth/LoginForm.jsx`) usa `createBrowserClient` para guardar la cookie.
- El Middleware (`src/middleware.ts`) usa `createServerClient` para leer la cookie y validar acceso.
