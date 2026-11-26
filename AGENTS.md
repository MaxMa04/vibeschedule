# vibeschedule

Internes Social-Media-Scheduling für VibeLabs: Kalender, Post-Editor, Medien, Analytics. Basiert auf einem Fork von Postiz (AGPL-3.0), stark gekürzt. Post for Me (PfM) übernimmt OAuth, Planung, Veröffentlichung und Metriken, Cloudflare R2 speichert die Medien.

## Aufbau

| Ort | Inhalt |
|---|---|
| `apps/backend` | NestJS-API (Port 3000), Routen in `src/api/routes`, öffentliche API in `src/public-api` |
| `apps/frontend` | Next.js-App (Port 4200), nur Deutsch. shadcn `base-nova` (Base UI) in `src/components/ui`, Tailwind v4, Theme in `src/app/globals.css` |
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
corepack pnpm@10.6.1 run typecheck        # Gate: Backend, Frontend, CLI + scripts/check-frontend.mjs
corepack pnpm@10.6.1 test                 # Unit-Tests: *.spec.ts (scripts/test-unit.mjs) und libraries/**/*.test.mjs
corepack pnpm@10.6.1 run build
```

Lokale Konfiguration steht in `.env` (Vorlage `.env.example`), beide Apps lesen sie per `dotenv -e ../../.env`. Lokale Postgres-DB: `docker-compose.dev.yaml` oder eigene Instanz.

## Regeln

- Kein eigener Scheduler, keine Queue: Posts gehen mit `scheduled_at` an PfM. Status kommt über den PfM-Webhook `POST /public/pfm/webhook` und den Abgleich beim Laden des Kalenders.
- Kanäle sind PfM-Social-Accounts (`Integration.internalId` = PfM-ID). Plattformen nur die zehn aus `pfm.platforms.ts`.
- Manuelles Posten: Ein Post mit `manual` bekommt einen Termin, geht aber nie an PfM. Jemand postet ihn selbst in der App (Seite `/manual`, Routen `/manual/*`, `ManualPostsService`) und markiert ihn als gepostet. Ein Kanal mit `manualOnly` erzwingt das serverseitig für alle seine Posts. Jeder Weg zu PfM läuft über `PostsService.syncToPfm`, dort steht die Sperre. Der Kanal bleibt in PfM verbunden: Die Zahlen kommen aus dem Account-Feed, verknüpft über die TikTok-Post-ID aus dem Link oder über die gleiche Caption (`libraries/helpers/src/manual/manual.match.ts`), nie nur über die Zeit.
- PfM kennt keine Nur-Lese-Verbindung: Es fordert bei TikTok immer auch die Rechte zum Veröffentlichen an. Der Schutz ist deshalb `manualOnly`, nicht die OAuth-Berechtigung.
- Rollen: `ADMIN`, `USER` (Team, sieht alles außer den Einstellungen) und `CLIPPER`. Clipper sind für jede Route gesperrt, die nicht `@AllowClipper()` trägt (`ClipperGuard`, global). Offen sind nur `/manual/*` und die eigenen `/user`-Routen; `ManualPostsService` beschränkt sie auf die Kanäle aus `UserIntegration`. Eine neue Route für Clipper braucht beides: die Markierung und die Kanalprüfung im Service.
- Zuständige: `UserIntegration` heißt „Nutzer ist für den Kanal zuständig“, für alle Rollen. Bei `ADMIN`/`USER` ist das nur eine Zuordnung (Filter `user=<id>|me` bei Posts, Analytics, Formaten), ohne Zugriffsbeschränkung. Nur bei `CLIPPER` beschränkt sie den Zugriff, und ein Kanal, der einen Clipper bekommt, wird `manualOnly`. Schreiben nur über `ChannelUsersService`, Filter über `channelFilter`/`channelWhere` (`libraries/nestjs-libraries/src/database/prisma/integrations`).
- Nach dem OAuth leitet PfM immer auf die im PfM-Dashboard hinterlegte Projekt-URL `https://vibeschedule.vibelabs.to/integrations/social/postforme` weiter (Quickstart-Projekte erlauben keinen Override). Lokal verbundene Konten landen also auf Prod; lokal danach den Sync-Button neben "Kanal hinzufügen" nutzen.
- Plattform-Einstellungen eines Posts tragen die Feldnamen von PfM `platform_configurations` (snake_case). Das DTO in `libraries/nestjs-libraries/src/dtos/posts/providers-settings` ist zugleich die Whitelist; Frontend-Formular (`apps/frontend/src/components/new-launch/providers`) und CLI-Doku (`apps/cli/PLATFORM_SETTINGS.md`) bei Änderungen mitziehen.
- Medien nur auf R2, öffentliche URLs unter `CLOUDFLARE_BUCKET_URL`. PfM lädt sie von dort.
- Ein Workspace: genau eine `Organization`, Nutzer legt ein Admin unter Einstellungen an. Keine Selbstregistrierung. Der erste Admin entsteht beim Start aus `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`, wenn noch kein Nutzer existiert.
- UI-Texte nur über `t()` mit Eintrag in `de/translation.json`, du-Form.
- UI nur aus shadcn-Komponenten (`src/components/ui`, Base UI: `render={<Link />}` statt `asChild`) und Theme-Tokens. Nach `shadcn add` den `cn`-Import auf `@vibeschedule/frontend/lib/utils` umstellen; `scripts/check-frontend.mjs` prüft das.
- Clipper verbinden ihre TikTok-Accounts selbst auf `/manual` (`/manual/connect/tiktok`). Der Verbindungslink trägt `<orgId>:<userId>` als PfM-`external_id` (`libraries/helpers/src/channels/connect.owner.ts`); `ChannelUsersService.sync` gibt einen dabei **neu** entstandenen Kanal diesem Clipper und stellt ihn auf `manualOnly`. Jeder Sync läuft deshalb über `ChannelUsersService.sync`, nie direkt über `IntegrationService.sync`. Die Anleitung für Clipper ist die öffentliche Notion-Seite in `components/clippers/clipper.guide.ts`.
- Pro Clipper steht die vereinbarte Anzahl Accounts in `UserOrganization.clipperAccounts` (Standard 3). `ChannelUsersService.connectUrl` gibt keinen Verbindungslink mehr, wenn so viele nicht getrennte Accounts verbunden sind. Bekommt ein Clipper einen Kanal, setzt `handToClipper` „Nur manuell“ und, falls leer, 30 € im Monat.
- Clipper-Bezahlung: pro Kanal `clipFeeCents` (Euro-Cent im Monat, `null` = unbezahlt) und `clipPostsPerDay`, Admin-Seite `/clippers`, CLI `clippers:pay`. Gezählt werden Posts mit `postedAt` (als gepostet markiert), Tage in Europe/Berlin. Die Regeln aus der Clipping-SOP (Start ab dem ersten Post, 5 freie Fehlposts, 1 € Abzug je weiterem, verlorener Account bis zum letzten Post) stehen nur in `libraries/helpers/src/clippers/clipper.billing.ts` mit Tests; bei einer SOP-Änderung dort anpassen.
- Apps gruppieren Kanäle (Modell `App`, Tabelle `Customer`, `Integration.appId`). Formate laufen pro Kanal (`IntegrationFormat`, Status Aktiv/Test/Pausiert), ein Post kann sein Format tragen (`Post.formatId`). Analytics und Formate ordnen Feed-Posts über `Post.pfmPostId`/`releaseId` zu. Von Hand gepostete Posts ohne vibeschedule-Post bekommen ihr Format nachträglich als `FeedPostFormat` (Kanal + `platform_post_id`, `FormatsService.setFeedPostFormat`, CLI `posts:set-format`), nie als `Post`: sonst landeten sie im Kalender und in der Clipper-Abrechnung.
- Schema-Änderungen per `prisma db push` (keine Migrationshistorie). Der Container führt das beim Start aus; keine destruktiven Schemaänderungen ohne Freigabe.
- Lizenz AGPL-3.0 bleibt, ebenso der Hinweis auf Postiz in `README.md`.

## Deploy

Push auf `main` deployt über Coolify (Projekt `vibeschedule`, Server hetzner1) nach https://vibeschedule.vibelabs.to. Datenbank: Coolify-Postgres `vibeschedule-db`. `NEXT_PUBLIC_BACKEND_URL` ist Build-Variable, alle anderen Variablen aus `.env.example` sind Runtime-Variablen. `BACKEND_PUBLIC_URL` muss die https-API-URL sein, sonst registriert das Backend keinen PfM-Webhook.
