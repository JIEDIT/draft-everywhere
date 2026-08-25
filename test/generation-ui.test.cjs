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
const styles = fs.readFileSync(path.join(root, 'public/css/styles.css'), 'utf8');

function ready(platform, body = `Ready ${platform}`) {
  return {
    platform,
    status: 'ready',
    result: {
      body,
      tags: 'AI, Design',
      ...(platform === 'medium' ? { title: 'Title', subtitle: 'Subtitle' } : {}),
      ...(platform === 'substack' ? { title: 'Newsletter title', preview_text: 'Preview', note: 'Short promotional note.' } : {}),
      exposure_tip_zh: '提示',
      exposure_tip_en: 'Tip',
    },
    metrics: { bodyLength: Array.from(body).length, combinedLength: Array.from(body).length + 12 },
  };
}

test('Substack renders an independently editable promotional note and persists edits', async () => {
  const dom = createApp(async () => response(ready('substack')));
  await generate(dom.window, ['substack']);

  const card = dom.window.document.querySelector('.card[data-platform="substack"]');
  const note = card.querySelector('[data-role="note"]');
  assert.ok(note);
  assert.equal(note.value, 'Short promotional note.');
  assert.match(card.querySelector('[data-role="note-label"]').textContent, /SUBSTACK NOTE/i);

  note.value = 'Edited note.';
  note.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  const saved = JSON.parse(dom.window.localStorage.getItem('draft-everywhere:workspace:v1'));
  assert.equal(saved.platforms.substack.note, 'Edited note.');
  dom.window.close();
});

function response(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => payload,
  };
}

function createApp(fetchImpl) {
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://draft-everywhere.test/',
    pretendToBeVisual: true,
  });
  dom.window.fetch = (url, options) => url === '/api/capabilities'
    ? response({
      mode: 'trial', providerSelection: false, modelSelection: false,
      usage: { limit: 3, used: 0, remaining: 3, resetsAt: '2026-08-18T00:00:00.000Z' },
      githubUrl: 'https://github.com/JIEDIT/draft-everywhere',
    })
    : fetchImpl(url, options);
  dom.window.eval(constraints);
  dom.window.eval(twitterText);
  dom.window.eval(counting);
  dom.window.eval(app);
  return dom;
}

function select(window, selected) {
  window.document.querySelectorAll('.plat-toggle input').forEach(checkbox => {
    checkbox.checked = selected.includes(checkbox.value);
    checkbox.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
}

async function generate(window, selected) {
  await new Promise(resolve => window.setTimeout(resolve, 0));
  window.document.getElementById('draft').value = 'Source';
  select(window, selected);
  window.document.getElementById('go').click();
  await new Promise(resolve => window.setTimeout(resolve, 25));
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function waitFor(window, predicate, timeout = 500) {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt >= timeout) throw new Error('Timed out waiting for condition');
    await new Promise(resolve => window.setTimeout(resolve, 5));
  }
}

test('each selected platform displays independent progress inside its own tab without a panel or dropdown', async () => {
  const calls = [];
  const requests = {};
  const dom = createApp(async (_url, options) => {
    const payload = JSON.parse(options.body);
    calls.push(payload);
    requests[payload.platform] = deferred();
    return requests[payload.platform].promise;
  });

  await generate(dom.window, ['twitter', 'medium', 'xhs']);

  assert.equal(calls.length, 2);
  assert.equal(new Set(calls.map(call => call.requestId)).size, 1);
  assert.equal(dom.window.document.querySelectorAll('.rtab.processing').length, 3);
  assert.equal(dom.window.document.querySelectorAll('.rtab[aria-busy="true"]').length, 3);
  assert.equal(dom.window.document.querySelectorAll('.rtab [aria-live="polite"]').length, 3);
  assert.match(dom.window.document.querySelector('.rtab[data-platform="twitter"]').textContent, /Generating/);
  assert.equal(dom.window.document.querySelector('.platform-jobs'), null);
  assert.equal(dom.window.document.querySelector('select'), null);
  Object.entries(requests).forEach(([platform, request]) => request.resolve(response(ready(platform))));
  await waitFor(dom.window, () => Object.keys(requests).length === 3);
  Object.entries(requests).forEach(([platform, request]) => request.resolve(response(ready(platform))));
  await waitFor(dom.window, () => dom.window.document.querySelectorAll('.card').length === 3);
  dom.window.close();
});

test('first completed platform becomes active and later completion does not force-switch tabs', async () => {
  const requests = {};
  const dom = createApp(async (_url, options) => {
    const { platform } = JSON.parse(options.body);
    requests[platform] = deferred();
    return requests[platform].promise;
  });

  await generate(dom.window, ['twitter', 'medium', 'xhs']);
  requests.medium.resolve(response(ready('medium')));
  await new Promise(resolve => dom.window.setTimeout(resolve, 25));

  const mediumTab = dom.window.document.querySelector('.rtab[data-platform="medium"]');
  assert.equal(mediumTab.classList.contains('processing'), false);
  assert.equal(mediumTab.classList.contains('active'), true);
  assert.equal(mediumTab.disabled, false);
  assert.doesNotMatch(mediumTab.textContent, /Ready|已完成/i);

  requests.twitter.resolve(response(ready('twitter')));
  await new Promise(resolve => dom.window.setTimeout(resolve, 25));

  assert.equal(mediumTab.classList.contains('active'), true);
  assert.equal(dom.window.document.querySelector('.rtab[data-platform="twitter"]').classList.contains('active'), false);
  requests.xhs.resolve(response(ready('xhs')));
  await new Promise(resolve => dom.window.setTimeout(resolve, 25));
  dom.window.close();
});

test('validating and retrying states remain independent and retry shows its bounded attempt', async () => {
  const requests = [];
  const dom = createApp(async () => {
    const request = deferred();
    requests.push(request);
    return request.promise;
  });

  await generate(dom.window, ['twitter']);
  requests[0].resolve(response(ready('twitter')));
  await new Promise(resolve => dom.window.setTimeout(resolve, 0));
  assert.match(dom.window.document.querySelector('.rtab[data-platform="twitter"]').textContent, /Validating/);

  await new Promise(resolve => dom.window.setTimeout(resolve, 25));
  const firstTab = dom.window.document.querySelector('.rtab[data-platform="twitter"]');
  assert.equal(firstTab.classList.contains('processing'), false);

  const failedDom = createApp(async () => {
    const request = deferred();
    requests.push(request);
    return request.promise;
  });
  await generate(failedDom.window, ['xhs']);
  requests[1].resolve(response({ platform: 'xhs', status: 'failed', error: { message: 'invalid' } }, 422));
  await new Promise(resolve => failedDom.window.setTimeout(resolve, 0));
  failedDom.window.document.querySelector('[data-role="retry-platform"]').click();
  assert.match(failedDom.window.document.querySelector('.rtab[data-platform="xhs"]').textContent, /Retrying… \(1\/2\)/);
  requests[2].resolve(response(ready('xhs')));
  await new Promise(resolve => failedDom.window.setTimeout(resolve, 25));
  dom.window.close();
  failedDom.window.close();
});

test('invalid generated content stays hidden while only that platform adjusts length', async () => {
  const calls = [];
  const repairRequest = deferred();
  const invalidResponse = { text: 'invalid over-limit block', stopReason: 'end_turn' };
  const dom = createApp(async (_url, options) => {
    const body = JSON.parse(options.body);
    calls.push(body);
    if(body.action === 'generate'){
      return response({
        platform: 'xhs', status: 'needs_repair', invalidResponse,
        validation: { errors: ['body is 1001, maximum 1000'], metrics: { bodyLength: 1001 } },
      });
    }
    return repairRequest.promise;
  });

  await generate(dom.window, ['xhs']);

  const tab = dom.window.document.querySelector('.rtab[data-platform="xhs"]');
  assert.match(tab.textContent, /Adjusting length… \(1\/2\)/);
  assert.equal(dom.window.document.querySelector('.card[data-platform="xhs"]'), null);
  assert.equal(calls.length, 2);
  assert.equal(calls[1].platform, 'xhs');
  assert.equal(calls[1].action, 'repair');
  assert.deepEqual(calls[1].invalidResponse, invalidResponse);

  repairRequest.resolve(response(ready('xhs', 'Valid repaired body')));
  await new Promise(resolve => dom.window.setTimeout(resolve, 25));
  assert.ok(dom.window.document.querySelector('.card[data-platform="xhs"]'));
  assert.doesNotMatch(dom.window.document.querySelector('.rtab[data-platform="xhs"]').textContent, /调整长度|Adjusting/);
  dom.window.close();
});

test('failed platform keeps retry on its tab and retry does not change successful tabs', async () => {
  const callCounts = {};
  const dom = createApp(async (_url, options) => {
    const { platform } = JSON.parse(options.body);
    callCounts[platform] = (callCounts[platform] || 0) + 1;
    if(platform === 'xhs' && callCounts[platform] === 1){
      return response({ platform, status: 'failed', error: { type: 'validation_error', message: 'too long' } }, 422);
    }
    return response(ready(platform));
  });

  await generate(dom.window, ['twitter', 'medium', 'xhs']);

  assert.ok(dom.window.document.querySelector('.card[data-platform="twitter"]'));
  assert.ok(dom.window.document.querySelector('.card[data-platform="medium"]'));
  assert.equal(dom.window.document.querySelector('.card[data-platform="xhs"]'), null);
  const failedTab = dom.window.document.querySelector('.rtab.failed[data-platform="xhs"]');
  const retry = failedTab.querySelector('[data-role="retry-platform"]');
  assert.ok(retry);
  assert.match(failedTab.textContent, /Retry/);
  assert.equal(failedTab.getAttribute('aria-busy'), null);
  assert.equal(Array.from(dom.window.document.querySelectorAll('[data-role="retry-platform"]')).filter(button => !button.hidden).length, 1);

  dom.window.document.querySelector('.rtab[data-platform="medium"]').click();
  const activeBeforeRetry = dom.window.document.querySelector('.rtab.active').dataset.platform;

  retry.click();
  await waitFor(dom.window, () => dom.window.document.querySelector('.card[data-platform="xhs"]'));

  assert.equal(callCounts.twitter, 1);
  assert.equal(callCounts.medium, 1);
  assert.equal(callCounts.xhs, 2);
  assert.ok(dom.window.document.querySelector('.card[data-platform="xhs"]'));
  assert.equal(dom.window.document.querySelector('.rtab.active').dataset.platform, activeBeforeRetry);
  assert.equal(dom.window.document.querySelector('.rtab[data-platform="twitter"]').classList.contains('failed'), false);
  dom.window.close();
});

test('combined counter warns for X when current text plus current hashtags exceeds 280', async () => {
  const body = 'a'.repeat(275);
  const dom = createApp(async (_url, options) => response(ready(JSON.parse(options.body).platform, body)));

  await generate(dom.window, ['twitter']);

  const card = dom.window.document.querySelector('.card[data-platform="twitter"]');
  assert.match(card.querySelector('[data-role="segment-meter"]').textContent, /275 \/ 280.*(?:余 5|5 remaining)/);
  assert.match(card.querySelector('[data-role="combined-meter"]').textContent, /280/);
  assert.equal(card.querySelector('[data-role="combined-meter"]').classList.contains('over'), true);
  dom.window.close();
});

test('content copy remains body-only after independent generation', async () => {
  const dom = createApp(async (_url, options) => response(ready(JSON.parse(options.body).platform, 'Body only')));
  Object.defineProperty(dom.window, 'isSecureContext', { value: true });
  const copied = [];
  Object.defineProperty(dom.window.navigator, 'clipboard', { value: { writeText: async text => copied.push(text) } });

  await generate(dom.window, ['twitter']);
  dom.window.document.querySelector('[data-role="copy-content"]').click();
  await new Promise(resolve => dom.window.setTimeout(resolve, 0));

  assert.deepEqual(copied, ['Body only']);
  dom.window.close();
});

test('X thread renders independently editable post segments with weighted counters', async () => {
  const thread = '1/2 First post\n---\n2/2 中文😀 https://example.com/long/path';
  const dom = createApp(async (_url, options) => response(ready(JSON.parse(options.body).platform, thread)));
  await generate(dom.window, ['twitter']);

  const card = dom.window.document.querySelector('.card[data-platform="twitter"]');
  const segments = card.querySelectorAll('[data-role="thread-segment"]');
  assert.equal(segments.length, 2);
  assert.equal(segments[0].querySelector('[data-role="thread-label"]').textContent, 'POST 1');
  assert.match(segments[0].querySelector('[data-role="segment-meter"]').textContent, /14 \/ 280/);
  assert.match(segments[1].querySelector('[data-role="segment-meter"]').textContent, /34 \/ 280/);
  assert.match(dom.window.document.querySelector('.rtab[data-platform="twitter"]').textContent, /2 POSTS/);
  dom.window.close();
});

test('near-limit and over-limit edits show remaining or exceeded text and guard Copy Text', async () => {
  const dom = createApp(async (_url, options) => response(ready(JSON.parse(options.body).platform, '文'.repeat(900))));
  await generate(dom.window, ['xhs']);

  const card = dom.window.document.querySelector('.card[data-platform="xhs"]');
  const body = card.querySelector('[data-role="body"]');
  const meter = card.querySelector('[data-role="meter"]');
  const copy = card.querySelector('[data-role="copy-content"]');
  assert.match(meter.textContent, /900 \/ 1000 chars · 100 remaining/);
  assert.equal(copy.disabled, false);

  body.value = '文'.repeat(1001);
  body.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.equal(body.value.length, 1001);
  assert.match(meter.textContent, /1001 \/ 1000 chars · 1 over/);
  assert.equal(copy.disabled, true);
  assert.match(card.querySelector('[data-role="copy-limit-message"]').textContent, /1000/);
  assert.match(card.querySelector('[data-role="copy-limit-message"]').textContent, /Copy/);

  body.value = '文'.repeat(999);
  body.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  assert.equal(copy.disabled, false);
  assert.equal(card.querySelector('[data-role="copy-limit-message"]').hidden, true);
  dom.window.close();
});

test('all platform tabs use the same stable scrollable content viewport', async () => {
  const longBody = Array.from({ length: 30 }, (_, index) => `第 ${index + 1} 段内容`).join('\n\n');
  const platforms = ['twitter', 'substack', 'medium', 'xhs', 'linkedin'];
  const dom = createApp(async (_url, options) => response(ready(JSON.parse(options.body).platform, longBody)));
  await generate(dom.window, platforms);
  await waitFor(dom.window, () => dom.window.document.querySelectorAll('.card').length === platforms.length);
  const style = dom.window.document.createElement('style');
  style.textContent = styles;
  dom.window.document.head.appendChild(style);

  const twitterViewport = dom.window.document.querySelector('.card[data-platform="twitter"] [data-role="threadeditor"]');
  assert.equal(twitterViewport.classList.contains('scrolling-content'), true);
  const twitterStyle = dom.window.getComputedStyle(twitterViewport);
  assert.match(twitterStyle.boxShadow, /inset.*1px/);
  assert.equal(twitterStyle.paddingLeft, '12px');
  assert.equal(twitterStyle.paddingRight, '12px');

  for (const platform of ['substack', 'medium', 'xhs', 'linkedin']) {
    const body = dom.window.document.querySelector(`.card[data-platform="${platform}"] [data-role="body"]`);
    assert.equal(body.classList.contains('scrolling-content'), true, `${platform} should use the shared viewport`);
    const bodyStyle = dom.window.getComputedStyle(body);
    assert.match(bodyStyle.boxShadow, /inset.*1px/);
    assert.equal(bodyStyle.paddingLeft, '12px');
    assert.equal(bodyStyle.paddingRight, '12px');
    assert.equal(body.style.height, '');
  }

  const body = dom.window.document.querySelector('.card[data-platform="medium"] [data-role="body"]');
  const insertionPoint = body.value.indexOf('第 20 段');
  body.setSelectionRange(insertionPoint, insertionPoint);
  body.scrollTop = 240;
  body.value = body.value.slice(0, insertionPoint) + '新增' + body.value.slice(insertionPoint);
  body.setSelectionRange(insertionPoint + 2, insertionPoint + 2);
  body.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

  assert.equal(body.style.height, '');
  assert.equal(body.selectionStart, insertionPoint + 2);
  assert.equal(body.scrollTop, 240);
  dom.window.close();
});

test('one over-limit X segment is identified and preserved while Copy Text is disabled', async () => {
  const dom = createApp(async (_url, options) => response(ready(JSON.parse(options.body).platform, '1/2 Valid\n---\n2/2 Valid')));
  await generate(dom.window, ['twitter']);
  const card = dom.window.document.querySelector('.card[data-platform="twitter"]');
  const editors = card.querySelectorAll('[data-role="segment-body"]');
  editors[1].value = '2/2 ' + 'a'.repeat(277);
  editors[1].dispatchEvent(new dom.window.Event('input', { bubbles: true }));

  assert.equal(editors[1].value.length, 281);
  assert.match(card.querySelectorAll('[data-role="segment-meter"]')[1].textContent, /281 \/ 280.*(?:超出 1|1 over)/);
  assert.equal(card.querySelector('[data-role="copy-content"]').disabled, true);
  assert.match(card.querySelector('[data-role="copy-limit-message"]').textContent, /POST 2/);
  dom.window.close();
});

test('LinkedIn shows its hard maximum while Medium and Substack remain informational', async () => {
  const dom = createApp(async (_url, options) => response(ready(JSON.parse(options.body).platform, 'a'.repeat(42))));
  await generate(dom.window, ['linkedin', 'medium', 'substack']);
  await waitFor(dom.window, () => dom.window.document.querySelectorAll('.card').length === 3);
  assert.match(dom.window.document.querySelector('.card[data-platform="linkedin"] [data-role="meter"]').textContent, /^42 \/ 3000/);
  for(const platform of ['medium', 'substack']){
    const text = dom.window.document.querySelector(`.card[data-platform="${platform}"] [data-role="meter"]`).textContent;
    assert.match(text, /^42 (?:chars|字符)$/);
    assert.doesNotMatch(text, /\/|unlimited/i);
  }
  dom.window.close();
});

test('all platform cards render the same continuous content divider', async () => {
  const platforms = ['twitter', 'substack', 'medium', 'xhs', 'linkedin'];
  const dom = createApp(async (_url, options) => response(ready(JSON.parse(options.body).platform)));
  await generate(dom.window, platforms);
  await waitFor(dom.window, () => dom.window.document.querySelectorAll('.card').length === platforms.length);

  for (const platform of platforms) {
    const card = dom.window.document.querySelector(`.card[data-platform="${platform}"]`);
    const divider = card.querySelector('[data-role="content-divider"]');
    assert.ok(divider, `${platform} should render the shared content divider`);
    assert.equal(divider.children.length, 0, `${platform} divider should be one continuous element`);
  }
  dom.window.close();
});

test('text-only and optional hashtag counts stay separate and share the header without overlap markup', async () => {
  const dom = createApp(async (_url, options) => response(ready(JSON.parse(options.body).platform, 'a'.repeat(250))));
  await generate(dom.window, ['twitter']);
  const card = dom.window.document.querySelector('.card[data-platform="twitter"]');
  const header = card.querySelector('.card-head');
  assert.ok(header.querySelector('.length-meters'));
  assert.ok(header.querySelector('[data-role="copy-content"]'));
  assert.match(card.querySelector('[data-role="combined-meter"]').textContent, /With hashtags|话题标签/);
  assert.match(card.querySelector('[data-role="combined-meter"]').textContent, /262 \/ 280/);
  dom.window.close();
});

test('multi-platform generation limits upstream concurrency while preserving independent completion', async () => {
  let active = 0;
  let maximumActive = 0;
  const pending = [];
  const dom = createApp(async (_url, options) => {
    const { platform } = JSON.parse(options.body);
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    const request = deferred();
    pending.push({ platform, request });
    return request.promise.finally(() => { active -= 1; });
  });

  const generation = generate(dom.window, ['twitter', 'substack', 'medium', 'xhs', 'linkedin']);
  await new Promise(resolve => dom.window.setTimeout(resolve, 10));
  assert.equal(maximumActive, 2);
  assert.equal(pending.length, 2);

  for(let completed = 0; completed < 5; completed++){
    while(pending.length === 0) await new Promise(resolve => dom.window.setTimeout(resolve, 5));
    const next = pending.shift();
    next.request.resolve(response(ready(next.platform)));
    await new Promise(resolve => dom.window.setTimeout(resolve, 10));
  }
  await generation;
  await new Promise(resolve => dom.window.setTimeout(resolve, 25));
  assert.equal(dom.window.document.querySelectorAll('.card').length, 5);
  dom.window.close();
});

test('exhausted transient Worker errors automatically retry only that platform twice', async () => {
  const counts = { twitter: 0, medium: 0 };
  const dom = createApp(async (_url, options) => {
    const { platform } = JSON.parse(options.body);
    counts[platform] += 1;
    if(platform === 'twitter' && counts.twitter < 3){
      return response({ platform, status: 'failed', error: { type: 'upstream_error', message: 'temporary upstream failure' } }, 502);
    }
    return response(ready(platform));
  });

  await generate(dom.window, ['twitter', 'medium']);
  await new Promise(resolve => dom.window.setTimeout(resolve, 900));

  assert.equal(counts.twitter, 3);
  assert.equal(counts.medium, 1);
  assert.ok(dom.window.document.querySelector('.card[data-platform="twitter"]'));
  assert.ok(dom.window.document.querySelector('.card[data-platform="medium"]'));
  assert.equal(dom.window.document.querySelector('.rtab[data-platform="twitter"]').classList.contains('failed'), false);
  dom.window.close();
});
