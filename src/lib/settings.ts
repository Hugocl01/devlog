import { prisma } from "@/lib/prisma";

const TTL_MS = 30_000;

let cache: { data: App.Locals["settings"]; expiresAt: number } | null = null;

export async function getSiteSettings(): Promise<App.Locals["settings"]> {
  if (cache && cache.expiresAt > Date.now()) return cache.data;

  const rows = await prisma.siteSetting.findMany({ select: { key: true, value: true } });
  const s = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const data: App.Locals["settings"] = {
    site_name: s.site_name || "DevLog",
    site_description: s.site_description || "",
    site_author: s.site_author || "",
    portfolio_url: s.portfolio_url || "",
    maintenance_mode: s.maintenance_mode || "false",
    social_github: s.social_github || "",
    social_linkedin: s.social_linkedin || "",
    contact_email: s.contact_email || "",
  };

  cache = { data, expiresAt: Date.now() + TTL_MS };
  return data;
}

export function invalidateSiteSettingsCache() {
  cache = null;
}
