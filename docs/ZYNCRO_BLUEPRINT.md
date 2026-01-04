# 📘 Zyncro CRM - Documentación de Arquitectura y Diseño

> **Proyecto:** Zyncro CRM
> **Versión:** 1.2 (Consolidada)
> **Fecha:** Enero 2026
> **Estado:** Fase de Planificación / Ideación

---

## 1. Visión General
**Zyncro CRM** es un sistema de gestión de relaciones con clientes (CRM) diseñado específicamente para centralizar y optimizar la comunicación a través de **WhatsApp Business API**.

El objetivo es transformar WhatsApp de una herramienta de chat individual a un canal de ventas colaborativo, permitiendo múltiples agentes, gestión de roles, auditoría de conversaciones y asignación inteligente de leads, todo bajo una arquitectura moderna y escalable.

---

## 2. Stack Tecnológico

### Frontend & Core
* **Framework Principal:** [Astro](https://astro.build/)
    * *Configuración:* Modo SSR (`output: 'server'`) para gestionar sesiones y lógica de servidor.
* **UI Library (Interactividad):** [React](https://react.dev/)
    * *Uso:* "Islas" interactivas para el Chat en tiempo real y dashboards complejos.
* **Estilado:** [Tailwind CSS](https://tailwindcss.com/)

### Backend & Datos
* **Base de Datos & Auth:** [Supabase](https://supabase.com/)
    * PostgreSQL para datos.
    * **Auth Strategy:** SSR Auth (Cookies HttpOnly) mediante `@supabase/ssr`.
    * Supabase Realtime para sincronización de chat (WebSockets).
    * Supabase Storage para multimedia (fotos/audios).
* **Server Logic:** Astro Endpoints (API Routes) y Middleware.
* **Hosting Previsto:** Vercel (Adapter Serverless).

### Integraciones Externas
* **Mensajería:** Meta Cloud API (WhatsApp Business Platform).

---

## 3. Arquitectura del Sistema

### Estructura Lógica
1.  **Capa de Presentación (Frontend):**
    * Renderizado híbrido. Páginas estáticas para login/landing. SSR para validación de rutas protegidas. React solo donde se requiere estado complejo (Ventana de Chat).
2.  **Capa de Negocio (Middleware/API):**
    * **Astro Middleware:** Intercepta peticiones para verificar roles y sesiones antes de renderizar.
    * **Webhooks:** Endpoints dedicados (`/api/webhooks/whatsapp`) para recibir eventos POST de Meta.
3.  **Capa de Datos:**
    * Almacenamiento relacional y persistente.

### Estructura de Directorios Sugerida
```text
zyncrocrm/
├── docs/                      # Documentación (este archivo)
├── public/                    # Assets estáticos
├── src/
│   ├── components/            # Componentes UI (React/Astro)
│   ├── layouts/               # Plantillas de página
│   ├── middleware.ts          # Protección de rutas
│   ├── pages/
│   │   ├── api/               # Endpoints (Webhooks)
│   │   ├── dashboard/         # Rutas de la app
│   │   └── index.astro
└── astro.config.mjs
```
---
## 4. Definición de Roles y Permisos (RBAC)

### 👑 Nivel 1: Superuser (Dueño/IT)
* **Acceso:** Global e irrestricto.
* **Funciones:**
    * Configuración técnica (API Keys, Secretos).
    * Gestión de Administradores.
    * Visualización de facturación y logs de auditoría.
    * *Nota:* No destinado a operar chats diariamente.

### 🛡️ Nivel 2: Admin (Gerente de Ventas)
* **Acceso:** Supervisión operativa.
* **Funciones:**
    * Gestión de Vendedores (Crear/Editar/Bloquear).
    * Asignación y reasignación de Leads.
    * **Modo Fantasma:** Supervisar chats en vivo sin intervenir.
    * Exportación de reportes y contactos.

### 👤 Nivel 3: Vendedor (Usuario Final)
* **Acceso:** Limitado a su cartera.
* **Funciones:**
    * Buzón de entrada personal.
    * Envío de mensajes multimedia y notas de voz.
    * Uso de Respuestas Rápidas.
    * **Restricción:** No puede borrar historial ni exportar bases de datos.

---
## 5. Lógica de Negocio: WhatsApp (Multi-Canal)

### Gestión de Canales (Números de Teléfono)
El sistema soporta múltiples números de WhatsApp conectados simultáneamente.
* **Canales Personales:** Un número asignado exclusivamente a un vendedor (ej: "Móvil de Juan"). Todo mensaje que llegue aquí es asignado automáticamente a Juan.
* **Canales Compartidos:** Un número general (ej: "Ventas Web"). Los mensajes entran a una bolsa común para ser reclamados por cualquier vendedor disponible.

### Gestión de la "Ventana de 24 Horas"
El sistema controlará el estado de la sesión por cada contacto:
1.  **Estado Activo:** (< 24h desde el último mensaje del cliente). Permite chat libre.
2.  **Estado Inactivo:** (> 24h). Bloquea el input. Requiere **Plantilla (Template)**.

### Flujo de Entrada (Inbound Routing)
1.  **Recepción:** El Webhook recibe el mensaje e identifica el ID del teléfono de destino (`metadata.display_phone_number` o ID).
2.  **Identificación de Canal:** Busca en la tabla `channels` a qué línea pertenece ese ID.
3.  **Gestión del Contacto:**
    * Busca si el cliente ya existe **dentro de ese canal**.
    * *Nota:* Un mismo cliente puede tener dos conversaciones distintas: una con el Vendedor A (Canal A) y otra con Soporte (Canal B).
4.  **Asignación Automática:**
    * Si el canal tiene un `default_assignee_id` (Dueño de la línea), el contacto se asigna a él inmediatamente.
    * Si no, queda como `null` (Sin asignar) en la bandeja de entrada de ese canal.

---

## 6. Diseño de Base de Datos (Esquema ERD)

### A. Tablas Principales

#### 1. Tabla: `channels` (Líneas de WhatsApp)
Representa los números de teléfono conectados a la empresa.
* `id` (UUID, PK).
* `name` (Text): Nombre interno (ej: "Línea Juan", "Soporte General").
* `phone_number` (Text): El número visual (ej: +54911...).
* `meta_phone_id` (Text, Unique): ID técnico de Meta (Vital para identificar el webhook).
* `default_assignee_id` (UUID, FK -> profiles.id): Si es la línea personal de un vendedor, se pone su ID aquí. Si es NULL, es línea compartida.
* `status` (Enum): 'connected', 'disconnected'.
* `config` (JSONB): Configuración avanzada del canal.
    * Ejemplo de estructura JSON:
      ```json
      {
        "working_hours": {
          "mon": ["09:00-18:00"],
          "tue": ["09:00-18:00"]
        },
        "auto_reply": {
          "welcome_message": "¡Hola! Gracias por escribir a Zyncro.",
          "away_message": "Estamos cerrados. Volvemos a las 09:00.",
          "enabled": true
        }
      }
      ```


#### 2. Tabla: `profiles` (Usuarios del Sistema)
* `id` (UUID, PK): Vinculado a `auth.users.id`.
* `email` (Text).
* `full_name` (Text).
* `role` (Enum): 'superuser', 'admin', 'seller'.
* `avatar_url` (Text).
* `status` (Enum): 'online', 'offline', 'busy'.



#### 3. Tabla: `contacts` (Clientes / Leads)
* `id` (UUID, PK).
* `channel_id` (UUID, FK -> channels.id): **CRÍTICO.** Indica a qué número de la empresa escribió el cliente.
* `phone_number` (Text): El número del cliente.
* `name` (Text): Nombre del contacto.
* `assigned_to` (UUID, FK -> profiles.id): Vendedor responsable actual.
* `unread_count` (Integer): Contador de mensajes no leídos.
* `last_interaction` (Timestamp).
* `labels` (Array of Text): Etiquetas rápidas (ej: 'caliente', 'frio').
* `metadata` (JSONB): Campo flexible para guardar datos del negocio. (Ej: `{ "client_type": "mayorista", "tax_id": "X-123", "address": "..." }`).
* **Restricción Única:** El par `(phone_number, channel_id)` debe ser único.

#### 4. Tabla: `messages` (Historial)
* `id` (BigInt, PK).
* `contact_id` (UUID, FK -> contacts.id): Vincula con el cliente y el canal implícito.
* `sender_id` (UUID, FK -> profiles.id): NULL si es mensaje del cliente.
* `reply_to_id` (BigInt, FK).
* `direction` (Enum): 'inbound', 'outbound'.
* `type` (Enum): 'text', 'image', 'audio', 'note', 'template'.
* `content` (Text).
* `media_url` (Text).
* `status` (Enum): 'sent', 'delivered', 'read', 'failed'.
* `wam_id` (Text).
* `is_internal` (Boolean).
* `created_at` (Timestamp).

#### 5. Tabla: `templates` (Plantillas HSM)
* `id` (UUID, PK).
* `meta_id` (Text).
* `name` (Text).
* `body` (Text).
* `language` (Text).
* `status` (Enum).

#### 6. Tabla: `system_config` (Global)
* `key` (Text, PK).
* `value` (Text).
* `description` (Text).

#### 7. Tabla: `audit_logs`
* `id` (BigInt, PK).
* `user_id` (UUID, FK).
* `action` (Text).
* `details` (JSONB).
* `created_at` (Timestamp).

### B. Políticas de Seguridad (RLS) Actualizadas
* **`channels`**: Lectura para todos. Edición solo Superuser.
* **`contacts`**:
    * Super/Admin: Ven todo.
    * Seller: Ven contactos donde `assigned_to` es él mismo, O donde el `channel_id` está asignado a él, O donde el `channel_id` es público (sin dueño) y el contacto no tiene dueño.
---

## 7. Estrategia de Almacenamiento (Supabase Storage)

Se crearán dos "Buckets" (contenedores de archivos):

### A. Bucket `avatars`
* **Contenido:** Fotos de perfil de los usuarios.
* **Acceso:** Público (lectura). Solo el usuario dueño puede subir/editar su foto.

### B. Bucket `chat-media`
* **Contenido:** Imágenes, audios y documentos enviados por WhatsApp.
* **Estructura de carpetas:** `/{contact_id}/{year}/{filename}`.
* **Acceso:** Privado. Solo accesible si el usuario tiene permiso de ver el `contact_id` asociado (verificado vía RLS o Backend firmando URLs).

---

## 8. Variables de Entorno Requeridas (.env)

Estas variables son necesarias para el despliegue y conexión inicial.

```bash
PUBLIC_SUPABASE_URL="[https://xyz.supabase.co](https://xyz.supabase.co)"
PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR..." # Solo usar en Backend (API/Middleware)
WEBHOOK_VERIFY_TOKEN="mi_token_secreto_personalizado" # Para verificar handshake con Meta
```

---

## 9. Funcionalidades Avanzadas y Automatización

### A. Gestión de Horarios y Auto-Respuestas
El sistema utilizará el campo `config` de la tabla `channels` para interceptar mensajes:
1.  **Check de Horario:** Al recibir un mensaje, el backend verifica `working_hours` del canal.
2.  **Modo Ausente:** Si está fuera de horario y `auto_reply.enabled` es true, se envía el `away_message` automáticamente vía API de Meta y no se notifica al vendedor (o se marca con baja prioridad).
3.  **Bienvenida:** Si es un contacto nuevo (o sin interacción en X días), se envía el `welcome_message`.

### B. Búsqueda Inteligente (Full Text Search)
* **Implementación:** Se crearán índices `GIN` en PostgreSQL sobre las columnas de texto.
* **Uso:** Permitirá buscar "Juan factura" y encontrar al cliente Juan que habló sobre una factura, sin recorrer toda la base de datos secuencialmente.

### C. Webhooks de Sistema
Escucharemos cambios de estado críticos desde Meta:
* **Template Updates:** Actualización automática del estado de plantillas (Approved/Rejected) en nuestra DB.
* **Quality Updates:** Alerta a Superuser si la calidad del número baja (riesgo de bloqueo).
