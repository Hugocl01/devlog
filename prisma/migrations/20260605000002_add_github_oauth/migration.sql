-- Soporte de GitHub OAuth en la tabla users.
-- Permite que un usuario inicie sesión con GitHub en lugar de contraseña.

-- La contraseña pasa a ser opcional: los usuarios creados via GitHub no tienen contraseña.
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;

-- Identificador único del usuario en GitHub (null para cuentas de email/contraseña).
ALTER TABLE "users" ADD COLUMN "githubId" TEXT;
CREATE UNIQUE INDEX "users_githubId_key" ON "users"("githubId");
