const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function loadCounting() {
  const context = { globalThis: null };
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'public/shared/platform-constraints.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'public/shared/twitter-text-browser.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'public/shared/platform-counting.js'), 'utf8'), context);
  return context.PLATFORM_COUNTING;
}

test('X uses official weighted counting for Latin, Chinese, emoji, URLs, and numbering', () => {
  const counting = loadCounting();
  assert.equal(counting.measureText('twitter', 'a').length, 1);
  assert.equal(counting.measureText('twitter', '中').length, 2);
  assert.equal(counting.measureText('twitter', '😀').length, 2);
  assert.equal(counting.measureText('twitter', 'https://example.com/very/long/path').length, 23);
  assert.equal(counting.measureText('twitter', '1/6 中😀 https://example.com/x').length, 32);
});

test('non-X platforms count NFC-normalized Unicode code points consistently', () => {
  const counting = loadCounting();
  assert.equal(counting.measureText('xhs', '中文😀\n').length, 4);
  assert.equal(counting.measureText('linkedin', 'e\u0301').length, 1);
  assert.equal(counting.measureText('medium', '😀').length, 1);
});

test('platform measurement reports normal, near-limit, and over-limit states', () => {
  const counting = loadCounting();
  assert.deepEqual(
    JSON.parse(JSON.stringify(counting.measureText('xhs', '文'.repeat(900)))),
    { length: 900, limit: 1000, remaining: 100, overBy: 0, nearLimit: true, valid: true },
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(counting.measureText('linkedin', 'a'.repeat(3001)))),
    { length: 3001, limit: 3000, remaining: 0, overBy: 1, nearLimit: true, valid: false },
  );
  assert.equal(counting.measureText('substack', 'hello').limit, null);
  assert.equal(counting.measureText('medium', 'hello').valid, true);
});

test('X thread measurement validates each numbered segment and applies hashtags to the final post', () => {
  const counting = loadCounting();
  const result = counting.measureThread('1/2 First\n---\n2/2 Final', '#AI #Design');
  assert.deepEqual(Array.from(result.segments, segment => segment.length), [9, 9]);
  assert.equal(result.hashtagSegment, 2);
  assert.equal(result.combinedSegments[0].length, 9);
  assert.equal(result.combinedSegments[1].length, 21);
});
