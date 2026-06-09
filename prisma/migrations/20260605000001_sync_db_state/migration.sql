-- Migración de sincronización.
-- Captura todos los cambios que se aplicaron a la BD directamente con
-- `prisma db push` y que no quedaron registrados en el historial de migraciones.
-- Este fichero NO se ejecutará en la BD local (ya tiene los cambios); sí se
-- ejecutará en instalaciones nuevas tras init y add_tag_color.

-- ─── users ────────────────────────────────────────────────────────────────
ALTER TABLE "users" ADD COLUMN     "banned"               BOOLEAN   NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN     "bannedAt"             TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN     "emailChangePending"   TEXT;
ALTER TABLE "users" ADD COLUMN     "emailChangeToken"     TEXT;
ALTER TABLE "users" ADD COLUMN     "emailChangeExpiresAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "users_emailChangeToken_key" ON "users"("emailChangeToken");

-- ─── posts ────────────────────────────────────────────────────────────────
ALTER TABLE "posts" DROP COLUMN "author";
ALTER TABLE "posts" ADD COLUMN "authorId"  TEXT;
ALTER TABLE "posts" ADD COLUMN "metaTitle" TEXT;
ALTER TABLE "posts" ADD COLUMN "canonical" TEXT;
CREATE INDEX "posts_authorId_idx" ON "posts"("authorId");
ALTER TABLE "posts" ADD CONSTRAINT "posts_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── updates ──────────────────────────────────────────────────────────────
ALTER TABLE "updates" DROP COLUMN "author";
ALTER TABLE "updates" ADD COLUMN "authorId"  TEXT;
ALTER TABLE "updates" ADD COLUMN "metaTitle" TEXT;
ALTER TABLE "updates" ADD COLUMN "canonical" TEXT;
CREATE INDEX "updates_authorId_idx" ON "updates"("authorId");
ALTER TABLE "updates" ADD CONSTRAINT "updates_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── comments ─────────────────────────────────────────────────────────────
ALTER TABLE "comments" ADD COLUMN "banned" BOOLEAN NOT NULL DEFAULT false;

-- ─── update_views (nueva tabla) ───────────────────────────────────────────
CREATE TABLE "update_views" (
    "id"        SERIAL        NOT NULL,
    "ipHash"    TEXT,
    "userAgent" TEXT,
    "viewedAt"  TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateId"  INTEGER       NOT NULL,
    CONSTRAINT "update_views_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "update_views_updateId_idx" ON "update_views"("updateId");
CREATE INDEX "update_views_viewedAt_idx" ON "update_views"("viewedAt");
ALTER TABLE "update_views" ADD CONSTRAINT "update_views_updateId_fkey"
  FOREIGN KEY ("updateId") REFERENCES "updates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── media (nueva tabla) ──────────────────────────────────────────────────
CREATE TABLE "media" (
    "id"           SERIAL        NOT NULL,
    "filename"     TEXT          NOT NULL,
    "originalName" TEXT          NOT NULL,
    "mimeType"     TEXT          NOT NULL,
    "size"         INTEGER       NOT NULL,
    "url"          TEXT          NOT NULL,
    "uploadedById" TEXT,
    "createdAt"    TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "media_filename_key"      ON "media"("filename");
CREATE INDEX        "media_uploadedById_idx"  ON "media"("uploadedById");
ALTER TABLE "media" ADD CONSTRAINT "media_uploadedById_fkey"
  FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── site_settings (nueva tabla) ──────────────────────────────────────────
CREATE TABLE "site_settings" (
    "key"         TEXT NOT NULL,
    "value"       TEXT NOT NULL,
    "label"       TEXT NOT NULL,
    "description" TEXT,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
);

-- ─── audit_logs (nueva tabla) ─────────────────────────────────────────────
CREATE TABLE "audit_logs" (
    "id"        SERIAL        NOT NULL,
    "userId"    TEXT,
    "userEmail" TEXT,
    "action"    TEXT          NOT NULL,
    "entity"    TEXT          NOT NULL,
    "entityId"  TEXT,
    "metadata"  JSONB,
    "createdAt" TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_logs_userId_idx"    ON "audit_logs"("userId");
CREATE INDEX "audit_logs_entity_idx"    ON "audit_logs"("entity");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");
