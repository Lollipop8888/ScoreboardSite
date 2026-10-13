#!/usr/bin/env bash
# Daily backup of the production database (data/scoreboard.db), run by cron at 03:30.
# Uses SQLite's online backup, so it's safe while the site is running, then checks the copy.
# Keeps 14 days of these automatic backups in data/daily-backups/ (only files this script made,
# scoreboard_YYYYMMDD_HHMM.db, are ever removed; other backups are never touched).
set -euo pipefail
cd "$(dirname "$0")/.."
DEST=data/daily-backups
mkdir -p "$DEST"
OUT="$DEST/scoreboard_$(date +%Y%m%d_%H%M).db"
sqlite3 data/scoreboard.db ".backup '$OUT'"
if [ "$(sqlite3 "$OUT" 'pragma integrity_check')" != "ok" ]; then
  echo "$(date -Is) backup integrity check FAILED: $OUT" >&2
  exit 1
fi
find "$DEST" -maxdepth 1 -name 'scoreboard_????????_????.db' -mtime +14 -delete
echo "$(date -Is) backed up to $OUT ($(du -h "$OUT" | cut -f1))"
