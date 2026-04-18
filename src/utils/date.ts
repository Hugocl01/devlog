export function toDate(value: string | Date): Date {
  return typeof value === "string" ? new Date(value) : value;
}

export function isoDate(value: string | Date): string {
  return toDate(value).toISOString();
}

export function formatDate(value: string | Date, locale = "es-ES"): string {
  return toDate(value).toLocaleDateString(locale, { dateStyle: "long" });
}

export function formatDateShort(value: string | Date, locale = "es-ES"): string {
  return toDate(value).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}


