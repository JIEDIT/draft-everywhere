const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');

test('uses the renamed Draft Everywhere PNG as the site favicon', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const document = new JSDOM(html).window.document;
  const favicon = document.querySelector('link[rel="icon"]');

  assert.ok(favicon);
  assert.equal(favicon.getAttribute('type'), 'image/png');
  assert.equal(favicon.getAttribute('href'), 'assets/images/draft-everywhere-favicon.png');
  const faviconPath = path.join(root, 'public', favicon.getAttribute('href'));
  assert.equal(fs.existsSync(faviconPath), true);
  assert.equal(
    crypto.createHash('sha256').update(fs.readFileSync(faviconPath)).digest('hex'),
    '3fa874563e7036616367c381085dee964aea820ac6bcb8a25f321e466c7a08d8',
  );
});

test('uses the Draft Everywhere artwork in the top-left brand mark', () => {
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const document = new JSDOM(html).window.document;
  const logo = document.querySelector('.brand-logo');

  assert.ok(logo);
  assert.equal(logo.getAttribute('src'), 'assets/images/draft-everywhere-favicon.png');
  assert.equal(logo.getAttribute('alt'), 'Draft Everywhere');
});
