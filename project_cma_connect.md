---
name: CMA Connect - Specs
description: Spécifications techniques et fonctionnelles complètes du projet CMA Connect - plateforme de réseautage pour le Collège Marie-Anne
type: project
---

## CMA Connect v1.0.0
Plateforme de réseautage, annuaire et mentorat pour les anciennes et actuelles élèves du Collège Marie-Anne (CMA). PWA Mobile-First.

**Lead Developer:** Saint-Vil Angie-Reyna Leddycia

### Stack
- **Frontend:** Next.js (App Router) + React
- **UI:** Tailwind CSS + shadcn/ui (Radix UI — accessible par défaut)
- **Monitoring:** Sentry (error tracking frontend + backend)
- **Backend/DB:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (Email + Mot de passe en interne — frontend accepte username, nom complet ou email)
- **Storage:** Supabase Storage (compression images côté client)
- **Realtime:** Supabase Realtime Subscriptions (forum, DMs, notifications)
- **Animations:** Framer Motion (splash screen, transitions de pages, micro-interactions)
- **Graphiques:** Recharts (dashboard admin analytics)
- **Export PDF:** jsPDF (génération rapports admin côté client)
- **Rate Limiting:** Upstash Redis + @upstash/ratelimit (sliding window)
- **Forms:** React Hook Form + Zod
- **Déploiement:** Vercel
- **PWA Offline:** Service Worker + Cache Strategy

### Identité Visuelle & Branding

#### Logo
Écusson bicolore (bordeaux/vert) avec lettres "CMA" dorées, lauriers, et bannière "CMA · Connexion · Mentorat". Sert de favicon et icône PWA.

#### Palette de couleurs (tirée du logo)
| Nom | Hex | Usage |
|---|---|---|
| **Bordeaux (Maroon)** | `#800020` | Couleur primaire — headers, boutons principaux, liens actifs |
| **Vert foncé (Forest)** | `#006B3F` | Couleur secondaire — accents, badges, succès |
| **Or (Gold)** | `#D4A017` | Couleur d'accentuation — étoiles, badges premium, bordures, hover |
| **Or clair** | `#F5DEB3` | Fonds subtils, highlights |
| **Blanc** | `#FFFFFF` | Fond principal (mode clair) |
| **Gris clair** | `#F5F5F5` | Fond secondaire, cartes |
| **Gris foncé** | `#1A1A1A` | Texte principal |
| **Noir profond** | `#0D0D0D` | Fond principal (mode sombre) |

Les couleurs sont configurées dans `tailwind.config.ts` comme couleurs custom du design system.

#### Favicon & Icône PWA
- Le logo (écusson CMA) sert de favicon (`favicon.ico`, 32x32 + 16x16)
- Versions PWA : `icon-192.png`, `icon-512.png` pour le manifest
- Apple touch icon : `apple-touch-icon.png` (180x180)
- Configuré dans le `manifest.json` et les meta tags `<head>`

#### Animation d'ouverture (Splash Screen)
Animation riche et impactante au lancement de l'application :
- **Phase 1 — Fond** : Dégradé radial bordeaux foncé (#800020 → #5c0018 → #3a000f) avec particules dorées flottantes (GoldenParticles)
- **Phase 2 — Logo** : L'écusson CMA apparaît au centre dans un cercle doré avec scale-up (0.9→1) + fade-in (durée 1s, courbe spring)
- **Phase 3 — Texte** : "CMA · Connexion · Mentorat" en doré (#D4A017) slide-in sous le logo sur une seule ligne
- **Phase 4 — Sortie** : Fade-out global (1s) puis transition fluide vers la page de login
- **Durée totale** : 5 secondes + 1s de sortie (skippable à tout moment)
- **Implémentation** : Framer Motion (AnimatePresence avec onExitComplete) — affiché uniquement au premier chargement de la session
- **Skip** : Cliquable (onClick) + clavier (Enter/Space) pour passer l'animation. Attributs a11y : role="button", tabIndex={0}, aria-label

### Utilisateurs
- Alumni (anciennes élèves)
- S4 (finissantes)
- S1-S3 (élèves actuelles)
- Admins (direction + équipe IT)

### Onboarding (Wizard multi-étapes) — Profil AVANT compte
L'inscription exige que **tous les champs de chaque étape soient remplis** avant de passer à la suivante. Aucune étape ne peut être sautée. `is_profile_complete` passe à `true` à la fin de l'inscription. Les champs NULLABLE dans la table `profiles` (`class`, `filiere`, `enrollment_date`, `expected_end_date`, `promo_id`, `promo_start_date`) sont NULLABLE car ils ne s'appliquent pas à tous les rôles — une alumni n'a pas de `class`, une S1-S3 n'a pas de `promo_id`. Chaque branche de l'onboarding rend ses propres champs obligatoires. `avatar_url` et `bio` sont optionnels et remplissables après l'inscription.

1. **Profil de base** (Données démographiques) :
   - Prénoms, Nom, Date de naissance, Nationalité, Pays de résidence
   - Sélection du statut : **[Ancienne]** ou **[Élève Actuelle]**

2. **Branchement conditionnel** :

   **Si [Ancienne] → Branche Alumni :**
   - Promotion (dropdown ou saisie libre si absente → crée une promo `pending`)
   - Année de début de promotion (Année — select filtrable YearSelect, stockée dans `profiles.promo_start_date` INTEGER)
   - Année de fin de promotion (auto-verrouillée depuis `promotions.end_date`)
   - Filière (select : SVT, SES, SMP, Section A, Section B, Section C, Section D)
   - Activités parascolaires (multi-select depuis options gérées par admin)
   - Parcours post-CMA :
     - Type d'institution : [Université] / [École professionnelle] / [Autre] puis nom
     - Domaine d'études, niveau, années
     - Métier actuel (1 seul à l'inscription) :
       - Titre du poste (obligatoire)
       - Entreprise (optionnel — checkbox "Si applicable")
       - `is_current` automatiquement à `true`
       - D'autres métiers peuvent être ajoutés après l'inscription depuis `/profile/edit`

   **Si [Élève Actuelle] → Sous-sélection :**
   - **[Finissante (S4)]** ou **[Autres classes (S1-S3)]**

     **Si [Finissante (S4)] → Branche S4 :**
     - Promotion actuelle (dropdown)
     - Année de début (Année — select filtrable YearSelect, stockée dans `profiles.promo_start_date` INTEGER)
     - Année de fin (auto-verrouillée depuis `promotions.end_date`)
     - Filière (select : SVT, SES, SMP, Section A, Section B, Section C, Section D)
     - Activités parascolaires (multi-select depuis options gérées par admin)
     - Domaines d'études désirés à l'université (multi-saisie, max 3)

     **Si [Autres classes (S1-S3)] → Branche S1-S3 :**
     - Classe actuelle : dropdown [S1] / [S2] / [S3]
     - Année d'entrée au collège (Année — select filtrable YearSelect, stockée dans `profiles.enrollment_date` INTEGER)
     - Date de fin prévue (auto-calculée et verrouillée selon classe : S1→+3ans, S2→+2ans, S3→+1an, stockée dans `profiles.expected_end_date`)
     - Activités parascolaires (multi-select depuis options gérées par admin)
     - Domaines d'études désirés (multi-saisie, max 3)
   
   **Note filière S1-S3 :** Les S1-S3 n'ont pas encore de filière attribuée. Le champ `filiere` leur sera ouvert par l'admin quand elles passeront en S4.

3. **Création du compte** (dernière étape) :
   - Username (unique, servira à l'identification sur la plateforme)
   - Email (obligatoire — recevra un mail de bienvenue + vérification)
   - Mot de passe + Confirmation
   - Acceptation CGU / Politique de confidentialité (obligatoire) — checkbox avec liens cliquables vers `/legal/terms` et `/legal/privacy` (ouvrent dans un nouvel onglet). L'inscription est bloquée tant que la checkbox n'est pas cochée.

**Post-inscription :** Email de bienvenue automatique ("Bienvenue sur CMA Connect !") + lien de vérification email envoyé à l'adresse renseignée.

**Affichage sur la plateforme :** Nom complet affiché en principal, username affiché en dessous (ex: @username).

### Règles d'édition du profil
- **Ajout d'informations supplémentaires :** L'utilisatrice peut librement ajouter de nouveaux parcours académiques (`user_education`), métiers (`user_professions`), activités parascolaires, et domaines d'études désirés depuis son profil.
- **Modification de données existantes :** Pour modifier des données déjà renseignées (nom, promo, filière, etc.), l'utilisatrice doit contacter un admin qui effectuera la modification.
- **Avatar et bio :** Modifiables librement à tout moment.
- **Génération de lien d'invitation :** Bouton visible sur son propre profil (`/profile/edit`) pour les alumni approuvées. Génère un lien unique, affiche le lien copiable + date d'expiration (7 jours).
- **Désactivation de compte :** Bouton sur son propre profil (`/profile/edit`), section "Zone de danger" en bas de page. Modale de confirmation avec saisie obligatoire de "DÉSACTIVER" pour valider. Le compte passe en `status: deactivated`, la réactivation nécessite l'approbation d'un admin.

### Contrôle d'accès à l'inscription
Chaque inscription crée un compte avec `status: pending`. L'utilisatrice voit un écran d'attente jusqu'à approbation.

- **Approbation admin :** L'admin valide ou rejette manuellement chaque inscription depuis le dashboard.
- **Liens d'invitation alumni :** Une alumni déjà approuvée (`status: active`) peut générer un lien d'invitation unique depuis son profil. Ce lien :
  - Contient un token unique (UUID)
  - A une date d'expiration
  - Est à usage unique (1 lien = 1 inscription)
  - Pré-approuve l'inscrite (passe directement en `status: active` au lieu de `pending`)
  - Enregistre qui a invité qui (`inviter_id` → `used_by`)
  - Peut être révoqué par un admin (champ `is_revoked`)
  - Traçable dans le dashboard admin : qui a partagé, qui s'est inscrit via quel lien

### Authentification (Login)
**Champ unique d'identifiant :** L'utilisatrice peut entrer son **username**, son **email**, ou son **nom complet** dans un seul champ. Le système détecte le type d'identifiant et résout l'email Supabase Auth en interne.

**Détection automatique du type d'identifiant :**
- Contient `@` → traité comme **email**
- Ne contient que des caractères alphanumérique + underscore → traité comme **username**
- Contient des espaces → traité comme **nom complet**

**Flow de login :**
1. L'utilisatrice entre son identifiant (username, email ou nom complet) + mot de passe
2. **Si username ou email :** lookup direct en DB → email trouvé → Supabase Auth login
3. **Si nom complet :**
   - L'utilisatrice doit entrer **tous ses prénoms** tels qu'inscrits à l'inscription, suivis de son nom (ex: "Marie-Anne Joséphine Dupont"). La correspondance est exacte et insensible à la casse sur `first_name || ' ' || last_name`.
   - **Si 1 résultat :** login normal
   - **Si plusieurs résultats (homonymes) :** un champ supplémentaire apparaît pour demander la date de naissance
   - **Si même nom + même date de naissance :** le système envoie un code de vérification par email à toutes les correspondances, et un champ apparaît pour entrer le code reçu

- **Reset mot de passe (déconnectée) :** Via email depuis `/forgot-password` (Supabase Auth natif). Le lien redirige vers `/auth/reset-password`.
- **Changement de mot de passe (connectée) :** Depuis `/settings`, formulaire avec 3 champs : ancien mot de passe, nouveau mot de passe, confirmation. Implémenté via `supabase.auth.updateUser({ password })` après vérification de l'ancien mot de passe. Validation Zod : min 8 caractères, au moins 1 majuscule, 1 minuscule, 1 chiffre.
- **Pas de suppression définitive :** Un compte ne peut pas être supprimé. L'utilisatrice peut désactiver son compte, mais la réactivation nécessite l'approbation d'un admin.

---

### Tables DB

#### `profiles`
Table centrale des utilisatrices.
| Champ | Type | Description |
|---|---|---|
| `id` | UUID, PK, FK Auth | Lié à Supabase Auth |
| `username` | TEXT, UNIQUE, NOT NULL | Identifiant public (@username) |
| `first_name` | TEXT | Prénoms |
| `last_name` | TEXT | Nom |
| `date_of_birth` | DATE | Date de naissance |
| `nationality` | TEXT[] | Nationalité(s) — tableau PostgreSQL, supporte la multi-nationalité (ex: `{'Haïtienne', 'Canadienne'}`) |
| `country` | TEXT | Pays de résidence actuel |
| `role` | ENUM (alumni, s4, student, admin) | Rôle/statut |
| `class` | TEXT, NULLABLE | Classe actuelle (S1, S2, S3) — uniquement pour students |
| `filiere` | TEXT, NULLABLE, CHECK (`filiere IN ('SVT', 'SES', 'SMP', 'Section A', 'Section B', 'Section C', 'Section D')`) | Filière au CMA (select contraint). NULL pour S1-S3 (attribué par admin au passage en S4). |
| `enrollment_date` | INTEGER, NULLABLE | Année d'entrée au collège (S1-S3) |
| `promo_id` | UUID, FK promotions, NULLABLE | Lien vers la promotion. NULL pour S1-S3 (attribué par l'admin quand l'élève passe en S4) |
| `promo_start_date` | INTEGER, NULLABLE | Année de début de promotion (select filtrable YearSelect) |
| `avatar_url` | TEXT, NULLABLE | Photo de profil |
| `bio` | TEXT, NULLABLE | Courte description personnelle |
| `expected_end_date` | INTEGER, NULLABLE | Année de fin prévue au CMA (auto-calculée : enrollment_date + 1/2/3 ans) |
| `status` | ENUM (pending, active, suspended, deactivated), DEFAULT 'pending' | Statut du compte |
| `is_profile_complete` | BOOLEAN, DEFAULT false | Passe à true à la fin de l'inscription |
| `is_super_admin` | BOOLEAN, DEFAULT false | true uniquement pour LakouSystems (seed, immuable) |
| `must_change_password` | BOOLEAN, DEFAULT false | true pour admins créés — force changement au premier login |
| `theme_preference` | TEXT, DEFAULT 'system' | Préférence de thème (light, dark, system) |
| `last_seen_at` | TIMESTAMPTZ, NULLABLE | Dernière activité (mis à jour à chaque requête authentifiée) |
| `accepted_terms_at` | TIMESTAMPTZ | Horodatage de l'acceptation des CGU |
| `terms_version` | TEXT | Version des CGU acceptées (ex: "1.0", "1.1") |
| `search_vector` | TSVECTOR | Colonne full-text search (générée automatiquement via trigger) |
| `created_at` | TIMESTAMPTZ | Date de création |
| `updated_at` | TIMESTAMPTZ, DEFAULT NOW() | Dernière modification |

#### `promotions`
| Champ | Type | Description |
|---|---|---|
| `id` | UUID, PK | — |
| `name` | TEXT, UNIQUE | Nom de la promotion |
| `start_date` | INTEGER | Année de début |
| `end_date` | INTEGER | Année de fin |
| `emblem_url` | TEXT, NULLABLE | URL de l'emblème |
| `leader_id` | UUID, FK profiles, NULLABLE | Chef de promo élue par les membres |
| `status` | ENUM (active, pending, rejected) | Statut de validation |
| `created_at` | TIMESTAMPTZ | — |
| `updated_at` | TIMESTAMPTZ, DEFAULT NOW() | — |

#### `promo_elections` (NOUVELLE — élections de chef de promo)
| Champ | Type | Description |
|---|---|---|
| `id` | UUID, PK | — |
| `promo_id` | UUID, FK promotions | Promotion concernée |
| `initiated_by` | UUID, FK profiles | Qui a lancé l'élection |
| `status` | ENUM (nomination, voting, completed, cancelled) | Phase en cours |
| `nomination_end` | TIMESTAMPTZ | Fin de la période de candidature |
| `voting_end` | TIMESTAMPTZ | Fin de la période de vote |
| `winner_id` | UUID, FK profiles, NULLABLE | Candidate élue (rempli à la clôture) |
| `created_at` | TIMESTAMPTZ | — |
| `updated_at` | TIMESTAMPTZ, DEFAULT NOW() | Mis à jour à chaque changement de phase (nomination → voting → completed/cancelled) |

#### `promo_candidates` (NOUVELLE — candidates à l'élection)
| Champ | Type | Description |
|---|---|---|
| `id` | UUID, PK | — |
| `election_id` | UUID, FK promo_elections | Élection concernée |
| `candidate_id` | UUID, FK profiles | Utilisatrice qui se porte candidate |
| `pitch` | TEXT, NULLABLE | Court message de candidature (max 300 caractères) |
| `vote_count` | INT, DEFAULT 0 | Compteur de votes dénormalisé (mis à jour par trigger DB sur `promo_votes` INSERT/DELETE) |
| `created_at` | TIMESTAMPTZ | — |
| UNIQUE | (election_id, candidate_id) | Une seule candidature par élection |

#### `promo_votes` (NOUVELLE — votes pour l'élection)
| Champ | Type | Description |
|---|---|---|
| `id` | UUID, PK | — |
| `election_id` | UUID, FK promo_elections | Élection concernée |
| `voter_id` | UUID, FK profiles | Qui vote |
| `promo_candidate_id` | UUID, FK promo_candidates.id | Entrée de candidature pour laquelle l'utilisatrice vote (pas le profil directement) |
| `created_at` | TIMESTAMPTZ | — |
| UNIQUE | (election_id, voter_id) | Un seul vote par membre par élection |

#### `user_education` (NOUVELLE — jonction multi-parcours)
Supporte plusieurs parcours universitaires par profil.
| Champ | Type | Description |
|---|---|---|
| `id` | UUID, PK | — |
| `profile_id` | UUID, FK profiles | — |
| `institution_type` | ENUM (university, professional_school, other) | Type d'institution |
| `institution_name` | TEXT | Nom de l'institution |
| `study_field` | TEXT | Domaine d'études |
| `degree_level` | TEXT, NULLABLE | Niveau (Licence, Master, etc.) |
| `start_year` | INT, NULLABLE | Année de début |
| `end_year` | INT, NULLABLE | Année de fin |
| `created_at` | TIMESTAMPTZ | — |
| `updated_at` | TIMESTAMPTZ, DEFAULT NOW() | Mis à jour par admin lors d'une correction |

#### `user_professions` (NOUVELLE — jonction multi-métiers)
Supporte plusieurs métiers par profil.
| Champ | Type | Description |
|---|---|---|
| `id` | UUID, PK | — |
| `profile_id` | UUID, FK profiles | — |
| `title` | TEXT | Titre du poste |
| `company` | TEXT, NULLABLE | Entreprise |
| `is_current` | BOOLEAN, DEFAULT false | Poste actuel ? |
| `created_at` | TIMESTAMPTZ | — |
| `updated_at` | TIMESTAMPTZ, DEFAULT NOW() | Mis à jour par admin lors d'une correction |

#### `activities` (NOUVELLE — parascolaires)
| Champ | Type | Description |
|---|---|---|
| `id` | UUID, PK | — |
| `name` | TEXT, UNIQUE | Nom de l'activité |
| `created_at` | TIMESTAMPTZ | — |
| `updated_at` | TIMESTAMPTZ, DEFAULT NOW() | Mis à jour lors d'un renommage par admin |

#### `profile_activities` (NOUVELLE — jonction profil/activités)
| Champ | Type | Description |
|---|---|---|
| `profile_id` | UUID, FK profiles | — |
| `activity_id` | UUID, FK activities | — |
| PK composite | (profile_id, activity_id) | — |

#### `desired_study_fields` (NOUVELLE — domaines d'études désirés pour élèves actuelles)
Stocke les intérêts universitaires des S1-S4 pour le matching mentorat. **Maximum 3 domaines par profil** (modifiables — l'utilisatrice peut supprimer et ajouter de nouveaux domaines). Le plafond de 3 est vérifié par une **fonction RPC Supabase** pour l'INSERT : avant d'insérer, elle exécute `SELECT COUNT(*) FROM desired_study_fields WHERE profile_id = auth.uid()` et rejette si ≥ 3. La validation Zod frontend empêche aussi l'envoi si 3 domaines existent déjà (double protection).
| Champ | Type | Description |
|---|---|---|
| `id` | UUID, PK | — |
| `profile_id` | UUID, FK profiles | — |
| `field_name` | TEXT | Domaine d'études désiré (ex: Médecine, Droit, Informatique) |
| `created_at` | TIMESTAMPTZ | — |

#### `forum_tags` (NOUVELLE — remplace l'ENUM tag)
Tags gérables par l'admin depuis le dashboard, sans migration DB.
| Champ | Type | Description |
|---|---|---|
| `id` | UUID, PK | — |
| `name` | TEXT, UNIQUE | Nom du tag (ex: Orientation, Offre de Stage, Entraide) |
| `color` | TEXT | Couleur du badge UI (ex: #3B82F6) |
| `is_system` | BOOLEAN, DEFAULT false | Tag système protégé contre la suppression (ex: "Bourses & Opportunités") |
| `created_at` | TIMESTAMPTZ | — |
| `updated_at` | TIMESTAMPTZ, DEFAULT NOW() | Mis à jour lors d'une modification par admin |

**Tags système (seedés à la création de la DB, non supprimables) :**
- "Bourses & Opportunités" — alimente le forum `/opportunities`
- Les tags système ont `is_system = true` et ne peuvent pas être supprimés ni renommés par l'admin

#### `forum_posts`
| Champ | Type | Description |
|---|---|---|
| `id` | UUID, PK | — |
| `author_id` | UUID, FK profiles | — |
| `content` | TEXT | Contenu du post (max 2000 caractères) |
| `tag_id` | UUID, FK forum_tags | Tag obligatoire (référence table forum_tags) |
| `image_url` | TEXT, NULLABLE | Image jointe (1 max) |
| `promo_id` | UUID, FK promotions, NULLABLE | Si renseigné = Coin Promo uniquement |
| `reaction_count` | INT, DEFAULT 0 | Compteur total de réactions dénormalisé (mis à jour par trigger DB sur `forum_reactions` INSERT/DELETE) |
| `is_pinned` | BOOLEAN, DEFAULT false | Post épinglé en haut du flux (admin partout, chef de promo dans son Coin Promo) |
| `is_edited` | BOOLEAN, DEFAULT false | Indicateur "(modifié)" affiché dans l'UI |
| `is_deleted` | BOOLEAN, DEFAULT false | Soft delete pour modération |
| `created_at` | TIMESTAMPTZ | — |
| `search_vector` | TSVECTOR | Full-text search sur le contenu (trigger + index GIN) |
| `updated_at` | TIMESTAMPTZ, DEFAULT NOW() | Mis à jour lors d'une édition par l'auteur |

Les posts sont **éditables** par leur auteur. Lors d'une modification, `is_edited` passe à `true` et `updated_at` est rafraîchi. L'UI affiche "(modifié)" à côté du timestamp.

#### `forum_comments`
| Champ | Type | Description |
|---|---|---|
| `id` | UUID, PK | — |
| `post_id` | UUID, FK forum_posts | — |
| `author_id` | UUID, FK profiles | — |
| `parent_id` | UUID, FK forum_comments, NULLABLE | Si renseigné = réponse à un autre commentaire (threading à 1 niveau max) |
| `content` | TEXT | Contenu (max 500 caractères) |
| `reaction_count` | INT, DEFAULT 0 | Compteur total de réactions dénormalisé (trigger DB sur `forum_reactions` INSERT/DELETE) |
| `is_edited` | BOOLEAN, DEFAULT false | Indicateur "(modifié)" |
| `is_deleted` | BOOLEAN, DEFAULT false | Soft delete |
| `created_at` | TIMESTAMPTZ | — |
| `updated_at` | TIMESTAMPTZ, DEFAULT NOW() | Mis à jour lors d'une édition par l'auteur |

Les commentaires sont **éditables** par leur auteur, même logique que les posts (`is_edited` + `updated_at`).
Les commentaires supportent le **threading à 1 niveau** : un commentaire peut être une réponse à un autre commentaire (`parent_id`), mais pas de réponse à une réponse (profondeur max = 1). L'UI affiche les réponses indentées sous le commentaire parent.

#### `conversations` (NOUVELLE — threads de messagerie)
Regroupe les échanges entre deux utilisatrices. Évite les requêtes lourdes pour lister les discussions.
| Champ | Type | Description |
|---|---|---|
| `id` | UUID, PK | — |
| `participant_1` | UUID, FK profiles | Première participante (ID le plus petit pour unicité) |
| `participant_2` | UUID, FK profiles | Seconde participante |
| `last_message_at` | TIMESTAMPTZ, NULLABLE | Timestamp du dernier message (pour tri de la liste) |
| `archived_by_1` | BOOLEAN, DEFAULT false | Archivée côté participant_1 |
| `archived_by_2` | BOOLEAN, DEFAULT false | Archivée côté participant_2 |
| `created_at` | TIMESTAMPTZ | — |
| UNIQUE | (participant_1, participant_2) | Une seule conversation par paire |
| CHECK | `participant_1 < participant_2` | Garantit l'unicité de la paire (pas de doublons inversés). Appliqué via un trigger BEFORE INSERT qui ordonne les deux UUIDs. |

#### `direct_messages`
| Champ | Type | Description |
|---|---|---|
| `id` | UUID, PK | — |
| `conversation_id` | UUID, FK conversations | Thread parent |
| `sender_id` | UUID, FK profiles | — |
| `content` | TEXT | Contenu du message (max 1000 caractères) |
| `image_url` | TEXT, NULLABLE | Image jointe (1 max, mêmes contraintes que forum-images) |
| `is_read` | BOOLEAN, DEFAULT false | Indicateur lu/non-lu |
| `read_at` | TIMESTAMPTZ, NULLABLE | Date de lecture |
| `is_deleted_by_sender` | BOOLEAN, DEFAULT false | Supprimé côté sender |
| `is_deleted_by_receiver` | BOOLEAN, DEFAULT false | Supprimé côté receiver |
| `created_at` | TIMESTAMPTZ | — |

Les DMs supportent l'envoi d'**une image par message** (mêmes formats et contraintes que les images forum). La suppression est **par utilisatrice** : chaque partie peut supprimer le message de son côté sans affecter l'autre. **L'admin n'a pas accès aux DMs** — les politiques RLS excluent explicitement le rôle admin des SELECT sur `direct_messages` et `conversations`.

**Purge des DMs :** Un **trigger DB AFTER UPDATE** sur `direct_messages` vérifie à chaque modification si `is_deleted_by_sender = true AND is_deleted_by_receiver = true`. Si oui, le message est **hard-deleted** immédiatement (DELETE de la ligne + suppression de l'image dans le bucket `dm-images` si `image_url` est renseigné). Pas de cron — la purge est instantanée et déclenchée par l'action de la seconde partie qui supprime.

#### `notifications` (NOUVELLE)
| Champ | Type | Description |
|---|---|---|
| `id` | UUID, PK | — |
| `recipient_id` | UUID, FK profiles | Destinataire |
| `type` | ENUM (dm, forum_reply, forum_comment_reply, reaction, mention, admin, account_approved, account_suspended, account_deactivated, account_reactivated, promo_rejected, mentorship, mentorship_completed, invitation_used, election, post_pinned, new_opportunity, support_reply) | Type de notification |
| `reference_id` | UUID, NULLABLE | ID de l'objet lié (post, message, etc.) |
| `content` | TEXT | Texte de la notification |
| `is_read` | BOOLEAN, DEFAULT false | — |
| `created_at` | TIMESTAMPTZ | — |

#### `reports` (NOUVELLE — signalements)
| Champ | Type | Description |
|---|---|---|
| `id` | UUID, PK | — |
| `reporter_id` | UUID, FK profiles | Qui signale |
| `reported_user_id` | UUID, FK profiles, NULLABLE | Utilisatrice signalée |
| `reported_post_id` | UUID, FK forum_posts, NULLABLE | Post signalé |
| `reported_comment_id` | UUID, FK forum_comments, NULLABLE | Commentaire signalé |
| `reported_message_id` | UUID, FK direct_messages, NULLABLE | Message privé signalé |
| `reason` | TEXT | Motif du signalement |
| `status` | ENUM (pending, reviewed, dismissed) | Statut du traitement |
| `reviewed_by` | UUID, FK profiles, NULLABLE | Admin qui a traité le signalement |
| `reviewed_at` | TIMESTAMPTZ, NULLABLE | Date du traitement |
| `admin_note` | TEXT, NULLABLE | Note interne de l'admin sur la décision (max 500 chars) |
| `created_at` | TIMESTAMPTZ | — |
| `updated_at` | TIMESTAMPTZ, DEFAULT NOW() | — |

#### `blocked_users` (NOUVELLE)
| Champ | Type | Description |
|---|---|---|
| `blocker_id` | UUID, FK profiles | Qui bloque |
| `blocked_id` | UUID, FK profiles | Qui est bloquée |
| PK composite | (blocker_id, blocked_id) | — |
| `created_at` | TIMESTAMPTZ | — |

#### `invitation_links` (NOUVELLE — liens d'invitation générés par alumni approuvées)
| Champ | Type | Description |
|---|---|---|
| `id` | UUID, PK | — |
| `inviter_id` | UUID, FK profiles | Alumni qui génère le lien |
| `token` | UUID, UNIQUE | Token unique dans l'URL d'invitation (UUID v4, 36 caractères) |
| `used_by` | UUID, FK profiles, NULLABLE | Profil de l'inscrite via ce lien |
| `is_used` | BOOLEAN, DEFAULT false | Lien déjà utilisé ? |
| `is_revoked` | BOOLEAN, DEFAULT false | Lien révoqué par admin ? |
| `expires_at` | TIMESTAMPTZ | Date d'expiration du lien (auto-calculée : `created_at + 7 jours`) |
| `created_at` | TIMESTAMPTZ | — |

**Expiration :** Les liens d'invitation expirent automatiquement **7 jours** après leur création. À l'ouverture d'un lien expiré, l'utilisatrice voit un écran "Ce lien d'invitation a expiré. Contactez l'alumni qui vous l'a envoyé pour en obtenir un nouveau." La vérification se fait côté serveur : `expires_at < NOW()` → rejet. Le lien n'est pas supprimé de la DB (historique traçable par l'admin).

#### `support_tickets` (NOUVELLE — demandes de support / contact admin)
| Champ | Type | Description |
|---|---|---|
| `id` | UUID, PK | — |
| `author_id` | UUID, FK profiles | Utilisatrice qui soumet le ticket |
| `category` | ENUM (profile_modification, promo_issue, account_reactivation, bug_report, other) | Catégorie du ticket |
| `subject` | TEXT | Objet du ticket (max 150 caractères) |
| `message` | TEXT | Description détaillée (max 2000 caractères) |
| `status` | ENUM (open, in_progress, resolved, closed), DEFAULT 'open' | Statut du traitement |
| `assigned_to` | UUID, FK profiles, NULLABLE | Admin assigné au ticket |
| `admin_response` | TEXT, NULLABLE | Réponse de l'admin (max 2000 caractères) |
| `resolved_at` | TIMESTAMPTZ, NULLABLE | Date de résolution |
| `created_at` | TIMESTAMPTZ | — |
| `updated_at` | TIMESTAMPTZ, DEFAULT NOW() | — |

*Tables `admin_deactivation_votes` et `admin_deactivation_approvals` supprimées — LakouSystems gère seul la désactivation/réactivation des admins.*

#### `admin_audit_log` (NOUVELLE — journal d'audit des actions admin)
| Champ | Type | Description |
|---|---|---|
| `id` | UUID, PK | — |
| `admin_id` | UUID, FK profiles | Admin qui a effectué l'action |
| `action` | TEXT, CHECK (max 50 chars) | Type d'action — valeurs contrôlées par le trigger DB (liste exhaustive ci-dessous) |

**Valeurs exhaustives de `action` :**
- **Comptes :** `approve_user`, `reject_user`, `suspend_user`, `deactivate_user`, `reactivate_user`, `update_profile`, `bulk_approve`, `bulk_suspend`
- **Promotions :** `approve_promo`, `reject_promo`, `update_promo`, `assign_promo_to_user`
- **Forum :** `delete_post`, `delete_comment`, `pin_post`, `unpin_post`
- **Tags :** `create_tag`, `update_tag`, `delete_tag`
- **Activités :** `create_activity`, `update_activity`, `delete_activity`
- **Invitations :** `revoke_invitation`
- **Élections :** `cancel_election`
- **Support :** `assign_ticket`, `respond_ticket`, `close_ticket`
- **Admins (super_admin_action) :** `create_admin`, `deactivate_admin`, `reactivate_admin`, `reset_admin_password`, `admin_login`
| `target_type` | TEXT, CHECK (max 50 chars) | Type de cible — valeurs contrôlées par le trigger DB (profile, promotion, forum_post, forum_comment, invitation_link, activity, forum_tag, blocked_users, profile_activities, promo_election, mentorship_request, mentorship_session, support_ticket) |
| `target_id` | TEXT | ID de l'élément ciblé (UUID en string, ou clé composite sérialisée ex: "blocker_id:blocked_id" pour les tables à PK composite) |
| `details` | JSONB, NULLABLE | Détails supplémentaires (ex: raison de suspension, ancien statut, IDs composites décomposés) |
| `created_at` | TIMESTAMPTZ | — |

#### `notification_preferences` (NOUVELLE — préférences de notification par utilisatrice)
| Champ | Type | Description |
|---|---|---|
| `id` | UUID, PK | — |
| `profile_id` | UUID, FK profiles, UNIQUE | Une seule ligne par utilisatrice |
| `dm` | BOOLEAN, DEFAULT true | Notifications de messages privés |
| `forum_reply` | BOOLEAN, DEFAULT true | Réponses à ses posts |
| `forum_comment_reply` | BOOLEAN, DEFAULT true | Réponses à des posts qu'elle a commentés |
| `reaction` | BOOLEAN, DEFAULT true | Réactions sur ses posts/commentaires |
| `mention` | BOOLEAN, DEFAULT true | @mentions |
| `mentorship` | BOOLEAN, DEFAULT true | Demandes et réponses mentorat |
| `mentorship_completed` | BOOLEAN, DEFAULT true | Mentorat marqué comme terminé |
| `election` | BOOLEAN, DEFAULT true | Élections de promo |
| `new_opportunity` | BOOLEAN, DEFAULT true | Nouvelles bourses/opportunités |
| `push_enabled` | BOOLEAN, DEFAULT false | Active les push notifications (Web Push) |
| `created_at` | TIMESTAMPTZ | — |
| `updated_at` | TIMESTAMPTZ, DEFAULT NOW() | — |

Créée automatiquement à l'inscription (valeurs par défaut : tout activé sauf push). Modifiable depuis `/settings`. Les notifications de type `admin`, `account_approved`, `account_suspended`, `account_deactivated`, `account_reactivated`, `promo_rejected`, `invitation_used`, `post_pinned`, `support_reply` sont **toujours envoyées** et ne peuvent pas être désactivées.

#### `push_subscriptions` (NOUVELLE — endpoints Web Push par utilisatrice)
| Champ | Type | Description |
|---|---|---|
| `id` | UUID, PK | — |
| `profile_id` | UUID, FK profiles | — |
| `endpoint` | TEXT, max 500 chars | URL endpoint du navigateur (générée par le navigateur via Web Push API) |
| `p256dh` | TEXT, max 200 chars | Clé publique ECDH (générée par le navigateur) |
| `auth` | TEXT, max 200 chars | Secret d'authentification (généré par le navigateur) |
| `created_at` | TIMESTAMPTZ | — |

#### `forum_reactions` (NOUVELLE — likes/emojis sur posts ET commentaires)
| Champ | Type | Description |
|---|---|---|
| `id` | UUID, PK | — |
| `post_id` | UUID, FK forum_posts, NULLABLE | Post concerné (NULL si réaction sur commentaire) |
| `comment_id` | UUID, FK forum_comments, NULLABLE | Commentaire concerné (NULL si réaction sur post) |
| `user_id` | UUID, FK profiles | Qui réagit |
| `emoji` | TEXT, CHECK (`emoji IN ('like', 'heart', 'clap')`) | Emoji contraint aux 3 types autorisés |
| `created_at` | TIMESTAMPTZ | — |
| CHECK | `(post_id IS NOT NULL) != (comment_id IS NOT NULL)` | Exactement un des deux doit être renseigné |
| UNIQUE | (post_id, user_id, emoji) WHERE post_id IS NOT NULL | 1 réaction par type par utilisatrice par post |
| UNIQUE | (comment_id, user_id, emoji) WHERE comment_id IS NOT NULL | 1 réaction par type par utilisatrice par commentaire |

---

### Features principales
- Profils avec emblème de promotion + badge "Graine de CMA" pour élèves actuelles
- Affichage: Nom complet principal + @username en dessous
- Annuaire filtrable avec full-text search PostgreSQL (nom, username, domaine, profession, promo)
- Forum global avec tags obligatoires gérés via table `forum_tags` (CRUD admin)
- Coins Promos (espaces cloisonnés par promo_id, remplacent WhatsApp)
- Messagerie privée avec indicateurs lu/non-lu (mentorat)
- Système de notifications (DMs, réponses forum, réactions, mentions, mentorat, actions admin)
- Signalement et blocage entre utilisatrices
- Dashboard admin complet (analytics graphiques, validation promos, modération, signalements, audit log, invitations, activités parascolaires, export données, actions en lot)
- Reset de mot de passe (via Supabase Auth natif)
- Vérification email à l'inscription
- Réactions sur les posts forum (like, heart, clap — 1 réaction par type par utilisatrice)
- Édition de posts forum par l'auteur (indicateur "modifié" affiché)
- Système de @mentions (autocomplete username dans forum/commentaires, génère une notification)
- Épinglage de posts forum — admin (partout) ou chef de promo (dans son Coin Promo uniquement)
- Élection de chef de promo — candidature, vote anonyme, succession
- Édition de commentaires par l'auteur (indicateur "modifié")
- Suspension de comptes par l'admin
- Désactivation de compte par l'utilisatrice (réactivation via approbation admin)
- Liens d'invitation générés par alumni approuvées (usage unique, expiration, pré-approbation)
- Login alternatif par nom complet si username oublié
- Dark mode (toggle dans settings, respect préférence système par défaut)
- Mentorat : feature dédiée avec matching intelligent, demandes, suivi (voir section Mentorat)
- Forum "Bourses & Opportunités" : espace dédié aux bourses, stages, et opportunités professionnelles
- Activités parascolaires : multi-select depuis options gérées par l'admin dans le dashboard
- Login multi-identifiant : email, username, ou nom complet + disambiguation automatique
- Email de bienvenue + vérification à l'inscription
- Édition profil : ajout libre de parcours, modification données existantes via admin

---

### Sécurité

#### RLS (Row Level Security)

**Règle globale :** Toutes les requêtes authentifiées vérifient `profiles.status = 'active'` — les comptes pending/suspendus/désactivés sont bloqués sur toutes les tables.

##### `profiles`
- SELECT: tous les authentifiés
- INSERT: via **fonction serveur** à la fin de l'onboarding (crée le profil lié au `auth.uid()`)
- UPDATE: via **fonction RPC** — l'utilisatrice (`auth.uid() = id`) peut modifier uniquement `avatar_url`, `bio`, `theme_preference`. Modification de champs protégés (nom, promo, filière, etc.) → admin uniquement. `is_super_admin` → **immuable** (valeur set uniquement par seed, aucune policy UPDATE autorisée).
- DELETE: **interdit** (pas de suppression de compte)

##### `promotions`
- SELECT: tous les authentifiés
- INSERT: via **fonction serveur** uniquement (promo `pending` depuis onboarding)
- UPDATE: admin uniquement (validation, emblème, leader_id via fonction serveur après élection)
- DELETE: admin uniquement

##### `conversations`
- SELECT: `auth.uid() = participant_1 OR auth.uid() = participant_2` (admin explicitement EXCLUS)
- INSERT: via **fonction RPC** — vérifie que `sender ≠ receiver` (pas de conversation avec soi-même), vérifie blocage bidirectionnel (`NOT EXISTS blocked_users` dans les deux sens), ordonne les IDs (`participant_1 < participant_2`), crée la conversation
- UPDATE (`archived_by_*`): chaque participante peut archiver/désarchiver de son côté
- DELETE: via **fonction RPC** — autorisé uniquement si tous les messages sont supprimés des deux côtés (`is_deleted_by_sender = true AND is_deleted_by_receiver = true` sur tous les DMs), puis hard-delete conversation + messages

##### `direct_messages`
- SELECT: via conversation dont l'utilisatrice est participante + filtre `is_deleted_by_[sender|receiver] = false` pour l'utilisatrice concernée (admin explicitement EXCLUS)
- INSERT: via **fonction RPC** qui :
  1. Vérifie `auth.uid() = sender_id`
  2. Résout le receiver via `conversations` (l'autre participant)
  3. Vérifie blocage : `NOT EXISTS blocked_users WHERE blocker_id = receiver AND blocked_id = sender`
  4. Vérifie statut sender : `profiles.status = 'active'`
  5. INSERT message + UPDATE `conversations.last_message_at`
- UPDATE (`is_deleted_by_*`): chaque participante peut supprimer de son côté
- DELETE: **interdit directement** — la purge se fait par trigger DB `AFTER UPDATE` quand `is_deleted_by_sender = true AND is_deleted_by_receiver = true`

##### `forum_posts`
- SELECT (global): `promo_id IS NULL AND is_deleted = false` pour tous les authentifiés
- SELECT (Coin Promo): `promo_id` du post = `promo_id` du profil authentifié `AND is_deleted = false`
- SELECT (admin): admins voient aussi les posts soft-deleted, tous Coins Promos
- INSERT: tous les authentifiés (mur global), ou matching `promo_id` (Coin Promo)
- UPDATE (contenu): auteur uniquement (`auth.uid() = author_id`)
- UPDATE (`is_pinned`): admin OU chef de promo (vérifie `promotions.leader_id = auth.uid() AND forum_posts.promo_id = profiles.promo_id`)
- DELETE (soft): auteur ou admin (`is_deleted = true`)

##### `forum_comments`
- SELECT: tous les authentifiés `WHERE is_deleted = false` ET post parent accessible (jointure sur `forum_posts` — si `promo_id IS NULL` → visible, si `promo_id` renseigné → uniquement si matching promo de l'utilisatrice)
- SELECT (admin): admins voient aussi les soft-deleted, tous Coins Promos
- INSERT: tous les authentifiés, uniquement sur posts accessibles
- UPDATE (contenu): auteur uniquement (`auth.uid() = author_id`)
- DELETE (soft): auteur ou admin (`is_deleted = true`)

##### `forum_reactions`
- SELECT: tous les authentifiés, filtré par accessibilité du post/commentaire parent (jointure Coin Promo)
- INSERT: tous les authentifiés, uniquement sur posts/commentaires accessibles
- DELETE: `auth.uid() = user_id` (retrait de sa propre réaction)
- UPDATE: **interdit** (changement = DELETE + INSERT)

##### `forum_tags`
- SELECT: tous les authentifiés
- INSERT/UPDATE/DELETE: admin uniquement (tags `is_system = true` protégés contre DELETE et renommage)

##### `user_education`
- SELECT: tous les authentifiés (annuaire)
- INSERT: `auth.uid() = profile_id`
- UPDATE: admin uniquement (modification via `/admin/users/[id]`)
- DELETE: `auth.uid() = profile_id`

##### `user_professions`
- SELECT: tous les authentifiés
- INSERT: `auth.uid() = profile_id`
- UPDATE: admin uniquement
- DELETE: `auth.uid() = profile_id`

##### `activities`
- SELECT: tous les authentifiés (multi-select onboarding + profil)
- INSERT/UPDATE/DELETE: admin uniquement

##### `profile_activities`
- SELECT: tous les authentifiés
- INSERT: `auth.uid() = profile_id`
- DELETE: `auth.uid() = profile_id`
- UPDATE: **interdit** (pas de champ modifiable — PK composite)

##### `desired_study_fields`
- SELECT: tous les authentifiés (matching mentorat)
- INSERT: via **fonction RPC** — `auth.uid() = profile_id` + vérifie COUNT < 3
- UPDATE: **interdit** (changement = DELETE + INSERT via la RPC, garantit le respect du plafond de 3)
- DELETE: `auth.uid() = profile_id`

##### `notifications`
- SELECT: `auth.uid() = recipient_id`
- INSERT: via **trigger DB / fonction serveur** uniquement (jamais par l'utilisatrice directement)
- UPDATE (`is_read`): `auth.uid() = recipient_id`
- DELETE: `auth.uid() = recipient_id` (l'utilisatrice peut supprimer ses notifications)

##### `notification_preferences`
- SELECT: `auth.uid() = profile_id`
- INSERT: via **trigger DB** automatique à la création du profil (valeurs par défaut)
- UPDATE: `auth.uid() = profile_id`
- DELETE: **interdit**

##### `reports`
- SELECT: admin uniquement
- INSERT: tous les authentifiés
- UPDATE (`status`): admin uniquement
- DELETE: **interdit** (intégrité des signalements)

##### `blocked_users`
- SELECT: `auth.uid() = blocker_id`
- INSERT: via **fonction RPC** — `auth.uid() = blocker_id` + si un mentorat actif (`mentorship_sessions.status = 'active'`) existe entre les deux utilisatrices, la session est automatiquement annulée (`status: cancelled`) avant le blocage
- DELETE: `auth.uid() = blocker_id` (débloquer)
- UPDATE: **interdit** (pas de champ modifiable — PK composite)

##### `invitation_links`
- SELECT: `auth.uid() = inviter_id` OU admin
- INSERT: alumni active uniquement (`profiles.role = 'alumni' AND profiles.status = 'active'`)
- UPDATE (`is_revoked`): admin uniquement
- DELETE: **interdit** (historique traçable)

##### `push_subscriptions`
- SELECT: `auth.uid() = profile_id`
- INSERT: `auth.uid() = profile_id`
- DELETE: `auth.uid() = profile_id` (désabonnement)
- UPDATE: **interdit** (renouvellement = DELETE ancien + INSERT nouveau)

##### `admin_audit_log`
- SELECT: admin uniquement
- INSERT: via **trigger DB** uniquement (jamais par appel client)
- UPDATE: **interdit**
- DELETE: **interdit** (intégrité du journal)

##### `support_tickets`
- SELECT: `auth.uid() = author_id` (l'utilisatrice voit ses propres tickets) OU admin (voit tous les tickets)
- INSERT: toute utilisatrice authentifiée
- UPDATE (`status`, `assigned_to`, `admin_response`, `resolved_at`): admin uniquement
- DELETE: **interdit** (historique de support)

*RLS `admin_deactivation_votes` et `admin_deactivation_approvals` supprimées — tables retirées.*

#### Sanitisation & Validation
- Validation Zod sur tous les inputs frontend avant mutation
- Sanitisation HTML/XSS avec DOMPurify sur le contenu affiché (forum, DMs, bios)

#### Rate Limiting (Upstash Redis + sliding window)
Implémenté via middleware Next.js. Algorithme sliding window pour une précision maximale.

**Auth (par IP) :**
| Endpoint | Limite | Raison |
|---|---|---|
| Login (tentatives) | 5 / minute | Anti brute-force |
| Inscription | 3 / heure | Anti création de masse |
| Reset mot de passe | 3 / heure / email | Anti spam email |
| Code de vérification (disambiguation) | 3 / heure / email | Anti spam email |

**Forum (par utilisatrice authentifiée) :**
| Action | Limite | Raison |
|---|---|---|
| Créer un post | 5 / heure | Anti spam |
| Créer un commentaire | 20 / heure | Discussions actives |
| Réaction (like/heart/clap) | 30 / minute | Anti spam clics |
| Signalement | 10 / heure | Anti abus reports |

**DMs (par utilisatrice authentifiée) :**
| Action | Limite | Raison |
|---|---|---|
| Envoyer un message | 30 / minute | Chat fluide |
| Créer une conversation | 10 / heure | Anti harcèlement de masse |

**Compte & Sécurité (par utilisatrice authentifiée) :**
| Action | Limite | Raison |
|---|---|---|
| Changement de mot de passe | 3 / heure | Anti brute-force sur ancien mot de passe |
| Désactivation de compte | 1 / jour | Protection contre les clics accidentels |

**Uploads (par utilisatrice authentifiée) :**
| Action | Limite | Raison |
|---|---|---|
| Upload image (tous types) | 10 / heure | Anti abus stockage Supabase |
| Upload avatar | 3 / heure | Changements raisonnables |

**Mentorat & Invitations :**
| Action | Limite | Raison |
|---|---|---|
| Demande de mentorat | 5 / jour | Anti spam demandes |
| Ticket de support | 5 / jour | Anti spam tickets |
| Générer un lien d'invitation | 5 / jour | Contrôle croissance |

**Global :**
| Scope | Limite | Raison |
|---|---|---|
| Toute requête authentifiée | 100 / minute / utilisatrice | Filet de sécurité |
| Bulk actions admin | 10 / minute / admin | Anti erreurs de masse |

**Réponse en cas de dépassement :**
- HTTP `429 Too Many Requests` + header `Retry-After` (secondes)
- UI : toast "Trop de requêtes, réessayez dans X secondes"

#### Admin — Hiérarchie et gestion

**Super-Admin (LakouSystems) :**
- Compte ancré en DB (seed migration 006, username: `LakouSystems`, email: `lakousystems@gmail.com`)
- Non supprimable, non désactivable, identifié par `profiles.is_super_admin = true`
- **Pouvoirs exclusifs :**
  - Créer de nouveaux comptes admin via `/admin/users/create` (formulaire simplifié : prénoms, nom, email, username, mot de passe temporaire — pas d'onboarding)
  - Désactiver/réactiver un admin (action immédiate, pas de vote)
  - Réinitialiser le mot de passe d'un admin (génère un temporaire affiché une seule fois)
- Maximum **5 admins actifs** simultanément (hors LakouSystems). Vérifié par la Server Action de création.
- Toutes ses actions exclusives sont tracées dans l'audit log avec tag `super_admin_action`
- Badge **"Super-Admin"** dans le dashboard

**Admins (créés par LakouSystems) :**
- Créés directement via `/admin/users/create` — **NE PASSENT PAS par `/register`**
- Statut immédiatement `active`, `role: admin`
- `must_change_password = true` au premier login → redirigé vers `/auth/change-password`
- Mêmes pouvoirs que LakouSystems **SAUF** : ne peut pas créer/désactiver d'autres admins, ne peut pas reset les mots de passe admin
- Badge **"Admin"** dans le dashboard

**Sécurité admin :**
- Pas de flow d'auto-promotion : aucune utilisatrice ne peut devenir admin elle-même
- Connexion admin tracée dans l'audit log (`action: admin_login`)
- Session admin : vérification d'inactivité > 2h dans le layout admin (redirect vers `/login`)

**Gestion des comptes utilisatrices (inchangé) :**
- Inscription en `status: pending` par défaut, nécessite approbation admin (sauf via lien d'invitation)
- Suspension de compte (`status: suspended`) : bloque login + actions, réversible par admin
- Désactivation de compte (`status: deactivated`) : l'utilisatrice désactive elle-même son compte, réactivation nécessite approbation admin
- Pas de suppression définitive de compte
- `invitation_links` : INSERT par alumni active uniquement, SELECT par l'inviteur ou admin, UPDATE (révocation) par admin
- `admin_audit_log` : INSERT via **trigger DB** (PostgreSQL trigger AFTER sur les tables concernées, déclenché automatiquement lors d'actions admin — pas d'appel client, garantit l'intégrité même si le frontend est contourné). SELECT admins uniquement.
- `activities` CRUD : admin uniquement
##### `promo_elections`
- SELECT: membres de la promo (`auth.uid()` a le même `promo_id`)
- INSERT: tout membre de la promo (si aucune élection active en cours pour cette promo)
- UPDATE (`status`, `winner_id`): via **fonction serveur sécurisée** (clôture automatique)
- DELETE: **interdit** (historique des élections)

##### `promo_candidates`
- SELECT: membres de la promo
- INSERT: tout membre de la promo (pendant phase `nomination` uniquement)
- UPDATE (`vote_count`): via **trigger DB** uniquement (sur INSERT/DELETE `promo_votes`). `pitch` modifiable par la candidate (`auth.uid() = candidate_id`) pendant la phase `nomination`.
- DELETE: la candidate elle-même (`auth.uid() = candidate_id`, pendant phase `nomination` uniquement — retrait candidature)

##### `promo_votes`
- SELECT: **interdit** pour tous (votes anonymes — le décompte est visible via `promo_candidates.vote_count`)
- INSERT: tout membre de la promo (pendant phase `voting`, 1 vote max via contrainte UNIQUE)
- UPDATE: **interdit**
- DELETE: `auth.uid() = voter_id` (pendant phase `voting` uniquement — permet de changer de vote via DELETE + INSERT)

`promotions` UPDATE (`leader_id`): via **fonction serveur sécurisée** uniquement (après clôture élection)

#### Médias
- Pas de vidéos (contrôle coûts), images uniquement
- Compression et redimensionnement côté client avant upload

#### Contraintes d'upload d'images
| Upload | Formats acceptés | Taille max | Dimensions |
|---|---|---|---|
| Avatar | JPG, PNG, WebP | 2 MB | Redimensionné à 400x400px |
| Emblème promo | PNG, WebP | 1 MB | Redimensionné à 200x200px. SVG exclu (vecteur d'attaque XSS — peut contenir du JavaScript). |
| Image forum | JPG, PNG, WebP | 5 MB | Redimensionné à 1200px largeur max |
| Image DM | JPG, PNG, WebP | 5 MB | Redimensionné à 1200px largeur max |

#### Supabase Storage (Buckets)
| Bucket | Contenu | Accès lecture | Accès upload |
|---|---|---|---|
| `avatars` | Photos de profil | Public | Authentifié (propre profil uniquement) |
| `emblems` | Emblèmes de promotions | Public | Admin uniquement |
| `forum-images` | Images jointes aux posts | Public | Authentifié |
| `dm-images` | Images jointes aux DMs | Privé (participants de la conversation uniquement) | Authentifié |

### @Mentions
- L'utilisatrice tape `@` dans le forum ou commentaires → dropdown autocomplete avec usernames
- À la soumission, le backend parse le contenu, extrait les `@username`, résout les `profile_id`, crée les notifications de type `mention`
- Côté affichage, les `@username` sont rendus comme des liens cliquables vers le profil

### Dashboard Admin — Analytics & Graphiques
Bibliothèque de graphiques : **Recharts** (React, léger, responsive, compatible SSR).

#### KPIs (cartes en haut du dashboard)
- Total membres inscrits (toutes catégories)
- Nouvelles inscriptions (cette semaine / ce mois)
- Inscriptions en attente (pending)
- Taux d'engagement forum (posts + commentaires / membres actifs)

#### Graphiques — Démographie des membres
| Graphique | Type | Données |
|---|---|---|
| Répartition par rôle | Donut/Pie chart | Alumni vs S4 vs S1-S3 |
| Évolution des inscriptions | Line chart (temporel) | Nouvelles inscriptions par mois |
| Répartition par promotion | Bar chart horizontal | Nombre de membres par promotion |
| Nationalités | Bar chart | Top nationalités représentées |
| Pays de résidence | Carte/Bar chart | Où vivent les membres actuellement |
| Diaspora | Bar chart comparatif | Nationalités qui ont le plus quitté leur pays (nationalité vs pays de résidence différent) |

#### Graphiques — Parcours académique & professionnel
| Graphique | Type | Données |
|---|---|---|
| Domaines d'études | Treemap ou Bar chart | Répartition par domaine (Médecine, Droit, Informatique, etc.) |
| Type de parcours | Donut/Pie chart | Universitaire vs École professionnelle vs Autre |
| Universités fréquentées | Bar chart horizontal | Top universités les plus représentées |
| Niveaux d'études | Bar chart | Licence vs Master vs Doctorat vs Autre |
| Domaines d'études désirés (élèves) | Bar chart | Domaines les plus demandés par les S1-S4 |
| Professions | Word cloud ou Bar chart | Métiers les plus représentés chez les alumni |
| Filières au CMA | Donut/Pie chart | Répartition des filières d'origine |

#### Graphiques — Activité de la plateforme
| Graphique | Type | Données |
|---|---|---|
| Activité forum | Line chart (temporel) | Posts + commentaires par semaine |
| Tags les plus utilisés | Bar chart | Répartition des tags sur les posts forum |
| Messagerie | Line chart | Volume de DMs par semaine |
| Engagement par promo | Bar chart | Coins Promos les plus actifs |
| Signalements | Line chart | Évolution des reports par mois |

#### Graphiques — Mentorat
| Graphique | Type | Données |
|---|---|---|
| Mentorats actifs | KPI card | Nombre total de sessions en cours |
| Demandes en attente | KPI card | Nombre de requests pending |
| Taux d'acceptation | Donut/Pie chart | Demandes acceptées vs déclinées |
| Domaines les plus demandés | Bar chart | Domaines d'études les plus sollicités en mentorat |
| Top mentors | Bar chart horizontal | Alumni avec le plus de sessions (actives + terminées) |
| Évolution mentorat | Line chart (temporel) | Nouvelles demandes et sessions par mois |

#### Graphiques — Engagement & Rétention
| Graphique | Type | Données |
|---|---|---|
| DAU / MAU | Line chart (temporel) | Utilisatrices actives par jour / mois (basé sur `last_seen_at`) |
| Utilisatrices inactives | KPI card | Nombre de comptes actifs sans `last_seen_at` > 30 jours |
| Taux d'adoption push | Donut/Pie chart | % d'utilisatrices ayant activé les notifications push (`push_subscriptions`) |
| Activités parascolaires populaires | Bar chart horizontal | Top activités les plus sélectionnées (`profile_activities` + `activities`) |
| Réactions par type | Donut/Pie chart | Répartition like vs heart vs clap (`forum_reactions.emoji`) |
| Invitations — évolution | Line chart (temporel) | Liens générés, utilisés, révoqués par mois |
| Taux de modération | KPI card + Line chart | Posts/commentaires supprimés / total par mois (`is_deleted`) |
| Conversations actives | KPI card | Nombre de conversations avec messages dans les 7 derniers jours |
| Délai réponse mentorat | KPI card | Temps moyen entre `mentorship_requests.created_at` et `updated_at` (acceptation/déclin) |

#### Graphiques — Élections de promo
| Graphique | Type | Données |
|---|---|---|
| Élections tenues | KPI card | Nombre total d'élections terminées (`promo_elections.status = completed`) |
| Taux de participation | Bar chart horizontal | % de membres ayant voté par promo (votes / membres de la promo) |
| Candidatures par élection | Bar chart | Nombre moyen de candidates par élection |
| Promos sans chef | KPI card | Nombre de promos actives avec `leader_id IS NULL` |

#### Filtres globaux
- Période : 7j / 30j / 90j / 1 an / Tout
- Par promotion
- Par rôle (alumni / S4 / S1-S3)

#### Export des données
- Bouton "Exporter" sur chaque section du dashboard
- **PDF** : rapport statistique avec graphiques (pour la direction du collège)
- **CSV** : liste de membres filtrée, données par promotion, données brutes
- Génération côté client via jsPDF (PDF) et export CSV natif

#### Journal d'audit (`/admin/audit`)
- Log chronologique de toutes les actions admin
- Chaque entrée : admin, action, cible, détails, date
- Filtrable par admin, par type d'action, par période
- Non supprimable, non modifiable (intégrité garantie par RLS — INSERT only, pas de UPDATE/DELETE)

#### Suivi des invitations (`/admin/invitations`)
- Liste de tous les liens générés : qui a invité, quand, statut (utilisé/expiré/actif)
- Qui s'est inscrit via quel lien
- Top invitrices (alumni ayant généré le plus d'inscriptions)
- Possibilité de révoquer un lien actif

#### Gestion des activités parascolaires (`/admin/activities`)
- CRUD complet sur la table `activities`
- Voir combien de membres sont associés à chaque activité

#### Vue détaillée utilisatrice (`/admin/users/[id]`)
- Profil complet (toutes les données d'inscription) — **éditable par l'admin** :
  - Champs profil protégés (nom, promo, filière, nationalité, etc.) : modifiables directement
  - Parcours académiques (`user_education`) : ajout, modification, suppression
  - Métiers (`user_professions`) : ajout, modification, suppression
  - Activités parascolaires : ajout, suppression
  - Chaque modification est tracée dans l'audit log (action `update_profile`)
- Compteurs d'activité : posts, commentaires, DMs envoyés, réactions
- Signalements reçus et émis
- Date de dernière connexion
- Qui l'a invitée (si via lien d'invitation) + qui elle a invité
- Historique des actions admin sur ce compte (via audit log)
- **Si le compte est admin (super-admin uniquement) :**
  - Bouton "Réinitialiser le mot de passe" → génère un temporaire affiché une seule fois
  - Bouton "Révoquer l'accès admin" → `status: deactivated` immédiat + audit log
  - Bouton "Réactiver" → si admin désactivé, remet `status: active`

#### Actions en lot (Bulk Actions)
- `/admin/approvals` : checkboxes + "Approuver sélection" / "Rejeter sélection"
- `/admin/users` : checkboxes + "Suspendre sélection"
- Confirmation modale avant exécution
- Chaque action en lot est enregistrée dans l'audit log

### Chef de Promo (Rôle élu)

Le chef de promo est une utilisatrice élue par les membres de sa promotion au sein du Coin Promo. Ce n'est **pas un rôle dans l'enum `profiles.role`** — c'est une référence dynamique via `promotions.leader_id`.

#### Pouvoirs du chef de promo
- **Épingler / Désépingler** des posts dans le Coin Promo de sa promotion uniquement
- **Lancer une nouvelle élection** (pour passer le relais ou si la communauté le demande)
- Pas de pouvoir de modération (suppression de posts/commentaires) — ça reste réservé aux admins

#### Flow d'élection

1. **Lancement :** N'importe quelle membre de la promo peut lancer une élection (si aucune élection n'est déjà en cours pour cette promo). Bouton "Lancer une élection" dans le Coin Promo.

2. **Phase de candidature** (`status: nomination`, durée : 3 jours) :
   - Toute membre de la promo peut se porter candidate
   - La candidate peut ajouter un court message de candidature (pitch, max 300 caractères)
   - Elle peut retirer sa candidature avant la fin de la phase
   - Minimum 2 candidates requises pour passer au vote (sinon l'élection est annulée)

3. **Phase de vote** (`status: voting`, durée : 3 jours) :
   - Chaque membre de la promo a **1 vote**
   - Le vote est **anonyme** (la table `promo_votes` n'est jamais exposée en SELECT aux utilisatrices — seul le décompte est montré)
   - L'utilisatrice voit les candidates avec leur pitch et le nombre de votes actuel
   - Elle peut changer son vote pendant la phase de vote (DELETE ancien + INSERT nouveau)

4. **Clôture** (`status: completed`) :
   - Via fonction serveur sécurisée (cron ou trigger à `voting_end`)
   - La candidate avec le plus de votes gagne
   - En cas d'égalité : la candidate inscrite en premier sur la plateforme (`profiles.created_at` le plus ancien) gagne
   - `promotions.leader_id` est mis à jour automatiquement
   - `promo_elections.winner_id` est rempli
   - Notification envoyée à toute la promo

5. **Succession :**
   - Le chef de promo en poste peut lancer une nouvelle élection à tout moment (pour passer le relais)
   - N'importe quelle membre peut aussi lancer une élection (pas de protection du poste)
   - Le mandat n'a pas de durée fixe — il dure jusqu'à la prochaine élection

#### Notifications élection
| Événement | Destinataires | Type notification |
|---|---|---|
| Élection lancée | Toutes les membres de la promo | `election` |
| Phase de vote ouverte | Toutes les membres de la promo | `election` |
| Résultats / Nouveau chef élu | Toutes les membres de la promo | `election` |
| Élection annulée (< 2 candidates) | Toutes les membres de la promo | `election` |

### Mentorat (Feature dédiée)

Le mentorat est une feature à part entière, pas un simple filtre de l'annuaire.

#### Matching intelligent
- Algorithme de suggestion basé sur les `desired_study_fields` des élèves ↔ `user_education.study_field` des alumni
- Score de pertinence : domaine exact > domaine proche > même filière CMA
- Prise en compte du pays de résidence (bonus si même pays pour mentorat local)

#### Règle des 3 mentors maximum
- Une élève (S1-S4) peut avoir **au maximum 3 mentorats actifs** simultanément
- N'importe quelle alumni (`status: active`) peut accepter une demande de mentorat
- Une alumni peut mentorer **plusieurs élèves** sans limite
- Vérification du plafond de 3 côté serveur avant création de session

#### Tables spécifiques au mentorat

##### `mentorship_requests` (NOUVELLE)
| Champ | Type | Description |
|---|---|---|
| `id` | UUID, PK | — |
| `mentee_id` | UUID, FK profiles | Élève qui demande un mentorat |
| `mentor_id` | UUID, FK profiles, NULLABLE | Alumni ciblée (NULL = demande ouverte à toutes les alumni du domaine) |
| `message` | TEXT | Message de présentation de l'élève (max 1000 caractères) |
| `study_field` | TEXT | Domaine d'études pour lequel l'élève cherche un mentorat |
| `status` | ENUM (pending, accepted, declined) | Statut de la demande |
| `created_at` | TIMESTAMPTZ | — |
| `updated_at` | TIMESTAMPTZ, DEFAULT NOW() | — |

##### `mentorship_sessions` (NOUVELLE — suivi des mentorats actifs)
| Champ | Type | Description |
|---|---|---|
| `id` | UUID, PK | — |
| `request_id` | UUID, FK mentorship_requests | Demande d'origine |
| `mentor_id` | UUID, FK profiles | — |
| `mentee_id` | UUID, FK profiles | — |
| `status` | ENUM (active, completed, cancelled) | Statut du mentorat |
| `started_at` | TIMESTAMPTZ | Date de début |
| `ended_at` | TIMESTAMPTZ, NULLABLE | Date de fin |
| `created_at` | TIMESTAMPTZ | — |

#### Flow mentorat
1. L'élève consulte `/mentorship` → voit les alumni suggérées (matching par domaine d'études)
2. Elle peut parcourir les profils, filtrer par domaine, université, pays
3. Elle envoie une **demande de mentorat** — soit ciblée (à une alumni précise), soit ouverte (visible par toutes les alumni du domaine)
4. L'alumni (ou n'importe quelle alumni si demande ouverte) reçoit une notification `mentorship` et peut accepter ou décliner
5. **Si acceptée** → via **fonction serveur sécurisée** :
   - Vérifie que l'élève n'a pas déjà 3 mentorats actifs
   - Crée la `mentorship_session` (INSERT)
   - Ouvre automatiquement une conversation DM entre mentor et mentee
   - Notifie l'élève de l'acceptation
6. Le mentorat peut être marqué comme "terminé" par l'une ou l'autre partie
7. Un mentorat terminé libère une place dans le quota de 3 de l'élève

#### RLS mentorat

##### `mentorship_requests`
- SELECT: `auth.uid() = mentee_id OR auth.uid() = mentor_id`, ou toute alumni si `mentor_id IS NULL` (demande ouverte), ou admin (analytics dashboard)
- INSERT: élèves uniquement (`role IN (s4, student)`), vérifie quota < 3 sessions actives
- UPDATE (`status`): toute alumni (`role = alumni`) si demande ouverte, ou `auth.uid() = mentor_id` si ciblée
- DELETE: `auth.uid() = mentee_id` uniquement si `status = 'pending'` (annuler une demande en attente). Demandes acceptées/déclinées non supprimables (historique). **Les demandes ouvertes (`mentor_id IS NULL`) n'expirent pas** — elles restent visibles dans le hub mentorat jusqu'à ce que la mentee les supprime manuellement ou qu'une alumni les accepte.

##### `mentorship_sessions`
- SELECT: `auth.uid() = mentor_id OR auth.uid() = mentee_id` OU admin (analytics dashboard)
- INSERT: via **fonction serveur sécurisée** uniquement (après acceptation, vérifie quota de 3)
- UPDATE (`status`): participants uniquement (marquer completed/cancelled)
- DELETE: **interdit** (historique des mentorats)

### Accès à `/promo` selon le rôle

| Rôle | `promo_id` | Accès `/promo` | Badge affiché |
|---|---|---|---|
| **Alumni** (avec promo) | Renseigné | Coin Promo complet (posts, élection, épinglage si chef) | Emblème de la promotion |
| **S4** | Renseigné | Coin Promo complet | Emblème de la promotion |
| **S1-S3** | NULL | Page spéciale affichant leur cohorte : année d'entrée (`enrollment_date`) → année actuelle. Pas de Coin Promo classique. | Badge spécial **"Graine de CMA [année début]-[année actuelle]"** (ex: "Graine de CMA 2024-2026") |
| **Alumni** (sans promo — promo rejetée/nettoyée) | NULL | Message : "Vous n'êtes pas encore liée à une promotion. Contactez un admin." Lien masqué dans la nav. | Aucun |

Les S1-S3 voient une page d'accueil allégée à `/promo` avec :
- Leur badge "Graine de CMA" avec leurs années
- Un message d'encouragement
- Un aperçu de la vie des promotions (lecture seule des posts publics du mur global liés aux promos)
- Pas d'accès aux Coins Promos des S4/alumni (cloisonnement RLS maintenu)

### Forum "Bourses & Opportunités"
Espace dédié distinct du mur global, spécifiquement pour les bourses d'études, offres de stage, et opportunités professionnelles.

- Route dédiée : `/opportunities`
- Fonctionne comme le forum global mais filtré sur un tag système "Bourses & Opportunités"
- **Visibilité exclusive** : les posts tagués "Bourses & Opportunités" apparaissent **uniquement** dans `/opportunities`, pas dans le mur global `/feed`. Cela évite la double visibilité et la double notification.
- Accessible à toutes les utilisatrices authentifiées
- Les alumni peuvent poster des opportunités qu'elles connaissent
- Les élèves peuvent poster des demandes d'aide pour trouver des bourses
- Posts épinglables par l'admin (bourses récurrentes, deadlines importantes)
- La notification `new_opportunity` est envoyée aux élèves S1-S4 car elles ne consultent pas forcément `/opportunities` régulièrement

### Activités parascolaires — Multi-select
- L'admin gère la liste des activités disponibles via `/admin/activities` (CRUD)
- À l'inscription (étape 2 alumni), l'utilisatrice sélectionne ses activités via un **multi-select** alimenté par la table `activities`
- L'utilisatrice peut ajouter des activités à son profil après l'inscription (ajout libre)
- Affichage sur le profil sous forme de badges/tags

### Expiration des promotions `pending`

Les promotions créées en `pending` lors de l'onboarding expirent automatiquement **après 3 jours** si l'admin n'a pas agi (ni approuvé ni rejeté). Via **cron job / Edge Function** :
- La promo passe en `status: rejected`
- Le flow de rejet ci-dessous se déclenche (notification + délai de grâce + désactivation)
- L'admin voit les promos expirées dans le dashboard avec un indicateur "Expirée (auto-rejetée)"

### Rejet d'une promotion `pending`

Quand l'admin rejette une promotion (`status: pending` → `status: rejected`), un processus automatique se déclenche :

1. **Notification immédiate** : Toutes les utilisatrices dont `promo_id` pointe vers la promo rejetée reçoivent une notification `promo_rejected` :
   > "La promotion [nom] a été rejetée. Si cette promotion existe réellement, contactez un admin dans les 3 jours. Passé ce délai, votre compte sera suspendu puis désactivé."

2. **Suspension immédiate** : Les comptes concernés passent en `status: suspended` (ne peuvent plus poster ni interagir, mais peuvent toujours contacter un admin).
   - Notification `account_suspended` envoyée
   - L'admin peut corriger le `promo_id` depuis `/admin/users/[id]` et réactiver le compte

3. **Après 3 jours** (via **cron job / Supabase Edge Function planifiée**) :
   - Les profils encore liés à la promo rejetée et toujours en `status: suspended` passent en `status: deactivated`
   - Leur `promo_id` est remis à NULL
   - Notification `account_deactivated` envoyée
   - Chaque action est tracée dans l'audit log (action `deactivate_user`, details: `{"reason": "promo_rejected_timeout", "promo_name": "..."}`)

4. **La promo rejetée reste en DB** (historique traçable) mais n'apparaît plus dans les dropdowns de l'onboarding ni dans l'annuaire.

### Transitions de rôles (Cycle de vie des utilisatrices)

Le passage d'une classe/rôle à l'autre est géré par l'admin depuis `/admin/users/[id]` à chaque rentrée scolaire.

#### S1 → S2 → S3 (progression annuelle)
- **Déclencheur :** Admin, en début d'année scolaire
- **Champs modifiés :** `profiles.class` (S1→S2, S2→S3)
- **Champs auto-recalculés :** `profiles.expected_end_date` (recalculé selon la nouvelle classe)
- **Accès :** Aucun changement (pas de Coin Promo, mêmes features)
- **Comptes non renouvelés :** Si une élève ne revient pas au collège, l'admin désactive son compte (`status: deactivated`)

#### S3 → S4 (passage en finissante)
- **Déclencheur :** Admin, en début d'année scolaire
- **Champs modifiés :**
  - `profiles.role` : `student` → `s4`
  - `profiles.class` : remis à NULL (plus pertinent en S4)
  - `profiles.promo_id` : attribué par l'admin (la promo de l'année)
  - `profiles.promo_start_date` : renseigné par l'admin
  - `profiles.filiere` : attribué par l'admin (select parmi SVT, SES, SMP, Section A-D)
  - `profiles.expected_end_date` : remis à NULL (remplacé par `promotions.end_date`)
- **Nouveaux accès :** Coin Promo, élection chef de promo, épinglage (si élue)
- **Notification :** `admin` → l'élève est notifiée de son passage en S4

#### S4 → Alumni (fin de scolarité)
- **Déclencheur :** Admin, après la remise des diplômes / fin d'année
- **Champs modifiés :**
  - `profiles.role` : `s4` → `alumni`
- **Champs NON modifiés :** `promo_id`, `promo_start_date`, `filiere` restent (l'alumni garde sa promo)
- **Nouveaux accès ouverts :** L'ancienne S4 peut maintenant :
  - Ajouter ses parcours académiques (`user_education`) **directement sans passer par l'admin**
  - Ajouter ses métiers (`user_professions`) **directement sans passer par l'admin**
  - Générer des liens d'invitation
  - Accepter des demandes de mentorat
- **Accès conservé :** Coin Promo (elle y reste en tant qu'alumni de cette promo)
- **Notification :** `admin` → l'utilisatrice est notifiée de son passage en alumni

#### Actions en lot (rentrée scolaire)
L'admin peut utiliser les **bulk actions** depuis `/admin/users` pour :
- Promouvoir toutes les S3 en S4 d'un coup (avec attribution de promo + filière)
- Promouvoir toutes les S4 en alumni d'un coup
- Faire progresser S1→S2 et S2→S3 en lot
- Désactiver les comptes des élèves qui ne reviennent pas

Chaque transition est tracée dans l'audit log (action `update_profile`).

### Clauses ON DELETE (Intégrité référentielle)

Chaque FK doit spécifier son comportement de suppression. Voici la liste exhaustive :

#### CASCADE (suppression en chaîne)
| FK | Table enfant → Table parent | Raison |
|---|---|---|
| `forum_comments.post_id` → `forum_posts.id` | Si un post est hard-deleted (purge admin), ses commentaires le sont aussi |
| `forum_reactions.post_id` → `forum_posts.id` | Réactions supprimées avec le post |
| `forum_reactions.comment_id` → `forum_comments.id` | Réactions supprimées avec le commentaire |
| `direct_messages.conversation_id` → `conversations.id` | Messages supprimés quand la conversation est purgée |
| `promo_votes.promo_candidate_id` → `promo_candidates.id` | Votes supprimés si la candidate retire sa candidature |
| `promo_candidates.election_id` → `promo_elections.id` | Candidatures supprimées si l'élection est purgée (ne devrait pas arriver — DELETE interdit) |
| `promo_votes.election_id` → `promo_elections.id` | Idem |
| `profile_activities.activity_id` → `activities.id` | Liaison supprimée si l'activité est supprimée par admin |
| `profile_activities.profile_id` → `profiles.id` | Idem |
| ~~`admin_deactivation_approvals.vote_id`~~ | *Table supprimée* |
| `notification_preferences.profile_id` → `profiles.id` | Préférences supprimées si profil purgé |
| `push_subscriptions.profile_id` → `profiles.id` | Subscriptions supprimées si profil purgé |
| `desired_study_fields.profile_id` → `profiles.id` | Domaines désirés supprimés si profil purgé |
| `user_education.profile_id` → `profiles.id` | Parcours académiques supprimés si profil purgé |
| `user_professions.profile_id` → `profiles.id` | Métiers supprimés si profil purgé |
| `blocked_users.blocker_id` → `profiles.id` | Blocages supprimés si profil purgé |
| `blocked_users.blocked_id` → `profiles.id` | Idem |
| `forum_comments.parent_id` → `forum_comments.id` | Réponses supprimées si commentaire parent hard-deleted (threading à 1 niveau) |

#### SET NULL (référence remise à NULL)
| FK | Table enfant → Table parent | Raison |
|---|---|---|
| `forum_posts.author_id` → `profiles.id` | Si un profil est purgé, les posts restent mais apparaissent comme "Utilisatrice supprimée" |
| `forum_comments.author_id` → `profiles.id` | Idem |
| `forum_reactions.user_id` → `profiles.id` | Idem |
| `direct_messages.sender_id` → `profiles.id` | Messages restent lisibles mais sender anonymisé |
| `notifications.recipient_id` → `profiles.id` | Notifications orphelines nettoyées par cron |
| `reports.reporter_id` → `profiles.id` | Signalement reste mais reporter anonymisé |
| `reports.reported_user_id` → `profiles.id` | Idem |
| `invitation_links.used_by` → `profiles.id` | Lien reste traçable mais inscrite anonymisée |
| `mentorship_requests.mentor_id` → `profiles.id` | Demande ouverte si le mentor est purgé |
| `mentorship_requests.mentee_id` → `profiles.id` | Demande anonymisée si mentee purgée |
| `mentorship_sessions.mentor_id` → `profiles.id` | Session anonymisée si mentor purgé |
| `mentorship_sessions.mentee_id` → `profiles.id` | Session anonymisée si mentee purgée |
| `promotions.leader_id` → `profiles.id` | Promo perd son chef, nouvelle élection nécessaire |
| `promo_elections.initiated_by` → `profiles.id` | Élection reste mais initiatrice anonymisée |
| `promo_elections.winner_id` → `profiles.id` | Résultat anonymisé |
| `promo_candidates.candidate_id` → `profiles.id` | Candidature anonymisée |
| `promo_votes.voter_id` → `profiles.id` | Vote anonymisé (déjà anonyme par design) |
| `invitation_links.inviter_id` → `profiles.id` | Lien reste traçable mais invitatrice anonymisée |
| `admin_audit_log.admin_id` → `profiles.id` | Action auditée reste mais admin anonymisé |
| ~~`admin_deactivation_votes.*`~~ | *Tables supprimées* |
| `reports.reviewed_by` → `profiles.id` | Signalement traité reste mais reviewer anonymisé |
| `reports.reported_post_id` → `forum_posts.id` | Signalement reste mais référence post anonymisée si hard-deleted |
| `reports.reported_comment_id` → `forum_comments.id` | Idem pour commentaires |
| `reports.reported_message_id` → `direct_messages.id` | Idem pour DMs (purge possible) |
| `support_tickets.author_id` → `profiles.id` | Ticket anonymisé si profil purgé |
| `support_tickets.assigned_to` → `profiles.id` | Ticket non assigné si admin purgé |

#### RESTRICT (blocage — empêche la suppression du parent)
| FK | Table enfant → Table parent | Raison |
|---|---|---|
| `profiles.promo_id` → `promotions.id` | Impossible de supprimer une promo qui a des membres (admin doit d'abord réassigner ou dissocier) |
| `forum_posts.tag_id` → `forum_tags.id` | Impossible de supprimer un tag utilisé par des posts |
| `forum_posts.promo_id` → `promotions.id` | Impossible de supprimer une promo qui a des posts dans son Coin Promo |
| `promo_elections.promo_id` → `promotions.id` | Impossible de supprimer une promo qui a des élections (historique) |
| `mentorship_sessions.request_id` → `mentorship_requests.id` | Impossible de supprimer une demande qui a une session active (la demande peut être supprimée seulement si `status = pending`) |
| `conversations.participant_1/2` → `profiles.id` | Impossible de purger un profil qui a des conversations non supprimées |

**Note :** En pratique, les profils ne sont jamais hard-deleted (pas de suppression définitive). Les clauses SET NULL et RESTRICT sur `profiles` sont des filets de sécurité en cas d'opération directe en DB.

### Déclencheurs de notifications (exhaustif)

| Événement | Type notification | Destinataires |
|---|---|---|
| Nouveau DM reçu | `dm` | Receiver du message |
| Commentaire sur un post dont on est l'auteur | `forum_reply` | Auteur du post |
| Commentaire sur un post qu'on a déjà commenté | `forum_comment_reply` | Toutes les utilisatrices ayant commenté ce post (sauf auteur du nouveau commentaire) |
| Réaction sur son post | `reaction` | Auteur du post |
| Réaction sur son commentaire | `reaction` | Auteur du commentaire |
| @mention dans un post ou commentaire | `mention` | Utilisatrice mentionnée |
| Post supprimé par admin (modération) | `admin` | Auteur du post supprimé |
| Commentaire supprimé par admin | `admin` | Auteur du commentaire supprimé |
| Profil modifié par admin (champs protégés) | `admin` | Utilisatrice dont le profil est modifié |
| Parcours académique/métier modifié par admin | `admin` | Utilisatrice concernée |
| Promo réassignée par admin | `admin` | Utilisatrice dont la promo change |
| Élection annulée par admin | `admin` | Toutes les membres de la promo |
| Compte approuvé par admin | `account_approved` | Utilisatrice approuvée |
| Promotion rejetée (délai de grâce 3j) | `promo_rejected` | Utilisatrices liées à la promo rejetée |
| Transition de rôle (S→S4, S4→Alumni, etc.) | `admin` | Utilisatrice dont le rôle change |
| Compte suspendu par admin | `account_suspended` | Utilisatrice suspendue |
| Compte réactivé par admin | `account_reactivated` | Utilisatrice réactivée |
| Demande de mentorat ciblée reçue | `mentorship` | Alumni ciblée (`mentor_id`) |
| Demande de mentorat ouverte postée | `mentorship` | **Top 5 alumni** les mieux matchées par domaine (pas toutes — anti-spam). Les autres voient la demande dans le hub `/mentorship` sans notification. |
| Demande de mentorat acceptée / déclinée | `mentorship` | Mentee (réponse à sa demande) |
| Mentorat marqué comme terminé | `mentorship_completed` | L'autre participant(e) |
| Inscription via lien d'invitation | `invitation_used` | Alumni qui a généré le lien |
| Élection (lancement, vote ouvert, résultats, annulation) | `election` | Toutes les membres de la promo |
| Post épinglé | `post_pinned` | Auteur du post épinglé |
| Nouveau post dans "Bourses & Opportunités" | `new_opportunity` | Toutes les élèves actuelles (S1-S4) |
| Nouveau ticket de support soumis | `admin` | Tous les admins |
| Réponse admin à un ticket de support | `support_reply` | Auteur du ticket |

### Index de base de données

#### Index GIN (Full-Text Search)
Documentés dans la section Full-Text Search ci-dessous.

#### Index BTREE (Performance des requêtes courantes)

##### Clés étrangères à fort trafic
| Table | Colonne(s) | Raison |
|---|---|---|
| `forum_posts` | `promo_id` | Chargement du Coin Promo — filtre sur chaque visite |
| `forum_posts` | `tag_id` | Page `/opportunities` — filtre par tag système |
| `forum_posts` | `author_id` | Profil utilisatrice — "ses posts" |
| `forum_comments` | `post_id` | Chargement des commentaires d'un post |
| `forum_comments` | `author_id` | Profil utilisatrice — "ses commentaires" |
| `forum_reactions` | `post_id` | Compteur de réactions par post |
| `forum_reactions` | `comment_id` | Compteur de réactions par commentaire |
| `direct_messages` | `conversation_id` | Chargement des messages d'une conversation |
| `notifications` | `recipient_id` | Liste des notifications de l'utilisatrice |
| `mentorship_requests` | `mentee_id` | Liste des demandes envoyées + vérification quota |
| `mentorship_requests` | `mentor_id` | Liste des demandes reçues |
| `mentorship_sessions` | `mentee_id` | Vérification quota 3 sessions actives |
| `user_education` | `profile_id` | Chargement du profil / annuaire |
| `user_professions` | `profile_id` | Idem |
| `desired_study_fields` | `profile_id` | Idem + matching mentorat |
| `profile_activities` | `profile_id` | Idem |
| `invitation_links` | `inviter_id` | Dashboard admin — suivi invitations |
| `admin_audit_log` | `admin_id` | Filtrage audit log par admin |
| `promo_candidates` | `election_id` | Chargement des candidates d'une élection |
| `promo_elections` | `promo_id` | Vérification élection active pour une promo |
| `support_tickets` | `author_id` | Liste des tickets d'une utilisatrice |
| `support_tickets` | `status` | Filtrage par statut dans le dashboard admin |
| `support_tickets` | `assigned_to` | Filtrage par admin assigné |

##### Index composites (pagination cursor-based)
| Table | Colonne(s) | Raison |
|---|---|---|
| `forum_posts` | `(created_at DESC, id)` | Pagination cursor-based du feed |
| `forum_posts` | `(promo_id, created_at DESC, id)` | Pagination Coin Promo |
| `forum_comments` | `(post_id, created_at ASC, id)` | Pagination commentaires d'un post |
| `direct_messages` | `(conversation_id, created_at DESC, id)` | Pagination messages d'une conversation |
| `notifications` | `(recipient_id, created_at DESC, id)` | Pagination notifications |
| `admin_audit_log` | `(created_at DESC, id)` | Pagination audit log |
| `conversations` | `(last_message_at DESC, id)` | Tri de la liste des conversations |

##### Index de filtre courant
| Table | Colonne(s) | Raison |
|---|---|---|
| `profiles` | `status` | Filtre global sur toutes les requêtes authentifiées |
| `profiles` | `role` | Matching mentorat (filtre alumni), dashboard analytics |
| `profiles` | `username` | Lookup login par username (déjà UNIQUE donc indexé) |
| `profiles` | `(first_name, last_name)` | Lookup login par nom complet |
| `profiles` | `last_seen_at` | Analytics DAU/MAU |
| `forum_posts` | `is_deleted` | Filtre soft delete sur chaque SELECT |
| `forum_comments` | `is_deleted` | Idem |
| `mentorship_sessions` | `(mentee_id, status)` | Vérification quota : COUNT WHERE status = 'active' |

**Note :** Les colonnes avec contrainte UNIQUE (`profiles.username`, `invitation_links.token`, `promotions.name`, etc.) sont automatiquement indexées par PostgreSQL.

### Full-Text Search

#### Annuaire
- Colonne `search_vector` (TSVECTOR) sur `profiles`, indexée via GIN
- Alimentée par un trigger PostgreSQL qui combine : `first_name`, `last_name`, `username`, `nationality`, `country`, `filiere`
- Les données de `user_education` et `user_professions` sont jointes à la recherche via des sous-requêtes
- Côté SDK Supabase : utilisation de `.textSearch()` pour les requêtes

#### Forum
- Colonne `search_vector` (TSVECTOR) sur `forum_posts`, indexée via GIN
- Alimentée par un trigger PostgreSQL sur `content`
- Permet de rechercher des posts par mots-clés dans le mur global et les Coins Promos
- Les RLS s'appliquent toujours (une recherche dans un Coin Promo ne retourne que les posts de la promo de l'utilisatrice)

### Seed Super-Admin (Migration 006)
- Créer le user dans `auth.users` (email: `lakousystems@gmail.com`, password: `@LakouSystems2026|`)
- Créer le profil dans `profiles` (username: `LakouSystems`, role: `admin`, status: `active`, is_super_admin: `true`, is_profile_complete: `true`, must_change_password: `false`)
- Créer les `notification_preferences` par défaut
- Ajouter les champs `is_super_admin` et `must_change_password` à la table `profiles`
- Supprimer les tables `admin_deactivation_votes` et `admin_deactivation_approvals`
- Supprimer le trigger `trg_check_admin_deactivation` et la fonction `check_admin_deactivation_threshold`

### Emails personnalisés
- Templates Supabase Auth customisés avec branding CMA (logo, couleurs, ton)
- Templates requis : vérification email, reset mot de passe, confirmation de changement d'email
- Configuration via le dashboard Supabase (Auth > Email Templates)

### Dark Mode
- Toggle dans les settings du profil (clair / sombre / système)
- Respect de `prefers-color-scheme` par défaut
- Implémentation via classe `dark` sur `<html>` — shadcn/ui supporte les deux thèmes nativement
- Préférence sauvegardée en `localStorage` + champ `theme_preference` optionnel sur `profiles`

### Limites de caractères (validées par Zod)
| Champ | Min | Max |
|---|---|---|
| `username` | 3 | 20 (alphanumérique + underscore uniquement) |
| `first_name` | 1 | 100 (lettres, espaces, tirets, accents, apostrophes) |
| `last_name` | 1 | 100 (lettres, espaces, tirets, accents, apostrophes) |
| `nationality` | 1 par entrée | 100 par entrée (tableau, max 5 nationalités — lettres, espaces, tirets, accents) |
| `country` | 1 | 100 (lettres, espaces, tirets, accents) |
| `filiere` | — | — (select contraint : SVT, SES, SMP, Section A, Section B, Section C, Section D — un seul choix autorisé) |
| `class` | — | — (dropdown contraint : S1, S2, S3) |
| `bio` | — | 300 |
| `institution_name` | 1 | 200 (texte libre — noms d'universités internationaux avec accents, tirets, apostrophes) |
| `study_field` | 1 | 150 |
| `degree_level` | 1 | 100 |
| `title` (profession) | 1 | 150 |
| `company` | 1 | 200 |
| `field_name` (desired) | 1 | 150 |
| `name` (activité) | 1 | 100 |
| `name` (forum_tag) | 1 | 50 |
| `color` (forum_tag) | 4 | 9 (format hex : #RGB à #RRGGBBAA) |
| `name` (promotion) | 1 | 150 |
| `content` (notification) | 1 | 500 |
| `forum_posts.content` | 1 | 2000 |
| `forum_comments.content` | 1 | 500 |
| `direct_messages.content` | 1 | 1000 |
| `reports.reason` | 10 | 500 |
| `mentorship_requests.message` | 10 | 1000 |
| `promo_candidates.pitch` | — | 300 |
| `reports.admin_note` | — | 500 |
| `support_tickets.subject` | 5 | 150 |
| `support_tickets.message` | 20 | 2000 |
| `support_tickets.admin_response` | 1 | 2000 |

**Règle de validation texte :** Tous les champs texte ci-dessus acceptent les caractères Unicode (accents, cédilles, trémas), les tirets (`-`), les apostrophes (`'`), les espaces, et les points. Les caractères HTML/JS dangereux (`<`, `>`, `script`) sont rejetés par Zod + sanitisés par DOMPurify à l'affichage.

### SEO / Meta Tags
- Utilisation de `generateMetadata()` Next.js App Router pour les meta tags dynamiques
- Open Graph + Twitter Card sur les pages de profil et posts forum partagés
- Balises structurées : titre, description, image (avatar ou emblème selon la page)

---

### Déploiement & Environnements

#### Environnements
| Environnement | Frontend | Backend | Usage |
|---|---|---|---|
| **Dev** | `next dev` (localhost) | Supabase local (`supabase start`) | Développement quotidien |
| **Preview** | Branch Vercel automatique | Projet Supabase staging | Review / QA avant merge |
| **Prod** | Vercel production | Supabase production | Utilisatrices réelles |

#### Déploiement
- **Hébergement:** Vercel (intégration native Next.js)
- CI/CD automatique via Git push
- Preview deployments automatiques sur chaque PR

### Monitoring & Error Tracking
- **Sentry** intégré à Next.js (capture automatique erreurs frontend + API routes)
- Alertes email/Slack sur erreurs critiques en production
- Source maps uploadées à Sentry pour des stack traces lisibles

### Flow d'entrée dans l'application

#### Séquence d'arrivée (première visite ou session expirée)
1. **Animation d'ouverture** (splash screen — voir section Identité Visuelle) : ~2.5-3s, skippable
2. **Transition fluide** vers la **page de login** (`/`) :
   - Le logo réduit se positionne en haut de la page
   - Le formulaire de login apparaît en fade-in, centré, sur un fond élégant bordeaux/blanc
   - Design clean et minimaliste : logo CMA en haut, champ identifiant, champ mot de passe, bouton "Se connecter" (bordeaux), lien "Mot de passe oublié ?"
   - En bas du formulaire : "Pas encore de compte ? **S'inscrire**" → redirige vers `/register`
   - Couleurs : fond blanc cassé, accents bordeaux et or, typographie sobre
3. **Après login réussi** → redirection vers la **page d'accueil** (`/feed`)

#### Page d'accueil (`/feed`) — Design
Design clean, minimaliste et professionnel respectant la palette bordeaux/vert/or.

**Structure :**
- **Header fixe** : logo CMA (petit, à gauche), barre de recherche (centre), avatar utilisatrice + notifications (droite)
- **Navigation mobile (bottom bar)** :
  ```
  [ Feed ] [ Annuaire ] [ + ] [ Messages ] [ Profil ]
  ```
  Le `+` central ouvre un menu rapide (nouveau post, nouvelle conversation, demande mentorat). Badges compteurs sur Messages et Profil (notifications non-lues).
- **Navigation desktop (sidebar gauche)** : liens verticaux avec icônes — Feed, Annuaire, Coin Promo, Mentorat, Bourses & Opportunités, Messages, Support
- **Zone principale (centre)** :
  - Compteur de membres inscrits dynamique (animé au chargement, style KPI avec icône — ex: "247 membres de la famille CMA")
  - Barre de création de post rapide ("Quoi de neuf ?" + avatar)
  - Flux des posts (infinite scroll)
- **Sidebar droite (desktop uniquement)** :
  - Carte profil résumé (avatar, nom, @username, promo, badge)
  - Suggestions de mentorat (2-3 alumni matchées)
  - Dernières opportunités (2-3 posts récents de Bourses & Opportunités)
  - Événements / posts épinglés

**Principes de design :**
- Espaces blancs généreux (pas de surcharge visuelle)
- Cartes arrondies avec ombres subtiles pour les posts
- Bordeaux pour les actions primaires (boutons, liens actifs)
- Vert pour les indicateurs positifs (succès, en ligne, badges)
- Or pour les éléments premium (emblèmes de promo, badges spéciaux)
- Gris clair pour les fonds de cartes et séparateurs
- Typographie : sans-serif moderne (Inter ou similaire), hiérarchie claire

#### Footer global (présent sur toutes les pages)
- **Colonne 1 — CMA Connect** : logo petit + slogan + compteur membres
- **Colonne 2 — Contact** : email de l'équipe informatique du collège + formulaire de support (`/support`)
- **Colonne 3 — Réseaux sociaux** : liens vers les comptes officiels du Collège Marie-Anne (Facebook, Instagram, LinkedIn, etc.)
- **Colonne 4 — Témoignages alumni** : 2-3 citations courtes rotatives d'anciennes élèves (stockées en dur côté frontend pour le v1, éditables par l'admin en v2)
- **Barre du bas** : © CMA Connect [année] — Liens vers CGU (`/legal/terms`) et Politique de confidentialité (`/legal/privacy`)

Design : fond bordeaux foncé, texte blanc/or clair, séparateur doré fin en haut.

### États vides (Empty States)
Chaque section vide affiche une illustration CMA + un message guide + un CTA pour orienter l'utilisatrice.

| Section | Message | CTA |
|---|---|---|
| Feed (0 posts) | "Soyez la première à partager quelque chose !" | Bouton "Créer un post" |
| Messages (0 conversations) | "Commencez une conversation avec une membre" | Lien vers l'annuaire |
| Notifications (0) | "Rien pour l'instant — vous serez notifiée ici" | Aucun (illustration seule) |
| Mentorat — élève (0 demandes) | "Trouvez une mentor dans votre domaine" | Bouton "Parcourir les mentors" |
| Mentorat — alumni (0 demandes reçues) | "Aucune demande de mentorat pour l'instant" | Lien vers les demandes ouvertes |
| Coin Promo (0 posts) | "Votre Coin Promo est tout neuf — lancez la discussion !" | Bouton "Créer un post" |
| Coin Promo (pas de chef) | "Votre promo n'a pas encore de chef. Lancez une élection !" | Bouton "Lancer une élection" |
| Annuaire (0 résultats recherche) | "Aucune membre ne correspond à votre recherche" | Lien "Réinitialiser les filtres" |
| Bourses & Opportunités (0 posts) | "Aucune opportunité publiée pour l'instant" | Bouton "Partager une opportunité" (si alumni) |
| Support (0 tickets) | "Vous n'avez pas encore de demande de support" | Bouton "Créer un ticket" |
| Utilisatrices bloquées (0) | "Vous n'avez bloqué personne" | Aucun |

Design : illustration minimaliste aux couleurs CMA (bordeaux/or), texte centré, CTA en bouton bordeaux. Cohérent visuellement avec les pages d'erreur brandées.

### Accessibilité (a11y)
- **Base :** shadcn/ui bâti sur Radix UI (composants accessibles par défaut — ARIA, focus management, keyboard navigation)
- **Contraste :** WCAG AA minimum sur toutes les combinaisons de couleurs (clair + sombre)
- **Navigation clavier :** complète sur tous les éléments interactifs (formulaires, forum, DMs, navigation)
- **Focus visible :** outline clair sur tous les éléments focusables
- **Labels ARIA :** sur tous les éléments interactifs sans texte visible (icônes, boutons d'action)
- **Textes alternatifs :** sur toutes les images (avatars, emblèmes, images forum)

### Structure des Routes (Next.js App Router)

#### Pages publiques (non-authentifié)
```
/                         → Page de login (après animation d'ouverture)
/register                 → Wizard d'inscription (multi-étapes)
/register/invite/[token]  → Inscription via lien d'invitation alumni
/login                    → Login (username, email ou nom complet + mdp)
/forgot-password          → Reset mot de passe
/pending                  → Écran d'attente approbation admin
/auth/verify-email        → Callback de vérification email (traite le token Supabase Auth, affiche confirmation)
/auth/reset-password      → Callback de reset mot de passe (formulaire nouveau mot de passe)
/auth/change-password     → Changement de mot de passe obligatoire (premier login admin avec must_change_password)
/legal/terms              → Conditions Générales d'Utilisation
/legal/privacy            → Politique de Confidentialité
```

#### Pages d'erreur (brandées CMA)
```
/404                      → "Cette page n'existe pas" — illustration CMA + bouton retour à l'accueil
/500                      → "Quelque chose s'est mal passé" — illustration CMA + lien vers support/contact admin
/maintenance              → "CMA Connect est en maintenance" — logo + message estimé de retour. Activée via variable d'environnement (`NEXT_PUBLIC_MAINTENANCE_MODE=true`), le middleware Next.js redirige toutes les routes vers cette page.
```

#### Pages authentifiées (layout partagé : navbar + sidebar)
```
/feed                     → Mur global du forum
/feed/[postId]            → Détail d'un post + commentaires
/promo                    → Coin Promo de l'utilisatrice (posts, épinglés, élection chef de promo)
/promo/election           → Élection en cours (candidatures, votes, résultats)
/promo/elections          → Historique des élections passées (résultats, participantes, dates)
/directory                → Annuaire (recherche + filtres)
/profile/[username]       → Profil public d'une utilisatrice
/profile/edit             → Édition de son propre profil
/messages                 → Liste des conversations
/messages/[conversationId]→ Thread de DMs
/notifications            → Centre de notifications
/mentorship               → Hub mentorat (suggestions, demandes envoyées/reçues)
/mentorship/[sessionId]   → Suivi d'un mentorat actif
/opportunities            → Forum Bourses & Opportunités
/support                  → Formulaire de contact admin (catégorie, sujet, message) + historique de ses tickets
/support/[ticketId]       → Détail d'un ticket (statut, réponse admin)
/settings                 → Préférences (dark mode, mot de passe, notifications, désactivation)
/settings/blocked         → Gestion des utilisatrices bloquées (voir, débloquer)
```

#### Pages admin (layout admin)
```
/admin                    → Dashboard analytics (graphiques + KPIs + filtres + export)
/admin/approvals          → Inscriptions en attente (pending) — bulk approve/reject
/admin/promotions         → Gestion promos (validation pending, emblèmes)
/admin/moderation         → Posts signalés + modération forum
/admin/tags               → CRUD des tags forum
/admin/activities         → CRUD des activités parascolaires
/admin/users              → Gestion des comptes (suspension, vue détaillée) — bulk actions
/admin/users/create       → Création d'un compte admin (super-admin LakouSystems uniquement)
/admin/users/[id]         → Vue détaillée d'une utilisatrice (profil, activité, signalements, inviteur)
/admin/invitations        → Suivi des liens d'invitation (générés, utilisés, expirés, révocation)
/admin/audit              → Journal d'audit des actions admin
/admin/support            → Gestion des tickets de support (liste, assignation, réponse)
/admin/support/[ticketId] → Détail d'un ticket (répondre, changer statut, assigner)
```

### PWA & Offline
- **Service Worker:** next-pwa ou Serwist pour génération automatique du SW
- **Cache Strategy:**
  - App Shell (layout, navigation, UI) : Cache-First — chargement instantané
  - Annuaire / Profils : Stale-While-Revalidate — données affichées depuis le cache puis mises à jour en arrière-plan
  - Forum / DMs : Network-First — priorité aux données fraîches, fallback cache si hors-ligne
  - Images (avatars, emblèmes) : Cache-First avec expiration longue
- **Offline UX:** Bannière indiquant le mode hors-ligne, contenu consulté précédemment reste accessible en lecture seule

### Supabase Realtime — Scope détaillé
| Canal | Table/Événement | Usage |
|---|---|---|
| Forum global | `forum_posts` INSERT (où `promo_id IS NULL`) | Nouveau post en temps réel sur le mur |
| Coin Promo | `forum_posts` INSERT (où `promo_id = user.promo_id`) | Nouveau post dans le coin promo |
| Commentaires | `forum_comments` INSERT (sur post affiché) | Nouveaux commentaires en temps réel |
| Conversation DM | `direct_messages` INSERT (sur `conversation_id` ouvert) | Messages reçus instantanément |
| Notifications | `notifications` INSERT (où `recipient_id = auth.uid()`) | Badge compteur temps réel dans la navbar |
| Réactions | `forum_reactions` INSERT/DELETE (sur post affiché) | Compteur de réactions live — le client incrémente/décrémente `reaction_count` localement à réception de l'event sans refetch. Le trigger DB met à jour le compteur en DB de manière indépendante. |
| Élection (votes) | `promo_candidates` UPDATE (`vote_count`) | Décompte en temps réel (le trigger DB sur `promo_votes` incrémente `vote_count` sur `promo_candidates`, qui est exposé en SELECT — contourne le blocage RLS sur `promo_votes`) |
| Élection (candidatures) | `promo_candidates` INSERT/DELETE | Nouvelles candidatures / retraits en temps réel pendant la phase de nomination |
- **Push Notifications (Web Push API) :**
  - Notification hors-app pour les DMs, réponses forum, réactions, mentions, mentorat
  - Demande de permission au premier login (opt-in)
  - Implémentation via Web Push API + Service Worker
  - Table `push_subscriptions` pour stocker les endpoints de notification par utilisatrice

### Pagination (Stratégie hybride)
**Batch size par défaut : 20 items.**

| Zone | Stratégie | Curseur / Clé | UX |
|---|---|---|---|
| Forum (mur + coins promos + opportunités) | Cursor-based | `created_at` + `id` | Infinite scroll |
| Commentaires | Cursor-based | `created_at` + `id` | Load more |
| Liste des conversations | Cursor-based | `last_message_at` + `id` | Infinite scroll |
| DMs (dans une conversation) | Cursor-based | `created_at` + `id` | Scroll inversé (récent en bas) |
| Notifications | Cursor-based | `created_at` + `id` | Infinite scroll |
| Suggestions mentors | Offset | `page * limit` | Infinite scroll (résultats stables basés sur le matching) |
| Demandes de mentorat (envoyées/reçues) | Cursor-based | `created_at` + `id` | Liste paginée |
| Sessions mentorat actives | Offset | `page * limit` | Liste (volume faible, max 3 actives par élève) |
| Utilisatrices bloquées (`/settings/blocked`) | Offset | `page * limit` | Liste simple (volume faible) |
| Annuaire | Offset | `page * limit` | Infinite scroll ou pages |
| Admin — signalements (`/admin/moderation`) | Offset | `page * limit` | Pagination classique par pages |
| Admin — journal d'audit (`/admin/audit`) | Cursor-based | `created_at` + `id` | Infinite scroll (volume potentiellement élevé) |
| Admin — invitations (`/admin/invitations`) | Offset | `page * limit` | Pagination classique par pages |
| Admin — activités (`/admin/activities`) | Offset | `page * limit` | Pagination classique par pages |
| Admin — tags (`/admin/tags`) | Offset | `page * limit` | Pagination classique par pages |
| Admin — promotions (`/admin/promotions`) | Offset | `page * limit` | Pagination classique par pages |
| Admin — utilisatrices (`/admin/users`) | Offset | `page * limit` | Pagination classique par pages |
| Admin — support (`/admin/support`) | Offset | `page * limit` | Pagination classique par pages |
| Mes tickets (`/support`) | Offset | `page * limit` | Liste simple |
| Admin — approvals (`/admin/approvals`) | Offset | `page * limit` | Pagination classique par pages |

- **Cursor-based** pour les flux temps réel (évite doublons/manques lors d'insertion de nouvelles données)
- **Offset-based** pour les données stables (annuaire, admin) où navigation par pages et total de résultats sont utiles
