import { APP_HTML } from './html';

export interface Env {
  DB: D1Database;
  VIDEOS: R2Bucket;
  /** Set with `wrangler secret put APP_PASSWORD` (or .dev.vars locally). */
  APP_PASSWORD: string;
}

const COOKIE_NAME = 'reon_auth';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

// ---------------------------------------------------------------------------
// Auth: stateless HMAC-signed cookie, keyed by the APP_PASSWORD secret.
// Changing the password invalidates every outstanding session.
// ---------------------------------------------------------------------------

const encoder = new TextEncoder();

function base64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function hmacKey(secret: string, usage: 'sign' | 'verify'): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(`reon-stream:${secret}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage],
  );
}

async function createSessionToken(secret: string): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  const key = await hmacKey(secret, 'sign');
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(String(exp)));
  return `${exp}.${base64url(sig)}`;
}

async function verifySessionToken(secret: string, token: string): Promise<boolean> {
  const dot = token.indexOf('.');
  if (dot < 0) return false;
  const exp = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now() / 1000) return false;

  const sigBytes = Uint8Array.from(
    atob(sig.replace(/-/g, '+').replace(/_/g, '/')),
    (c) => c.charCodeAt(0),
  );
  const key = await hmacKey(secret, 'verify');
  return crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(exp));
}

async function passwordsMatch(supplied: string, actual: string): Promise<boolean> {
  // Compare SHA-256 digests so the comparison is constant-time in length.
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(supplied)),
    crypto.subtle.digest('SHA-256', encoder.encode(actual)),
  ]);
  const ua = new Uint8Array(a);
  const ub = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < ua.length; i++) diff |= ua[i] ^ ub[i];
  return diff === 0;
}

function getCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=');
  }
  return null;
}

async function isAuthed(request: Request, env: Env): Promise<boolean> {
  const token = getCookie(request, COOKIE_NAME);
  if (!token) return false;
  return verifySessionToken(env.APP_PASSWORD, token);
}

function sessionCookie(token: string, maxAge: number): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${maxAge}`;
}

// ---------------------------------------------------------------------------
// Streaming
// ---------------------------------------------------------------------------

const CONTENT_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function guessContentType(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  return CONTENT_TYPES[ext] ?? 'application/octet-stream';
}

function contentRange(range: R2Range, size: number): { header: string; length: number } {
  if ('suffix' in range && range.suffix !== undefined) {
    const start = Math.max(0, size - range.suffix);
    return { header: `bytes ${start}-${size - 1}/${size}`, length: size - start };
  }
  const offset = 'offset' in range && range.offset !== undefined ? range.offset : 0;
  const length =
    'length' in range && range.length !== undefined ? range.length : size - offset;
  return { header: `bytes ${offset}-${offset + length - 1}/${size}`, length };
}

async function streamObject(request: Request, env: Env, key: string): Promise<Response> {
  if (request.method === 'HEAD') {
    const head = await env.VIDEOS.head(key);
    if (!head) return new Response(null, { status: 404 });
    const headers = new Headers();
    head.writeHttpMetadata(headers);
    if (!headers.has('content-type')) headers.set('content-type', guessContentType(key));
    headers.set('content-length', String(head.size));
    headers.set('accept-ranges', 'bytes');
    headers.set('etag', head.httpEtag);
    return new Response(null, { headers });
  }

  const wantsRange = request.headers.has('range');
  let object: R2ObjectBody | null;
  try {
    object = await env.VIDEOS.get(key, wantsRange ? { range: request.headers } : undefined);
  } catch {
    // R2 throws on an unsatisfiable Range header.
    return new Response('Range Not Satisfiable', {
      status: 416,
      headers: { 'content-range': `bytes */0` },
    });
  }
  if (!object) return new Response('Video not found in R2', { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  if (!headers.has('content-type')) headers.set('content-type', guessContentType(key));
  headers.set('accept-ranges', 'bytes');
  headers.set('etag', object.httpEtag);

  if (wantsRange && object.range) {
    const { header, length } = contentRange(object.range, object.size);
    headers.set('content-range', header);
    headers.set('content-length', String(length));
    return new Response(object.body, { status: 206, headers });
  }

  headers.set('content-length', String(object.size));
  return new Response(object.body, { headers });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

function badKey(key: unknown): boolean {
  return typeof key !== 'string' || key.length === 0 || key.includes('..') || key.startsWith('/');
}

/** "My Film (2024).MP4" -> "my-film-2024.mp4" */
function slugifyFilename(name: string): string {
  const dot = name.lastIndexOf('.');
  const base =
    (dot > 0 ? name.slice(0, dot) : name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'file';
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  return ext ? `${base}.${ext}` : base;
}

/** Pick a collision-free key under the given prefix. */
async function freshKey(env: Env, prefix: string, filename: string): Promise<string> {
  const slug = slugifyFilename(filename);
  const key = `${prefix}/${slug}`;
  if (!(await env.VIDEOS.head(key))) return key;
  return `${prefix}/${Date.now()}-${slug}`;
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;
    const method = request.method;

    // The app shell is public; everything with data behind it requires auth.
    if (pathname === '/' && method === 'GET') {
      return new Response(APP_HTML, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }

    if (pathname === '/api/login' && method === 'POST') {
      const body = await readJson(request);
      const password = typeof body?.password === 'string' ? body.password : '';
      if (!env.APP_PASSWORD) {
        return json({ error: 'APP_PASSWORD secret is not configured' }, 500);
      }
      if (!(await passwordsMatch(password, env.APP_PASSWORD))) {
        // Small fixed delay to blunt brute-force attempts.
        await new Promise((r) => setTimeout(r, 400));
        return json({ error: 'Wrong password' }, 401);
      }
      const token = await createSessionToken(env.APP_PASSWORD);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'set-cookie': sessionCookie(token, SESSION_TTL_SECONDS),
        },
      });
    }

    if (pathname === '/api/logout' && method === 'POST') {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'set-cookie': sessionCookie('', 0),
        },
      });
    }

    // ---- everything below requires a valid session ----
    if (!(await isAuthed(request, env))) {
      return json({ error: 'Unauthorized' }, 401);
    }

    // ---- uploads (chunked multipart into R2; parts stay under the request size limit) ----

    if (pathname === '/api/upload/create' && method === 'POST') {
      const body = await readJson(request);
      const filename = typeof body?.filename === 'string' ? body.filename : '';
      if (!filename) return json({ error: 'filename is required' }, 400);
      const contentType =
        typeof body?.contentType === 'string' && body.contentType !== ''
          ? body.contentType
          : guessContentType(filename);
      const prefix = body?.kind === 'thumb' ? 'thumbs' : 'uploads';
      const key = await freshKey(env, prefix, filename);
      const upload = await env.VIDEOS.createMultipartUpload(key, {
        httpMetadata: { contentType },
      });
      return json({ key: upload.key, uploadId: upload.uploadId });
    }

    if (pathname === '/api/upload/part' && method === 'PUT') {
      const key = url.searchParams.get('key') ?? '';
      const uploadId = url.searchParams.get('id') ?? '';
      const partNumber = Number(url.searchParams.get('n'));
      if (badKey(key) || !uploadId || !Number.isInteger(partNumber) || partNumber < 1) {
        return json({ error: 'Bad part request' }, 400);
      }
      if (!request.body) return json({ error: 'Empty body' }, 400);
      try {
        const upload = env.VIDEOS.resumeMultipartUpload(key, uploadId);
        const part = await upload.uploadPart(partNumber, request.body);
        return json({ etag: part.etag });
      } catch (e) {
        return json({ error: e instanceof Error ? e.message : 'Part upload failed' }, 400);
      }
    }

    if (pathname === '/api/upload/complete' && method === 'POST') {
      const body = await readJson(request);
      const key = typeof body?.key === 'string' ? body.key : '';
      const uploadId = typeof body?.uploadId === 'string' ? body.uploadId : '';
      const parts = Array.isArray(body?.parts)
        ? (body.parts as Array<{ partNumber?: unknown; etag?: unknown }>).flatMap((p) =>
            typeof p?.partNumber === 'number' && typeof p?.etag === 'string'
              ? [{ partNumber: p.partNumber, etag: p.etag }]
              : [],
          )
        : [];
      if (badKey(key) || !uploadId || parts.length === 0) {
        return json({ error: 'Bad complete request' }, 400);
      }
      try {
        const upload = env.VIDEOS.resumeMultipartUpload(key, uploadId);
        const object = await upload.complete(parts);
        return json({ key: object.key, size: object.size });
      } catch (e) {
        return json({ error: e instanceof Error ? e.message : 'Complete failed' }, 400);
      }
    }

    if (pathname === '/api/upload/abort' && method === 'POST') {
      const body = await readJson(request);
      const key = typeof body?.key === 'string' ? body.key : '';
      const uploadId = typeof body?.uploadId === 'string' ? body.uploadId : '';
      if (badKey(key) || !uploadId) return json({ error: 'Bad abort request' }, 400);
      try {
        await env.VIDEOS.resumeMultipartUpload(key, uploadId).abort();
      } catch {
        // already gone — nothing to clean up
      }
      return json({ ok: true });
    }

    // Small direct upload for thumbnail images.
    if (pathname === '/api/upload/image' && method === 'PUT') {
      const filename = url.searchParams.get('filename') ?? '';
      if (!filename) return json({ error: 'filename query param is required' }, 400);
      const contentType = request.headers.get('content-type') || guessContentType(filename);
      if (!contentType.startsWith('image/')) {
        return json({ error: 'Thumbnail must be an image' }, 400);
      }
      if (!request.body) return json({ error: 'Empty body' }, 400);
      const key = await freshKey(env, 'thumbs', filename);
      await env.VIDEOS.put(key, request.body, { httpMetadata: { contentType } });
      return json({ key });
    }

    if (pathname === '/api/videos' && method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT id, title, description, r2_key, thumbnail_key, created_at FROM videos ORDER BY created_at DESC, id DESC',
      ).all();
      return json({ videos: results });
    }

    if (pathname === '/api/videos' && method === 'POST') {
      const body = await readJson(request);
      const title = typeof body?.title === 'string' ? body.title.trim() : '';
      const description = typeof body?.description === 'string' ? body.description.trim() : '';
      const r2Key = typeof body?.r2_key === 'string' ? body.r2_key.trim() : '';
      const thumbnailKey =
        typeof body?.thumbnail_key === 'string' && body.thumbnail_key.trim() !== ''
          ? body.thumbnail_key.trim()
          : null;

      if (!title) return json({ error: 'Title is required' }, 400);
      if (badKey(r2Key)) return json({ error: 'A valid R2 path is required' }, 400);
      if (thumbnailKey !== null && badKey(thumbnailKey)) {
        return json({ error: 'Invalid thumbnail path' }, 400);
      }

      // Verify the object actually exists so the catalogue never points at nothing.
      const head = await env.VIDEOS.head(r2Key);
      if (!head) {
        return json({ error: `No object at "${r2Key}" in the videos bucket` }, 404);
      }

      const result = await env.DB.prepare(
        'INSERT INTO videos (title, description, r2_key, thumbnail_key) VALUES (?, ?, ?, ?) RETURNING id, title, description, r2_key, thumbnail_key, created_at',
      )
        .bind(title, description, r2Key, thumbnailKey)
        .first();
      return json({ video: result }, 201);
    }

    const videoIdMatch = pathname.match(/^\/api\/videos\/(\d+)$/);
    if (videoIdMatch && method === 'DELETE') {
      const result = await env.DB.prepare('DELETE FROM videos WHERE id = ?')
        .bind(Number(videoIdMatch[1]))
        .run();
      if (result.meta.changes === 0) return json({ error: 'Not found' }, 404);
      return json({ ok: true });
    }

    // List R2 keys so the "add video" form can offer existing paths.
    if (pathname === '/api/keys' && method === 'GET') {
      const listed = await env.VIDEOS.list({ limit: 1000 });
      return json({ keys: listed.objects.map((o) => ({ key: o.key, size: o.size })) });
    }

    // Stream a catalogued video by id: /stream/:id
    const streamMatch = pathname.match(/^\/stream\/(\d+)$/);
    if (streamMatch && (method === 'GET' || method === 'HEAD')) {
      const row = await env.DB.prepare('SELECT r2_key FROM videos WHERE id = ?')
        .bind(Number(streamMatch[1]))
        .first<{ r2_key: string }>();
      if (!row) return new Response('Not found', { status: 404 });
      return streamObject(request, env, row.r2_key);
    }

    // Thumbnail by id: /thumb/:id
    const thumbMatch = pathname.match(/^\/thumb\/(\d+)$/);
    if (thumbMatch && method === 'GET') {
      const row = await env.DB.prepare('SELECT thumbnail_key FROM videos WHERE id = ?')
        .bind(Number(thumbMatch[1]))
        .first<{ thumbnail_key: string | null }>();
      if (!row?.thumbnail_key) return new Response('Not found', { status: 404 });
      return streamObject(request, env, row.thumbnail_key);
    }

    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
