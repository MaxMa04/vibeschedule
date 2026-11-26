// Runs every *.spec.ts under apps/ and libraries/ with node:test.
// Each spec is bundled with esbuild first, so path aliases and CJS packages
// like dayjs plugins resolve the same way as in the apps.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(import.meta.url), '../..');
const esbuild = join(root, 'node_modules/.bin/esbuild');

const specs = ['apps', 'libraries'].flatMap((dir) =>
  readdirSync(join(root, dir), { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.spec.ts'))
    .map((e) => join(e.parentPath, e.name))
    .filter((p) => !p.includes('node_modules'))
);

const out = mkdtempSync(join(tmpdir(), 'vibeschedule-spec-'));
try {
  const bundles = specs.map((spec, i) => {
    const file = join(out, `${i}.spec.cjs`);
    execFileSync(
      esbuild,
      [
        spec,
        '--bundle',
        '--platform=node',
        '--format=cjs',
        `--tsconfig=${join(root, 'tsconfig.base.json')}`,
        `--outfile=${file}`,
        '--log-level=warning',
      ],
      { stdio: 'inherit' }
    );
    console.log(`${relative(root, spec)} -> ${file}`);
    return file;
  });
  execFileSync(process.execPath, ['--test', ...bundles], { stdio: 'inherit' });
} finally {
  rmSync(out, { recursive: true, force: true });
}
