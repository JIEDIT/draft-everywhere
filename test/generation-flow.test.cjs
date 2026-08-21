const test = require('node:test');
const assert = require('node:assert/strict');

let workerPromise;
function loadWorker() {
  workerPromise ||= import('../src/local-worker.js').then(module => module.default);
  return workerPromise;
}

function env() {
  return {
    ANTHROPIC_API_KEY: 'test-key',
    ASSETS: { fetch: async () => new Response('asset') },
  };
}

function block(platform, fields) {
  return `@@PLATFORM:${platform}@@\n${Object.entries(fields).map(([key, value]) =>
    `@@FIELD:${key}@@\n${value}`).join('\n')}\n@@END@@`;
}

function anthropic(text, stopReason = 'end_turn', status = 200) {
  return new Response(JSON.stringify({
    content: [{ type: 'text', text }],
    stop_reason: stopReason,
  }), { status, headers: { 'Content-Type': 'application/json' } });
}

async function generate(platform, fetchImpl, extra = {}) {
  const originalFetch = global.fetch;
  global.fetch = fetchImpl;
  try {
    const worker = await loadWorker();
    const response = await worker.fetch(new Request('https://local.test/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '127.0.0.1' },
      body: JSON.stringify({
        action: 'generate', draft: 'A source draft', platform, requestId: 'test-run',
        provider: 'anthropic', model: 'claude-sonnet-5', ...extra,
      }),
    }), env());
    return { response, payload: await response.json() };
  } finally {
    global.fetch = originalFetch;
  }
}

async function repair(platform, invalidResponse, fetchImpl, attempt = 1) {
  return generate(platform, fetchImpl, { action: 'repair', invalidResponse, repairAttempt: attempt });
}

test('X accepts a weighted single post at exactly 280 characters', async () => {
  const body = '😀' + 'a'.repeat(278);
  const { response, payload } = await generate('twitter', async () => anthropic(block('twitter', {
    body,
    tags: 'AI',
    exposure_tip_zh: '提示',
    exposure_tip_en: 'Tip',
  })));

  assert.equal(response.status, 200);
  assert.equal(payload.status, 'ready');
  assert.equal(payload.metrics.bodyLength, 280);
  assert.deepEqual(payload.metrics.segmentLengths, [280]);
});

test('generation request keeps the raw draft as the only factual source and adapts length to it', async () => {
  let requestBody;
  const { payload } = await generate('linkedin', async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return anthropic(block('linkedin', {
      body: 'A short, scannable post.', tags: 'Design', exposure_tip_zh: '提示', exposure_tip_en: 'Tip',
    }));
  }, { draft: 'I tested a small design change.' });

  assert.equal(payload.status, 'ready');
  const instructions = `${requestBody.system.map(item => item.text).join('\n')}\n${requestBody.messages[0].content}`;
  assert.match(instructions, /only factual source/i);
  assert.match(instructions, /do not invent/i);
  assert.match(instructions, /short source.*short/i);
  assert.doesNotMatch(instructions, /1,?800\s*[–-]\s*2,?700/i);
});

test('platform prompts preserve native presentation without manufacturing substance', async () => {
  const captured = {};
  const valid = {
    twitter: { body: 'One clear point.', tags: '', exposure_tip_zh: '提示', exposure_tip_en: 'Tip' },
    linkedin: { body: 'One clear point.', tags: '', exposure_tip_zh: '提示', exposure_tip_en: 'Tip' },
  };

  for (const platform of Object.keys(valid)) {
    const { payload } = await generate(platform, async (_url, options) => {
      captured[platform] = JSON.parse(options.body);
      return anthropic(block(platform, valid[platform]));
    });
    assert.equal(payload.status, 'ready');
  }

  const xInstructions = captured.twitter.messages[0].content;
  assert.match(xInstructions, /thread only when the raw draft contains multiple substantive points/i);
  assert.match(xInstructions, /280/);

  const linkedInInstructions = captured.linkedin.messages[0].content;
  assert.match(linkedInInstructions, /busy professionals/i);
  assert.match(linkedInInstructions, /short paragraphs/i);
  assert.match(linkedInInstructions, /emoji.*visual anchors/i);
});

test('X repairs an over-limit post into a thread and validates every numbered segment', async () => {
  const calls = [];
  const over = 'a'.repeat(281);
  const repaired = '1/2 ' + 'a'.repeat(275) + '\n---\n2/2 ' + 'b'.repeat(275);
  const first = await generate('twitter', async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return anthropic(block('twitter', { body: over, tags: 'AI', exposure_tip_zh: '提示', exposure_tip_en: 'Tip' }));
  });
  assert.equal(first.payload.status, 'needs_repair');
  assert.equal(first.payload.validation.metrics.segmentLengths[0], 281);
  assert.equal(first.payload.result, undefined);

  const second = await repair('twitter', first.payload.invalidResponse, async (_url, options) => {
    calls.push(JSON.parse(options.body));
    return anthropic(block('twitter', { body: repaired, tags: 'AI', exposure_tip_zh: '提示', exposure_tip_en: 'Tip' }));
  });
  assert.equal(calls.length, 2);
  assert.match(calls[1].messages.at(-1).content, /281/);
  assert.match(calls[1].messages.at(-1).content, /rewrite/i);
  assert.deepEqual(second.payload.metrics.segmentLengths, [279, 279]);
  assert.equal(second.payload.result.body, repaired);
});

test('X repairs an unnumbered thread and permits an explicitly empty hashtags field', async () => {
  let call = 0;
  const unnumbered = 'First post\n---\nSecond post';
  const numbered = '1/2 First post\n---\n2/2 Second post';
  const first = await generate('twitter', async () => {
    call += 1;
    return anthropic(block('twitter', {
      body: unnumbered,
      tags: '', exposure_tip_zh: '提示', exposure_tip_en: 'Tip',
    }));
  });
  const second = await repair('twitter', first.payload.invalidResponse, async () => {
    call += 1;
    return anthropic(block('twitter', { body: numbered, tags: '', exposure_tip_zh: '提示', exposure_tip_en: 'Tip' }));
  });
  assert.equal(call, 2);
  assert.equal(second.payload.result.body, numbered);
  assert.deepEqual(second.payload.result.tags, []);
});

test('Xiaohongshu and LinkedIn enforce Unicode body limits without slicing', async () => {
  for (const [platform, maximum] of [['xhs', 1000], ['linkedin', 3000]]) {
    let call = 0;
    const invalid = '文'.repeat(maximum + 1);
    const valid = '文'.repeat(maximum);
    const first = await generate(platform, async () => {
      call += 1;
      return anthropic(block(platform, {
        ...(platform === 'xhs' ? { title: '标题' } : {}),
        body: invalid,
        tags: '设计', exposure_tip_zh: '提示', exposure_tip_en: 'Tip',
      }));
    });
    assert.equal(first.payload.status, 'needs_repair', platform);
    const { payload } = await repair(platform, first.payload.invalidResponse, async () => {
      call += 1;
      return anthropic(block(platform, {
        ...(platform === 'xhs' ? { title: '标题' } : {}), body: valid,
        tags: '设计', exposure_tip_zh: '提示', exposure_tip_en: 'Tip',
      }));
    });
    assert.equal(call, 2, platform);
    assert.equal(payload.result.body, valid, platform);
    assert.equal(payload.metrics.bodyLength, maximum, platform);
  }
});

test('a max_tokens response is repaired and never returned as successful partial content', async () => {
  let call = 0;
  const partial = block('medium', { title: 'Partial', subtitle: 'Sub', body: 'cut off' }).replace('@@END@@', '');
  const complete = block('medium', {
    title: 'Complete', subtitle: 'Sub', body: 'Complete story.', tags: 'Writing',
    exposure_tip_zh: '提示', exposure_tip_en: 'Tip',
  });
  const first = await generate('medium', async () => {
    call += 1;
    return anthropic(partial, 'max_tokens');
  });
  assert.equal(first.payload.status, 'needs_repair');
  const { payload } = await repair('medium', first.payload.invalidResponse, async () => {
    call += 1;
    return anthropic(complete);
  });
  assert.equal(call, 2);
  assert.equal(payload.status, 'ready');
  assert.equal(payload.result.title, 'Complete');
  assert.notEqual(payload.result.title, 'Partial');
});

test('missing required fields trigger bounded repair and exhausted repair fails', async () => {
  let call = 0;
  const incomplete = block('substack', { title: 'Only a title', body: 'Body' });
  const first = await generate('substack', async () => {
    call += 1;
    return anthropic(incomplete);
  });
  const second = await repair('substack', first.payload.invalidResponse, async () => {
    call += 1;
    return anthropic(incomplete);
  }, 1);
  const third = await repair('substack', second.payload.invalidResponse, async () => {
    call += 1;
    return anthropic(incomplete);
  }, 2);
  assert.equal(third.response.status, 422);
  assert.equal(third.payload.status, 'failed');
  assert.equal(third.payload.error.type, 'validation_error');
  assert.equal(call, 3);
});

test('Substack requires a separate promotional note and accepts a concise faithful version', async () => {
  const withoutNote = {
    title: 'A small test', preview_text: 'What changed.', body: 'I tested a small design change.',
    tags: 'Design', exposure_tip_zh: '提示', exposure_tip_en: 'Tip',
  };
  const first = await generate('substack', async () => anthropic(block('substack', withoutNote)));
  assert.equal(first.payload.status, 'needs_repair');
  assert.match(first.payload.validation.errors.join('; '), /missing required field note/);

  const note = 'A small design change, tested. Here is what changed.';
  const second = await repair('substack', first.payload.invalidResponse, async () => anthropic(block('substack', {
    ...withoutNote,
    note,
  })));
  assert.equal(second.payload.status, 'ready');
  assert.equal(second.payload.result.note, note);
});

test('transient upstream failure retries only the requested platform', async () => {
  let call = 0;
  const valid = block('linkedin', {
    body: 'Ready post', tags: 'AI', exposure_tip_zh: '提示', exposure_tip_en: 'Tip',
  });
  const { payload } = await generate('linkedin', async () => {
    call += 1;
    return call === 1
      ? new Response(JSON.stringify({ error: { type: 'overloaded_error', message: 'busy' } }), { status: 503 })
      : anthropic(valid);
  });

  assert.equal(call, 2);
  assert.equal(payload.platform, 'linkedin');
  assert.equal(payload.status, 'ready');
});

test('duplicate platform blocks and duplicate fields are rejected for repair', async () => {
  const validFields = { body: 'Post', tags: 'AI', exposure_tip_zh: '提示', exposure_tip_en: 'Tip' };
  const duplicateBlock = block('linkedin', validFields) + '\n' + block('linkedin', validFields);
  const duplicateField = block('linkedin', validFields).replace(
    '@@FIELD:tags@@\nAI',
    '@@FIELD:tags@@\nAI\n@@FIELD:tags@@\nDesign',
  );
  for(const text of [duplicateBlock, duplicateField]){
    const { payload } = await generate('linkedin', async () => anthropic(text));
    assert.equal(payload.status, 'needs_repair');
    assert.equal(payload.result, undefined);
  }
});

test('Medium and Substack accept complete long-form bodies without false hard-limit repair', async () => {
  for(const platform of ['medium', 'substack']){
    const fields = {
      title: 'Title', body: 'a'.repeat(12000), tags: 'Writing',
      exposure_tip_zh: '提示', exposure_tip_en: 'Tip',
      ...(platform === 'medium' ? { subtitle: 'Subtitle' } : { preview_text: 'Preview', note: 'Short note.' }),
    };
    const { payload } = await generate(platform, async () => anthropic(block(platform, fields)));
    assert.equal(payload.status, 'ready', platform);
    assert.equal(payload.metrics.bodyLength, 12000, platform);
  }
});
