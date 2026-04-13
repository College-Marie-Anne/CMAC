/**
 * Returns a French relative time string.
 * "il y a 2 min", "il y a 3h", "il y a 1j", "il y a 2 sem", "le 12 mars 2024"
 */
export function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diff = now - then;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (seconds < 60) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  if (hours < 24) return `il y a ${hours}h`;
  if (days < 7) return `il y a ${days}j`;
  if (weeks < 4) return `il y a ${weeks} sem`;

  // Older than ~1 month: show full date
  const d = new Date(dateString);
  const monthNames = [
    "janv.", "févr.", "mars", "avr.", "mai", "juin",
    "juil.", "août", "sept.", "oct.", "nov.", "déc.",
  ];
  return `le ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
}
