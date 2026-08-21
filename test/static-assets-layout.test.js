import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('Wrangler serves browser files from an isolated public directory', () => {
  const config = fs.readFileSync(path.join(root, 'wrangler.jsonc'), 'utf8');
  const directory = config.match(/"directory"\s*:\s*"([^"]+)"/)?.[1];

  assert.equal(directory, './public');

  const publicRoot = path.resolve(root, directory);
  for (const file of ['index.html', 'css/styles.css', 'js/app.js', 'shared/platform-counting.js']) {
    assert.ok(fs.existsSync(path.join(publicRoot, file)), `${file} should be served from public/`);
  }

  assert.equal(path.dirname(path.join(root, '.wrangler')).startsWith(publicRoot), false);
});
