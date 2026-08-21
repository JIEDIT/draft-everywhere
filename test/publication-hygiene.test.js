const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('public local setup has one secret-file convention', () => {
  const pkg = JSON.parse(read('package.json'));
  const envExample = read('.env.example');
  assert.equal(pkg.scripts.dev, 'wrangler dev --env-file .env.local --ip 127.0.0.1');
  assert.match(envExample, /^ANTHROPIC_API_KEY=$/m);
  assert.match(envExample, /^OPENAI_API_KEY=$/m);
  assert.match(envExample, /^GEMINI_API_KEY=$/m);
  assert.doesNotMatch(envExample, /DRAFT_EVERYWHERE_MODE|sk-|AIza|[A-Za-z0-9_-]{40,}/);
});

test('public configuration contains no hosted deployment controls', () => {
  const wrangler = read('wrangler.jsonc');
  assert.doesNotMatch(wrangler, /jiedit\.com|kv_namespaces|ratelimits|TRIAL_|custom_domain/);
  assert.equal(fs.existsSync(path.join(root, 'src/trial-security.js')), false);
  assert.equal(fs.existsSync(path.join(root, 'src/trial-usage.js')), false);
});

test('browser persistence has no API-key path', () => {
  const app = read('public/js/app.js');
  assert.doesNotMatch(app, /localStorage\.(?:setItem|getItem)\([^\n]*(?:API_KEY|apiKey|secret)/);
});
