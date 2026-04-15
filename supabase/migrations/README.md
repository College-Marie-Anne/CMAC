# Migrations CMA Connect

## État du runtime vs historique

Les migrations sont **lues dans l'ordre lexicographique** (001 → 019). Le runtime PostgreSQL final est **propre**, mais l'historique de fichiers contient du cruft résiduel de pivots produit :

| Artefact | Créé en | Dropé en | Statut runtime |
|---|---|---|---|
| Tables `admin_deactivation_votes` / `_approvals` | 002:307-324 | 006:13-14 + 018 CASCADE | ✅ absent |
| Fonction `check_admin_deactivation_threshold()` | 003:215-243 | 006:12 + 018 CASCADE | ✅ absent |
| Trigger `trg_check_admin_deactivation` | 003:240-243 | 006:11 | ✅ absent |
| Type ENUM `admin_deactivation_status` | 001:26 | 006:15 + 018 CASCADE | ✅ absent |
| Policies RLS `admin_deactivation_*` | 004:580-602 | 012 | ✅ absent |
| CHECK constraints années (DATE→INT) | 011 | — (conservé) | ✅ actif |
| Duplication CHECK constraints (idempotence fix) | 014 | — | ✅ sans effet (DROP IF EXISTS) |

Aucune référence dans `src/` à ces artefacts (vérifié via `grep -rn`).

## Squash : pourquoi pas maintenant

Un squash dur (`001-019` → un seul fichier baseline) implique :

1. **DB reset** requis sur tous les environnements dev (historique `schema_migrations` invalidé)
2. **Risque sur prod** si déjà déployé (conflit de hash de migration)
3. **Perte de traçabilité** des raisons de changements (8 fixes de sécurité / bugs dans 008-017)

Les bénéfices (~300 lignes SQL en moins) ne compensent pas ces risques dans un projet en développement actif.

## Quand faire le squash

Conditions cumulatives à attendre :
- [ ] Aucun environnement prod déployé, OU fenêtre de maintenance planifiée
- [ ] Stabilisation de la v1.0.0 (plus de changements DB majeurs prévus)
- [ ] Équipe alignée sur le baseline cible

## Procédure de squash (future, non exécutée)

1. Dumper le schéma complet d'un environnement sain :
   ```bash
   supabase db dump --schema public --schema auth --file baseline.sql
   ```
2. Nettoyer `baseline.sql` (retirer ROW VALUES de dump, garder DDL)
3. Remplacer `001_*` à `019_*` par `001_baseline.sql`
4. Réappliquer seed dans une `002_seed.sql` dédiée
5. Reset le tracker de migrations :
   ```sql
   DELETE FROM supabase_migrations.schema_migrations;
   INSERT INTO supabase_migrations.schema_migrations (version, name)
   VALUES ('001', 'baseline'), ('002', 'seed');
   ```

## Conventions

- **Numérotation :** `NNN_snake_case.sql` (3 chiffres zero-padded)
- **Idempotence :** toutes les migrations utilisent `IF NOT EXISTS` / `IF EXISTS` / `ON CONFLICT` pour permettre la ré-application safe
- **Commentaires SQL :** en-tête obligatoire expliquant le « pourquoi » du changement
- **Rollback :** non versionné — rollback se fait par nouvelle migration corrective (ex. 006 annule 001-004 pour admin_deactivation_*)

## Historique

| # | Objet |
|---|---|
| 001 | Types ENUM + tables maîtresses (promotions, activities, forum_tags) |
| 002 | Tables dépendantes : profiles, forum, messagerie, mentorat |
| 003 | Triggers + RPC + full-text search |
| 004 | RLS policies + index |
| 005 | RPC `resolve_email_by_profile_id` |
| 006 | Super-admin + drop flow `admin_deactivation_*` |
| 007 | RPC login (`resolve_profile_id_by_username`, `resolve_profiles_by_fullname`) |
| 008 | Fix sécurité : trigger `prevent_super_admin_change` + purge DM `BEFORE UPDATE` |
| 009 | Fix `resolve_profiles_by_fullname` ne fuit plus la DOB + colonne `registration_incomplete` |
| 010 | Index manquants + policy UPDATE sur `profile_activities` |
| 011 | Conversion DATE → INTEGER (années) sur `promotions` et `profiles` |
| 012 | Drop policies RLS orphelines de `admin_deactivation_*` |
| 013 | LIMIT 10 sur `resolve_profiles_by_fullname` (anti-DoS) |
| 014 | CHECK constraints idempotents + policy `promo_votes_select_deny` |
| 015 | Index manquants (mentorship_sessions, promo_votes, reports, reactions) |
| 016 | Policies RLS self-edit profil (user_education, user_professions, desired_study_fields) |
| 017 | Policies anon SELECT sur `promotions` et `activities` pour inscription |
| **018** | **Hardening : trigger max-3 desired_study_fields + WITH CHECK admin + cleanup ENUM** |
| **019** | **Seed super-admin LakouSystems (remplace Server Action manuelle)** |
| **020** | **Audit log via triggers DB (corrige RLS INSERT silencieusement bloqué — spec §775)** |
