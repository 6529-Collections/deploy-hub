import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';

function replaceRequired(source, search, replacement, file) {
  if (!source.includes(search)) {
    throw new Error(`Expected ${search} in ${file}`);
  }
  return source.replace(search, replacement);
}

const [sourceArgument, outputArgument, version] = process.argv.slice(2);

if (!sourceArgument || !outputArgument || !/^[0-9a-f]{40}$/i.test(version)) {
  throw new Error(
    'Usage: node prepare-pages.mjs <source> <output> <40-character SHA>'
  );
}

const sourceDirectory = resolve(sourceArgument);
const outputDirectory = resolve(outputArgument);

if (sourceDirectory === outputDirectory) {
  throw new Error('Pages output must differ from the UI source directory.');
}

await mkdir(outputDirectory, { recursive: true });
await cp(sourceDirectory, outputDirectory, { recursive: true, force: true });

const suffix = `?v=${version}`;
const indexPath = resolve(outputDirectory, 'index.html');
let index = await readFile(indexPath, 'utf8');
index = replaceRequired(
  index,
  'href="./styles.css"',
  `href="./styles.css${suffix}"`,
  indexPath
);
index = replaceRequired(
  index,
  'src="./app.js"',
  `src="./app.js${suffix}"`,
  indexPath
);
await writeFile(indexPath, index);

const appPath = resolve(outputDirectory, 'app.js');
let app = await readFile(appPath, 'utf8');
for (const moduleName of ['github-operations.js', 'github-auth.js']) {
  app = replaceRequired(
    app,
    `from './${moduleName}';`,
    `from './${moduleName}${suffix}';`,
    appPath
  );
}
await writeFile(appPath, app);
