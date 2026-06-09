export interface ClientUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  roleId: number;
}

// Cache en memoria para no lanzar múltiples peticiones por página
let cached: ClientUser | null | undefined = undefined;
let inflight: Promise<ClientUser | null> | null = null;

export function getCurrentUser(): Promise<ClientUser | null> {
  if (cached !== undefined) return Promise.resolve(cached);
  if (inflight) return inflight;

  inflight = fetch("/api/auth/me")
    .then((r) => r.json())
    .then(({ user }: { user: ClientUser | null }) => {
      cached = user;
      return user;
    })
    .catch(() => {
      cached = null;
      return null;
    });

  return inflight;
}

// Llamar al hacer logout o login para invalidar el cache
export function clearUserCache() {
  cached = undefined;
  inflight = null;
}
