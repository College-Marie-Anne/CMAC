/**
 * Normalisation des pays et nationalités pour éliminer les doublons dus aux
 * variations de saisie : casse, diacritiques, espaces accessoires.
 *
 * Exemple résolu :
 *   "haiti", "HAITI", "Haïti", "  haïti  " → "Haïti"
 *   "haitienne", "Haïtienne", "HAÏTIENNE" → "Haïtienne"
 *
 * Stratégie :
 *   1. trim + normalisation Unicode NFC (lettres composées uniformisées)
 *   2. clé de lookup = accent-folded + lowercased
 *   3. dictionnaire `CANONICAL` mappe cette clé vers la forme officielle
 *      (avec accents et majuscules corrects)
 *   4. fallback si inconnu : Title Case du trim
 *
 * Le dictionnaire est centré sur l'écosystème CMA (Haïti, francophone, diaspora).
 * À étendre au besoin : on ajoute juste une entrée `"nouvelleclé": "Forme Officielle"`.
 */

/** Enlève les diacritiques (é → e, ö → o, etc.) et lowercase. Utilisé UNIQUEMENT pour créer la clé de lookup. */
function foldKey(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/** Title case simple, sans altérer les articles/prépositions courants. */
function titleCase(raw: string): string {
  const lower = raw.toLowerCase();
  return lower.replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, ch: string) =>
    sep + ch.toUpperCase()
  );
}

// Clés lookup (accent-folded + lowercase) → forme canonique affichée.
const CANONICAL_COUNTRY: Record<string, string> = {
  "haiti": "Haïti",
  "ayiti": "Haïti",
  "france": "France",
  "canada": "Canada",
  "quebec": "Québec",
  "etats-unis": "États-Unis",
  "etats unis": "États-Unis",
  "united states": "États-Unis",
  "usa": "États-Unis",
  "royaume-uni": "Royaume-Uni",
  "royaume uni": "Royaume-Uni",
  "united kingdom": "Royaume-Uni",
  "republique dominicaine": "République dominicaine",
  "dominican republic": "République dominicaine",
  "cote d'ivoire": "Côte d'Ivoire",
  "cote-d'ivoire": "Côte d'Ivoire",
  "cote divoire": "Côte d'Ivoire",
  "ivory coast": "Côte d'Ivoire",
  "benin": "Bénin",
  "senegal": "Sénégal",
  "bresil": "Brésil",
  "brazil": "Brésil",
  "belgique": "Belgique",
  "suisse": "Suisse",
  "espagne": "Espagne",
  "allemagne": "Allemagne",
  "italie": "Italie",
  "mexique": "Mexique",
  "chili": "Chili",
  "argentine": "Argentine",
  "togo": "Togo",
  "cameroun": "Cameroun",
  "burkina faso": "Burkina Faso",
  "mali": "Mali",
  "niger": "Niger",
  "rwanda": "Rwanda",
  "congo": "Congo",
  "rd congo": "RD Congo",
  "madagascar": "Madagascar",
};

const CANONICAL_NATIONALITY: Record<string, string> = {
  "haitienne": "Haïtienne",
  "haitien": "Haïtienne",
  "ayisyen": "Haïtienne",
  "francaise": "Française",
  "francais": "Française",
  "french": "Française",
  "canadienne": "Canadienne",
  "canadien": "Canadienne",
  "quebecoise": "Québécoise",
  "quebecois": "Québécoise",
  "americaine": "Américaine",
  "americain": "Américaine",
  "american": "Américaine",
  "dominicaine": "Dominicaine",
  "dominicain": "Dominicaine",
  "ivoirienne": "Ivoirienne",
  "ivoirien": "Ivoirienne",
  "beninoise": "Béninoise",
  "beninois": "Béninoise",
  "senegalaise": "Sénégalaise",
  "senegalais": "Sénégalaise",
  "bresilienne": "Brésilienne",
  "bresilien": "Brésilienne",
  "belge": "Belge",
  "suisse": "Suisse",
  "espagnole": "Espagnole",
  "allemande": "Allemande",
  "italienne": "Italienne",
  "mexicaine": "Mexicaine",
  "chilienne": "Chilienne",
  "argentine": "Argentine",
  "togolaise": "Togolaise",
  "camerounaise": "Camerounaise",
  "burkinabe": "Burkinabè",
  "malienne": "Malienne",
  "nigerienne": "Nigérienne",
  "rwandaise": "Rwandaise",
  "congolaise": "Congolaise",
  "malgache": "Malgache",
  "britannique": "Britannique",
  "british": "Britannique",
};

export function normalizeCountry(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const cleaned = raw.normalize("NFC").trim().replace(/\s+/g, " ");
  if (cleaned === "") return null;
  const key = foldKey(cleaned);
  return CANONICAL_COUNTRY[key] ?? titleCase(cleaned);
}

export function normalizeNationality(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const cleaned = raw.normalize("NFC").trim().replace(/\s+/g, " ");
  if (cleaned === "") return null;
  const key = foldKey(cleaned);
  return CANONICAL_NATIONALITY[key] ?? titleCase(cleaned);
}

/** Normalise un tableau de nationalités + déduplique après normalisation. */
export function normalizeNationalities(
  raw: readonly string[] | null | undefined
): string[] {
  if (!raw || raw.length === 0) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const n of raw) {
    const norm = normalizeNationality(n);
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      out.push(norm);
    }
  }
  return out;
}
