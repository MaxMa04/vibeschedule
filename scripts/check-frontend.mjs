// Static checks for the frontend that tsc cannot catch. Run via `pnpm run typecheck`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const dirs = ['apps/frontend/src', 'libraries/react-shared-libraries/src'];

const rules = [
  {
    pattern: /from\s+['"]cn['"]/,
    message:
      'Import cn from "@vibeschedule/frontend/lib/utils". The "cn" package is only a transitive dependency of the shadcn CLI.',
  },
  {
    // Postiz tokens without a theme behind them anymore: Tailwind drops them silently
    pattern:
      /\b(?:bg|text|border|ring|fill|stroke|placeholder|divide)-(?:newBgColor|newBgColorInner|newBgLineColor|newTextColor|newTableBorder|newTableHeader|newTableText|newColColor|newBorder|newSep|newSettings|newBackdrop|textItemBlur|textItemFocused|boxFocused|boxHover|blockSeparator|btnSimple|btnText|btnPrimary|menuDots|bigStrip|textColor|inputText|tableBorder|third|forth|fifth|sixth|seventh|teal|coral|ink|surface)\b|\b(?:mobile|tablet|iconBreak|maxMedia|minCustom):|\bfont-display\b|\brounded-(?:button|card)\b/,
    message:
      'Legacy Postiz token. Use the shadcn theme tokens (bg-card, text-muted-foreground, border, primary, …) and standard breakpoints.',
  },
  {
    pattern: /from\s+['"]@radix-ui\//,
    message: 'This project uses shadcn on Base UI (@base-ui/react), not Radix.',
  },
];

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(tsx?|jsx?)$/.test(name)) files.push(path);
  }
};
dirs.forEach((d) => walk(join(root, d)));

let failures = 0;
for (const file of files) {
  readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      for (const rule of rules) {
        if (rule.pattern.test(line)) {
          failures++;
          console.error(`${relative(root, file)}:${i + 1}: ${rule.message}`);
        }
      }
    });
}
for (const pkg of ['package.json', 'apps/frontend/package.json']) {
  const json = JSON.parse(readFileSync(join(root, pkg), 'utf8'));
  if (json.dependencies?.cn || json.devDependencies?.cn) {
    failures++;
    console.error(
      `${pkg}: remove the "cn" dependency that \`shadcn add\` writes; use @vibeschedule/frontend/lib/utils.`
    );
  }
}

if (failures) process.exit(1);
