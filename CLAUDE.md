# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Database safety (critical)

The SQLite database is the **live production database** for the running site. In Docker it is `data/scoreboard.db` (see Deployment). On a bare dev checkout it is `backend/scoreboard.db`. These rules come from the project owner (also in `.windsurf/rules/`):

- Make a backup copy of `scoreboard.db` before any change to it. Existing backups follow the pattern `scoreboard.db.backup_<description>` or `scoreboard.db.backup_<YYYYMMDD>_<description>`.
- Never delete database files, tables, or data, and never use `rm` without explicit permission.
- Migrations must be non-destructive. When replacing a table, rename the old one to `<old_table_name_YYYYMMDD>` instead of dropping it.

## Commands

Backend (FastAPI, run from `backend/`; virtualenv is `backend/venv`):
```bash
source venv/bin/activate
pip install -r requirements.txt   # notifications.py also needs pywebpush (+ py_vapid), which is missing from requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000   # API docs at /docs
```

Frontend (Vite + React, run from `frontend/`):
```bash
npm install
npm run dev      # http://localhost:5173, proxies /api, /uploads, /ws to :8000
npm run build
npm run lint     # eslint is installed, but the repo has no eslint config file
```

Tests: `scripts/run_tests.sh` runs the backend tests (`backend/tests`, pytest, a throwaway SQLite file; never the production database) and the frontend tests (`frontend/tests`, `node --test`) in throwaway containers.

## Deployment (Docker)

Production runs with `docker compose` on host `beelink2` from `~/gridironscore`, which is also the working copy for development there. The site is served at gridironscore.com: Cloudflare → the user's nginx proxy → host port 8470.

- `frontend` container: nginx serves the Vite build and proxies `/api`, `/ws`, and `/uploads` to `backend:8000` (`frontend/nginx.conf`). It is the only published port (`GRIDIRON_PORT`, default 8470).
- `backend` container: uvicorn with a **single worker**, because WebSocket rooms and heartbeats are in-process state.
- **Persistent state lives in `./data/`** (gitignored), bind-mounted at `/data`: `data/scoreboard.db` is the production database and `data/uploads/` holds the logos. The Dockerfile sets `DATABASE_URL`, `UPLOAD_DIR`, and `DB_PATH`, which the migration scripts read. The database safety rules above apply to `data/scoreboard.db`.
- `.env` (gitignored, see `.env.example`) holds `SECRET_KEY` and `GRIDIRON_PORT`.
- Deploy a code change: `docker compose up -d --build`. Run a migration: back up `data/scoreboard.db` first, then `docker compose exec backend python migrate_xxx.py`.
- Logs: `docker compose logs -f backend`.
- Cron (user adam, alongside other projects' jobs): `scripts/backup_db.sh` daily at 03:30 (SQLite online backup into `data/daily-backups/`, 14 days kept; only that script's own files are removed) and `scripts/uptime_check.sh` every 5 minutes (push alert via `backend/send_alert.py` to league owners, or `ALERT_USERNAMES`, after 2 failed checks and when the site is back; log in `data/uptime/`).
- The ESPN sync (League > Games > Sync with ESPN) backs up the database into `data/backups/` before applying.

## Architecture

**Backend** is a single-module FastAPI app: almost every route, the WebSocket `ConnectionManager`, and helpers are in `backend/main.py` (~2500 lines). `models.py` holds SQLAlchemy models, `schemas.py` the Pydantic request/response models, `auth.py` JWT auth (bcrypt + python-jose, `SECRET_KEY` env var), and `notifications.py` Web Push via VAPID (private key from `VAPID_PRIVATE_KEY_FILE` → `data/vapid_private.pem` in Docker, or `VAPID_PRIVATE_KEY`; never commit it — the repo is public).

- **Schema changes:** `Base.metadata.create_all` runs at startup but only creates *missing tables*. Adding a column to an existing table needs a standalone migration script (see `backend/migrate_*.py`: plain `sqlite3`, check `PRAGMA table_info`, then `ALTER TABLE ... ADD COLUMN`). Update `models.py`, `schemas.py`, and add the migration together.
- **Domain model:** User → League → (Season, Team, Game, Bracket → BracketMatch, RecordType/TeamRecord, TeamSeasonStats). `StandaloneGame` is a game with no league, with team info stored inline. `Scoreboard`/`ScoreboardPlayer` are simple generic score trackers. Invites, UserFollow, PushSubscription, and NotificationPreferences support sharing and notifications.
- **Ownership:** Mutating league-scoped routes call `check_league_ownership(db, league_id, current_user)`. `auth.get_current_user` is optional (it returns `None` when there is no token).
- **Share codes:** Leagues, games, brackets, standalone games, and scoreboards each have an 8-char `share_code`, used for public share URLs and as the WebSocket room key.
- **Real-time:** WebSocket rooms are named `"<type>:<SHARE_CODE_UPPER>"` (`game`, `bracket`, `scoreboard`, `league`). Endpoints are `/ws/{type}/{share_code}`. After a mutation, routes call `await manager.broadcast(room, {...})`. Game updates also broadcast to the parent league's room. Standalone games share the `game:` room namespace.
- **Controller heartbeat:** The client that is scoring a game posts heartbeats. If they stop (10s timeout), viewers receive a "technical difficulties" broadcast. League games keep heartbeats in an in-memory dict (`game_heartbeats`, lost on restart), while standalone games persist `last_heartbeat` in the DB.
- **Push notifications:** Game start/end in `update_game` call `notifications.notify_game_audience` (followers of the game, its league, or either team, once each). `GameUpdate.notification` is a transient field that is not stored.
- **Standings:** team W/L and season standings are rebuilt from final scores (`recompute_team_records`, `recompute_season_stats`); finished seasons are never recomputed; preseason games count only toward preseason records.
- **Co-scorers and chat:** co-scorer links (`co_scorer_links`) relay actions over the game WebSocket room to the scoring page, which applies them. Share-page chat and reactions are in memory only (`chat_rooms` in `main.py`).
- Uploaded logos go to `backend/uploads/` and are served at `/uploads`.

**Frontend** (`frontend/src`) uses React 18 + React Router + Tailwind, with shadcn-style Radix wrappers in `components/ui/`. The `@` alias points to `src/`.

- `lib/api.js` is the only HTTP/WebSocket client. `fetchApi` adds the Bearer token from `localStorage` and **on any 401/403 clears the token and redirects to `/`**. It groups calls into per-resource API objects and has a WebSocket helper that builds `/ws/{type}/{shareCode}` from `window.location`.
- Global contexts: `lib/auth.jsx` (`useAuth`), `lib/theme.jsx` (`useTheme`), `lib/i18n.jsx` (`useLanguage`).
- `pages/LiveGamePage.jsx` (~8900 lines) is the scoring controller for both league games (`/games/:gameId`) and standalone games (`/standalone/:gameId`, `standalone` prop). It contains football-specific game logic (clock, downs, field goals, keybinds). `components/GameScoreboardDisplay.jsx` renders the scoreboard that viewers, share pages, and `pages/OBSDisplayPage.jsx` (`/obs/:code`, a chromeless overlay for streaming) all use.
- `pages/LeagueDetailPage.jsx` (~4900 lines) handles league management: teams, games, seasons, standings, brackets, and records.
- `public/sw.js` is the service worker that receives Web Push messages, and `lib/notifications.js` handles subscription on the client.

The old dev-server deployment (`gridiron.kropp.cloud`) is still listed in `vite.config.js` `allowedHosts`.
