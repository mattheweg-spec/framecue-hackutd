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
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    if (Array.isArray(content.objects) || typeof content.object === 'string') return content;
    if (typeof content.text === 'string') content = content.text;
    else if (typeof content.content === 'string') content = content.content;
    else content = JSON.stringify(content);
  }
  const text = Array.isArray(content)
    ? content.map(part => typeof part === 'string' ? part : part?.text || part?.content || '').join('\n')
    : String(content || '');
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```(?:json)?/gi, '').trim();
  const candidates = [cleaned];
  let depth = 0;
  let start = -1;
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < cleaned.length; index++) {
    const character = cleaned[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') { quoted = true; continue; }
    if (character === '{') {
      if (depth === 0) start = index;
      depth++;
    } else if (character === '}' && depth > 0) {
      depth--;
      if (depth === 0 && start >= 0) candidates.push(cleaned.slice(start, index + 1));
    }
  }
  for (const candidate of candidates) {
    for (const source of [candidate, candidate.replace(/,\s*([}\]])/g, '$1')]) {
      try {
        const parsed = JSON.parse(source);
        if (parsed && typeof parsed === 'object' && (Array.isArray(parsed.objects) || typeof parsed.object === 'string')) return parsed;
      } catch { /* Try the next balanced JSON object or common trailing-comma repair. */ }
    }
  }
  throw new Error('Nemotron response did not contain usable obstacle JSON. Retry the scan.');
}

function normalizeObservation(raw) {
  const allowed = new Set(['left', 'center', 'right', 'none']);
  const clamp = value => Math.min(1000, Math.max(0, Number(value)));
  const rawObjects = Array.isArray(raw.objects) ? raw.objects.slice(0, 8) : [];
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
    const depth = ['near', 'middle', 'far'].includes(String(item.depth || '').toLowerCase())
      ? String(item.depth).toLowerCase()
      : 'unknown';
    const height = (y2 - y1) / 1000;
    const bottom = y2 / 1000;
    const estimatedProximity = Math.min(1, Math.max(0, height * 1.4 + Math.max(0, bottom - 0.55) * 0.28));
    const proximity = depth === 'near' ? 0.9 : depth === 'middle' ? 0.55 : depth === 'far' ? 0.2 : estimatedProximity;
    return [{ label, confidence, box, position: suggestedPosition, depth, proximity }];
  });
  objects.sort((a, b) => b.proximity - a.proximity);
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
    'Detect up to 8 visible obstacles, including individual people in a crowd. Label people only as "person"; do not identify anyone, describe appearance, inspect faces, or read text. Separate people when their bodies are visibly distinct.',
    'For each object, estimate a tight bounding box in image coordinates from 0 to 1000: [left, top, right, bottom]. Coordinates are normalized to the full image, with 0 at the top/left and 1000 at the bottom/right.',
    'Prioritize obstacles that look largest/closest and that occupy the lower or central walking area. Do not claim motion from a single image. Do not recommend a route or claim the scene is safe.',
    'Return ONLY a compact JSON object with one key: objects. Each array item has only label, confidence, and box. Confidence is 0 to 1. Use an empty array when no obstacle is clear. Do not include markdown or prose.'
  ].join(' ');
  let apiResponse;
  try {
    apiResponse = await fetch(NVIDIA_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: imageData } }] }],
        response_format: { type: 'json_object' },
        chat_template_kwargs: { enable_thinking: false },
        temperature: 0.2,
        max_tokens: 900,
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
  const choice = result.choices?.[0];
  if (choice?.finish_reason === 'length') {
    return sendJson(response, 502, { error: 'Nemotron response was cut off. Try a simpler view with fewer visible objects.' });
  }
  try {
    const observation = normalizeObservation(parseModelJson(choice?.message?.content));
    const cue = mapSceneToHapticCue(observation);
    return sendJson(response, 200, { model: MODEL, observation, cue, workflow: ['frame captured', 'Nemotron interpretation complete', 'local cue mapping complete'] });
  } catch (error) {
    return sendJson(response, 502, { error: error.message });
  }
}

function parseJsonObject(content) {
  if (content && typeof content === 'object' && !Array.isArray(content)) {
    if (typeof content.text === 'string') content = content.text;
    else if (typeof content.content === 'string') content = content.content;
    else return content;
  }
  const text = Array.isArray(content)
    ? content.map(part => typeof part === 'string' ? part : part?.text || part?.content || '').join('\n')
    : String(content || '');
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```(?:json)?/gi, '').trim();
  try {
    const value = JSON.parse(cleaned);
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  } catch { /* Some model responses include a short preamble around the JSON. */ }
  const start = cleaned.indexOf('{'), end = cleaned.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try {
      const value = JSON.parse(cleaned.slice(start, end + 1).replace(/,\s*([}\]])/g, '$1'));
      if (value && typeof value === 'object' && !Array.isArray(value)) return value;
    } catch { /* Report one clear parsing error below. */ }
  }
  throw new Error('Nemotron returned an unusable place-search response.');
}

function validOrigin(value) {
  if (!value || typeof value !== 'object') return null;
  const latitude = Number(value.latitude), longitude = Number(value.longitude);
  return Number.isFinite(latitude) && Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
    ? { latitude, longitude }
    : null;
}

function distanceBetweenMeters(a, b) {
  const radians = value => value * Math.PI / 180;
  const dLat = radians(b.latitude - a.latitude), dLon = radians(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 12742000 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function distanceBand(distance) {
  if (distance == null) return 'unknown';
  if (distance < 1000) return 'under 1 km';
  if (distance < 5000) return '1 to 5 km';
  if (distance < 20000) return '5 to 20 km';
  return 'over 20 km';
}

function safePlaceCorrection(original, suggested) {
  if (typeof suggested !== 'string') return original;
  const cleaned = suggested.trim().replace(/\s+/g, ' ').slice(0, 160);
  if (!cleaned) return original;
  const normalize = value => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
  const a = normalize(original), b = normalize(cleaned);
  if (a === b) return cleaned;
  // Accept conservative typos and spacing repairs. Reject changes that could silently replace the destination.
  if (!a || !b || Math.max(a.length, b.length) > 120) return original;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  const similarity = 1 - previous[b.length] / Math.max(a.length, b.length);
  return similarity >= 0.75 ? cleaned : original;
}

async function photonSearch(query, origin) {
  const endpoint = new URL('https://photon.komoot.io/api/');
  endpoint.searchParams.set('q', query);
  endpoint.searchParams.set('limit', '8');
  if (origin) {
    endpoint.searchParams.set('lat', String(origin.latitude));
    endpoint.searchParams.set('lon', String(origin.longitude));
  }
  const result = await fetch(endpoint, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12000) });
  if (!result.ok) throw new Error(`Place search returned ${result.status}.`);
  const data = await result.json();
  return (Array.isArray(data.features) ? data.features : []).flatMap(feature => {
    const coordinates = feature?.geometry?.coordinates;
    const properties = feature?.properties;
    if (!Array.isArray(coordinates) || coordinates.length < 2 || !properties) return [];
    const longitude = Number(coordinates[0]), latitude = Number(coordinates[1]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return [];
    const label = [properties.name, properties.housenumber, properties.street,
      properties.district || properties.suburb, properties.city || properties.town || properties.village,
      properties.state, properties.country].filter(Boolean).join(', ').slice(0, 240);
    if (!label) return [];
    const distanceMeters = origin ? Math.round(distanceBetweenMeters(origin, { latitude, longitude })) : null;
    return [{ label, latitude, longitude, distanceMeters, distanceBand: distanceBand(distanceMeters) }];
  });
}

async function askNemotronForPlaces(key, query, candidates) {
  const places = candidates.map((candidate, id) => ({ id, label: candidate.label, distance: candidate.distanceBand }));
  const prompt = [
    'You help clean up a destination search for a walking route.',
    'Correct only obvious spelling or speech-recognition mistakes. Preserve the user’s intended place and every meaningful detail; do not invent or add a destination, city, or neighborhood.',
    'Rank only the supplied geocoder candidates by how well they match the search. Prefer nearer candidates only when their names and place details are similarly plausible. A nearby mismatch is still a mismatch.',
    'The candidate IDs are the only allowed destinations. Never create coordinates or choose a destination on the user’s behalf. If the request is ambiguous or no candidate fits, set needsClarification to true and explain briefly.',
    `Search text: ${JSON.stringify(query)}`,
    `Candidates: ${JSON.stringify(places)}`,
    'Return only JSON with keys correctedQuery (string), rankedIds (array of supplied integer IDs from best to worst; empty if none fit), needsClarification (boolean), and clarification (short string).'
  ].join('\n');
  const apiResponse = await fetch(NVIDIA_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      chat_template_kwargs: { enable_thinking: false },
      temperature: 0,
      max_tokens: 300,
      stream: false
    }),
    signal: AbortSignal.timeout(25000)
  });
  const result = await apiResponse.json().catch(() => ({}));
  if (!apiResponse.ok) throw new Error(typeof result?.error?.message === 'string' ? result.error.message.slice(0, 180) : `NVIDIA returned ${apiResponse.status}.`);
  if (result.choices?.[0]?.finish_reason === 'length') throw new Error('Nemotron place-search response was cut off.');
  return parseJsonObject(result.choices?.[0]?.message?.content);
}

function orderPlaceCandidates(candidates, decision) {
  const rankings = Array.isArray(decision?.rankedIds) ? decision.rankedIds : [];
  const ids = [...new Set(rankings.map(Number).filter(id => Number.isInteger(id) && id >= 0 && id < candidates.length))];
  const ordered = ids.map(id => candidates[id]);
  for (let index = 0; index < candidates.length; index++) {
    if (!ids.includes(index)) ordered.push(candidates[index]);
  }
  return ordered;
}

async function searchPlaces(request, response) {
  let payload;
  try { payload = await readJson(request, 16 * 1024); }
  catch (error) { return sendJson(response, error.status || 400, { error: error.message }); }
  const query = typeof payload.query === 'string' ? payload.query.trim().slice(0, 160) : '';
  if (query.length < 3) return sendJson(response, 400, { error: 'Enter at least three characters for a place search.' });
  const origin = validOrigin(payload.origin);
  let candidates;
  try { candidates = await photonSearch(query, origin); }
  catch (error) { return sendJson(response, 502, { error: `Place search unavailable: ${error.message}` }); }

  const key = loadLocalKey();
  let decision = null, correctedQuery = query, modelUsed = false, clarification = '';
  if (key) {
    let initialDecision = null;
    try {
      initialDecision = await askNemotronForPlaces(key, query, candidates);
      decision = initialDecision;
      modelUsed = true;
    } catch (error) {
      // Geocoder results remain available if NVIDIA is temporarily unavailable.
      clarification = 'Nemotron could not check this search; review the nearby matches carefully.';
      console.warn('Nemotron place search unavailable:', error.message);
    }
    if (initialDecision) {
      const suggested = safePlaceCorrection(query, initialDecision.correctedQuery);
      const normalize = value => value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
      if (normalize(suggested) !== normalize(query)) {
        try {
          const correctedCandidates = await photonSearch(suggested, origin);
          if (correctedCandidates.length) {
            correctedQuery = suggested;
            candidates = correctedCandidates;
            // Re-rank only real candidates produced by the corrected geocoder query.
            try {
              decision = await askNemotronForPlaces(key, correctedQuery, candidates);
            } catch (error) {
              decision = null;
              clarification = 'The spelling was corrected, but Nemotron could not rank those matches. Check the destination names before selecting one.';
              console.warn('Nemotron corrected-place ranking unavailable:', error.message);
            }
          }
        } catch (error) {
          // Keep the initial query and its valid matches if the corrected query is unavailable.
          console.warn('Corrected Photon place search unavailable:', error.message);
        }
      }
      if (!clarification && decision) clarification = typeof decision.clarification === 'string' ? decision.clarification.trim().slice(0, 180) : '';
    }
  }
  const matches = orderPlaceCandidates(candidates, decision).map(candidate => ({
    label: candidate.label,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    distanceMeters: candidate.distanceMeters
  }));
  return sendJson(response, 200, {
    matches,
    correctedQuery,
    corrected: correctedQuery !== query,
    nearby: Boolean(origin),
    modelUsed,
    needsClarification: decision?.needsClarification === true,
    clarification
  });
}

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.obj': 'text/plain; charset=utf-8', '.mtl': 'text/plain; charset=utf-8' };
const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  if (request.method === 'GET' && url.pathname === '/api/health') {
    return sendJson(response, 200, { configured: Boolean(loadLocalKey()), model: MODEL });
  }
  if (request.method === 'POST' && url.pathname === '/api/search-places') return searchPlaces(request, response);
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
