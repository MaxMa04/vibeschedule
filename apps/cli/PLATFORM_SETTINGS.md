# Plattform-Einstellungen

Jeder Kanal in `posts[]` hat ein eigenes `settings`-Objekt. vibeschedule reicht es als `platform_configurations.<plattform>` an Post for Me weiter, deshalb gelten die Feldnamen von Post for Me (snake_case). `__type` musst du nicht setzen, das Backend ergänzt es aus dem Kanal.

Alle Felder sind optional. Text und Medien kommen aus `value[0].content` und `value[0].image`, nicht aus `settings`.

Mit `posts:create --settings '<json>'` gilt dasselbe Objekt für alle Kanäle aus `-i`. Für Kanäle verschiedener Plattformen nimm `--json` und gib jedem Kanal sein eigenes `settings`.

`vibeschedule integrations:settings <kanal-id>` zeigt, was das Backend für einen Kanal erwartet.

## x

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| `reply_settings` | `following` \| `mentionedUsers` \| `subscribers` \| `verified` | Wer antworten darf. Ohne Angabe alle. |
| `community_id` | string | In dieser Community posten |
| `quote_tweet_id` | string | Diesen Post zitieren |
| `poll` | `{ "duration_minutes": number, "options": string[], "reply_settings"?: ... }` | Umfrage mit 2 bis 4 Optionen |

## linkedin

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| `title` | string | Titel im PDF-Viewer, max. 200 Zeichen |
| `reshare_post_id` | string | Diesen Post teilen, der Text wird zum Kommentar |

## instagram

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| `placement` | `timeline` \| `reels` \| `stories` | Wo der Post erscheint |
| `share_to_feed` | boolean | `false`: Video nur im Reels-Tab |
| `collaborators` | string[] | Instagram-Namen als Mitwirkende |
| `location` | string | Page-ID eines Orts |
| `trial_reel_type` | `manual` \| `performance` | Als Probe-Reel anlegen |
| `audio_name` | string | Name der Tonspur, nur bei Reels mit Originalton |
| `is_ai_generated` | boolean | Als KI-generiert kennzeichnen |

## facebook

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| `placement` | `timeline` \| `reels` \| `stories` | Wo der Post erscheint |
| `location` | string | Page-ID eines Orts |
| `collaborators` | string[] | Page-IDs als Mitwirkende bei Video-Reels |
| `set_caption_for_each_image` | boolean | Text an jedes Bild eines Karussells hängen |

## threads

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| `placement` | `timeline` \| `reels` | Wo der Post erscheint |

## tiktok und tiktok_business

Beide nutzen dieselben Felder.

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| `title` | string | Titel |
| `privacy_status` | `public` \| `private` \| `followers` \| `friends` | Wer das Video sieht |
| `allow_comment` | boolean | Kommentare erlauben |
| `allow_duet` | boolean | Duette erlauben |
| `allow_stitch` | boolean | Stitches erlauben |
| `disclose_your_brand` | boolean | Werbung für die eigene Marke |
| `disclose_branded_content` | boolean | Bezahlte Kooperation |
| `is_ai_generated` | boolean | Als KI-generiert kennzeichnen |
| `is_draft` | boolean | Nur als Entwurf in die TikTok-App laden, dort fertig veröffentlichen |
| `auto_add_music` | boolean | Musik zu Foto-Posts hinzufügen |

## youtube

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| `title` | string | Videotitel |
| `description` | string | Beschreibung, sonst der Post-Text. Max. 5000 Byte |
| `privacy_status` | `public` \| `private` \| `unlisted` | Sichtbarkeit, Standard `public` |
| `tags` | string[] | Video-Tags |
| `category_id` | string | YouTube-Kategorie-ID, z. B. `22` (People & Blogs), `27` (Bildung) |
| `made_for_kids` | boolean | Für Kinder bestimmt, Standard `false` |
| `contains_synthetic_media` | boolean | Enthält veränderte oder KI-Inhalte |
| `has_paid_product_placement` | boolean | Enthält bezahlte Produktplatzierung |
| `publish_at` | ISO 8601 (UTC) | Veröffentlichung durch YouTube, nur bei `privacy_status: private` |
| `embeddable` | boolean | Einbetten erlauben, Standard `true` |
| `license` | `youtube` \| `creativeCommon` | Lizenz |
| `public_stats_viewable` | boolean | Statistiken öffentlich, Standard `true` |
| `default_language` | string | Sprache als BCP-47-Tag, z. B. `de` |
| `localizations` | `{ "<sprache>": { "title": string, "description": string } }` | Titel und Beschreibung je Sprache |
| `recording_date` | `YYYY-MM-DD` | Aufnahmedatum |

## pinterest

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| `title` | string | Titel des Pins |
| `board_ids` | string[] | Boards, auf die der Pin kommt |
| `link` | string | Ziel-URL des Pins |

## bluesky

Keine Einstellungen.
