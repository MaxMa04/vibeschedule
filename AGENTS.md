# vibeschedule

Internes Social-Media-Scheduling für VibeLabs: Kalender, Post-Editor, Medien, Analytics. Basiert auf einem Fork von Postiz (AGPL-3.0), stark gekürzt. Post for Me (PfM) übernimmt OAuth, Planung, Veröffentlichung und Metriken, Cloudflare R2 speichert die Medien.

## Aufbau

| Ort | Inhalt |
|---|---|
| `apps/backend` | NestJS-API (Port 3000), Routen in `src/api/routes`, öffentliche API in `src/public-api` |
| `apps/frontend` | Next.js-App (Port 4200), nur Deutsch |
| `apps/cli` | `vibeschedule`-CLI für die öffentliche API, Doku in `apps/cli/README.md` |
| `libraries/nestjs-libraries` | Services, Repositories, Prisma-Schema, PfM-Client (`src/integrations/pfm.client.ts`), Plattformkatalog (`src/integrations/pfm.platforms.ts`), R2-Upload |
| `libraries/react-shared-libraries` | UI-Bausteine, Übersetzungen (`src/translation/locales/de`) |
| `libraries/helpers` | geteilte Helfer für Frontend und Backend |
| `docker/`, `Dockerfile` | ein Container: nginx auf 5000, `/api` → Backend, Rest → Frontend |

Path-Alias `@vibeschedule/*` (siehe `tsconfig.base.json`).

## Befehle

pnpm über corepack (`corepack pnpm@10.6.1 …`), Node 22.

```sh
corepack pnpm@10.6.1 install
corepack pnpm@10.6.1 run prisma-db-push   # Schema in die DB aus .env schreiben
corepack pnpm@10.6.1 run dev              # Backend :3000 + Frontend :4200
corepack pnpm@10.6.1 run typecheck        # Gate: Backend, Frontend, CLI
corepack pnpm@10.6.1 run build
```

Lokale Konfiguration steht in `.env` (Vorlage `.env.example`), beide Apps lesen sie per `dotenv -e ../../.env`. Lokale Postgres-DB: `docker-compose.dev.yaml` oder eigene Instanz.

## Regeln

- Kein eigener Scheduler, keine Queue: Posts gehen mit `scheduled_at` an PfM. Status kommt über den PfM-Webhook `POST /public/pfm/webhook` und den Abgleich beim Laden des Kalenders.
- Kanäle sind PfM-Social-Accounts (`Integration.internalId` = PfM-ID). Plattformen nur die zehn aus `pfm.platforms.ts`.
- Plattform-Einstellungen eines Posts tragen die Feldnamen von PfM `platform_configurations` (snake_case). Das DTO in `libraries/nestjs-libraries/src/dtos/posts/providers-settings` ist zugleich die Whitelist; Frontend-Formular (`apps/frontend/src/components/new-launch/providers`) und CLI-Doku (`apps/cli/PLATFORM_SETTINGS.md`) bei Änderungen mitziehen.
- Medien nur auf R2, öffentliche URLs unter `CLOUDFLARE_BUCKET_URL`. PfM lädt sie von dort.
- Ein Workspace: genau eine `Organization`, Nutzer legt ein Admin unter Einstellungen an. Keine Selbstregistrierung. Der erste Admin entsteht beim Start aus `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`, wenn noch kein Nutzer existiert.
- UI-Texte nur über `t()` mit Eintrag in `de/translation.json`, du-Form.
- Schema-Änderungen per `prisma db push` (keine Migrationshistorie). Der Container führt das beim Start aus; keine destruktiven Schemaänderungen ohne Freigabe.
- Lizenz AGPL-3.0 bleibt, ebenso der Hinweis auf Postiz in `README.md`.

## Deploy

Push auf `main` deployt über Coolify (Projekt `vibeschedule`, Server hetzner1) nach https://vibeschedule.vibelabs.to. Datenbank: Coolify-Postgres `vibeschedule-db`. `NEXT_PUBLIC_BACKEND_URL` ist Build-Variable, alle anderen Variablen aus `.env.example` sind Runtime-Variablen. `BACKEND_PUBLIC_URL` muss die https-API-URL sein, sonst registriert das Backend keinen PfM-Webhook.
