/**
 * Helpers de formatage de dates centralisés — évite la dérive entre pages.
 *
 * Usage :
 *   import { formatDate, formatDateTime, formatDateLong } from "@/lib/format-date";
 *   formatDate("2026-04-15T14:30:00Z")     → "15/04/2026"
 *   formatDateLong("2026-04-15T14:30:00Z") → "15 avril 2026"
 *   formatDateMonthYear("2026-04-15")      → "avril 2026"
 *   formatDateTime("2026-04-15T14:30:00Z") → "15/04/2026 14:30"
 *   formatTime("2026-04-15T14:30:00Z")     → "14:30"
 *
 * Les instances Intl.DateTimeFormat sont cachées au module-level : créer un
 * DateTimeFormat coûte ~0.5ms, l'appeler avec `.format()` coûte < 0.01ms. Sur
 * une liste de 50 posts, ça économise ~25ms.
 *
 * Pour les temps relatifs ("il y a 2h", "à l'instant"), voir `./time-ago.ts`.
 */

const LOCALE = "fr-FR";

const dateFormatter = new Intl.DateTimeFormat(LOCALE, {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const dateLongFormatter = new Intl.DateTimeFormat(LOCALE, {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const dateLongTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const dateMonthYearFormatter = new Intl.DateTimeFormat(LOCALE, {
  year: "numeric",
  month: "long",
});

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat(LOCALE, {
  hour: "2-digit",
  minute: "2-digit",
});

type DateInput = string | Date | number | null | undefined;

function toDate(input: DateInput): Date | null {
  if (input == null) return null;
  const d = input instanceof Date ? input : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "15/04/2026" — format court, idéal pour les listes et tableaux. */
export function formatDate(input: DateInput, fallback = ""): string {
  const d = toDate(input);
  return d ? dateFormatter.format(d) : fallback;
}

/** "15 avril 2026" — format long, idéal pour les en-têtes et détails. */
export function formatDateLong(input: DateInput, fallback = ""): string {
  const d = toDate(input);
  return d ? dateLongFormatter.format(d) : fallback;
}

/** "15 avril 2026 14:30" — format long avec heure, idéal pour les tickets. */
export function formatDateLongTime(input: DateInput, fallback = ""): string {
  const d = toDate(input);
  return d ? dateLongTimeFormatter.format(d) : fallback;
}

/** "avril 2026" — idéal pour "Membre depuis ...". */
export function formatDateMonthYear(input: DateInput, fallback = ""): string {
  const d = toDate(input);
  return d ? dateMonthYearFormatter.format(d) : fallback;
}

/** "15/04/2026 14:30" — idéal pour les logs d'audit, timestamps d'événements. */
export function formatDateTime(input: DateInput, fallback = ""): string {
  const d = toDate(input);
  return d ? dateTimeFormatter.format(d) : fallback;
}

/** "14:30" — heure seule. */
export function formatTime(input: DateInput, fallback = ""): string {
  const d = toDate(input);
  return d ? timeFormatter.format(d) : fallback;
}
