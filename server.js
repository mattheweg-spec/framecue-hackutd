const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const NVIDIA_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning';

function loadLocalKey() {
  if (process.env.NVIDIA_API_KEY) return process.env.NVIDIA_API_KEY.trim();
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) return '';
  const line = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).find(item => /^\s*NVIDIA_API_KEY\s*=/.test(item));
  if (!line) return '';
  return line.slice(line.indexOf('=') + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
}

function sendJson(response, status, data) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(data));
}

function readJson(request, maxBytes = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    let tooLarge = false;
    request.on('data', chunk => {
      if (tooLarge) return;
      size += chunk.length;
      if (size > maxBytes) {
        tooLarge = true;
        reject(Object.assign(new Error('Image is too large. Try moving closer or using a lower camera resolution.'), { status: 413 }));
        return;
      }
      body += chunk;
    });
    request.on('end', () => {
      if (tooLarge) return;
      try { resolve(JSON.parse(body || '{}')); }
      catch { reject(Object.assign(new Error('Request body must be valid JSON.'), { status: 400 })); }
    });
    request.on('error', reject);
  });
}

function parseModelJson(content) {
  const cleaned = String(content || '').replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Nemotron returned an unreadable scene description. Try again.');
  return JSON.parse(cleaned.slice(start, end + 1));
}

function normalizeObservation(raw) {
  const allowed = new Set(['left', 'center', 'right', 'none']);
  const clamp = value => Math.min(1000, Math.max(0, Number(value)));
  const rawObjects = Array.isArray(raw.objects) ? raw.objects.slice(0, 6) : [];
  if (!rawObjects.length && typeof raw.object === 'string' && Array.isArray(raw.box)) {
    rawObjects.push({ label: raw.object, confidence: raw.confidence, box: raw.box, position: raw.position });
  }
  const objects = rawObjects.flatMap(item => {
    if (!item || !Array.isArray(item.box) || item.box.length !== 4) return [];
    const box = item.box.map(clamp);
    const [x1, y1, x2, y2] = box;
    if (!box.every(Number.isFinite) || x2 - x1 < 8 || y2 - y1 < 8) return [];
    const confidenceValue = Number(item.confidence);
    const confidence = Number.isFinite(confidenceValue) ? Math.min(1, Math.max(0, confidenceValue)) : 0;
    if (confidence < 0.12) return [];
    const label = typeof item.label === 'string' ? item.label.trim().slice(0, 60) : '';
    if (!label) return [];
    const centerX = (x1 + x2) / 2;
    const suggestedPosition = centerX < 333 ? 'left' : centerX > 666 ? 'right' : 'center';
    return [{ label, confidence, box, position: suggestedPosition }];
  });
  const legacyPosition = String(raw.position || 'none').toLowerCase().trim();
  const position = objects[0]?.position || (allowed.has(legacyPosition) ? legacyPosition : 'none');
  const confidenceValue = Number(raw.confidence);
  const confidence = objects[0]?.confidence ?? (Number.isFinite(confidenceValue) ? Math.min(1, Math.max(0, confidenceValue)) : 0);
  const object = objects[0]?.label || (typeof raw.object === 'string' ? raw.object.trim().slice(0, 120) : '');
  const reason = typeof raw.reason === 'string' ? raw.reason.trim().slice(0, 240) : '';
  return { object, position, confidence, reason, objects };
}

// Deterministic tool step: turn Nemotron's observation into one simulated zone cue.
function mapSceneToHapticCue(observation) {
  if (!observation.object || observation.position === 'none' || observation.confidence < 0.25) return 'clear';
  return observation.position;
}

async function analyze(request, response) {
  const key = loadLocalKey();
  if (!key) return sendJson(response, 503, { error: 'NVIDIA_API_KEY is missing. Add it to the local .env.local file, then restart the server.' });
  let payload;
  try { payload = await readJson(request); }
  catch (error) { return sendJson(response, error.status || 400, { error: error.message }); }
  const imageData = payload.imageData;
  if (typeof imageData !== 'string' || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(imageData)) {
    return sendJson(response, 400, { error: 'Expected a reduced-size JPEG camera frame.' });
  }
  const prompt = [
    'Identify up to 6 clearly visible everyday objects or obstacles in this single camera frame. Do not identify people, faces, or read text.',
    'For each object, estimate a tight bounding box in image coordinates from 0 to 1000: [left, top, right, bottom]. Coordinates are normalized to the full image, with 0 at the top/left and 1000 at the bottom/right.',
    'Put the most relevant nearby object first. Do not recommend a route or claim the scene is safe.',
    'Return ONLY valid JSON with exactly these keys: objects (array of {label, confidence, box}), reason (short string). Confidence is 0 to 1. Use an empty objects array when no object is clear. Do not include markdown.'
  ].join(' ');
  let apiResponse;
  try {
    apiResponse = await fetch(NVIDIA_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: imageData } }] }],
        temperature: 0.2,
        max_tokens: 420,
        stream: false
      }),
      signal: AbortSignal.timeout(45000)
    });
  } catch (error) {
    return sendJson(response, 502, { error: error.name === 'TimeoutError' ? 'Nemotron timed out. Try again.' : 'Could not reach NVIDIA. Check your connection and try again.' });
  }
  const result = await apiResponse.json().catch(() => ({}));
  if (!apiResponse.ok) {
    const message = typeof result?.error?.message === 'string' ? result.error.message.slice(0, 220) : `NVIDIA returned ${apiResponse.status}.`;
    return sendJson(response, 502, { error: `NVIDIA request failed: ${message}` });
  }
  try {
    const observation = normalizeObservation(parseModelJson(result.choices?.[0]?.message?.content));
    const cue = mapSceneToHapticCue(observation);
    return sendJson(response, 200, { model: MODEL, observation, cue, workflow: ['frame captured', 'Nemotron interpretation complete', 'local cue mapping complete'] });
  } catch (error) {
    return sendJson(response, 502, { error: error instanceof SyntaxError ? 'Nemotron returned invalid JSON. Try again.' : error.message });
  }
}

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  if (request.method === 'GET' && url.pathname === '/api/health') {
    return sendJson(response, 200, { configured: Boolean(loadLocalKey()), model: MODEL });
  }
  if (request.method === 'POST' && url.pathname === '/api/analyze') return analyze(request, response);
  if (request.method !== 'GET') return sendJson(response, 405, { error: 'Method not allowed.' });
  const requested = url.pathname === '/' ? '/index.html' : decodeURIComponent(url.pathname);
  const resolved = path.resolve(ROOT, `.${requested}`);
  if (!resolved.startsWith(ROOT + path.sep)) return sendJson(response, 403, { error: 'Forbidden.' });
  fs.readFile(resolved, (error, data) => {
    if (error) return sendJson(response, 404, { error: 'File not found.' });
    response.writeHead(200, { 'Content-Type': mime[path.extname(resolved)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    response.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`FrameCue is running at http://localhost:${PORT}`);
  if (!loadLocalKey()) console.log('NVIDIA key not found yet. Add NVIDIA_API_KEY to .env.local before starting scene analysis.');
});
