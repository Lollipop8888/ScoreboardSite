#!/usr/bin/env bash
# Uptime check, run by cron every 5 minutes. After 2 failed checks in a row it sends a push alert to
# the site's operators (backend/send_alert.py), and again when the site is back. It sends through a
# one-off backend container, so it works even when the backend is down. State and log: data/uptime/.
set -uo pipefail
cd "$(dirname "$0")/.."
DIR=data/uptime
mkdir -p "$DIR"
STATE="$DIR/failures"
LOG="$DIR/uptime.log"
URL=${UPTIME_URL:-https://gridironscore.com}

check() { curl -fsS -m 20 -o /dev/null "$URL/" && curl -fsS -m 20 -o /dev/null "$URL/api/leagues"; }
alert() {
  docker compose run --rm --no-deps -T ${ALERT_DRY_RUN:+-e ALERT_DRY_RUN=1} backend python send_alert.py "$1" "$2" >> "$LOG" 2>&1 \
    || echo "$(date -Is) could not send the alert" >> "$LOG"
}

failures=$(cat "$STATE" 2>/dev/null || echo 0)
if check; then
  if [ "$failures" -ge 2 ]; then
    echo "$(date -Is) back up after $failures failed checks" >> "$LOG"
    alert "✅ GridIron is back up" "$URL is responding again."
  fi
  echo 0 > "$STATE"
else
  failures=$((failures + 1))
  echo "$failures" > "$STATE"
  local_code=$(curl -s -m 10 -o /dev/null -w '%{http_code}' "http://localhost:${GRIDIRON_PORT:-8470}/" || true)
  echo "$(date -Is) check failed ($failures in a row); this server's port answers ${local_code:-nothing}" >> "$LOG"
  if [ "$failures" -eq 2 ]; then
    alert "🚨 GridIron is down" "$URL isn't responding (this server's port: ${local_code:-no answer}). Check docker compose ps on beelink2."
  fi
fi
