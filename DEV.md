# Guía de desarrollo local — DevLog

> ← [Volver al README](README.md) · [Instalación en servidor](INSTALL.md) · [Guía de despliegue](DEPLOY.md)

Todo lo necesario para trabajar en DevLog en local: configuración del entorno, workflow diario y referencia de comandos.

---

## Índice

1. [Requisitos](#1-requisitos)
2. [Configuración inicial](#2-configuración-inicial)
3. [Variables de entorno en desarrollo](#3-variables-de-entorno-en-desarrollo)
4. [Base de datos y seed](#4-base-de-datos-y-seed)
5. [Servicios externos en desarrollo](#5-servicios-externos-en-desarrollo)
6. [Workflow diario](#6-workflow-diario)
7. [Añadir contenido](#7-añadir-contenido)
8. [Cambios en el schema de BD](#8-cambios-en-el-schema-de-bd)
9. [Referencia de comandos](#9-referencia-de-comandos)

---

## 1. Requisitos

| Herramienta | Versión | Notas |
|-------------|---------|-------|
| Node.js | 22.x (LTS) | Recomendado con `nvm` |
| PostgreSQL | 15+ | Corriendo en `localhost:5432` |
| Git | cualquiera | |

Instalar Node.js con `nvm`:

```bash
nvm install 22
nvm use 22
nvm alias default 22
```

---

## 2. Configuración inicial

Solo hay que hacerlo una vez al clonar el repositorio:

```bash
# 1. Instala dependencias
npm install

# 2. Crea la base de datos local
createuser -P devlog_user        # introduce una contraseña cuando la pida
createdb -O devlog_user devlog

# 3. Copia y rellena el .env
cp .env.example .env
# Edita .env — mínimo: DATABASE_URL con tus credenciales locales

# 4. Aplica las migraciones y genera el cliente Prisma
npx prisma migrate dev

# 5. Carga los datos de prueba
npm run db:seed

# 6. Arranca el servidor
npm run dev
```

Abre `http://localhost:4321` en el navegador.

---

## 3. Variables de entorno en desarrollo

El archivo `.env` en local debe tener estos valores. No necesitas cambiar lo que ya está comentado como "opcional":

```dotenv
NODE_ENV="development"

HOST="localhost"
PORT="4321"
SITE_URL="http://localhost:4321"

DATABASE_URL="postgresql://devlog_user:TU_CONTRASEÑA@localhost:5432/devlog?schema=public"

# Puede ser cualquier cadena — en dev no necesita ser segura
JWT_SECRET="clave_local_de_desarrollo"
JWT_EXPIRES_IN="7d"

# Con API key real, EMAIL_FROM debe ser onboarding@resend.dev (sender de prueba de Resend)
# Deja re_xxx para simular emails en consola (ver sección 5)
RESEND_API_KEY="re_xxxxxxxxxxxxxxxxxxxx"
EMAIL_FROM="DevLog <onboarding@resend.dev>"

# Opcional — solo si quieres probar el login con GitHub en local
# GITHUB_CLIENT_ID="..."
# GITHUB_CLIENT_SECRET="..."
```

> El `JWT_SECRET` en desarrollo puede ser cualquier cadena. Usa uno distinto en producción para que las sesiones sean independientes entre entornos.

---

## 4. Base de datos y seed

### Qué genera el seed de desarrollo

`npm run db:seed` borra todos los datos y recrea:

- **Roles:** USER, ADMIN
- **Tipos de reacción:** 10 emojis (👍 ❤️ 🔥 👏 😮 🤔 🚀 💡 😂 🏆)
- **Tipos de update:** feature, bugfix, improvement, general
- **Tags:** ~60 etiquetas con colores
- **Configuración del sitio:** valores por defecto
- **10 usuarios de prueba** con datos realistas
- **25 posts** leídos desde `src/content/posts/`
- **6 updates** leídos desde `src/content/updates/`
- **~70 reacciones** distribuidas entre posts y usuarios
- **~10 comentarios** con respuestas anidadas
- **~2.700 vistas de posts** distribuidas en los últimos 180 días
- **~760 vistas de updates** distribuidas en los últimos 90 días

### Credenciales de los usuarios de prueba

Todos los usuarios tienen la misma contraseña: **`DevLog2025!`**

| Nombre | Email | Rol |
|--------|-------|-----|
| Hugo Cayón Laso | hugocayon@gmail.com | **Admin** |
| María García | maria.garcia@email.com | Usuario |
| Carlos López | carlos.lopez@email.com | Usuario |
| Ana Martínez | ana.martinez@email.com | Usuario |
| David Fernández | david.fernandez@email.com | Usuario |
| Laura Rodríguez | laura.rodriguez@email.com | Usuario |
| Javier Sánchez | javier.sanchez@email.com | Usuario |
| Elena González | elena.gonzalez@email.com | Usuario |
| Pablo Díaz | pablo.diaz@email.com | Usuario (sin verificar) |
| Isabel Moreno | isabel.moreno@email.com | Usuario (sin verificar) |

### Resetear la base de datos

```bash
# Borra todo y vuelve a empezar desde cero
npm run db:reset
npm run db:seed
```

---

## 5. Servicios externos en desarrollo

### Email (Resend)

En desarrollo no necesitas enviar emails reales. Cuando `RESEND_API_KEY` empieza por `re_xxx` (o está vacía), el código entra en modo simulado y **imprime el enlace directamente en la consola** del servidor en lugar de enviarlo.

```
[DEV] Email de verificación para usuario@example.com
[DEV] Enlace: http://localhost:4321/api/auth/verify-email?token=abc123
```

Si quieres probar el envío real en local, usa el dominio de prueba de Resend:

```dotenv
RESEND_API_KEY="re_tu_api_key_real"
EMAIL_FROM="DevLog <onboarding@resend.dev>"
```

`onboarding@resend.dev` es el sender de prueba que Resend permite usar sin verificar un dominio propio.

### GitHub OAuth

Para probar el login con GitHub en local necesitas crear una OAuth App de desarrollo separada:

1. Ve a [github.com/settings/developers](https://github.com/settings/developers) → **New OAuth App**
2. Rellena:
   - **Homepage URL:** `http://localhost:4321`
   - **Callback URL:** `http://localhost:4321/api/auth/github/callback`
3. Copia el Client ID y genera un Client Secret
4. Añádelos al `.env`:
   ```dotenv
   GITHUB_CLIENT_ID="Ov23li..."
   GITHUB_CLIENT_SECRET="..."
   ```

Si no configuras GitHub OAuth, el botón "Entrar con GitHub" simplemente fallará en local — el resto de la aplicación funciona con normalidad.

---

## 6. Workflow diario

El día a día de desarrollo es sencillo:

```bash
# Arranca el servidor
npm run dev

# Si cambias el schema de Prisma (ver sección 8)
npx prisma migrate dev --name descripcion-del-cambio

# Si quieres ver los datos de la BD visualmente
npm run db:studio
```

El servidor recarga automáticamente al guardar cualquier archivo `.astro`, `.ts` o `.tsx`.

---

## 7. Añadir contenido

Los posts y updates se guardan como archivos Markdown en `src/content/` y se sincronizan a la base de datos.

### Añadir un post nuevo

1. Crea `src/content/posts/post-XXXXXX.md` con el frontmatter:

```markdown
---
title: "Título del post"
description: "Descripción corta"
publishedAt: "2026-06-01"
draft: false
tags: ["astro", "typescript"]
---

Contenido del post en Markdown...
```

2. Sincroniza a la BD:

```bash
npm run sync
```

El script lee todos los archivos de `src/content/` y crea o actualiza los registros en la base de datos.

### Editar un post existente

Edita el archivo `.md` directamente y vuelve a ejecutar `npm run sync`. El slug se deriva del nombre del archivo, así que no lo cambies si ya tienes el post en producción.

---

## 8. Cambios en el schema de BD

Cuando modificas `prisma/schema.prisma`:

```bash
# Crea la migración y la aplica en local
npx prisma migrate dev --name descripcion-breve

# Regenera el cliente TypeScript (normalmente lo hace solo migrate dev)
npx prisma generate
```

El comando `migrate dev` hace tres cosas: crea el archivo SQL en `prisma/migrations/`, lo aplica a la BD local y regenera el cliente Prisma.

> Nunca edites manualmente los archivos dentro de `prisma/migrations/` — son el historial de versiones de la BD.

Cuando el cambio llegue a producción, `prisma migrate deploy` aplicará solo las migraciones que aún no estén en el servidor (ver [DEPLOY.md](DEPLOY.md)).

---

## 9. Referencia de comandos

```bash
# Desarrollo
npm run dev              # Servidor con hot reload en localhost:4321
npm run build            # Build de producción (para probar localmente)
npm run preview          # Sirve el build en localhost:4321

# Base de datos
npm run db:migrate:dev   # Crea y aplica una migración en desarrollo
npm run db:generate      # Regenera el cliente Prisma
npm run db:seed          # Seed de desarrollo (borra y recrea todo)
npm run db:seed:prod     # Seed de producción (upsert, no borra datos)
npm run db:studio        # Explorador visual de la BD en el navegador
npm run db:reset         # ⚠️  Resetea la BD completamente

# Contenido
npm run sync             # Sincroniza Markdown → BD
```
