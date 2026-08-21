(function(root){
  const constraints = {
    twitter: {
      label: 'X / Twitter', hardLimit: 280, target: 'one complete post, or a numbered thread',
      counting: 'twitter-text-v3-weighted', nearLimitRatio: 0.9, hashtagsOnThreadPost: 'last',
      requiredFields: ['body', 'tags', 'exposure_tip_zh', 'exposure_tip_en'], maxTokens: 2048,
      prompt: 'Maximum 280 weighted characters per post. Prefer one complete post with one clear point. Create a thread only when the raw draft contains multiple substantive points that cannot fit faithfully in one post. Separate thread posts with a line containing only ---. Include numbering such as 1/5 in every segment; numbering counts toward 280. Never cut text mechanically or add substance to fill a thread.',
    },
    xhs: {
      label: '小红书 · XHS', hardLimit: 1000, target: 'length proportional to the source',
      counting: 'nfc-unicode-code-points', nearLimitRatio: 0.9,
      requiredFields: ['title', 'body', 'tags', 'exposure_tip_zh', 'exposure_tip_en'], maxTokens: 3072,
      prompt: 'The body must be complete and at most 1,000 Unicode characters. Keep its length proportional to the source; a short source must produce a short post. Keep title and tags separate from body. Never pad, slice, or leave the body unfinished.',
    },
    linkedin: {
      label: 'LinkedIn', hardLimit: 3000, target: 'length proportional to the source',
      counting: 'nfc-unicode-code-points', nearLimitRatio: 0.9,
      requiredFields: ['body', 'tags', 'exposure_tip_zh', 'exposure_tip_en'], maxTokens: 4096,
      prompt: 'Write a regular LinkedIn post for busy professionals, not an article. Maximum 3,000 Unicode characters, with no minimum length. Keep it easy to scan with a strong opening, short paragraphs, clear bullets only when the source supports a list, and restrained emoji used as visual anchors rather than decoration.',
    },
    medium: {
      label: 'Medium', hardLimit: null, target: 'length proportional to the source',
      counting: 'nfc-unicode-code-points', nearLimitRatio: null,
      requiredFields: ['title', 'subtitle', 'body', 'tags', 'exposure_tip_zh', 'exposure_tip_en'], maxTokens: 8192,
      prompt: 'Write a complete Medium story whose length serves the source. A short source may become a short story. Use a clear non-clickbait title and subtitle, and add section headings only when the source contains enough structure.',
    },
    substack: {
      label: 'Substack', hardLimit: null, target: 'newsletter length proportional to the source',
      counting: 'nfc-unicode-code-points', nearLimitRatio: null,
      requiredFields: ['title', 'preview_text', 'body', 'note', 'tags', 'exposure_tip_zh', 'exposure_tip_en'], maxTokens: 8192,
      prompt: 'Write a complete newsletter-style version whose detail and length are proportional to the source. Preserve useful detail when present, but keep a thin source concise and never manufacture material to make it feel long-form. Also write a short note that promotes or summarizes the newsletter using only source-supported material; do not imply that a link exists unless the raw draft provides one.',
    },
  };
  root.PLATFORM_CONSTRAINTS = Object.freeze(constraints);
})(globalThis);
