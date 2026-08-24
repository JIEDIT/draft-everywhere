const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const constraints = fs.readFileSync(path.join(root, 'public/shared/platform-constraints.js'), 'utf8');
const twitterText = fs.readFileSync(path.join(root, 'public/shared/twitter-text-browser.js'), 'utf8');
const counting = fs.readFileSync(path.join(root, 'public/shared/platform-counting.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'public/js/app.js'), 'utf8');
const generated = `@@PLATFORM:twitter@@
@@FIELD:body@@
Generated tweet
@@FIELD:tags@@
drafting
@@FIELD:exposure_tip_zh@@
中文建议
@@FIELD:exposure_tip_en@@
English tip
@@END@@`;

function createApp(savedState) {
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://draft-everywhere.test/',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  window.fetch = async (url, options) => url === '/api/capabilities' ? ({
    ok: true,
    status: 200,
    json: async () => ({
      mode: 'trial', providerSelection: false, modelSelection: false,
      usage: { limit: 3, used: 0, remaining: 3, resetsAt: '2026-08-18T00:00:00.000Z' },
      githubUrl: 'https://github.com/JIEDIT/draft-everywhere',
    }),
  }) : ({
    ok: true,
    status: 200,
    json: async () => {
      const { platform } = JSON.parse(options.body);
      return {
        platform,
        status: 'ready',
        result: {
          body: 'Generated tweet',
          tags: ['#drafting'],
          exposure_tip_zh: '中文建议',
          exposure_tip_en: 'English tip',
        },
        metrics: { bodyLength: 15, combinedLength: 26, segmentLengths: [15] },
      };
    },
  });
  if (savedState) window.localStorage.setItem('draft-everywhere:workspace:v1', savedState);
  window.eval(constraints);
  window.eval(twitterText);
  window.eval(counting);
  window.eval(app);
  return dom;
}

function input(window, element, value) {
  element.value = value;
  element.dispatchEvent(new window.Event('input', { bubbles: true }));
}

test('CLEAR sits in a dedicated action row before the raw draft box', () => {
  const dom = createApp();
  const clear = dom.window.document.getElementById('clearDraft');
  const actionRow = clear.closest('.draft-actions');
  const draftBox = dom.window.document.querySelector('.draft-box');

  assert.equal(clear.type, 'button');
  assert.ok(actionRow);
  assert.ok(draftBox);
  assert.equal(actionRow.children.length, 1);
  assert.equal(actionRow.nextElementSibling, draftBox);
  assert.equal(draftBox.querySelector('#draft'), dom.window.document.getElementById('draft'));
  assert.equal(draftBox.querySelector('#clearDraft'), null);
  dom.window.close();
});

async function generate(window, draft = 'Raw idea') {
  await new Promise((resolve) => window.setTimeout(resolve, 0));
  input(window, window.document.getElementById('draft'), draft);
  window.document.querySelectorAll('.plat-toggle input').forEach((checkbox) => {
    checkbox.checked = checkbox.value === 'twitter';
  });
  window.document.getElementById('go').click();
  await new Promise((resolve) => window.setTimeout(resolve, 25));
}

test('CLEAR is hidden when empty and appears when the raw draft has content', () => {
  const dom = createApp();
  const clear = dom.window.document.getElementById('clearDraft');
  assert.equal(clear.hidden, true);

  input(dom.window, dom.window.document.getElementById('draft'), 'An idea');

  assert.equal(clear.hidden, false);
  assert.match(dom.window.localStorage.getItem('draft-everywhere:workspace:v1'), /An idea/);
  dom.window.close();
});

test('CLEAR immediately clears a raw-only workspace and returns focus', () => {
  const dom = createApp();
  const { window } = dom;
  const draft = window.document.getElementById('draft');
  input(window, draft, 'An idea');

  window.document.getElementById('clearDraft').click();

  assert.equal(draft.value, '');
  assert.equal(window.document.activeElement, draft);
  assert.equal(window.document.getElementById('clearDraft').hidden, true);
  assert.equal(window.localStorage.getItem('draft-everywhere:workspace:v1'), null);
  dom.window.close();
});

test('generated results require confirmation and cancel preserves the workspace', async () => {
  const dom = createApp();
  const { window } = dom;
  await generate(window);

  window.document.getElementById('clearDraft').click();

  const dialog = window.document.getElementById('clearDraftDialog');
  assert.equal(dialog.hasAttribute('open'), true);
  window.document.getElementById('cancelClearDraft').click();
  assert.equal(dialog.hasAttribute('open'), false);
  assert.equal(window.document.getElementById('draft').value, 'Raw idea');
  assert.equal(window.document.querySelectorAll('.card').length, 1);
  dom.window.close();
});

test('confirming clear removes draft, results, and storage but preserves display settings', async () => {
  const dom = createApp();
  const { window } = dom;
  const linkedin = window.document.querySelector('input[value="linkedin"]');
  linkedin.checked = false;
  linkedin.dispatchEvent(new window.Event('change', { bubbles: true }));
  window.document.getElementById('langToggle').click();
  await generate(window);

  window.document.getElementById('clearDraft').click();
  window.document.getElementById('confirmClearDraft').click();

  assert.equal(window.document.getElementById('draft').value, '');
  assert.equal(window.document.querySelectorAll('.card').length, 0);
  assert.equal(window.document.querySelectorAll('.rtab.ghost').length, 5);
  assert.equal(window.localStorage.getItem('draft-everywhere:workspace:v1'), null);
  assert.equal(linkedin.checked, false);
  assert.equal(window.document.body.classList.contains('lang-zh'), false);
  assert.equal(window.document.activeElement, window.document.getElementById('draft'));
  dom.window.close();
});

test('manually deleting the raw draft also removes generated results and saved state', async () => {
  const dom = createApp();
  const { window } = dom;
  await generate(window);

  input(window, window.document.getElementById('draft'), '');

  assert.equal(window.document.querySelectorAll('.card').length, 0);
  assert.equal(window.localStorage.getItem('draft-everywhere:workspace:v1'), null);
  assert.equal(window.document.getElementById('clearDraft').hidden, true);
  dom.window.close();
});

test('a refresh restores uncleared raw draft and generated results', async () => {
  const first = createApp();
  await generate(first.window, 'Keep this draft');
  const saved = first.window.localStorage.getItem('draft-everywhere:workspace:v1');
  first.window.close();

  const refreshed = createApp(saved);

  assert.equal(refreshed.window.document.getElementById('draft').value, 'Keep this draft');
  assert.equal(refreshed.window.document.querySelector('.card[data-platform="twitter"] [data-role="body"]').value, 'Generated tweet');
  assert.equal(refreshed.window.document.getElementById('clearDraft').hidden, false);
  refreshed.window.close();
});

test('support link opens Ko-fi in a new tab and follows the selected language', () => {
  const dom = createApp();
  const { window } = dom;
  const supportLink = window.document.getElementById('supportLink');

  assert.equal(supportLink.href, 'https://ko-fi.com/jieliu');
  assert.equal(supportLink.target, '_blank');
  assert.equal(supportLink.rel, 'noopener noreferrer');
  assert.equal(supportLink.querySelector('.support-link-icon').getAttribute('aria-hidden'), 'true');
  assert.equal(supportLink.textContent.trim(), '支持这个工具并留下反馈 →');

  window.document.getElementById('langToggle').click();
  assert.equal(supportLink.textContent.trim(), 'Support the tool & share feedback →');
  dom.window.close();
});
