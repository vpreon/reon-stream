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
      <label for="v-key">Video path in R2 bucket</label>
      <input id="v-key" required list="r2-keys" placeholder="movies/inception.mp4">
      <datalist id="r2-keys"></datalist>
    </div>
    <div>
      <label for="v-thumb">Thumbnail path in R2 (optional)</label>
      <input id="v-thumb" list="r2-keys" placeholder="thumbs/inception.jpg">
    </div>
    <div class="error" id="add-error"></div>
    <div style="display:flex; gap:10px; justify-content:flex-end">
      <button class="btn btn-ghost" type="button" id="add-cancel">Cancel</button>
      <button class="btn btn-accent" type="submit">Add to catalogue</button>
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

  $('add-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('add-error').textContent = '';
    try {
      const { video } = await api('/api/videos', {
        method: 'POST',
        body: JSON.stringify({
          title: $('v-title').value,
          description: $('v-desc').value,
          r2_key: $('v-key').value,
          thumbnail_key: $('v-thumb').value,
        }),
      });
      videos.unshift(video);
      $('add-form').reset();
      $('add-overlay').classList.remove('open');
      render();
    } catch (err) {
      $('add-error').textContent = err.message;
    }
  });

  $('search').addEventListener('input', render);

  // boot: try loading the catalogue; a 401 drops us on the login screen
  load().catch(() => {});
})();
</script>
</body>
</html>`;
