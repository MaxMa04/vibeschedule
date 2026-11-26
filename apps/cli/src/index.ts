import { readFileSync } from 'node:fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { apiUrl, request, uploadFile } from './api';
import { buildPost } from './posts';
import { idList, resolveId } from './resolve';

const print = (data: unknown) => console.log(JSON.stringify(data, null, 2));
const enc = encodeURIComponent;

const userOption = {
  describe: 'Nur Kanäle, für die dieser Nutzer zuständig ist (Nutzer-ID)',
  type: 'string',
} as const;

const resolveFormat = async (value: string) =>
  resolveId(value, await request('/formats'), 'Format');
const resolveApp = async (value: string) =>
  resolveId(value, await request('/apps'), 'App');
// users by ID or email, names need not be unique
const resolveUsers = async (value: string) => {
  const ids = idList(value);
  if (!ids.length) return [];
  const users: { id: string; email: string }[] = await request('/users');
  return ids.map((id) =>
    resolveId(
      id,
      users.map(({ id, email }) => ({ id, email })),
      'Nutzer'
    )
  );
};

const statuses = ['active', 'testing', 'paused'] as const;

yargs(hideBin(process.argv))
  .scriptName('vibeschedule')
  .locale('de')
  .usage('$0 <befehl> [optionen]')
  .command('auth:check', 'API-Schlüssel und API-URL prüfen', {}, async () => {
    const integrations = await request('/integrations');
    print({ ok: true, apiUrl: apiUrl(), integrations: integrations.length });
  })
  .command(
    'integrations:list',
    'Verbundene Kanäle auflisten',
    (y) =>
      y
        .option('app', {
          describe: 'Nur Kanäle dieser App (App-ID, "none" für ohne App)',
          type: 'string',
        })
        .option('user', userOption),
    async (argv) => {
      const query = new URLSearchParams();
      if (argv.app) query.set('app', argv.app);
      if (argv.user) query.set('user', argv.user);
      print(await request(`/integrations${query.size ? `?${query}` : ''}`));
    }
  )
  .command(
    'integrations:app <id> <app>',
    'App eines Kanals setzen',
    (y) =>
      y
        .positional('id', {
          describe: 'Kanal-ID',
          type: 'string',
          demandOption: true,
        })
        .positional('app', {
          describe: 'App-ID oder Name, "none" entfernt die App',
          type: 'string',
          demandOption: true,
        }),
    async (argv) => {
      const appId =
        argv.app.trim().toLowerCase() === 'none'
          ? null
          : await resolveApp(argv.app);
      print(
        await request(`/integrations/${enc(argv.id)}/app`, {
          method: 'PUT',
          body: { appId },
        })
      );
    }
  )
  .command(
    'integrations:users <id> <users>',
    'Zuständige Nutzer eines Kanals setzen (ersetzt die bisherigen)',
    (y) =>
      y
        .positional('id', {
          describe: 'Kanal-ID',
          type: 'string',
          demandOption: true,
        })
        .positional('users', {
          describe: 'Nutzer-IDs oder E-Mails, kommagetrennt, "none" für keine',
          type: 'string',
          demandOption: true,
        })
        .example(
          '$0 integrations:users abc123 max@vibelabs.to,lisa@vibelabs.to',
          'Zwei Zuständige setzen'
        ),
    async (argv) => {
      print(
        await request(`/integrations/${enc(argv.id)}/users`, {
          method: 'PUT',
          body: { userIds: await resolveUsers(argv.users) },
        })
      );
    }
  )
  .command('users:list', 'Nutzer des Workspace mit Rolle', {}, async () => {
    print(await request('/users'));
  })
  .command(
    'users:create <email>',
    'Zugang anlegen, z. B. für einen Clipper',
    (y) =>
      y
        .positional('email', {
          describe: 'E-Mail zum Anmelden, es geht keine Mail raus',
          type: 'string',
          demandOption: true,
        })
        .option('name', { type: 'string', demandOption: true })
        .option('role', {
          choices: ['CLIPPER', 'USER', 'ADMIN'] as const,
          default: 'CLIPPER' as const,
        })
        .option('password-file', {
          describe: 'Datei mit dem Passwort (mind. 8 Zeichen), hält es aus der Shell-History',
          type: 'string',
          demandOption: true,
        })
        .example(
          '$0 users:create clipping.anna@vibelabs.to --name Anna --password-file ./anna.pw',
          'Clipper-Zugang anlegen'
        ),
    async (argv) => {
      const password = readFileSync(argv['password-file'], 'utf8').trim();
      print(
        await request('/users', {
          method: 'POST',
          body: {
            email: argv.email,
            name: argv.name,
            role: argv.role,
            password,
          },
        })
      );
    }
  )
  .command(
    'clippers:pay [month]',
    'Was jeder Clipper pro Account im Monat bekommt',
    (y) =>
      y.positional('month', {
        describe: 'JJJJ-MM, ohne Angabe der laufende Monat',
        type: 'string',
      }),
    async (argv) => {
      print(
        await request(
          `/clippers/pay${argv.month ? `?month=${enc(argv.month)}` : ''}`
        )
      );
    }
  )
  .command('apps:list', 'Apps mit Anzahl Kanäle', {}, async () => {
    print(await request('/apps'));
  })
  .command(
    'apps:create <name>',
    'App anlegen',
    (y) =>
      y.positional('name', {
        describe: 'Name der App',
        type: 'string',
        demandOption: true,
      }),
    async (argv) => {
      print(
        await request('/apps', { method: 'POST', body: { name: argv.name } })
      );
    }
  )
  .command(
    'apps:rename <app> <name>',
    'App umbenennen',
    (y) =>
      y
        .positional('app', {
          describe: 'App-ID oder bisheriger Name',
          type: 'string',
          demandOption: true,
        })
        .positional('name', {
          describe: 'Neuer Name',
          type: 'string',
          demandOption: true,
        }),
    async (argv) => {
      print(
        await request(`/apps/${enc(await resolveApp(argv.app))}`, {
          method: 'PUT',
          body: { name: argv.name },
        })
      );
    }
  )
  .command(
    'apps:delete <app>',
    'App löschen, ihre Kanäle bleiben ohne App',
    (y) =>
      y.positional('app', {
        describe: 'App-ID oder Name',
        type: 'string',
        demandOption: true,
      }),
    async (argv) => {
      print(
        await request(`/apps/${enc(await resolveApp(argv.app))}`, {
          method: 'DELETE',
        })
      );
    }
  )
  .command(
    'integrations:sync',
    'Bei Post for Me verbundene Konten als Kanäle übernehmen',
    {},
    async () => {
      print(await request('/integrations/sync', { method: 'POST' }));
    }
  )
  .command(
    'integrations:connect-url <platform>',
    'Link erzeugen, mit dem der Besitzer ein Konto verbindet',
    (y) =>
      y
        .positional('platform', {
          describe: 'Plattform, z. B. tiktok',
          type: 'string',
          demandOption: true,
        })
        .example(
          '$0 integrations:connect-url tiktok',
          'Link öffnen lassen, danach integrations:sync'
        ),
    async (argv) => {
      print(await request(`/integrations/connect-url/${enc(argv.platform)}`));
    }
  )
  .command(
    'integrations:manual-only <id>',
    'Kanal auf „Nur manuell“ stellen: nichts geht mehr an die Plattform',
    (y) =>
      y
        .positional('id', {
          describe: 'Kanal-ID',
          type: 'string',
          demandOption: true,
        })
        .option('off', {
          describe: 'Automatisches Posten wieder erlauben',
          type: 'boolean',
        }),
    async (argv) => {
      print(
        await request(`/integrations/${enc(argv.id)}/manual-only`, {
          method: 'PUT',
          body: { manualOnly: !argv.off },
        })
      );
    }
  )
  .command(
    'integrations:settings <id>',
    'Einstellungen und Limits eines Kanals anzeigen',
    (y) =>
      y.positional('id', {
        describe: 'Kanal-ID',
        type: 'string',
        demandOption: true,
      }),
    async (argv) => {
      print(await request(`/integration-settings/${enc(argv.id)}`));
    }
  )
  .command(
    'upload <source>',
    'Datei oder URL in die Mediathek hochladen',
    (y) =>
      y
        .positional('source', {
          describe: 'Dateipfad oder öffentliche https-URL',
          type: 'string',
          demandOption: true,
        })
        .example('$0 upload ./video.mp4', 'Lokale Datei hochladen')
        .example(
          '$0 upload https://example.com/bild.jpg',
          'Datei von einer URL übernehmen'
        ),
    async (argv) => {
      print(
        /^https?:\/\//.test(argv.source)
          ? await request('/upload-from-url', {
              method: 'POST',
              body: { url: argv.source },
            })
          : await uploadFile(argv.source)
      );
    }
  )
  .command(
    'media:list',
    'Mediathek auflisten (neueste zuerst)',
    (y) =>
      y
        .option('search', {
          alias: 's',
          describe: 'Nach Dateiname filtern',
          type: 'string',
        })
        .option('page', {
          alias: 'p',
          describe: 'Seite, beginnt bei 1',
          type: 'number',
          default: 1,
        }),
    async (argv) => {
      const query = new URLSearchParams({ page: String(argv.page) });
      if (argv.search) query.set('search', argv.search);
      print(await request(`/media?${query}`));
    }
  )
  .command(
    'posts:create',
    'Post anlegen, einplanen oder sofort veröffentlichen',
    (y) =>
      y
        .option('content', {
          alias: 'c',
          describe: 'Text des Posts',
          type: 'string',
        })
        .option('media', {
          alias: 'm',
          describe: 'Medien-URLs aus der Mediathek, kommagetrennt',
          type: 'string',
        })
        .option('integrations', {
          alias: 'i',
          describe: 'Kanal-IDs, kommagetrennt',
          type: 'string',
        })
        .option('date', {
          alias: 's',
          describe: 'Zeitpunkt (ISO 8601), bei --type now optional',
          type: 'string',
        })
        .option('type', {
          alias: 't',
          describe: 'draft: Entwurf, schedule: einplanen, now: sofort posten',
          choices: ['draft', 'schedule', 'now'] as const,
          default: 'schedule' as const,
        })
        .option('settings', {
          describe:
            'Plattform-Einstellungen als JSON, gilt für alle Kanäle (siehe PLATFORM_SETTINGS.md)',
          type: 'string',
        })
        .option('format', {
          alias: 'f',
          describe: 'Format des Posts, ID oder Name (siehe formats:list)',
          type: 'string',
        })
        .option('manual', {
          describe:
            'Manuell posten: bekommt einen Termin, geht aber nicht an die Plattform. Jemand postet selbst in der App.',
          type: 'boolean',
        })
        .option('json', {
          alias: 'j',
          describe:
            'JSON-Datei mit dem kompletten Request, ersetzt alle anderen Optionen',
          type: 'string',
        })
        .check((argv) => {
          if (argv.json) return true;
          if (Array.isArray(argv.content)) {
            throw new Error('Pro Post ist nur ein --content erlaubt.');
          }
          if (!argv.content && !argv.media) {
            throw new Error('--content oder --media fehlt.');
          }
          if (!argv.integrations) {
            throw new Error('--integrations fehlt.');
          }
          if (!argv.date && argv.type !== 'now') {
            throw new Error('--date fehlt (nur bei --type now optional).');
          }
          return true;
        })
        .example(
          '$0 posts:create -c "Hallo" -i abc123 -s 2026-12-01T09:00:00Z',
          'Post einplanen'
        )
        .example(
          '$0 posts:create -c "Entwurf" -i abc123,def456 -s 2026-12-01T09:00:00Z -t draft',
          'Entwurf für zwei Kanäle'
        )
        .example(
          '$0 posts:create -c "Hook" -i abc123 -t draft -f "Storytime"',
          'Entwurf im Format "Storytime"'
        )
        .example(
          '$0 posts:create -c "Caption" -m https://…/01.jpg,https://…/02.jpg -i abc123 -s 2026-12-01T17:00:00Z --manual',
          'Slideshow zum manuellen Posten einplanen'
        )
        .example('$0 posts:create -j ./post.json', 'Request aus JSON-Datei'),
    async (argv) => {
      const formatId =
        argv.format && !argv.json
          ? await resolveFormat(argv.format)
          : undefined;
      print(
        await request('/posts', {
          method: 'POST',
          body: buildPost({ ...argv, formatId }),
        })
      );
    }
  )
  .command(
    'posts:list',
    'Posts in einem Zeitraum auflisten',
    (y) =>
      y
        .option('start', {
          describe: 'Beginn (ISO 8601), Standard: vor 30 Tagen',
          type: 'string',
        })
        .option('end', {
          describe: 'Ende (ISO 8601), Standard: in 30 Tagen',
          type: 'string',
        })
        .option('app', {
          describe: 'Nur Posts dieser App (App-ID, "none" für ohne App)',
          type: 'string',
        })
        .option('user', userOption),
    async (argv) => {
      const day = 24 * 60 * 60 * 1000;
      const query = new URLSearchParams({
        startDate: argv.start || new Date(Date.now() - 30 * day).toISOString(),
        endDate: argv.end || new Date(Date.now() + 30 * day).toISOString(),
      });
      if (argv.app) query.set('app', argv.app);
      if (argv.user) query.set('user', argv.user);
      print(await request(`/posts?${query}`));
    }
  )
  .command(
    'posts:delete <id>',
    'Post löschen (mit allen Kanälen seiner Gruppe)',
    (y) =>
      y.positional('id', {
        describe: 'Post-ID',
        type: 'string',
        demandOption: true,
      }),
    async (argv) => {
      print(await request(`/posts/${enc(argv.id)}`, { method: 'DELETE' }));
    }
  )
  .command(
    'posts:delete-group <group>',
    'Alle Posts einer Gruppe löschen',
    (y) =>
      y.positional('group', {
        describe: 'Gruppen-ID (Feld group eines Posts)',
        type: 'string',
        demandOption: true,
      }),
    async (argv) => {
      print(
        await request(`/posts/group/${enc(argv.group)}`, { method: 'DELETE' })
      );
    }
  )
  .command(
    'posts:find-slot <id>',
    'Nächsten freien Zeitslot eines Kanals finden',
    (y) =>
      y.positional('id', {
        describe: 'Kanal-ID',
        type: 'string',
        demandOption: true,
      }),
    async (argv) => {
      print(await request(`/find-slot/${enc(argv.id)}`));
    }
  )
  .command(
    'formats:list',
    'Formate mit den Kanälen, auf denen sie laufen',
    {},
    async () => {
      print(await request('/formats'));
    }
  )
  .command(
    'formats:overview',
    'Pro Kanal: Formate mit Posts, Aufrufen und Likes im Zeitraum',
    (y) =>
      y
        .option('app', {
          describe: 'Nur Kanäle dieser App (App-ID, "none" für ohne App)',
          type: 'string',
        })
        .option('days', {
          alias: 'd',
          describe: 'Zeitraum in Tagen',
          type: 'number',
          default: 30,
        })
        .option('user', userOption),
    async (argv) => {
      const query = new URLSearchParams({ days: String(argv.days) });
      if (argv.app) query.set('app', argv.app);
      if (argv.user) query.set('user', argv.user);
      print(await request(`/formats/overview?${query}`));
    }
  )
  .command(
    'formats:create <name>',
    'Format anlegen',
    (y) =>
      y
        .positional('name', {
          describe: 'Name des Formats',
          type: 'string',
          demandOption: true,
        })
        .option('description', {
          alias: 'd',
          describe: 'Beschreibung',
          type: 'string',
        }),
    async (argv) => {
      print(
        await request('/formats', {
          method: 'POST',
          body: { name: argv.name, description: argv.description },
        })
      );
    }
  )
  .command(
    'formats:update <format>',
    'Format umbenennen oder Beschreibung ändern',
    (y) =>
      y
        .positional('format', {
          describe: 'Format-ID oder Name',
          type: 'string',
          demandOption: true,
        })
        .option('name', {
          describe: 'Neuer Name',
          type: 'string',
        })
        .option('description', {
          alias: 'd',
          describe: 'Neue Beschreibung, "" leert sie',
          type: 'string',
        })
        .check((argv) => {
          if (argv.name === undefined && argv.description === undefined) {
            throw new Error('--name oder --description fehlt.');
          }
          return true;
        }),
    async (argv) => {
      const formats: {
        id: string;
        name: string;
        description: string | null;
      }[] = await request('/formats');
      const id = resolveId(argv.format, formats, 'Format');
      const current = formats.find((f) => f.id === id)!;
      print(
        await request(`/formats/${enc(id)}`, {
          method: 'PUT',
          body: {
            name: argv.name ?? current.name,
            description: argv.description ?? current.description,
          },
        })
      );
    }
  )
  .command(
    'formats:delete <format>',
    'Format löschen, Posts behalten ihren Bezug',
    (y) =>
      y.positional('format', {
        describe: 'Format-ID oder Name',
        type: 'string',
        demandOption: true,
      }),
    async (argv) => {
      print(
        await request(`/formats/${enc(await resolveFormat(argv.format))}`, {
          method: 'DELETE',
        })
      );
    }
  )
  .command(
    'formats:assign <format> <id>',
    'Format auf einem Kanal laufen lassen oder Status und Notiz ändern',
    (y) =>
      y
        .positional('format', {
          describe: 'Format-ID oder Name',
          type: 'string',
          demandOption: true,
        })
        .positional('id', {
          describe: 'Kanal-ID',
          type: 'string',
          demandOption: true,
        })
        .option('status', {
          describe: 'Status auf dem Kanal, neu zugewiesen: active',
          choices: statuses,
        })
        .option('note', {
          describe: 'Notiz zum Format auf diesem Kanal, "" leert sie',
          type: 'string',
        })
        .option('position', {
          describe: 'Reihenfolge auf dem Kanal, ab 0',
          type: 'number',
        })
        .example(
          '$0 formats:assign "Storytime" abc123 --status testing',
          'Format auf einem Kanal testen'
        ),
    async (argv) => {
      const formatId = await resolveFormat(argv.format);
      print(
        await request(
          `/formats/${enc(formatId)}/integrations/${enc(argv.id)}`,
          {
            method: 'PUT',
            body: {
              ...(argv.status ? { status: argv.status.toUpperCase() } : {}),
              ...(argv.note !== undefined ? { note: argv.note } : {}),
              ...(argv.position !== undefined
                ? { position: argv.position }
                : {}),
            },
          }
        )
      );
    }
  )
  .command(
    'formats:unassign <format> <id>',
    'Format von einem Kanal nehmen',
    (y) =>
      y
        .positional('format', {
          describe: 'Format-ID oder Name',
          type: 'string',
          demandOption: true,
        })
        .positional('id', {
          describe: 'Kanal-ID',
          type: 'string',
          demandOption: true,
        }),
    async (argv) => {
      const formatId = await resolveFormat(argv.format);
      print(
        await request(
          `/formats/${enc(formatId)}/integrations/${enc(argv.id)}`,
          { method: 'DELETE' }
        )
      );
    }
  )
  .command(
    'analytics:overview',
    'Kennzahlen aller Kanäle mit Vergleich zum Zeitraum davor',
    (y) =>
      y
        .option('days', {
          alias: 'd',
          describe: 'Zeitraum in Tagen (1–90)',
          type: 'number',
          default: 7,
        })
        .option('app', {
          describe: 'Nur Kanäle dieser App-ID',
          type: 'string',
        })
        .option('user', userOption)
        .option('fresh', {
          describe: 'Cache umgehen und den Feed neu laden',
          type: 'boolean',
          default: false,
        }),
    async (argv) => {
      const query = new URLSearchParams({ days: String(argv.days) });
      if (argv.app) query.set('app', argv.app);
      if (argv.user) query.set('user', argv.user);
      if (argv.fresh) query.set('fresh', '1');
      print(await request(`/analytics/overview?${query}`));
    }
  )
  .command(
    'analytics:account <id>',
    'Kennzahlen, Tagesverlauf und Posts eines Kanals',
    (y) =>
      y
        .positional('id', {
          describe: 'Kanal-ID',
          type: 'string',
          demandOption: true,
        })
        .option('days', {
          alias: 'd',
          describe: 'Zeitraum in Tagen (1–90)',
          type: 'number',
          default: 7,
        })
        .option('fresh', {
          describe: 'Cache umgehen und den Feed neu laden',
          type: 'boolean',
          default: false,
        }),
    async (argv) => {
      const query = new URLSearchParams({ days: String(argv.days) });
      if (argv.fresh) query.set('fresh', '1');
      print(await request(`/analytics/account/${enc(argv.id)}?${query}`));
    }
  )
  .command(
    'analytics:channel <id>',
    'Statistiken eines Kanals',
    (y) =>
      y
        .positional('id', {
          describe: 'Kanal-ID',
          type: 'string',
          demandOption: true,
        })
        .option('days', {
          alias: 'd',
          describe: 'Zeitraum in Tagen',
          type: 'number',
          default: 7,
        }),
    async (argv) => {
      print(await request(`/analytics/${enc(argv.id)}?date=${argv.days}`));
    }
  )
  .command(
    'analytics:post <id>',
    'Statistiken eines veröffentlichten Posts',
    (y) =>
      y.positional('id', {
        describe: 'Post-ID',
        type: 'string',
        demandOption: true,
      }),
    async (argv) => {
      print(await request(`/analytics/post/${enc(argv.id)}`));
    }
  )
  .demandCommand(1)
  .strict()
  .fail((msg, err, y) => {
    if (err) {
      console.error(err.message);
    } else {
      y.showHelp();
      console.error(`\n${msg}`);
    }
    process.exit(1);
  })
  .help()
  .alias('h', 'help')
  .version()
  .alias('v', 'version')
  .epilogue(
    'Konfiguration: VIBESCHEDULE_API_KEY (Pflicht), VIBESCHEDULE_API_URL (Standard: https://vibeschedule.vibelabs.to/api)'
  )
  .parse();
