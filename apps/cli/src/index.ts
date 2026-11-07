import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { apiUrl, request, uploadFile } from './api';
import { buildPost } from './posts';

const print = (data: unknown) => console.log(JSON.stringify(data, null, 2));
const enc = encodeURIComponent;

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
      y.option('customer', {
        describe: 'Nur Kanäle dieses Kunden (Kunden-ID)',
        type: 'string',
      }),
    async (argv) => {
      print(
        await request(
          `/integrations${argv.customer ? `?group=${enc(argv.customer)}` : ''}`
        )
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
        .example('$0 posts:create -j ./post.json', 'Request aus JSON-Datei'),
    async (argv) => {
      print(
        await request('/posts', {
          method: 'POST',
          body: buildPost(argv),
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
        .option('customer', {
          describe: 'Nur Posts dieses Kunden (Kunden-ID)',
          type: 'string',
        }),
    async (argv) => {
      const day = 24 * 60 * 60 * 1000;
      const query = new URLSearchParams({
        startDate: argv.start || new Date(Date.now() - 30 * day).toISOString(),
        endDate: argv.end || new Date(Date.now() + 30 * day).toISOString(),
      });
      if (argv.customer) query.set('customer', argv.customer);
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
