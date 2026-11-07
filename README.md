# vibeschedule

Internes Social-Media-Scheduling von VibeLabs. Beiträge für X, LinkedIn, Instagram, Facebook, Threads, TikTok, TikTok Business, YouTube, Pinterest und Bluesky planen, Medien verwalten, Kennzahlen ansehen.

- Web-App: https://vibeschedule.vibelabs.to (Login nur mit einem Konto, das ein Admin anlegt)
- CLI für Agents und Skripte: [`apps/cli`](apps/cli/README.md)
- Entwicklung und Deploy: [`AGENTS.md`](AGENTS.md)

Technik: Next.js, NestJS, Prisma mit Postgres, [Post for Me](https://www.postforme.dev/) als Schnittstelle zu den Plattformen, Cloudflare R2 für Medien.

## Lizenz

vibeschedule basiert auf [Postiz](https://github.com/gitroomhq/postiz-app) und der [Postiz-CLI](https://github.com/gitroomhq/postiz-agent) und steht wie diese unter der [AGPL-3.0](LICENSE).
