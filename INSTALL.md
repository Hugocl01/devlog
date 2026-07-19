# Guía de instalación — DevLog

> ← [Volver al README](README.md) · [Licencia](LICENSE) · [Plantilla .env](.env.example) · [Plantilla PM2](ecosystem.config.example.cjs) · [Plantilla Nginx](nginx/devlog.conf.example) · [Guía de despliegue](DEPLOY.md)

Guía paso a paso para desplegar DevLog en un VPS con Ubuntu/Debian. Al final tendrás la aplicación corriendo con PostgreSQL, PM2 y Nginx, con HTTPS activado mediante Certbot.

---

## Índice

1. [Requisitos](#1-requisitos)
2. [Preparar el servidor](#2-preparar-el-servidor)
3. [Instalar Node.js](#3-instalar-nodejs)
4. [Instalar y configurar PostgreSQL](#4-instalar-y-configurar-postgresql)
5. [Clonar y configurar la aplicación](#5-clonar-y-configurar-la-aplicación)
6. [Construir y migrar](#6-construir-y-migrar)
7. [Configurar PM2](#7-configurar-pm2)
8. [Configurar Nginx](#8-configurar-nginx)
9. [Activar HTTPS con Certbot](#9-activar-https-con-certbot)
10. [Verificar la instalación](#10-verificar-la-instalación)
11. [Actualizar la aplicación](#11-actualizar-la-aplicación)

---

## 1. Requisitos

| Componente   | Versión mínima | Notas                                  |
|--------------|----------------|----------------------------------------|
| Ubuntu       | 22.04 LTS      | También funciona en Debian 12          |
| Node.js      | 22.12+ LTS     | Requerido por Astro 7                  |
| PostgreSQL   | 15             |                                        |
| PM2          | 5.x            | Gestor de procesos Node                |
| Nginx        | 1.18+          | Servidor proxy inverso                 |
| Certbot      | cualquiera     | Certificados SSL gratuitos de Let's Encrypt |

**Recursos mínimos del VPS:** 1 vCPU · 1 GB RAM · 10 GB disco.

---

## 2. Preparar el servidor

Accede al VPS como root o como usuario con sudo y actualiza el sistema:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl wget unzip ufw
```

Configura el firewall para permitir solo los puertos necesarios:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## 3. Instalar Node.js

Se usa `nvm` para poder cambiar de versión fácilmente:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Recarga el perfil de shell
source ~/.bashrc

# Instala la versión LTS recomendada
nvm install 22
nvm use 22
nvm alias default 22

# Verifica
node --version   # v22.x.x
npm --version
```

Instala PM2 globalmente:

```bash
npm install -g pm2
```

---

## 4. Instalar y configurar PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

Crea el usuario y la base de datos de la aplicación. Sustituye `TU_CONTRASEÑA` por una contraseña segura:

```bash
sudo -u postgres psql <<EOF
CREATE USER devlog_user WITH PASSWORD 'TU_CONTRASEÑA';
CREATE DATABASE devlog OWNER devlog_user;
GRANT ALL PRIVILEGES ON DATABASE devlog TO devlog_user;
\q
EOF
```

Verifica que la conexión funciona:

```bash
psql -U devlog_user -d devlog -h localhost -c "\conninfo"
# Pedirá la contraseña — debe conectar sin error
```

---

## 5. Clonar y configurar la aplicación

Elige dónde alojar los ficheros. `/var/www/devlog` es una ruta habitual:

```bash
sudo mkdir -p /var/www/devlog
sudo chown $USER:$USER /var/www/devlog

git clone https://github.com/TU_USUARIO/devlog.git /var/www/devlog
cd /var/www/devlog
```

Copia la plantilla de variables de entorno y rellénala:

```bash
cp .env.example .env
nano .env
```

Valores que debes cambiar obligatoriamente:

```dotenv
NODE_ENV="production"

HOST="0.0.0.0"
PORT="4321"
SITE_URL="https://tudominio.com"

DATABASE_URL="postgresql://devlog_user:TU_CONTRASEÑA@localhost:5432/devlog?schema=public"

# Genera con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET="CLAVE_GENERADA_DE_128_CARACTERES_HEX"
JWT_EXPIRES_IN="7d"

# resend.com → API Keys → Create API Key
# Requiere dominio verificado en Resend (Domains → Add Domain)
RESEND_API_KEY="re_tu_api_key"
EMAIL_FROM="DevLog <noreply@tudominio.com>"

# github.com/settings/developers → New OAuth App
# Homepage URL: https://tudominio.com
# Callback URL: https://tudominio.com/api/auth/github/callback
GITHUB_CLIENT_ID="Ov23li..."
GITHUB_CLIENT_SECRET="..."
```

> **JWT_SECRET:** cambia la clave entre entornos. La misma clave en dev y prod invalida las sesiones al hacer deploy.
> **RESEND:** con `HOST="0.0.0.0"` y HTTPS activo, las cookies `Secure` funcionan correctamente — necesario para que el logout funcione en producción.

Instala las dependencias:

```bash
npm ci --omit=dev
```

> `npm ci` usa exactamente `package-lock.json` — reproducible y más rápido que `npm install`.

---

## 6. Construir y migrar

Genera el cliente de Prisma, aplica las migraciones y construye la aplicación:

```bash
# Genera el cliente de Prisma
npx prisma generate

# Aplica las migraciones en producción (no borra datos)
npx prisma migrate deploy

# Primera instalación — carga roles, tipos, tags, tu usuario admin, posts y updates
# No ejecutes esto si la BD ya tiene datos, sobreescribirá los posts y updates
npm run db:seed:prod

# Construye la aplicación
npm run build
```

> El seed de producción usa `upsert` — es seguro de volver a ejecutar, no borra datos existentes.
> La contraseña inicial del admin es `DevLog2025!` — **cámbiala inmediatamente** desde `/auth/forgot-password`.

Comprueba que el servidor arranca manualmente antes de configurar PM2:

```bash
node ./dist/server/entry.mjs
# Debe mostrar: Server listening on http://0.0.0.0:4321
# Ctrl+C para detener
```

---

## 7. Configurar PM2

Copia la plantilla de PM2 y rellena los valores (los mismos que en `.env`):

```bash
cp ecosystem.config.example.cjs ecosystem.config.cjs
nano ecosystem.config.cjs
```

Arranca la aplicación con PM2:

```bash
pm2 start ecosystem.config.cjs --env production
```

Comprueba que está corriendo:

```bash
pm2 status
pm2 logs devlog --lines 50
```

Guarda la configuración y activa el arranque automático al reiniciar el servidor:

```bash
pm2 save
pm2 startup
# Ejecuta el comando que PM2 te indique (empieza por "sudo env PATH=...")
```

Comandos útiles de PM2:

```bash
pm2 reload devlog          # Recarga sin downtime (usar al actualizar)
pm2 stop devlog            # Para la aplicación
pm2 restart devlog         # Reinicia forzosamente
pm2 logs devlog            # Sigue los logs en tiempo real
pm2 monit                  # Monitor interactivo de CPU/RAM
```

---

## 8. Configurar Nginx

Instala Nginx si no está instalado:

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

Crea el fichero de configuración del sitio. Sustituye `tudominio.com` por tu dominio real:

```bash
sudo nano /etc/nginx/sites-available/devlog
```

Pega esta configuración:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name tudominio.com www.tudominio.com;

    # Certbot añadirá aquí el redireccionamiento a HTTPS automáticamente

    location / {
        proxy_pass http://127.0.0.1:4321;
        proxy_http_version 1.1;

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";

        # Subida de ficheros (media)
        client_max_body_size 20M;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout    60s;
        proxy_read_timeout    60s;
    }

    # Cache de assets estáticos construidos por Astro
    location /_astro/ {
        proxy_pass http://127.0.0.1:4321;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Bloqueo de acceso externo al panel admin (opcional pero recomendado)
    # Descomenta y añade tu IP si quieres restringir el acceso
    # location /admin {
    #     allow TU_IP;
    #     deny  all;
    #     proxy_pass http://127.0.0.1:4321;
    #     proxy_set_header Host $host;
    # }

    # Compresión gzip
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    gzip_min_length 1024;
}
```

Activa el sitio y verifica la configuración:

```bash
sudo ln -s /etc/nginx/sites-available/devlog /etc/nginx/sites-enabled/
sudo nginx -t          # debe mostrar: syntax is ok / test is successful
sudo systemctl reload nginx
```

---

## 9. Activar HTTPS con Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx

# Solicita el certificado para tu dominio
sudo certbot --nginx -d tudominio.com -d www.tudominio.com
```

Certbot modificará automáticamente el bloque de Nginx para redirigir HTTP → HTTPS y configurará la renovación automática.

Verifica que la renovación automática funciona:

```bash
sudo certbot renew --dry-run
```

---

## 10. Verificar la instalación

```bash
# La aplicación responde en el puerto 4321
curl -I http://localhost:4321

# Nginx hace el proxy correctamente
curl -I http://tudominio.com

# HTTPS activo (tras Certbot)
curl -I https://tudominio.com

# PM2 está corriendo
pm2 status

# No hay errores en los logs
pm2 logs devlog --lines 100
```

Abre `https://tudominio.com` en el navegador. El panel de administración está en `/admin`.

---

## 11. Actualizar la aplicación

Consulta [DEPLOY.md](DEPLOY.md) para el proceso completo de despliegue, incluyendo cuándo ejecutar migraciones y cómo gestionar rollbacks.

---

## Resolución de problemas frecuentes

| Síntoma | Causa habitual | Solución |
|---------|---------------|----------|
| `502 Bad Gateway` en Nginx | La app no está corriendo | `pm2 status` y `pm2 logs devlog` |
| `Cannot connect to database` | `DATABASE_URL` incorrecta o PostgreSQL parado | `sudo systemctl status postgresql` |
| Subida de archivos falla | Permisos en `public/uploads/` | `chmod -R 755 public/uploads/` |
| PM2 no arranca al reiniciar | Falta ejecutar `pm2 startup` | Ver paso 7 |
| Certificado SSL caducado | Renovación automática falló | `sudo certbot renew` |
| Variables de entorno no cargadas | `.env` no existe en producción | Usa `ecosystem.config.cjs` para definirlas |
| La app no arranca: `JWT_SECRET no está definido` | Falta `JWT_SECRET` en `.env`/`ecosystem.config.cjs` con `NODE_ENV=production` | En producción es obligatorio definirlo — no hay valor por defecto. Genera uno con el comando indicado en el paso 5 |
