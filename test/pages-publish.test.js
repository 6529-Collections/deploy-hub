import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import process from 'node:process';
import test from 'node:test';
import { fileURLToPath, URL } from 'node:url';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const repositoryRoot = dirname(
  fileURLToPath(new URL('../package.json', import.meta.url))
);

test('Pages publication versions coupled static assets with the deployment SHA', async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'deploy-hub-pages-'));
  const outputDirectory = join(temporaryRoot, '_site');
  const version = 'a'.repeat(40);

  try {
    await execute(process.execPath, [
      join(repositoryRoot, 'prepare-pages.mjs'),
      join(repositoryRoot, 'ui'),
      outputDirectory,
      version
    ]);

    const [index, app] = await Promise.all([
      readFile(join(outputDirectory, 'index.html'), 'utf8'),
      readFile(join(outputDirectory, 'app.js'), 'utf8')
    ]);

    assert.match(index, new RegExp(`href="\\./styles\\.css\\?v=${version}"`));
    assert.match(index, new RegExp(`src="\\./app\\.js\\?v=${version}"`));
    assert.match(
      app,
      new RegExp(`from '\\./github-operations\\.js\\?v=${version}';`)
    );
    assert.match(
      app,
      new RegExp(`from '\\./github-auth\\.js\\?v=${version}';`)
    );
    assert.ok(
      (
        await stat(join(outputDirectory, 'assets/brand/favicon-32.png'))
      ).isFile()
    );
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
