# vibeschedule CLI

Kommandozeile für die Public API von vibeschedule: Kanäle ansehen, Apps, Formate und Zuständige pflegen, Medien hochladen, Posts einplanen und Statistiken abrufen. Alle Befehle geben JSON auf stdout aus, Fehler landen auf stderr mit Exit-Code 1.

Basiert auf der Postiz CLI (AGPL-3.0).

## Installation

Node 22 oder neuer. Im Root des Monorepos:

```bash
corepack pnpm@10.6.1 --filter ./apps/cli build
node apps/cli/dist/index.js --help
```

Als globaler Befehl `vibeschedule`:

```bash
cd apps/cli && npm link
```

## Konfiguration

| Variable | Pflicht | Bedeutung |
| --- | --- | --- |
| `VIBESCHEDULE_API_KEY` | ja | API-Schlüssel des Workspace, in vibeschedule unter Einstellungen > API-Schlüssel |
| `VIBESCHEDULE_API_URL` | nein | Standard `https://vibeschedule.vibelabs.to/api`, lokal z. B. `http://localhost:3000` |

```bash
export VIBESCHEDULE_API_KEY=...
vibeschedule auth:check
```

## Befehle

| Befehl | Zweck |
| --- | --- |
| `auth:check` | Schlüssel prüfen, zeigt API-URL und Anzahl Kanäle |
| `integrations:list [--app <id>] [--user <nutzer-id>]` | Verbundene Kanäle mit ID, Plattform (`identifier`), App, `manualOnly` und den zuständigen Nutzern (`users`). `--app none` zeigt Kanäle ohne App |
| `integrations:app <kanal-id> <app>` | App eines Kanals setzen (App-ID oder Name), `none` entfernt sie |
| `integrations:users <kanal-id> <nutzer>` | Zuständige eines Kanals setzen, ersetzt die bisherigen. Nutzer-IDs oder E-Mails kommagetrennt, `none` für keine. Ein Clipper darunter stellt den Kanal auf „Nur manuell“ |
| `users:list` | Nutzer des Workspace mit ID, Name, E-Mail und Rolle (`ADMIN`, `USER`, `CLIPPER`) |
| `users:create <email> --name <name> --password-file <datei> [--role CLIPPER] [--accounts 3]` | Zugang anlegen (Standardrolle `CLIPPER`, `--accounts`: wie viele TikTok-Accounts er verbinden darf). Das Passwort kommt aus einer Datei, damit es nicht in der Shell-History landet |
| `clippers:accounts <nutzer> <anzahl>` | Wie viele Accounts ein Clipper verbinden darf (ID oder E-Mail). Verbundene, nicht getrennte Accounts zählen |
| `clippers:onboarding [nutzer]` | Onboarding-Accounts aller Clipper oder eines Clippers (ID oder E-Mail): Betreuer (`manager`), allgemeine Aufgaben (`tasks`), was heute offen ist (`todo.open`, `todo.waitingForUs`), je Account die ID, das vergebene Profil, die App mit Brief (`app`), Stand (`plan.stage`), was heute dran ist (`todo`: `open` mit Schritt, `locked` mit Grund und Tag, `post` mit `posted`/`due` von heute), verbundener Kanal (`channel`, `channel.username` ist der TikTok-Anzeigename), Aufgaben (`tasks`, `openTasks` für den Clipper, `teamTasks` für uns), `rebrand` (Kanal trägt noch nicht das vergebene Profil) |
| `clippers:account <account-id>` | Ein Onboarding-Account wie in `clippers:onboarding` |
| `clippers:profile <account-id> [--name] [--username] [--bio] [--topic] [--search-terms <a,b>] [--avatar <datei>] [--app <app>]` | Profil setzen, das der Clipper für den Account bekommt. `--app` (ID oder Name, `none` entfernt sie): App des Accounts, der Clipper sieht ihren Brief; ein verbundener Kanal bekommt dieselbe App. Was fehlt, bleibt, `""` leert ein Feld. Ändern sich Name, Username, Bio oder Bild bei einem Account, der schon erstellt oder verbunden ist, entsteht automatisch die Aufgabe „Profil umstellen“ (Regel in `libraries/helpers/src/clippers/clipper.tasks.ts`) |
| `clippers:tasks [nutzer] [--open] [--team \| --no-team]` | Aufgaben mit Clipper, Betreuer, Account (`null` bei allgemeinen) und Kanal. `--team`: nur Aufgaben für uns, `--no-team`: nur die des Clippers |
| `clippers:task <account-id> [titel] [-d <beschreibung>] [--profile] [--team]` | Aufgabe zu einem Account anlegen. Der Clipper sieht offene Aufgaben oben auf „Manuell posten“ und hakt sie ab. `--profile` zeigt ihm dazu Bild, Name, Username und Bio zum Übernehmen; eine zweite offene Profil-Aufgabe entsteht nicht. `--team`: Aufgabe für uns, der Clipper sieht sie nicht |
| `clippers:user-task <nutzer> <titel> [-d <beschreibung>] [--team]` | Allgemeine Aufgabe zu einem Clipper, nicht zu einem Account (z. B. „Auszahlung November“ mit `--team`) |
| `clippers:manager <nutzer> <betreuer>` | Wer aus dem Team (Admin oder Nutzer, ID oder E-Mail) den Clipper betreut, `none` für niemanden. Der Clipper sieht den Namen als Ansprechperson |
| `clippers:task-done <task-id> [--undo]` | Aufgabe abhaken oder wieder öffnen |
| `clippers:task-delete <task-id>` | Aufgabe löschen |
| `clippers:pay [JJJJ-MM]` | Was jeder Clipper pro Account im Monat bekommt: Gepostet, Verpasst, Abzug, Betrag (Regeln in `libraries/helpers/src/clippers/clipper.billing.ts`) |
| `apps:list` | Apps mit ID und Anzahl Kanäle |
| `apps:create <name>` | App anlegen |
| `apps:rename <app> <name>` | App umbenennen (App-ID oder bisheriger Name) |
| `apps:brief <app> [text] [--file <datei>]` | Brief der App setzen, `""` entfernt ihn. Clipper sehen ihn auf „Dein Start“ und „Manuell posten“ für Accounts dieser App |
| `apps:delete <app>` | App löschen, ihre Kanäle bleiben ohne App |
| `integrations:settings <kanal-id>` | Einstellungen und Textlimit eines Kanals |
| `integrations:connect-url <plattform>` | Link, mit dem der Besitzer ein Konto verbindet (auf seinem Gerät öffnen, anmelden, zustimmen) |
| `integrations:sync` | Bei Post for Me verbundene Konten als Kanäle übernehmen, z. B. nach einem Verbindungslink |
| `integrations:manual-only <kanal-id> [--off]` | Kanal auf „Nur manuell“ stellen oder (`--off`) automatisches Posten wieder erlauben |
| `upload <datei-oder-url>` | In die Mediathek hochladen, gibt `path` (öffentliche URL) zurück |
| `media:list [-s <suche>] [-p <seite>]` | Mediathek, neueste zuerst |
| `posts:create ...` | Post anlegen, siehe unten |
| `posts:list [--start <iso>] [--end <iso>] [--app <id>] [--user <nutzer-id>]` | Posts im Zeitraum, Standard 30 Tage zurück bis 30 Tage voraus |
| `posts:delete <post-id>` | Post mit allen Kanälen seiner Gruppe löschen |
| `posts:delete-group <gruppe>` | Alle Posts einer Gruppe löschen |
| `posts:find-slot <kanal-id>` | Nächster freier Zeitslot des Kanals |
| `formats:list` | Formate mit ID, Beschreibung und den Kanälen, auf denen sie laufen (`status` ACTIVE, TESTING oder PAUSED) |
| `formats:overview [--app <id>] [--user <nutzer-id>] [-d <tage>]` | Pro Kanal seine Formate mit Posts, Aufrufen und Likes im Zeitraum (Standard 30 Tage), dazu `feed.withoutFormat`: veröffentlichte Posts ohne Format. `--app none` zeigt Kanäle ohne App |
| `formats:create <name> [-d <beschreibung>]` | Format anlegen |
| `formats:update <format> [--name <name>] [-d <beschreibung>]` | Format umbenennen oder Beschreibung ändern, was fehlt, bleibt. `-d ""` leert die Beschreibung |
| `formats:delete <format>` | Format löschen. Es verschwindet von allen Kanälen, Posts behalten ihren Bezug |
| `formats:assign <format> <kanal-id> [--status active\|testing\|paused] [--note <text>] [--position <n>]` | Format auf einem Kanal laufen lassen oder Status, Notiz und Reihenfolge ändern. Neu zugewiesen ist der Status `active`, was fehlt, bleibt |
| `formats:unassign <format> <kanal-id>` | Format von einem Kanal nehmen |
| `posts:set-format <kanal-id> <post> <format>` / `--file <json>` | Format eines veröffentlichten Posts setzen, auch eines von Hand geposteten, der nur im Feed des Kanals steht. `<post>` ist der Link (TikTok, YouTube, Instagram), die Plattform-ID oder die Post-for-Me-ID, `<format>` ID oder Name, `none` entfernt es. `--file` nimmt `[{"post": "…", "format": "…"}]`. Gefunden werden Posts der letzten 365 Tage. Ein in vibeschedule angelegter Post bekommt das Format direkt, sonst merkt sich vibeschedule es zum Feed-Post (kein Kalendereintrag, keine Clipper-Abrechnung). Danach zählt der Post in `formats:overview` beim Format statt unter `feed.withoutFormat`, und `analytics:account` zeigt es als `format` |
| `inspiration:list [--app <app>] [-s open\|done\|skipped\|all] [--format <format>]` | Gespeicherte Video-Links zum Nachmachen (Seite „Inspiration“), neueste zuerst, Standard nur offene. Jeder Eintrag mit `url`, `platform`, `author` (@Handle, wenn der Link ihn nennt), `thumbnail` (Vorschaubild auf R2), `note`, `app`, `format`. `--app none` / `--format none` zeigt Links ohne App bzw. ohne Format |
| `inspiration:add <link…> [--app <app>] [-n <notiz>]` | Links speichern, auch mehrere auf einmal oder mit Text drumherum. TikTok-Kurzlinks (`vm.tiktok.com`) werden aufgelöst; ein schon gespeichertes Video kommt mit `duplicate: true` zurück. Das Vorschaubild holt vibeschedule beim Speichern; fehlt es, lädt erneutes Hinzufügen es nach |
| `inspiration:update <id> [-f <format>] [-s open\|done\|skipped] [--app <app>] [-n <notiz>]` | Link dem Format zuordnen, das daraus wurde (ein offener Link ist damit erledigt), verwerfen (`-s skipped`), App oder Notiz ändern. `none` entfernt Format bzw. App, `-n ""` die Notiz |
| `inspiration:delete <id>` | Gespeicherten Link löschen |
| `analytics:overview [-d <tage>] [--app <id>] [--user <nutzer-id>] [--fresh]` | Alle Kanäle: Summen des Zeitraums (Standard 7 Tage, höchstens 90), Vergleich zum gleich langen Zeitraum davor (`change` in Prozent), Tagesverlauf und `summary` über alle Kanäle. `--app none` zeigt Kanäle ohne App |
| `analytics:account <kanal-id> [-d <tage>] [--fresh]` | Ein Kanal: Kennzahlen mit Vergleich, `series` pro Tag und alle Posts des Zeitraums mit Metriken, Link, Vorschaubild und zugehörigem vibeschedule-Post samt Format |
| `analytics:channel <kanal-id> [-d <tage>]` | Statistiken eines Kanals, Standard 7 Tage |
| `analytics:post <post-id>` | Statistiken eines veröffentlichten Posts |

`<format>` und `<app>` nehmen die ID oder den Namen (Groß- und Kleinschreibung egal). `--user` filtert auf die Kanäle, für die dieser Nutzer zuständig ist (ID aus `users:list`).

Zuständige: Jeder Nutzer kann für Kanäle zuständig sein. Bei Admins und Team ist das nur eine Zuordnung zum Filtern. Ein Clipper sieht in der App nur seine Kanäle und postet sie von Hand, deshalb geht ein Kanal, den ein Clipper bekommt, auf „Nur manuell“. Wird der Clipper wieder entfernt, bleibt „Nur manuell“ stehen (`integrations:manual-only <kanal-id> --off` hebt es auf).

Analytics-Zahlen sind die aktuellen Gesamtwerte der Posts, die im Zeitraum veröffentlicht wurden (Tage in Europe/Berlin). Ein Tag in `series` zeigt also die Aufrufe der Posts dieses Tages, nicht die Aufrufe an diesem Tag. Der Feed wird pro Kanal 5 Minuten zwischengespeichert.

### posts:create

| Option | Bedeutung |
| --- | --- |
| `-c, --content` | Text, ein Wert pro Post |
| `-m, --media` | Medien-URLs aus `upload`, kommagetrennt |
| `-i, --integrations` | Kanal-IDs, kommagetrennt. Jeder Kanal bekommt denselben Text |
| `-s, --date` | Zeitpunkt in ISO 8601, z. B. `2026-12-01T09:00:00Z` |
| `-t, --type` | `schedule` (Standard), `draft` oder `now` |
| `--settings` | Plattform-Einstellungen als JSON für alle Kanäle, siehe [PLATFORM_SETTINGS.md](PLATFORM_SETTINGS.md) |
| `-f, --format` | Format des Posts, ID oder Name aus `formats:list`. Gilt für alle Kanäle |
| `--manual` | Manuell posten: Der Post bekommt den Termin, geht aber nicht an die Plattform. Die zuständige Person postet ihn selbst in der App (Seite „Posten“). In einer `--json`-Datei ist das `"manual": true` am einzelnen Post |
| `-j, --json` | Kompletten Request aus einer Datei senden, z. B. für eigene Texte oder Einstellungen je Kanal |

`--date` ist Pflicht, außer bei `--type now`. Im JSON-Request (`--json`) steht das Format als `formatId` (ID, nicht Name) und `"manual": true` am einzelnen Eintrag von `posts[]`. Entwürfe bleiben in vibeschedule und gehen erst beim Einplanen an die Plattform. Manuelle Posts gehen nie an die Plattform; ein Kanal, der in vibeschedule auf „Nur manuell“ steht, macht jeden Post manuell, auch ohne `--manual`.

## Beispiele

Kanal-ID holen und einen Post einplanen:

```bash
vibeschedule integrations:list
vibeschedule posts:create -c "Neues Release ist live" -i <kanal-id> -s 2026-12-01T09:00:00Z
```

TikTok-Video, nur für Follower sichtbar, ohne Duette:

```bash
vibeschedule upload ./clip.mp4
vibeschedule posts:create \
  -c "Drei Tipps für bessere Fotos #fotografie" \
  -m "<path aus upload>" \
  -i <tiktok-kanal-id> \
  -s 2026-12-01T17:00:00Z \
  --settings '{"privacy_status":"followers","allow_comment":true,"allow_duet":false,"allow_stitch":false}'
```

Mehrere Plattformen mit eigenen Einstellungen je Kanal (IDs in der Datei ersetzen):

```bash
vibeschedule posts:create -j examples/multi-platform-with-settings.json
```

App, Formate und Zuständige für einen Kanal einrichten:

```bash
vibeschedule apps:create "Recipe Manager"
vibeschedule integrations:app <kanal-id> "Recipe Manager"
vibeschedule formats:create "Storytime" -d "Hook, drei Slides, CTA"
vibeschedule formats:assign "Storytime" <kanal-id> --status testing --note "erste Woche"
vibeschedule users:list
vibeschedule integrations:users <kanal-id> max@vibelabs.to,<nutzer-id>
```

Einen laufenden Clipper-Account auf ein neues Profil umstellen lassen:

```bash
vibeschedule clippers:onboarding clipping.anna@vibelabs.to   # Account-IDs und Kanäle
vibeschedule clippers:profile <account-id> --name Ethan --username ethanbulking \
  --bio "19 · skinny → strong · bulking diary" --topic "Zunehmen / Gym" \
  --search-terms "weight gain,bulking,gym food" --avatar ./ethan.jpg
vibeschedule clippers:tasks clipping.anna@vibelabs.to --open    # „Profil umstellen“ ist da
```

Gesammelte Inspiration mit dem Agent durchgehen: offene Links einer App holen, jedes Video ansehen, dann einem bestehenden Format zuordnen, ein neues anlegen oder verwerfen:

```bash
vibeschedule inspiration:list --app "Recipe Manager"
vibeschedule formats:list
vibeschedule inspiration:update <id> -f "Storytime"
vibeschedule formats:create "Fridge-Roast" -d "Kühlschrank zeigen, App bewertet die Reste"
vibeschedule inspiration:update <id> -f "Fridge-Roast" -n "Hook aus Sekunde 1 übernehmen"
vibeschedule inspiration:update <id> -s skipped -n "zu teuer zu drehen"
```

Weitere Vorlagen liegen in [examples/](examples/): `tiktok-video.json`, `youtube-video.json`, `multi-platform-post.json`.

## Lizenz

AGPL-3.0, siehe [LICENSE](LICENSE).
