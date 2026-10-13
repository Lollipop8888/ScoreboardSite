"""Send a push notification alert to the site's operators (used by scripts/uptime_check.sh).
Usage: python send_alert.py "title" "body"
Recipients: ALERT_USERNAMES (comma-separated) if set, otherwise every league owner.
ALERT_DRY_RUN=1 prints who would get it without sending."""
import os
import sys

from database import SessionLocal
import models
import notifications

title, body = sys.argv[1], sys.argv[2]
db = SessionLocal()
names = [n.strip() for n in os.environ.get("ALERT_USERNAMES", "").split(",") if n.strip()]
if names:
    users = db.query(models.User).filter(models.User.username.in_(names)).all()
else:
    owner_ids = {l.owner_id for l in db.query(models.League).all() if l.owner_id}
    users = db.query(models.User).filter(models.User.id.in_(owner_ids)).all()
if os.environ.get("ALERT_DRY_RUN") == "1":
    devices = db.query(models.PushSubscription).filter(models.PushSubscription.user_id.in_([u.id for u in users])).count()
    print(f"[dry run] '{title}' would go to {[u.username for u in users]} ({devices} device(s))")
else:
    sent = notifications.notify_users(db, [u.id for u in users], title, body, {"url": "/"})
    print(f"alert '{title}' sent to {sent} device(s)")
db.close()
