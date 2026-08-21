(function(root){
  function constraints(){ return root.PLATFORM_CONSTRAINTS; }

  function unicodeLength(value){
    return Array.from(String(value || '').normalize('NFC')).length;
  }

  function xWeightedLength(value){
    if(!root.twitterText || typeof root.twitterText.parseTweet !== 'function'){
      throw new Error('twitter-text parser is unavailable');
    }
    return root.twitterText.parseTweet(String(value || '')).weightedLength;
  }

  function measureText(platform, value){
    const config = constraints()[platform];
    const length = platform === 'twitter' ? xWeightedLength(value) : unicodeLength(value);
    const limit = config.hardLimit;
    const valid = limit == null || length <= limit;
    return {
      length,
      limit,
      remaining: limit == null ? null : Math.max(0, limit - length),
      overBy: limit == null ? 0 : Math.max(0, length - limit),
      nearLimit: limit != null && length >= limit * config.nearLimitRatio,
      valid,
    };
  }

  function splitThread(value){
    return String(value || '').split(/\n\s*---\s*\n/).map(segment=>segment.trim()).filter(Boolean);
  }

  function measureThread(value, hashtags){
    const texts = splitThread(value);
    const segments = texts.map(text=>Object.assign({ text }, measureText('twitter', text)));
    const hashtagText = String(hashtags || '').trim();
    const combinedSegments = texts.map((text, index)=>{
      const combined = index === texts.length - 1 && hashtagText ? text + ' ' + hashtagText : text;
      return Object.assign({ text: combined }, measureText('twitter', combined));
    });
    return {
      texts,
      segments,
      combinedSegments,
      hashtagSegment: texts.length || 1,
      valid: segments.length > 0 && segments.every(segment=>segment.valid),
      combinedValid: combinedSegments.length > 0 && combinedSegments.every(segment=>segment.valid),
    };
  }

  root.PLATFORM_COUNTING = Object.freeze({ unicodeLength, xWeightedLength, measureText, splitThread, measureThread });
})(globalThis);
