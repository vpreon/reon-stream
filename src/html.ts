export const APP_HTML = /* html */ `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Reon Stream</title>
<style>
  :root {
    --bg: #141414;
    --surface: #1f1f1f;
    --surface-2: #2a2a2a;
    --text: #f5f5f1;
    --text-dim: #a3a3a3;
    --accent: #e50914;
    --radius: 8px;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: var(--bg);
    color: var(--text);
    font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    min-height: 100vh;
  }
  button { font: inherit; cursor: pointer; border: 0; border-radius: var(--radius); }
  input, textarea {
    font: inherit; color: var(--text); background: var(--surface-2);
    border: 1px solid #444; border-radius: var(--radius); padding: 10px 12px; width: 100%;
  }
  input:focus, textarea:focus { outline: 2px solid var(--accent); border-color: transparent; }

  /* ---- top bar ---- */
  header {
    display: flex; align-items: center; gap: 16px;
    padding: 14px 4vw;
    background: linear-gradient(180deg, rgba(0,0,0,.7), rgba(0,0,0,0));
    position: sticky; top: 0; z-index: 5;
    backdrop-filter: blur(6px);
  }
  .brand { color: var(--accent); font-weight: 800; font-size: 24px; letter-spacing: 1px; }
  header .spacer { flex: 1; }
  #search {
    max-width: 260px; background: rgba(0,0,0,.55); border-color: #555;
  }
  .btn { padding: 10px 16px; font-weight: 600; }
  .btn-accent { background: var(--accent); color: #fff; }
  .btn-accent:hover { background: #f6121d; }
  .btn-ghost { background: transparent; color: var(--text-dim); border: 1px solid #444; }
  .btn-ghost:hover { color: var(--text); border-color: #777; }

  /* ---- catalogue ---- */
  main { padding: 12px 4vw 64px; }
  .section-title { font-size: 20px; font-weight: 700; margin: 18px 0 12px; }
  .grid {
    display: grid; gap: 16px;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
  .card {
    background: var(--surface); border-radius: var(--radius); overflow: hidden;
    transition: transform .15s ease; position: relative; cursor: pointer;
  }
  .card:hover { transform: scale(1.04); z-index: 2; }
  .card .poster {
    aspect-ratio: 16/9; width: 100%; object-fit: cover; display: block;
    background: linear-gradient(135deg, #2b1113, #1a1a2b);
  }
  .card .poster-fallback {
    aspect-ratio: 16/9; display: flex; align-items: center; justify-content: center;
    padding: 12px; text-align: center; font-weight: 700; font-size: 18px; color: #ddd;
    background: linear-gradient(135deg, #3a1518 0%, #1c1c30 100%);
  }
  .card .meta { padding: 10px 12px 12px; }
  .card .title { font-weight: 600; }
  .card .desc {
    color: var(--text-dim); font-size: 13px; margin-top: 2px;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .card .delete {
    position: absolute; top: 8px; right: 8px; opacity: 0;
    background: rgba(0,0,0,.7); color: #fff; width: 30px; height: 30px; border-radius: 50%;
    transition: opacity .15s;
  }
  .card:hover .delete { opacity: 1; }
  .card .delete:hover { background: var(--accent); }
  .empty { color: var(--text-dim); padding: 40px 0; text-align: center; }

  /* ---- overlays ---- */
  .overlay {
    position: fixed; inset: 0; z-index: 10; display: none;
    align-items: center; justify-content: center; background: rgba(0,0,0,.85);
  }
  .overlay.open { display: flex; }
  .panel {
    background: var(--surface); border-radius: 12px; padding: 28px;
    width: min(440px, 92vw); display: flex; flex-direction: column; gap: 14px;
  }
  .panel h2 { font-size: 22px; }
  .panel label { font-size: 13px; color: var(--text-dim); display: block; margin-bottom: 4px; }
  .error { color: #ff6b6b; font-size: 14px; min-height: 20px; }
  input[type=file] { padding: 8px; background: var(--surface-2); }
  input[type=file]::file-selector-button {
    font: inherit; border: 0; border-radius: 6px; padding: 6px 12px; margin-right: 10px;
    background: #444; color: var(--text); cursor: pointer;
  }
  .or-row { font-size: 12px; color: var(--text-dim); margin: 6px 0 4px; }
  #up-progress { display: flex; flex-direction: column; gap: 6px; }
  #up-bar-outer { height: 8px; background: var(--surface-2); border-radius: 4px; overflow: hidden; }
  #up-bar { height: 100%; width: 0%; background: var(--accent); transition: width .2s; }
  #up-status { font-size: 13px; color: var(--text-dim); }

  /* ---- player ---- */
  #player-overlay { flex-direction: column; padding: 3vh 3vw; }
  #player-overlay video {
    width: 100%; max-height: 82vh; border-radius: var(--radius); background: #000;
  }
  #player-bar {
    width: 100%; display: flex; align-items: center; gap: 12px; padding: 12px 4px;
  }
  #player-title { font-size: 20px; font-weight: 700; flex: 1; }
</style>
</head>
<body>

<header id="app-header" hidden>
  <div class="brand">REON</div>
  <div class="spacer"></div>
  <input id="search" type="search" placeholder="Search titles…">
  <button class="btn btn-accent" id="add-btn">+ Add video</button>
  <button class="btn btn-ghost" id="logout-btn">Sign out</button>
</header>

<main id="app-main" hidden>
  <div class="section-title">My catalogue</div>
  <div class="grid" id="grid"></div>
  <div class="empty" id="empty" hidden>Nothing here yet — add your first video.</div>
</main>

<!-- login -->
<div class="overlay open" id="login-overlay">
  <form class="panel" id="login-form">
    <div class="brand" style="font-size:32px">REON</div>
    <h2>Sign in</h2>
    <div>
      <label for="password">Password</label>
      <input id="password" type="password" autocomplete="current-password" required autofocus>
    </div>
    <div class="error" id="login-error"></div>
    <button class="btn btn-accent" type="submit">Sign in</button>
  </form>
</div>

<!-- add video -->
<div class="overlay" id="add-overlay">
  <form class="panel" id="add-form">
    <h2>Add video</h2>
    <div>
      <label for="v-title">Title</label>
      <input id="v-title" required maxlength="200">
    </div>
    <div>
      <label for="v-desc">Description</label>
      <textarea id="v-desc" rows="2" maxlength="1000"></textarea>
    </div>
    <div>
      <label for="v-file">Video file</label>
      <input id="v-file" type="file" accept="video/*,.mkv">
      <div class="or-row">…or use a path already in the R2 bucket:</div>
      <input id="v-key" list="r2-keys" placeholder="movies/inception.mp4">
      <datalist id="r2-keys"></datalist>
    </div>
    <div>
      <label for="v-thumb-file">Thumbnail image (optional)</label>
      <input id="v-thumb-file" type="file" accept="image/*">
      <div class="or-row">…or an existing R2 path:</div>
      <input id="v-thumb" list="r2-keys" placeholder="thumbs/inception.jpg">
    </div>
    <div id="up-progress" hidden>
      <div id="up-bar-outer"><div id="up-bar"></div></div>
      <div id="up-status"></div>
    </div>
    <div class="error" id="add-error"></div>
    <div style="display:flex; gap:10px; justify-content:flex-end">
      <button class="btn btn-ghost" type="button" id="add-cancel">Cancel</button>
      <button class="btn btn-accent" type="submit" id="add-submit">Add to catalogue</button>
    </div>
  </form>
</div>

<!-- player -->
<div class="overlay" id="player-overlay">
  <div id="player-bar">
    <div id="player-title"></div>
    <button class="btn btn-ghost" id="player-close">✕ Close</button>
  </div>
  <video id="player" controls playsinline></video>
</div>

<script>
(() => {
  const $ = (id) => document.getElementById(id);
  let videos = [];

  const api = async (path, opts = {}) => {
    const res = await fetch(path, {
      headers: { 'content-type': 'application/json' },
      ...opts,
    });
    if (res.status === 401) { showLogin(); throw new Error('unauthorized'); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  };

  // ---- views ----
  const showLogin = () => {
    $('login-overlay').classList.add('open');
    $('app-header').hidden = true;
    $('app-main').hidden = true;
  };
  const showApp = () => {
    $('login-overlay').classList.remove('open');
    $('app-header').hidden = false;
    $('app-main').hidden = false;
  };

  // ---- catalogue ----
  const render = () => {
    const q = $('search').value.trim().toLowerCase();
    const grid = $('grid');
    grid.textContent = '';
    const shown = videos.filter(v =>
      !q || v.title.toLowerCase().includes(q) || (v.description || '').toLowerCase().includes(q));
    $('empty').hidden = shown.length > 0;

    for (const v of shown) {
      const card = document.createElement('div');
      card.className = 'card';

      if (v.thumbnail_key) {
        const img = document.createElement('img');
        img.className = 'poster';
        img.loading = 'lazy';
        img.src = '/thumb/' + v.id;
        img.alt = '';
        card.appendChild(img);
      } else {
        const ph = document.createElement('div');
        ph.className = 'poster-fallback';
        ph.textContent = v.title;
        card.appendChild(ph);
      }

      const meta = document.createElement('div');
      meta.className = 'meta';
      const title = document.createElement('div');
      title.className = 'title';
      title.textContent = v.title;
      const desc = document.createElement('div');
      desc.className = 'desc';
      desc.textContent = v.description || '';
      meta.append(title, desc);
      card.appendChild(meta);

      const del = document.createElement('button');
      del.className = 'delete';
      del.textContent = '✕';
      del.title = 'Remove from catalogue';
      del.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('Remove "' + v.title + '" from the catalogue? (The file stays in R2.)')) return;
        await api('/api/videos/' + v.id, { method: 'DELETE' });
        videos = videos.filter(x => x.id !== v.id);
        render();
      });
      card.appendChild(del);

      card.addEventListener('click', () => play(v));
      grid.appendChild(card);
    }
  };

  const load = async () => {
    const data = await api('/api/videos');
    videos = data.videos;
    showApp();
    render();
  };

  // ---- player ----
  const play = (v) => {
    $('player-title').textContent = v.title;
    const player = $('player');
    player.src = '/stream/' + v.id;
    $('player-overlay').classList.add('open');
    player.play().catch(() => {});
  };
  const closePlayer = () => {
    const player = $('player');
    player.pause();
    player.removeAttribute('src');
    player.load();
    $('player-overlay').classList.remove('open');
  };
  $('player-close').addEventListener('click', closePlayer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePlayer();
      $('add-overlay').classList.remove('open');
    }
  });

  // ---- login ----
  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('login-error').textContent = '';
    try {
      await api('/api/login', {
        method: 'POST',
        body: JSON.stringify({ password: $('password').value }),
      });
      $('password').value = '';
      await load();
    } catch (err) {
      $('login-error').textContent = err.message === 'unauthorized' ? 'Wrong password' : err.message;
    }
  });

  $('logout-btn').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    showLogin();
  });

  // ---- add video ----
  $('add-btn').addEventListener('click', async () => {
    $('add-error').textContent = '';
    $('add-overlay').classList.add('open');
    try {
      const { keys } = await api('/api/keys');
      $('r2-keys').innerHTML = keys
        .map(k => '<option value="' + k.key.replace(/"/g, '&quot;') + '">')
        .join('');
    } catch { /* datalist is a convenience; typing still works */ }
  });
  $('add-cancel').addEventListener('click', () => $('add-overlay').classList.remove('open'));

  // ---- uploading ----
  const PART_SIZE = 40 * 1024 * 1024; // stays well under the Workers request body limit
  const CONCURRENCY = 4;              // parts in flight at once
  const PART_RETRIES = 3;
  const DIRECT_LIMIT = 90 * 1024 * 1024; // single-request cap for thumbnails

  const putXhr = (url, body, contentType, onProgress) => new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    if (contentType) xhr.setRequestHeader('content-type', contentType);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded); };
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data.error || ('HTTP ' + xhr.status)));
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(body);
  });

  const setProgress = (fraction, text) => {
    $('up-progress').hidden = false;
    $('up-bar').style.width = Math.round(fraction * 100) + '%';
    $('up-status').textContent = text;
  };

  const fmtMB = (bytes) => (bytes / 1048576).toFixed(1);

  // Chunked multipart upload: CONCURRENCY parts in flight, each retried on failure.
  const uploadLargeFile = async (file, kind, label) => {
    const { key, uploadId } = await api('/api/upload/create', {
      method: 'POST',
      body: JSON.stringify({ filename: file.name, contentType: file.type, kind }),
    });
    const totalParts = Math.max(1, Math.ceil(file.size / PART_SIZE));
    const parts = new Array(totalParts);
    const loadedByPart = new Array(totalParts).fill(0);
    const startedAt = Date.now();
    let failed = false;

    const report = () => {
      const sent = loadedByPart.reduce((a, b) => a + b, 0);
      const secs = (Date.now() - startedAt) / 1000;
      const speed = secs > 1 ? ' — ' + fmtMB(sent / secs) + ' MB/s' : '';
      setProgress(sent / file.size,
        label + '… ' + Math.round((sent / file.size) * 100) + '% (' +
        fmtMB(sent) + ' / ' + fmtMB(file.size) + ' MB' + speed + ')');
    };

    const uploadPart = async (i) => {
      const chunk = file.slice(i * PART_SIZE, Math.min(file.size, (i + 1) * PART_SIZE));
      const partUrl = '/api/upload/part?key=' + encodeURIComponent(key) +
        '&id=' + encodeURIComponent(uploadId) + '&n=' + (i + 1);
      for (let attempt = 1; ; attempt++) {
        try {
          const { etag } = await putXhr(partUrl, chunk, 'application/octet-stream',
            (loaded) => { loadedByPart[i] = loaded; report(); });
          loadedByPart[i] = chunk.size;
          parts[i] = { partNumber: i + 1, etag };
          report();
          return;
        } catch (err) {
          loadedByPart[i] = 0;
          if (failed || attempt >= PART_RETRIES) throw err;
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    };

    try {
      let next = 0;
      const workers = Array.from({ length: Math.min(CONCURRENCY, totalParts) }, async () => {
        while (next < totalParts && !failed) {
          const i = next++;
          try { await uploadPart(i); }
          catch (err) { failed = true; throw err; }
        }
      });
      await Promise.all(workers);
      await api('/api/upload/complete', {
        method: 'POST',
        body: JSON.stringify({ key, uploadId, parts }),
      });
      return key;
    } catch (err) {
      failed = true;
      api('/api/upload/abort', { method: 'POST', body: JSON.stringify({ key, uploadId }) })
        .catch(() => {});
      throw err;
    }
  };

  $('add-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('add-error').textContent = '';
    const videoFile = $('v-file').files[0];
    const thumbFile = $('v-thumb-file').files[0];
    if (!videoFile && !$('v-key').value.trim()) {
      $('add-error').textContent = 'Choose a video file or enter an R2 path';
      return;
    }
    $('add-submit').disabled = true;
    try {
      let r2Key = $('v-key').value.trim();
      if (videoFile) r2Key = await uploadLargeFile(videoFile, 'video', 'Uploading video');

      let thumbKey = $('v-thumb').value.trim();
      if (thumbFile) {
        if (thumbFile.size > DIRECT_LIMIT) {
          thumbKey = await uploadLargeFile(thumbFile, 'thumb', 'Uploading thumbnail');
        } else {
          setProgress(1, 'Uploading thumbnail…');
          const res = await putXhr(
            '/api/upload/image?filename=' + encodeURIComponent(thumbFile.name),
            thumbFile,
            thumbFile.type || 'image/jpeg',
            null,
          );
          thumbKey = res.key;
        }
      }

      setProgress(1, 'Saving…');
      const { video } = await api('/api/videos', {
        method: 'POST',
        body: JSON.stringify({
          title: $('v-title').value,
          description: $('v-desc').value,
          r2_key: r2Key,
          thumbnail_key: thumbKey,
        }),
      });
      videos.unshift(video);
      $('add-form').reset();
      $('add-overlay').classList.remove('open');
      render();
    } catch (err) {
      $('add-error').textContent = err.message;
    } finally {
      $('add-submit').disabled = false;
      $('up-progress').hidden = true;
      $('up-bar').style.width = '0%';
    }
  });

  $('search').addEventListener('input', render);

  // boot: try loading the catalogue; a 401 drops us on the login screen
  load().catch(() => {});
})();
</script>
</body>
</html>`;
