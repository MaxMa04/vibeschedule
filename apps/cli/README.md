# vibeschedule CLI

Kommandozeile für die Public API von vibeschedule: Kanäle ansehen, Medien hochladen, Posts einplanen und Statistiken abrufen. Alle Befehle geben JSON auf stdout aus, Fehler landen auf stderr mit Exit-Code 1.

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
| `integrations:list [--customer <id>]` | Verbundene Kanäle mit ID, Plattform (`identifier`) und Kunde |
| `integrations:settings <kanal-id>` | Einstellungen und Textlimit eines Kanals |
| `upload <datei-oder-url>` | In die Mediathek hochladen, gibt `path` (öffentliche URL) zurück |
| `media:list [-s <suche>] [-p <seite>]` | Mediathek, neueste zuerst |
| `posts:create ...` | Post anlegen, siehe unten |
| `posts:list [--start <iso>] [--end <iso>] [--customer <id>]` | Posts im Zeitraum, Standard 30 Tage zurück bis 30 Tage voraus |
| `posts:delete <post-id>` | Post mit allen Kanälen seiner Gruppe löschen |
| `posts:delete-group <gruppe>` | Alle Posts einer Gruppe löschen |
| `posts:find-slot <kanal-id>` | Nächster freier Zeitslot des Kanals |
| `analytics:channel <kanal-id> [-d <tage>]` | Statistiken eines Kanals, Standard 7 Tage |
| `analytics:post <post-id>` | Statistiken eines veröffentlichten Posts |

### posts:create

| Option | Bedeutung |
| --- | --- |
| `-c, --content` | Text, ein Wert pro Post |
| `-m, --media` | Medien-URLs aus `upload`, kommagetrennt |
| `-i, --integrations` | Kanal-IDs, kommagetrennt. Jeder Kanal bekommt denselben Text |
| `-s, --date` | Zeitpunkt in ISO 8601, z. B. `2026-12-01T09:00:00Z` |
| `-t, --type` | `schedule` (Standard), `draft` oder `now` |
| `--settings` | Plattform-Einstellungen als JSON für alle Kanäle, siehe [PLATFORM_SETTINGS.md](PLATFORM_SETTINGS.md) |
| `-j, --json` | Kompletten Request aus einer Datei senden, z. B. für eigene Texte oder Einstellungen je Kanal |

`--date` ist Pflicht, außer bei `--type now`. Entwürfe bleiben in vibeschedule und gehen erst beim Einplanen an die Plattform.

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

Weitere Vorlagen liegen in [examples/](examples/): `tiktok-video.json`, `youtube-video.json`, `multi-platform-post.json`.

## Lizenz

AGPL-3.0, siehe [LICENSE](LICENSE).
