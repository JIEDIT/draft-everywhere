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

const platforms = {
  twitter: { body: 'Generated X text', tags: 'AI, Design' },
  linkedin: { body: 'Generated LinkedIn text', tags: 'AI, Future of Work' },
  xhs: { body: '生成的小红书正文', tags: '人工智能, 设计' },
  substack: { title: 'Newsletter title', preview_text: 'Newsletter preview', body: 'Article body', note: 'Promotional note', tags: 'AI, Design' },
  medium: { title: 'Story title', subtitle: 'Story subtitle', body: 'First paragraph.\n\nSecond paragraph.', tags: 'AI, Future of Work' },
};

function createApp(platformState = platforms) {
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'https://draft-everywhere.test/',
    pretendToBeVisual: true,
  });
  dom.window.localStorage.setItem('draft-everywhere:workspace:v1', JSON.stringify({
    draft: 'Saved draft',
    platforms: platformState,
    activePlatform: Object.keys(platformState)[0],
  }));
  dom.window.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ mode: 'local', maxPlatforms: 5, githubUrl: 'https://example.test/repo' }),
  });
  dom.window.eval(constraints);
  dom.window.eval(twitterText);
  dom.window.eval(counting);
  dom.window.eval(app);
  return dom;
}

function installClipboard(window, writeText) {
  Object.defineProperty(window, 'isSecureContext', {
    configurable: true,
    value: true,
  });
  Object.defineProperty(window.navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
}

async function clickAndFlush(window, button) {
  button.click();
  await new Promise(resolve => window.setTimeout(resolve, 0));
}

test('content copy uses current edited fields, preserves paragraphs, and excludes tags', async () => {
  const dom = createApp({ twitter: platforms.twitter });
  const { window } = dom;
  const card = window.document.querySelector('.card[data-platform="twitter"]');
  const copied = [];
  installClipboard(window, async text => copied.push(text));
  card.querySelector('[data-role="body"]').value = 'Edited first paragraph.\n\nEdited second paragraph.';

  await clickAndFlush(window, card.querySelector('[data-role="copy-content"]'));

  assert.deepEqual(copied, ['Edited first paragraph.\n\nEdited second paragraph.']);
  assert.doesNotMatch(copied[0], /#AI|#Design/);
  dom.window.close();
});

test('Medium content copy follows title, subtitle, body publishing order', async () => {
  const dom = createApp({ medium: platforms.medium });
  const { window } = dom;
  const card = window.document.querySelector('.card[data-platform="medium"]');
  const copied = [];
  installClipboard(window, async text => copied.push(text));

  await clickAndFlush(window, card.querySelector('[data-role="copy-content"]'));

  assert.deepEqual(copied, ['Story title\n\nStory subtitle\n\nFirst paragraph.\n\nSecond paragraph.']);
  dom.window.close();
});

test('Substack content copy includes the newsletter and its separate promotional note', async () => {
  const dom = createApp({ substack: platforms.substack });
  const { window } = dom;
  const card = window.document.querySelector('.card[data-platform="substack"]');
  const copied = [];
  installClipboard(window, async text => copied.push(text));

  await clickAndFlush(window, card.querySelector('[data-role="copy-content"]'));

  assert.deepEqual(copied, ['Newsletter title\n\nNewsletter preview\n\nArticle body\n\nPromotional note']);
  dom.window.close();
});

test('hashtag copy reflects normalized manual additions and deletions in visible order', async () => {
  const dom = createApp({ twitter: platforms.twitter });
  const { window } = dom;
  const card = window.document.querySelector('.card[data-platform="twitter"]');
  const input = card.querySelector('[data-role="chipinput"]');
  input.value = 'Future of Work';
  input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  assert.equal(card.querySelectorAll('.chip')[2].firstChild.textContent, '#FutureofWork');
  card.querySelector('.chip-x').click();
  const copied = [];
  installClipboard(window, async text => copied.push(text));

  await clickAndFlush(window, card.querySelector('[data-role="copy-tags"]'));

  assert.deepEqual(copied, ['#Design #FutureofWork']);
  dom.window.close();
});

test('all five platforms display and copy space-separated hashtags', async () => {
  const cases = [
    ['twitter', '#AI #Design'],
    ['linkedin', '#AI #FutureofWork'],
    ['xhs', '#人工智能 #设计'],
    ['substack', '#AI #Design'],
    ['medium', '#AI #FutureofWork'],
  ];
  for (const [platform, expected] of cases) {
    const dom = createApp({ [platform]: platforms[platform] });
    const { window } = dom;
    const card = window.document.querySelector(`.card[data-platform="${platform}"]`);
    const displayed = Array.from(card.querySelectorAll('.chip')).map(chip => chip.firstChild.textContent);
    const copied = [];
    installClipboard(window, async text => copied.push(text));

    await clickAndFlush(window, card.querySelector('[data-role="copy-tags"]'));

    assert.deepEqual(copied, [expected], platform);
    assert.equal(displayed.join(' '), expected, platform);
    dom.window.close();
  }
});

test('generated hashtags normalize prefixes and spaces in the visible editable state', async () => {
  const dom = createApp({ twitter: { body: 'Text', tags: '#AI, ##Design Systems, R&D' } });
  const { window } = dom;
  const card = window.document.querySelector('.card[data-platform="twitter"]');
  const copied = [];
  installClipboard(window, async text => copied.push(text));

  await clickAndFlush(window, card.querySelector('[data-role="copy-tags"]'));

  assert.deepEqual(copied, ['#AI #DesignSystems #RD']);
  assert.deepEqual(
    Array.from(card.querySelectorAll('.chip')).map(chip => chip.firstChild.textContent),
    ['#AI', '#DesignSystems', '#RD'],
  );
  assert.equal(card.querySelectorAll('.chip').length, 3);
  dom.window.close();
});

test('case-insensitive duplicate hashtags are removed while first spelling and order are preserved', async () => {
  const dom = createApp({ medium: { body: 'Text', tags: '#AI, Design, #ai, Future Of Work, design, Web Design' } });
  const { window } = dom;
  const card = window.document.querySelector('.card[data-platform="medium"]');
  const input = card.querySelector('[data-role="chipinput"]');
  input.value = '##WEB DESIGN';
  input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  const copied = [];
  installClipboard(window, async text => copied.push(text));

  await clickAndFlush(window, card.querySelector('[data-role="copy-tags"]'));

  assert.deepEqual(copied, ['#AI #Design #FutureOfWork #WebDesign']);
  assert.deepEqual(
    Array.from(card.querySelectorAll('.chip')).map(chip => chip.firstChild.textContent),
    ['#AI', '#Design', '#FutureOfWork', '#WebDesign'],
  );
  dom.window.close();
});

test('empty tags hide their copy control and adding a tag reveals it', () => {
  const dom = createApp({ substack: { body: 'Article', tags: '' } });
  const { window } = dom;
  const card = window.document.querySelector('.card[data-platform="substack"]');
  const button = card.querySelector('[data-role="copy-tags"]');
  assert.equal(button.hidden, true);
  assert.equal(button.closest('.tag-copy-row').hidden, true);

  const input = card.querySelector('[data-role="chipinput"]');
  input.value = 'New tag';
  input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

  assert.equal(button.hidden, false);
  assert.equal(button.closest('.tag-copy-row').hidden, false);
  assert.equal(card.querySelector('.chip').firstChild.textContent, '#Newtag');
  dom.window.close();
});

test('copy controls expose platform-aware accessible labels in both languages', () => {
  const dom = createApp();
  const { window } = dom;
  const medium = window.document.querySelector('.card[data-platform="medium"]');
  const xhs = window.document.querySelector('.card[data-platform="xhs"]');
  assert.equal(medium.querySelector('[data-role="copy-content"]').getAttribute('aria-label'), '复制 Medium 故事');
  assert.equal(medium.querySelector('[data-role="copy-tags"]').getAttribute('aria-label'), '复制 Medium 话题标签');
  assert.equal(xhs.querySelector('[data-role="copy-tags"]').textContent, '复制话题标签');

  window.document.getElementById('langToggle').click();

  assert.equal(medium.querySelector('[data-role="copy-content"]').getAttribute('aria-label'), 'Copy Medium story');
  assert.equal(medium.querySelector('[data-role="copy-tags"]').getAttribute('aria-label'), 'Copy Medium hashtags');
  assert.equal(medium.querySelector('[data-role="copy-tags"]').textContent, 'COPY HASHTAGS');
  assert.equal(medium.querySelector('[data-role="copy-content"]').textContent, 'COPY STORY');
  dom.window.close();
});

test('successful and failed clipboard writes show truthful temporary feedback', async () => {
  const successDom = createApp({ twitter: platforms.twitter });
  const successButton = successDom.window.document.querySelector('[data-role="copy-content"]');
  installClipboard(successDom.window, async () => {});
  await clickAndFlush(successDom.window, successButton);
  assert.equal(successButton.textContent, '已复制');
  successDom.window.close();

  const failureDom = createApp({ twitter: platforms.twitter });
  const failureButton = failureDom.window.document.querySelector('[data-role="copy-content"]');
  installClipboard(failureDom.window, async () => { throw new Error('denied'); });
  failureDom.window.document.execCommand = () => false;
  await clickAndFlush(failureDom.window, failureButton);
  assert.equal(failureButton.textContent, '复制失败');
  assert.notEqual(failureButton.textContent, '已复制');
  failureDom.window.close();
});
