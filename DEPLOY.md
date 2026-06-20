# Guía de despliegue — DevLog

> ← [Volver al README](README.md) · [Guía de instalación](INSTALL.md)

Proceso para subir cambios del repositorio local al VPS de producción.

---

## Índice

1. [Despliegue estándar](#1-despliegue-estándar)
2. [Cuándo hacer qué](#2-cuándo-hacer-qué)
3. [Despliegue con migraciones de base de datos](#3-despliegue-con-migraciones-de-base-de-datos)
4. [Rollback](#4-rollback)
5. [Comandos útiles en el servidor](#5-comandos-útiles-en-el-servidor)

---

## 1. Despliegue estándar

Para la mayoría de cambios (código, componentes, estilos, contenido):

```bash
# Desde el repositorio local — sube los cambios
git push origin master

# En el VPS
cd /var/www/devlog

git pull origin master
npm ci --omit=dev
npx prisma generate
npm run build
pm2 reload devlog
```

> **Importante:** `npm run build` es obligatorio antes de `pm2 reload`. PM2 ejecuta el código de `dist/` — si no rebuilds, el servidor sigue con el código anterior aunque hayas hecho `git pull`.

> `pm2 reload` hace un reinicio con **zero downtime**: levanta el proceso nuevo antes de matar el viejo. Usa `pm2 restart` solo si `reload` falla.

---

## 2. Cuándo hacer qué

| Cambio | `npm ci` | `prisma generate` | `prisma migrate deploy` | `npm run build` | `pm2 reload` |
|--------|:--------:|:-----------------:|:-----------------------:|:---------------:|:------------:|
| Código / componentes / estilos | — | — | — | ✅ | ✅ |
| Nueva dependencia en `package.json` | ✅ | — | — | ✅ | ✅ |
| Cambio en `schema.prisma` | — | ✅ | ✅ | ✅ | ✅ |
| Solo cambio de `.env` | — | — | — | — | ✅ |

---

## 3. Despliegue con migraciones de base de datos

Cuando los cambios incluyen modificaciones al schema de Prisma (`prisma/schema.prisma`):

```bash
# En el VPS
cd /var/www/devlog

git pull origin master
npm ci --omit=dev

# Aplica las migraciones pendientes (no borra datos)
npx prisma migrate deploy

# Regenera el cliente Prisma con el nuevo schema
npx prisma generate

npm run build
pm2 reload devlog
```

> `prisma migrate deploy` aplica solo las migraciones que aún no están aplicadas en producción.
> **Nunca uses `prisma migrate dev` en el servidor** — ese comando es solo para desarrollo local.

---

## 4. Rollback

Si algo falla tras el despliegue:

### Rollback rápido — volver al commit anterior

```bash
cd /var/www/devlog

# Ve al commit anterior
git log --oneline -5          # identifica el commit al que volver
git checkout <commit-hash>

npm ci --omit=dev
npx prisma generate
npm run build
pm2 reload devlog
```

Para volver a la rama normal después:

```bash
git checkout master
```

### Si la migración rompió la BD

Prisma no tiene rollback automático de migraciones. Opciones:

- **Si tienes backup:** restaura el dump y vuelve al commit anterior.
- **Si no tienes backup:** aplica manualmente el SQL inverso o añade una nueva migración que deshaga el cambio.

> Por eso es recomendable hacer un `pg_dump` antes de cualquier despliegue con migraciones:
> ```bash
> pg_dump -U devlog_user devlog > backup_$(date +%Y%m%d_%H%M).sql
> ```

---

## 5. Comandos útiles en el servidor

```bash
# Estado de la aplicación
pm2 status
pm2 logs devlog --lines 100
pm2 monit

# Recargar sin downtime
pm2 reload devlog

# Reinicio forzoso (si reload no funciona)
pm2 restart devlog

# Ver variables de entorno cargadas
pm2 env 0

# Estado de PostgreSQL
sudo systemctl status postgresql

# Estado de Nginx
sudo systemctl status nginx
sudo nginx -t                  # verifica la configuración sin recargar

# Certificado SSL
sudo certbot renew --dry-run   # comprueba que la renovación automática funciona

# Espacio en disco
df -h

# Uso de memoria
free -h
```
