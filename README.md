# DevLog — Blog de Desarrollo Web

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Astro](https://img.shields.io/badge/Astro-000000?logo=astro&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-38B2AC?logo=tailwindcss&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)

Blog personal de desarrollo web con panel de administración completo, sistema de autenticación, comentarios, reacciones y gestión de medios. Construido con Astro SSR + Node.js + PostgreSQL.

---

## Características

**Blog público**
- Posts y updates con editor de contenido enriquecido y previsualización en tiempo real
- Sistema de etiquetas con colores personalizables
- Comentarios anidados con moderación
- Reacciones por emoji configurables
- Barra de progreso de lectura y tabla de contenidos automática
- Búsqueda de contenido
- RSS y sitemap generados automáticamente
- SEO completo (Open Graph, JSON-LD, meta tags)

**Autenticación**
- Registro con verificación por email (Resend)
- Login con email/contraseña o **GitHub OAuth**
- Recuperación de contraseña por email
- Gestión de sesiones activas por dispositivo
- Rate limiting en todos los endpoints de auth

**Panel de administración**
- Dashboard con analíticas y gráficas
- Gestión completa de posts, updates, etiquetas, usuarios y comentarios
- Biblioteca de medios con subida de archivos
- Calendario de contenido
- Log de auditoría de acciones administrativas
- Configuración del sitio

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | [Astro](https://astro.build/) con modo SSR + adaptador Node.js |
| UI | React 19 + Tailwind CSS v4 + shadcn/ui |
| Base de datos | PostgreSQL + [Prisma](https://www.prisma.io/) ORM |
| Autenticación | JWT (httpOnly cookie) + GitHub OAuth |
| Email | [Resend](https://resend.com/) |
| Proceso | [PM2](https://pm2.keymetrics.io/) en producción |
| Proxy | Nginx |

---

## Inicio rápido (desarrollo local)

### Requisitos previos

- Node.js 20+
- PostgreSQL 15+

### Pasos

```bash
# 1. Clona el repositorio
git clone https://github.com/TU_USUARIO/devlog.git
cd devlog

# 2. Instala dependencias
npm install

# 3. Configura las variables de entorno
cp .env.example .env
# Edita .env con tus credenciales locales

# 4. Inicializa la base de datos
npx prisma migrate dev
npx prisma db seed

# 5. Arranca el servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:4321`.  
El panel de administración en `http://localhost:4321/admin` (requiere usuario con rol ADMIN).

---

## Scripts disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Construye para producción
npm run start        # Inicia el servidor de producción (tras build)
npm run preview      # Previsualiza el build localmente

npm run db:migrate   # Aplica migraciones pendientes (producción)
npm run db:studio    # Abre Prisma Studio (explorador visual de BD)
npm run db:seed      # Carga datos iniciales
npm run db:reset     # Resetea la BD y re-aplica migraciones (¡destruye datos!)
```

---

## Ficheros de configuración

### Ficheros con secretos — ignorados por git, con plantilla de ejemplo

| Fichero real (ignorado por git) | Plantilla en el repo | Qué contiene |
|---|---|---|
| `.env` | [`.env.example`](.env.example) | Variables de entorno: BD, JWT, Resend, GitHub OAuth |
| `ecosystem.config.cjs` | [`ecosystem.config.example.cjs`](ecosystem.config.example.cjs) | Configuración de PM2: env vars de producción, instancias, memoria |
| `nginx/devlog.conf` | [`nginx/devlog.conf.example`](nginx/devlog.conf.example) | Configuración de Nginx: proxy inverso, caché, gzip, rate limiting |

Para instalar en un servidor nuevo: copia cada plantilla sin el `.example`, rellena los valores marcados con `CAMBIAR` y sigue la [Guía de instalación](INSTALL.md).

### Ficheros de configuración del proyecto (en el repo)

Estos ficheros sí se versionan porque no contienen secretos. Cada uno tiene comentarios explicativos internos:

| Fichero | Propósito |
|---|---|
| [`astro.config.mjs`](astro.config.mjs) | Configuración del framework: modo híbrido SSR/estático, adaptador Node.js, Tailwind, React, resaltado de código |
| [`prisma.config.ts`](prisma.config.ts) | Configuración de la CLI de Prisma: rutas del schema, migraciones y comando seed |
| [`prisma/schema.prisma`](prisma/schema.prisma) | Modelo de datos completo: tablas, relaciones, índices de PostgreSQL |
| [`tsconfig.json`](tsconfig.json) | Configuración de TypeScript: hereda strict de Astro, JSX React 17+, alias `@/*` |
| [`components.json`](components.json) | Configuración de shadcn/ui CLI: estilo "new-york", alias de rutas, librería de iconos Lucide |
| [`src/env.d.ts`](src/env.d.ts) | Tipos TypeScript de todas las variables de entorno (`import.meta.env`) |
| [`src/middleware.ts`](src/middleware.ts) | Validación de sesión en cada petición, protección de rutas admin, cabeceras de seguridad HTTP |
| [`.gitignore`](.gitignore) | Exclusiones de git: secretos, uploads, build, logs, certificados SSL |
| [`.prettierrc`](.prettierrc) | Formato de código: 2 espacios, comillas dobles, punto y coma, ancho 100 |

### Sobre `components.json`

Es el fichero de configuración de [shadcn/ui](https://ui.shadcn.com/). La CLI lo lee para saber dónde instalar nuevos componentes y qué variantes usar. Los valores relevantes:

- `style: "new-york"` — variante visual con bordes más marcados
- `tailwind.css` — apunta a `src/styles/global.css`, donde viven los tokens CSS de Tailwind v4
- `aliases` — mapea las rutas de componentes al alias `@/` definido en `tsconfig.json`

No contiene secretos y debe estar en el repositorio para que `npx shadcn@latest add <componente>` funcione correctamente.

---

## Despliegue en producción

Consulta la [**Guía de instalación**](INSTALL.md) para el proceso completo paso a paso, que cubre:

- Preparación del servidor (Ubuntu/Debian)
- Instalación de Node.js, PostgreSQL, PM2 y Nginx
- Configuración de HTTPS con Certbot (Let's Encrypt)
- Resolución de problemas frecuentes

---

## Estructura del proyecto

```
devlog/
├── nginx/
│   └── devlog.conf.example     # Plantilla de configuración Nginx
├── prisma/
│   ├── schema.prisma           # Esquema de la base de datos
│   ├── migrations/             # Historial de migraciones SQL
│   └── seed.ts                 # Datos iniciales
├── public/
│   └── uploads/                # Archivos subidos (ignorados por git)
├── scripts/
│   └── sync-content.ts         # Sincronización de contenido
├── src/
│   ├── components/
│   │   ├── admin/              # Componentes del panel de administración
│   │   ├── blog/               # Componentes del blog público
│   │   ├── nav/                # Navegación y menús de usuario
│   │   └── ui/                 # Componentes base (shadcn/ui)
│   ├── layouts/                # Layouts de Astro
│   ├── lib/                    # Lógica de negocio (auth, email, prisma…)
│   ├── pages/
│   │   ├── admin/              # Páginas del panel de administración
│   │   ├── api/                # Endpoints de la API
│   │   │   └── auth/           # Login, registro, OAuth (GitHub), sesiones
│   │   ├── auth/               # Páginas de autenticación
│   │   └── blog/               # Páginas públicas del blog
│   └── styles/
├── .env.example                # Plantilla de variables de entorno
├── ecosystem.config.example.cjs # Plantilla de configuración PM2
├── INSTALL.md                  # Guía de instalación en servidor
└── prisma.config.ts            # Configuración de Prisma CLI
```

---

## Licencia

Distribuido bajo la licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.
