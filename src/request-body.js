export async function readJsonBody(request, maxBytes = Number.POSITIVE_INFINITY) {
  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return { error: 'Content-Type must be application/json.' };
  }
  const contentLength = request.headers.get('Content-Length');
  if (Number.isFinite(maxBytes) && contentLength !== null && Number(contentLength) > maxBytes) {
    return { error: 'Request body is too large.' };
  }
  const text = await readTextWithLimit(request, maxBytes);
  if (text === null) return { error: 'Request body is too large.' };
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: 'Request body must be an object.' };
    return { value };
  } catch {
    return { error: 'Malformed JSON body.' };
  }
}

async function readTextWithLimit(request, maxBytes) {
  if (!Number.isFinite(maxBytes)) return request.text();

  const reader = request.body?.getReader();
  if (!reader) return '';

  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) return text + decoder.decode();
    bytesRead += value.byteLength;
    if (bytesRead > maxBytes) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
}
