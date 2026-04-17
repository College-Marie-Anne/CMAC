# Tests RLS (pgTAP)

Tests SQL natifs qui valident les policies Row-Level Security directement dans PostgreSQL.
Complémentaires aux tests Vitest (`src/actions/__tests__/`) qui ne couvrent que la logique applicative.

## Prérequis

- **Docker** en cours d'exécution
- **Supabase CLI** via `npx supabase` (déjà installé comme dépendance indirecte)

## Lancer les tests

```bash
# 1. Démarrer la DB locale (télécharge les images Docker à la première exécution)
npx supabase start

# 2. Appliquer les migrations
npx supabase db reset

# 3. Lancer les tests pgTAP
npx supabase test db
```

Les résultats s'affichent en TAP (Test Anything Protocol) : `ok N - description` ou `not ok N - description`.

## Structure

| Fichier | Tests | Couvre |
|---|---|---|
| `rls_helpers.sql` | — | Helpers réutilisables (`rls_test.as_user`, `rls_test.create_user`, etc.) |
| `01_profiles_rls_test.sql` | 7 | SELECT public, UPDATE own/admin, DELETE interdit, INSERT id=auth.uid() |
| `02_conversations_rls_test.sql` | 5 | Participants only, **admin EXCLU** (privacy DMs), UPDATE archive |
| `03_direct_messages_rls_test.sql` | 5 | Participants + soft-delete per-side (sender/receiver) |
| `04_invitation_links_rls_test.sql` | 4 | Alumni active create, inviter revoke, admin access |
| `05_audit_log_rls_test.sql` | 3 | Admin-only SELECT, INSERT uniquement via trigger SECURITY DEFINER |
| `06_notifications_rls_test.sql` | 4 | recipient only (SELECT/UPDATE/DELETE) |
| **Total** | **28** | |

## Pattern utilisé

Chaque fichier :
1. `BEGIN;`
2. `\i supabase/tests/rls_helpers.sql` — charge les helpers dans la transaction
3. `SELECT plan(N);` — déclare N tests
4. Fixtures via `rls_test.create_user()` (bypass RLS en postgres role)
5. `rls_test.as_user(uuid)` pour impersonate chaque user
6. Assertions pgTAP (`ok`, `is`, `lives_ok`, `throws_ok`)
7. `SELECT * FROM finish();`
8. `ROLLBACK;` — isolation entre tests, rien n'est persisté

## Troubleshooting

### `\i supabase/tests/rls_helpers.sql: No such file or directory`

Le CWD de `pg_prove` peut varier. Fallback : copier-coller le contenu de `rls_helpers.sql` directement dans chaque fichier de test (dans la transaction, avant `SELECT plan(...)`).

### `permission denied for table auth.users`

`rls_test.create_user()` est `SECURITY DEFINER` — assurez-vous qu'elle est créée par le role `postgres` (c'est le cas par défaut dans `supabase test db`).

### Tests lents

Supabase start peut prendre 1-2 min à la première exécution (téléchargement Docker images). Les tests eux-mêmes durent < 1s.

## Ce qui n'est PAS testé ici (hors scope)

- Policies non-RLS (constraints CHECK, UNIQUE, FK)
- RPCs SECURITY DEFINER (testées côté Vitest via mocks Supabase)
- Performance des policies (à profiler via `EXPLAIN ANALYZE` manuellement)
- Edge cases (row-level policies avec JOINs complexes → `02_conversations` les couvre partiellement)
