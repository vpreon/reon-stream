# Reon Stream

A minimal Netflix-style video streamer on Cloudflare Workers.

- **Worker** serves the UI, the catalogue API, and streams video with HTTP Range
  support (seeking works in the `<video>` player).
- **D1** (`reon-stream-db`) holds the catalogue — each row is a title plus the
  path of the video file in R2.
- **R2** (`reon-stream-videos`) holds the actual video files (and optional
  thumbnails).
- **Auth** is a single password stored as the `APP_PASSWORD` Worker secret.
  A successful login sets an HMAC-signed, HttpOnly cookie valid for 7 days.
  Changing the password invalidates all sessions.

## Everyday use

1. Upload a video to the bucket:

   ```sh
   npx wrangler r2 object put reon-stream-videos/movies/my-film.mp4 \
     --file ./my-film.mp4 --content-type video/mp4 --remote
   ```

2. Open the app, sign in, click **+ Add video**, and enter the R2 path
   (`movies/my-film.mp4`). The form offers existing bucket keys as suggestions
   and refuses paths that don't exist in the bucket.

Use MP4 (H.264 + AAC) for the widest browser support. Encoding with
`-movflags +faststart` puts the index at the front of the file so playback
starts before the whole file downloads.

## Commands

```sh
npm run dev                 # local dev (uses .dev.vars for APP_PASSWORD)
npm run deploy              # deploy to Cloudflare
npm run db:migrate:local    # apply migrations to local D1
npm run db:migrate:remote   # apply migrations to remote D1
npx wrangler secret put APP_PASSWORD   # set/change the password
```

## Endpoints

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/` | GET | no | App shell (login + catalogue + player) |
| `/api/login` | POST | no | `{password}` → sets session cookie |
| `/api/logout` | POST | no | Clears session cookie |
| `/api/videos` | GET/POST | yes | List / add catalogue entries |
| `/api/videos/:id` | DELETE | yes | Remove entry (file stays in R2) |
| `/api/keys` | GET | yes | List bucket keys (for the add form) |
| `/stream/:id` | GET/HEAD | yes | Stream video from R2, Range-aware |
| `/thumb/:id` | GET | yes | Serve thumbnail from R2 |
# reon-stream
