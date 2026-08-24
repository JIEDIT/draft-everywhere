const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const scripts = ['public/shared/platform-constraints.js', 'public/shared/twitter-text-browser.js', 'public/shared/platform-counting.js', 'public/js/app.js']
  .map(file => fs.readFileSync(path.join(root, file), 'utf8'));

function response(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, statusText: status === 200 ? 'OK' : 'Error', json: async () => payload };
}

async function createRuntimeApp(capabilities, savedWorkspace) {
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://draft.test/', pretendToBeVisual: true });
  if (savedWorkspace) dom.window.localStorage.setItem('draft-everywhere:workspace:v1', JSON.stringify(savedWorkspace));
  dom.window.fetch = async url => {
    if (url === '/api/capabilities') return response(capabilities);
    throw new Error('Unexpected generation request');
  };
  scripts.forEach(script => dom.window.eval(script));
  await new Promise(resolve => dom.window.setTimeout(resolve, 10));
  return dom;
}

const trial = remaining => ({
  mode: 'trial', providerSelection: false, modelSelection: false,
  usage: { limit: 3, used: 3 - remaining, remaining, resetsAt: '2026-08-18T00:00:00.000Z' },
  githubUrl: 'https://github.com/JIEDIT/draft-everywhere',
});

const local = {
  mode: 'local', providerSelection: true, modelSelection: true, usage: null,
  providers: [
    { id: 'anthropic', label: 'Anthropic', configured: false, models: [{ id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' }] },
    { id: 'openai', label: 'OpenAI', configured: true, models: [{ id: 'gpt-5-mini', label: 'GPT-5 mini' }] },
  ],
};

test('trial shows remaining usage and GitHub CTA without provider controls', async () => {
  const dom = await createRuntimeApp(trial(2));
  assert.match(dom.window.document.body.textContent, /剩余 2 \/ 3 次生成机会/);
  assert.equal(dom.window.document.querySelector('[data-role="provider-select"]'), null);
  assert.match(dom.window.document.querySelector('[data-role="github-local"]').href, /github.com\/JIEDIT\/draft-everywhere/);
  dom.window.document.getElementById('langToggle').click();
  assert.match(dom.window.document.body.textContent, /2 OF 3 GENERATIONS LEFT/i);
  dom.window.close();
});

test('exhausted trial disables generation but preserves restored draft and cards', async () => {
  const dom = await createRuntimeApp(trial(0), {
    draft: 'Saved draft', activePlatform: 'linkedin',
    platforms: { linkedin: { body: 'Saved post', tags: '', exposure_tip_zh: '提示', exposure_tip_en: 'Tip' } },
  });
  assert.equal(dom.window.document.getElementById('go').disabled, true);
  assert.equal(dom.window.document.getElementById('draft').value, 'Saved draft');
  assert.equal(dom.window.document.querySelectorAll('.card').length, 1);
  assert.match(dom.window.document.body.textContent, /免费试用已结束/);
  assert.match(dom.window.document.querySelector('[data-role="runtime-status"]').textContent, /现有结果仍可编辑与复制/);
  assert.equal(dom.window.document.getElementById('supportWidget').parentElement.dataset.role, 'runtime-support');
  assert.equal(dom.window.document.querySelector('.intro-row #supportWidget'), null);
  assert.equal(dom.window.document.querySelector('[data-role="runtime-support"]').nextElementSibling.dataset.role, 'github-local');
  dom.window.close();
});

test('available trial and local mode keep the single Ko-fi widget beside the introduction', async () => {
  for (const capabilities of [trial(2), local]) {
    const dom = await createRuntimeApp(capabilities);
    assert.ok(dom.window.document.querySelector('.intro-row #supportWidget'));
    assert.equal(dom.window.document.querySelector('[data-role="runtime-support"]'), null);
    assert.equal(dom.window.document.querySelectorAll('#supportWidget').length, 1);
    dom.window.close();
  }
});

test('local starts with Select Provider and enables generation only for configured provider and model', async () => {
  const dom = await createRuntimeApp(local);
  const provider = dom.window.document.querySelector('[data-role="provider-select"]');
  const model = dom.window.document.querySelector('[data-role="model-select"]');
  assert.equal(provider.value, '');
  assert.match(provider.options[0].textContent, /选择服务商/);
  assert.equal(model.disabled, true);
  assert.match(model.options[0].textContent, /选择模型/);

  provider.value = 'openai';
  provider.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.equal(model.disabled, false);
  model.value = 'gpt-5-mini';
  model.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  assert.equal(dom.window.document.getElementById('go').disabled, false);
  assert.match(dom.window.document.querySelector('[data-role="key-status"]').textContent, /API KEY 已配置/i);
  dom.window.document.getElementById('langToggle').click();
  assert.equal(dom.window.document.querySelector('[data-role="provider-select"]').value, 'openai');
  assert.equal(dom.window.document.querySelector('[data-role="model-select"]').value, 'gpt-5-mini');
  assert.match(dom.window.document.body.textContent, /LOCAL MODE/);
  dom.window.close();
});

test('primary accent uses the JIEDIT brand red', () => {
  const styles = fs.readFileSync(path.join(root, 'public/css/styles.css'), 'utf8');
  assert.match(styles, /--accent:\s*#A8402F/i);
  assert.doesNotMatch(styles, /--accent:\s*#DD0000/i);
});

test('page and content scrolling never shift the centered UI horizontally', () => {
  const styles = fs.readFileSync(path.join(root, 'public/css/styles.css'), 'utf8');
  assert.match(styles, /html\s*\{[^}]*overflow-y:\s*scroll[^}]*overflow-x:\s*clip[^}]*overscroll-behavior-x:\s*none[^}]*scrollbar-gutter:\s*stable both-edges/s);
  assert.match(styles, /body\s*\{[^}]*overflow-x:\s*clip[^}]*overscroll-behavior-x:\s*none/s);
  assert.match(styles, /\.scrolling-content\s*\{[^}]*overflow-y:\s*auto[^}]*overflow-x:\s*hidden/s);
});

test('Mac trackpad horizontal gestures are blocked while vertical scrolling remains available', async () => {
  const dom = await createRuntimeApp(trial(2));
  const horizontal = new dom.window.WheelEvent('wheel', {
    deltaX: 80, deltaY: 4, cancelable: true,
  });
  const vertical = new dom.window.WheelEvent('wheel', {
    deltaX: 4, deltaY: 80, cancelable: true,
  });
  dom.window.dispatchEvent(horizontal);
  dom.window.dispatchEvent(vertical);
  assert.equal(horizontal.defaultPrevented, true);
  assert.equal(vertical.defaultPrevented, false);
  dom.window.close();
});
